import type { AppType } from "../../app";
import { registerActionsRoutes } from "./Actions";
import { registerCampaignsRoutes } from "./Campaigns";
import { registerContactsRoutes } from "./Contacts";
import { registerEmailsRoutes } from "./Emails";
import { registerEventsRoutes } from "./Events";
import { registerGroupsRoutes } from "./Groups";
import { registerProjectIdentityRoutes } from "./Identity";
import { registerProjectInfoRoutes } from "./Info";
import { registerProjectKeysRoutes } from "./Keys";
import { registerProjectCrudRoutes } from "./Projects";
import { registerTemplatesRoutes } from "./Templates";
import { registerSmsRoutes } from "./Sms";

export const registerProjectRoutes = (app: AppType) => {
  registerProjectKeysRoutes(app);
  registerProjectIdentityRoutes(app);
  registerProjectCrudRoutes(app);
  registerProjectInfoRoutes(app);

  // Entities
  registerActionsRoutes(app);
  registerCampaignsRoutes(app);
  registerContactsRoutes(app);
  registerGroupsRoutes(app);
  registerEmailsRoutes(app);
  registerEventsRoutes(app);
  registerSmsRoutes(app);
  registerTemplatesRoutes(app);
};
