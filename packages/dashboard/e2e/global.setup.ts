import { test as setup } from "@playwright/test";
import { readFileSync } from "fs";
import {
  MembershipPersistence,
  ProjectPersistence,
  UserPersistence,
} from "@sendra/lib";
import { randomUUID, randomBytes, scryptSync, } from "crypto";

// Pass the password string and get hashed password back
// ( and store only the hashed string in your database)
const encryptPassword = (password: string, salt: string) => {
  return scryptSync(password, salt, 32).toString("hex");
};

/**
 * Generates a hash from plain text
 * @param {string} pass The password
 * @returns {Promise<string>} Password hash
 */
export const createHash = async (pass: string): Promise<string> => {
  const salt = randomBytes(16).toString("hex");
  return encryptPassword(pass, salt) + salt;
};


setup("creating E2E user", async ({}) => {
  const outputs = JSON.parse(readFileSync(".sst/outputs.json", "utf8"));

  process.env.DATA_TABLE_NAME = outputs.dynamo.table.id;
  process.env.RATE_LIMIT_TABLE_NAME = outputs.rateLimit.table.id;
  process.env.PERSISTENCE_PROVIDER = "local";

  const email = "e2e@example.com";
  const rawPassword = randomUUID();
  const password = await createHash(rawPassword);
  const userPersistence = new UserPersistence();
  let user = await userPersistence.getByEmail(email);
  if (user) {
    await userPersistence.put({
      ...user,
      password,
      enabled: true,
    });
  } else {
    user = await userPersistence.create({
      email,
      password,
      enabled: true,
    });
  }
  const projectPersistence = new ProjectPersistence();
  const projects = await projectPersistence.listAll();
  let project = projects.find((project) => project.name === "E2E Project");
  if (!project) {
    project = await projectPersistence.create({
      name: "E2E Project",
      url: "https://e2e.example.com",
      public: "e2e-public-key",
      secret: "e2e-secret-key",
      eventTypes: [],
      colors: [],
    });
  }

  const membershipPersistence = new MembershipPersistence();
  const isMember = await membershipPersistence.isMember(project.id, user.id);
  if (!isMember) {
    await membershipPersistence.create({
      email,
      user: user.id,
      project: project.id,
      role: "ADMIN",
    });
  }
  process.env.E2E_USER_EMAIL = email;
  process.env.E2E_USER_PASSWORD = rawPassword;
  process.env.E2E_PROJECT_ID = project.id;
});
