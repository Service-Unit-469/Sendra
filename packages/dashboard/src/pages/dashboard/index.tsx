import { lazy } from "react";
import { Route, Routes } from "react-router-dom";
import FullscreenLoader from "../../components/Utility/FullscreenLoader/FullscreenLoader";
import Redirect from "../../components/Utility/Redirect/Redirect";
import { Dashboard } from "../../layouts";
import { useActiveProject, useProjects } from "../../lib/hooks/projects";
import NotFound from "../NotFound";

const ActionsPage = lazy(() => import("./actions/index"));
const NewAction = lazy(() => import("./actions/NewAction"));
const ActionDetailPage = lazy(() => import("./actions/Details"));
const AnalyticsPage = lazy(() => import("./analytics/index"));
const AnalyticsClicksPage = lazy(() => import("./analytics/clicks"));
const AssetsPage = lazy(() => import("./assets/index"));
const CampaignsPage = lazy(() => import("./campaigns/index"));
const EditCampaignPage = lazy(() => import("./campaigns/Edit"));
const ViewCampaignPage = lazy(() => import("./campaigns/View"));
const ContactDetailPage = lazy(() => import("./contacts/Detail"));
const ContactsPage = lazy(() => import("./contacts/index"));
const EventsPage = lazy(() => import("./events/index"));
const GroupsPage = lazy(() => import("./groups/index"));
const EditGroupPage = lazy(() => import("./groups/Edit"));
const HomePage = lazy(() => import("./Home"));
const SettingsPage = lazy(() => import("./settings/index"));
const ProjectPage = lazy(() => import("./settings/project"));
const ContactSchemaPage = lazy(() => import("./settings/contact-schema"));
const ApiPage = lazy(() => import("./settings/api"));
const IdentityPage = lazy(() => import("./settings/identity"));
const MembersPage = lazy(() => import("./settings/members"));
const TemplatesPage = lazy(() => import("./templates/index"));
const NewTemplatePage = lazy(() => import("./templates/New"));
const EditTemplatePage = lazy(() => import("./templates/Edit"));
const SmsPage = lazy(() => import("./sms/index"));
const SmsSettingsPage = lazy(() => import("./settings/sms"));

/**
 *
 */
export default function Index() {
  const activeProject = useActiveProject();
  const { data: projects } = useProjects();

  // the user has no projects, redirect to the new project page
  if (typeof projects !== "undefined" && projects.length === 0) {
    return <Redirect to="/new" />;
  }

  if (!activeProject) {
    return <FullscreenLoader />;
  }

  return (
    <Dashboard>
      <Routes>
        <Route index element={<HomePage />} />
        <Route path="/" element={<HomePage />} />
        <Route path="/actions" element={<ActionsPage />} />
        <Route path="/actions/new" element={<NewAction />} />
        <Route path="/actions/:id" element={<ActionDetailPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/analytics/clicks" element={<AnalyticsClicksPage />} />
        <Route path="/assets" element={<AssetsPage />} />
        <Route path="/campaigns" element={<CampaignsPage />} />
        <Route path="/campaigns/:id/edit" element={<EditCampaignPage />} />
        <Route path="/campaigns/:id" element={<ViewCampaignPage />} />
        <Route path="/contacts" element={<ContactsPage />} />
        <Route path="/contacts/:id" element={<ContactDetailPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/groups" element={<GroupsPage />} />
        <Route path="/groups/:id" element={<EditGroupPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/settings/project" element={<ProjectPage />} />
        <Route path="/settings/contact-schema" element={<ContactSchemaPage />} />
        <Route path="/settings/api" element={<ApiPage />} />
        <Route path="/settings/identity" element={<IdentityPage />} />
        <Route path="/settings/members" element={<MembersPage />} />
        <Route path="/settings/sms" element={<SmsSettingsPage />} />
        <Route path="/sms" element={<SmsPage />} />
        <Route path="/templates" element={<TemplatesPage />} />
        <Route path="/templates/new" element={<NewTemplatePage />} />
        <Route path="/templates/:id" element={<EditTemplatePage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Dashboard>
  );
}
