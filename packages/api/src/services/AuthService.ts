import { z } from "@hono/zod-openapi";
import { rootLogger, UserPersistence } from "@sendra/lib";
import { type User, UserSchemas } from "@sendra/shared";
import type { Context, HonoRequest } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { type JwtPayload, sign, verify } from "jsonwebtoken";
import { authConfig, JWT_SECRET } from "../app/constants";
import { Conflict, HttpException } from "../exceptions";
import { createHash, verifyHash } from "../util/hash";

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
      throw new HttpException(302, "Please reset your password", {
        Location: `/auth/reset?id=${user.id}`,
      });
    }

    const verified = await verifyHash(password, user.password);
    if (!verified) {
      logger.info({ email }, "Invalid password");
      throw new HttpException(401, "Invalid username or password");
    }

    const token = AuthService.setUserToken(c, user.id, email);

    return { email: user.email, id: user.id, token };
  }

  public static async logout(c: Context): Promise<void> {
    setCookie(c, authConfig.cookieName, "", {
      httpOnly: true,
      expires: new Date(0),
      secure: true,
      sameSite: "lax",
      path: "/",
    });
  }

  public static async signup(c: Context): Promise<User> {
    if (authConfig.disableSignups) {
      throw new HttpException(400, "Signups are currently disabled");
    }

    const body = await c.req.json();
    const { email, password } = UserSchemas.credentials.parse(body);

    const userPersistence = new UserPersistence();
    const user = await userPersistence.getByEmail(email);

    if (user) {
      throw new Conflict("That email is already associated with another user");
    }

    const created_user = await userPersistence.create({
      email,
      password: await createHash(password),
    });

    AuthService.setUserToken(c, created_user.id, email);

    return created_user;
  }

  private static createUserToken(userId: string, email: string) {
    return sign(
      {
        type: "user",
        email,
      },
      JWT_SECRET,
      {
        expiresIn: authConfig.ttl.user,
        issuer: authConfig.issuer,
        subject: userId,
      },
    );
  }

  public static createProjectToken(key: string, type: "secret" | "public", projectId: string) {
    return sign(
      {
        type,
      },
      JWT_SECRET,
      {
        expiresIn: authConfig.ttl[type],
        issuer: authConfig.issuer,
        subject: projectId,
        keyid: key,
      },
    );
  }

  public static parseToken(c: Context, type?: AuthType): Auth {
    let token = getCookie(c, authConfig.cookieName);

    if (!token) {
      token = AuthService.parseBearer(c.req);
    }

    if (!token) {
      throw new HttpException(401, "No authorization passed");
    }

    try {
      const verified = verify(token, JWT_SECRET);
      const auth = authSchema.parse(verified);
      if (type && auth.type !== type) {
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
      return undefined;
    }

    const split = bearer.split(" ");
    if (!(split[0] === "Bearer") || split.length > 2 || !split[1]) {
      return undefined;
    }

    return split[1];
  }

  private static setUserToken(c: Context, userId: string, email: string): string {
    const token = AuthService.createUserToken(userId, email);
    setCookie(c, authConfig.cookieName, token, {
      httpOnly: true,
      expires: new Date(Date.now() + Number.parseInt(authConfig.ttl.user, 10) * 1000),
      secure: true,
      sameSite: "lax",
      path: "/",
    });
    return token;
  }
}
