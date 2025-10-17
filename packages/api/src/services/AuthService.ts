import { z } from "@hono/zod-openapi";
import { getAuthConfig, MembershipPersistence, rootLogger, UserPersistence } from "@sendra/lib";
import { type User, UserSchemas } from "@sendra/shared";
import type { Context, HonoRequest } from "hono";
import { type JwtPayload, sign, verify } from "jsonwebtoken";
import type { StringValue } from "ms";
import { Resource } from "sst";
import { Conflict, HttpException } from "../exceptions";
import { createHash, verifyHash } from "../util/hash";

export const JWT_SECRET = Resource.JwtSecret.value;

const logger = rootLogger.child({
  module: "AuthService",
});

export const authTypes = ["user", "secret", "public"] as const;
export type AuthType = (typeof authTypes)[number];

export type Auth = JwtPayload &
  (
    | {
        type: "secret" | "public";
        sub: string;
        iss: string;
        exp: number;
      }
    | {
        type: "user";
        email: string;
        sub: string;
        iss: string;
        exp: number;
      }
  );

const authSchema = z.union([
  z.object({
    type: z.enum(["secret", "public"]),
    sub: z.string(),
    iss: z.string(),
    exp: z.number(),
  }),
  z.object({
    type: z.literal("user"),
    email: z.string(),
    sub: z.string(),
    iss: z.string(),
    exp: z.number(),
  }),
]);

export class AuthService {
  private static async checkForMemberships(email: string) {
    const membershipPersistence = new MembershipPersistence();
    const memberships = await membershipPersistence.findAllBy({
      key: "email",
      value: email,
    });
    return memberships;
  }

  public static async login(c: Context): Promise<{
    email: string;
    id: string;
    token: string;
  }> {
    const body = await c.req.json();
    const { email, password } = UserSchemas.credentials.parse(body);

    const userPersistence = new UserPersistence();
    const user = await userPersistence.getByEmail(email);

    if (!user) {
      logger.info({ email }, "User not found");
      throw new HttpException(401, "Invalid username or password");
    }

    if (!user.password) {
      logger.info({ email }, "User has no password");
      throw new HttpException(302, "Please reset your password", {
        Location: `/auth/reset?id=${user.id}`,
      });
    }

    const verified = await verifyHash(password, user.password);
    if (!verified) {
      logger.info({ email }, "Invalid password");
      throw new HttpException(401, "Invalid username or password");
    }

    const token = AuthService.createUserToken(user.id, email);

    return { email: user.email, id: user.id, token };
  }

  public static async signup(c: Context): Promise<User> {
    const authConfig = getAuthConfig();
    const body = await c.req.json();
    const { email, password } = UserSchemas.credentials.parse(body);
    logger.info({ email }, "Signing up user");

    const memberships = await AuthService.checkForMemberships(email);
    if (authConfig.disableSignups && memberships.length === 0) {
      logger.info({ email }, "Signups are currently disabled");
      throw new HttpException(400, "Signups are currently disabled");
    }

    const userPersistence = new UserPersistence();
    const user = await userPersistence.getByEmail(email);

    if (user) {
      logger.info({ email }, "User already exists");
      throw new Conflict("That email is already associated with another user");
    }

    const created_user = await userPersistence.create({
      email,
      password: await createHash(password),
    });

    if (memberships.length > 0) {
      logger.info({ email, memberships }, "Assigning memberships to user");
      const membershipPersistence = new MembershipPersistence();
      await Promise.all(
        memberships.map((membership) =>
          membershipPersistence.put({
            ...membership,
            user: created_user.id,
          }),
        ),
      );
    }

    logger.info({ email, created_user }, "Created user");

    AuthService.createUserToken(created_user.id, email);

    return created_user;
  }

  private static createUserToken(userId: string, email: string) {
    const authConfig = getAuthConfig();
    return sign(
      {
        type: "user",
        email,
      },
      JWT_SECRET,
      {
        expiresIn: authConfig.ttl.user as number | StringValue,
        issuer: authConfig.issuer,
        subject: userId,
      },
    );
  }

  public static createProjectToken(key: string, type: "secret" | "public", projectId: string) {
    const authConfig = getAuthConfig();
    return sign(
      {
        type,
      },
      JWT_SECRET,
      {
        expiresIn: authConfig.ttl[type] as number | StringValue,
        issuer: authConfig.issuer,
        subject: projectId,
        keyid: key,
      },
    );
  }

  public static parseToken(c: Context, type?: AuthType): Auth {
    const token = AuthService.parseBearer(c.req);
    if (!token) {
      throw new HttpException(401, "No authorization passed");
    }

    try {
      const verified = verify(token, JWT_SECRET);
      const auth = authSchema.parse(verified);
      if (type && auth.type !== type) {
        logger.warn({ auth, type }, "Invalid authorization token for request");
        throw new HttpException(400, "Invalid authorization token for request");
      }
      return auth;
    } catch (e) {
      logger.warn({ error: e }, "Invalid authorization token");
      throw new HttpException(401, "Invalid authorization token");
    }
  }

  /**
   * Parse a bearer token from the request headers
   * @param request The express request object
   * @param type
   */
  private static parseBearer(request: HonoRequest): string | undefined {
    const bearer: string | undefined = request.header("Authorization");

    if (!bearer || !bearer.includes("Bearer")) {
      logger.warn({ bearer }, "Invalid authorization token");
      return undefined;
    }

    const split = bearer.split(" ");
    if (!(split[0] === "Bearer") || split.length > 2 || !split[1]) {
      logger.warn({ bearer }, "Invalid authorization token");
      return undefined;
    }

    return split[1];
  }
}
