import { z } from "@hono/zod-openapi";
import { getAuthConfig, MembershipPersistence, rootLogger, UserPersistence } from "@sendra/lib";
import type { Project, User, UserCredentials, UserRequestReset, UserVerify } from "@sendra/shared";
import type { Context, HonoRequest } from "hono";
import { type JwtPayload, sign, verify } from "jsonwebtoken";
import type { StringValue } from "ms";
import { Resource } from "sst";
import { Conflict, HttpException, NotFound } from "../exceptions";
import { createHash, verifyHash } from "../util/hash";
import { SystemEmailService } from "./SystemEmailService";

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

  private static createCode(email: string) {
    return sign({ email }, JWT_SECRET, { expiresIn: "1h" });
  }
  public static createProjectToken(key: string, type: "secret" | "public", projectId: string) {
    const authConfig = getAuthConfig();
    const token = sign(
      {
        type,
      },
      `${JWT_SECRET}:${key}`,
      {
        expiresIn: authConfig.ttl[type] as number | StringValue,
        issuer: authConfig.issuer,
        subject: projectId,
      },
    );
    return `${type === "secret" ? "s" : "p"}:${token}`;
  }

  private static createUserToken(userId: string, email: string) {
    const authConfig = getAuthConfig();
    const token = sign(
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
    return `u:${token}`;
  }

  private static getSalt(type: "s" | "p" | "u", project: Project): string {
    if (type === "s") {
      return `${JWT_SECRET}:${project.secret}`;
    }
    if (type === "p") {
      return `${JWT_SECRET}:${project.public}`;
    }
    return JWT_SECRET;
  }

  public static async login({ email, password }: UserCredentials): Promise<{
    email: string;
    id: string;
    token: string;
  }> {
    const userPersistence = new UserPersistence();
    const user = await userPersistence.getByEmail(email);

    if (!user) {
      logger.info({ email }, "User not found");
      throw new HttpException(401, "Invalid username or password");
    }

    if (!user.password) {
      logger.info({ email }, "User has no password");
      throw new HttpException(403, "Please reset your password", {
        resetUrl: `/auth/reset?id=${user.id}`,
      });
    }

    if (!user.enabled) {
      logger.info({ email }, "User is not enabled");
      throw new HttpException(403, "Please verify your email");
    }

    const verified = await verifyHash(password, user.password);
    if (!verified) {
      logger.info({ email }, "Invalid password");
      throw new HttpException(401, "Invalid username or password");
    }

    const token = AuthService.createUserToken(user.id, email);

    return { email: user.email, id: user.id, token };
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

  public static parseToken(c: Context, options?: { type?: AuthType; project?: Project }): Auth {
    const tokenString = AuthService.parseBearer(c.req);
    if (!tokenString) {
      throw new HttpException(401, "No authorization passed");
    }

    const [prefix, token] = tokenString.split(":");
    if (!prefix || !["u", "s", "p"].includes(prefix)) {
      logger.warn({ prefix }, "Invalid authorization token, invalid prefix");
      throw new HttpException(401, "Invalid authorization token");
    }

    if (!options?.project && prefix !== "u") {
      logger.warn({ prefix }, "Invalid authorization token, project is required for non-user tokens");
      throw new HttpException(401, "Invalid authorization token");
    }

    try {
      const salt = AuthService.getSalt(prefix as "s" | "p" | "u", options?.project as Project);
      const verified = verify(token, salt);
      const auth = authSchema.parse(verified);
      if (options?.type && auth.type !== options.type) {
        logger.warn({ auth, type: options.type }, "Invalid authorization token for request");
        throw new HttpException(400, "Invalid authorization token for request");
      }
      return auth;
    } catch (err) {
      logger.warn({ err }, "Invalid authorization token");
      throw new HttpException(401, "Invalid authorization token");
    }
  }

  public static async requestReset({ email }: UserRequestReset): Promise<void> {
    const userPersistence = new UserPersistence();
    const user = await userPersistence.getByEmail(email);
    if (!user) {
      logger.warn({ email }, "User not found");
      return;
    }

    logger.info({ email }, "User found, requesting reset");
    const code = AuthService.createCode(email);
    await userPersistence.put({
      ...user,
      code,
    });
    await SystemEmailService.sendResetPasswordEmail(email, code);
  }

  public static async resetPassword({ email, code, password }: { email: string; code: string; password: string }) {
    const user = await AuthService.verifyCode({ code, email });
    const userPersistence = new UserPersistence();
    await userPersistence.put({
      ...user,
      password: await createHash(password),
      enabled: true,
      code: undefined,
    });
    return user;
  }

  public static async signup({ email, password }: UserCredentials): Promise<User> {
    const authConfig = getAuthConfig();
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

    const code = AuthService.createCode(email);
    const created_user = await userPersistence.create({
      email,
      password: await createHash(password),
      enabled: false,
      code,
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

    await SystemEmailService.sendVerificationEmail(email, code);

    return created_user;
  }

  private static async verifyCode({ code, email }: UserVerify): Promise<User> {
    try {
      const verified = verify(code, JWT_SECRET) as { email: string };
      if (verified.email !== email) {
        throw new HttpException(401, "Invalid code");
      }
    } catch (err) {
      logger.error({ err }, "Error verifying code");
      throw new HttpException(401, "Invalid code");
    }

    const userPersistence = new UserPersistence();
    const user = await userPersistence.getByEmail(email);
    if (!user) {
      logger.info({ email }, "User not found");
      throw new NotFound("user");
    }

    if (user.code !== code) {
      logger.info({ email, code }, "Invalid code");
      throw new HttpException(401, "Invalid code");
    }
    return user;
  }

  public static async verifyUser({ email, code }: UserVerify): Promise<User> {
    const user = await AuthService.verifyCode({ code, email });

    const userPersistence = new UserPersistence();
    await userPersistence.put({
      ...user,
      enabled: true,
      code: undefined,
    });
    return user;
  }
}
