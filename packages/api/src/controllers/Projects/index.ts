import type { AppType } from "../../app";
import { registerActionsRoutes } from "./Actions";
import { registerAssetsRoutes } from "./Assets";
import { registerCampaignsRoutes } from "./Campaigns";
import { registerContactsRoutes } from "./Contacts";
import { registerEmailsRoutes } from "./Emails";
import { registerEventsRoutes } from "./Events";
import { registerGroupsRoutes } from "./Groups";
import { registerProjectIdentityRoutes } from "./Identity";
import { registerProjectInfoRoutes } from "./Info";
import { registerProjectKeysRoutes } from "./Keys";
import { registerProjectCrudRoutes } from "./Projects";
import { registerProjectSmsRoutes } from "./Sms";
import { registerTemplatesRoutes } from "./Templates";

export const registerProjectRoutes = (app: AppType) => {
  registerProjectCrudRoutes(app);
  registerProjectIdentityRoutes(app);
  registerProjectInfoRoutes(app);
  registerProjectKeysRoutes(app);
  registerProjectSmsRoutes(app);

  // Entities
  registerActionsRoutes(app);
  registerAssetsRoutes(app);
  registerCampaignsRoutes(app);
  registerContactsRoutes(app);
  registerEmailsRoutes(app);
  registerEventsRoutes(app);
  registerGroupsRoutes(app);
  registerTemplatesRoutes(app);
};
