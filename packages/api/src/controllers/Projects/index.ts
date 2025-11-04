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
import { registerTemplatesRoutes } from "./Templates";

export const registerProjectRoutes = (app: AppType) => {
  registerProjectKeysRoutes(app);
  registerProjectIdentityRoutes(app);
  registerProjectCrudRoutes(app);
  registerProjectInfoRoutes(app);

  // Entities
  registerActionsRoutes(app);
  registerAssetsRoutes(app);
  registerCampaignsRoutes(app);
  registerContactsRoutes(app);
  registerGroupsRoutes(app);
  registerEmailsRoutes(app);
  registerEventsRoutes(app);
  registerTemplatesRoutes(app);
};
