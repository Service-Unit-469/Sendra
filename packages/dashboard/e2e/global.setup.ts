import { test as setup } from "@playwright/test";
import { createHash } from "@sendra/api";
import {
  MembershipPersistence,
  ProjectPersistence,
  UserPersistence,
} from "@sendra/lib";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { getConfig } from "./util/config";

setup("creating E2E user", async ({ }) => {
  const { dataTableName, rateLimitTableName } = getConfig();

  process.env.DATA_TABLE_NAME = dataTableName;
  process.env.RATE_LIMIT_TABLE_NAME = rateLimitTableName;
  process.env.PERSISTENCE_PROVIDER = "local";


  const email = "e2e@example.com";
  const rawPassword = randomUUID();
  const password = await createHash(rawPassword);
  const userPersistence = new UserPersistence();
  let user = await userPersistence.getByEmail(email);
  if (user) {
    console.log('updating e2e user');
    await userPersistence.put({
      ...user,
      password,
      enabled: true,
    });
  } else {
    console.log('creating e2e user');
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
    console.log('creating e2e project');
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
    console.log('adding e2e user to project');
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

  // Write credentials to a file so they can be shared across Playwright projects
  // (environment variables set in setup projects are not available to dependent projects)
  const credentialsPath = join(__dirname, ".auth-credentials.json");
  writeFileSync(
    credentialsPath,
    JSON.stringify({
      email,
      password: rawPassword,
      projectId: project.id,
    }),
    "utf-8",
  );
});
