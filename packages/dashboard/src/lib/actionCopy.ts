type DeleteEntity = "campaign" | "template" | "action" | "group" | "contact" | "asset" | "project";

const deleteActionLabel: Record<DeleteEntity, string> = {
  campaign: "Delete Campaign",
  template: "Delete Template",
  action: "Delete Action",
  group: "Delete Group",
  contact: "Delete Contact",
  asset: "Delete Asset",
  project: "Delete Project",
};

export const campaignActionCopy = {
  saveDraft: "Save draft",
  sendNow: "Send now",
  sendTest: "Send test",
  sendModalTitle: "Send campaign now",
  sendModalDescription: (recipientCount: number) => `Sending this campaign to ${recipientCount} contacts is final. You cannot edit this campaign after sending, and this cannot be undone.`,
};

export const editActionCopy = {
  saveChanges: "Save changes",
};

export const deleteModalCopy = (entity: DeleteEntity, name: string) => {
  return {
    action: deleteActionLabel[entity],
    title: `Delete ${entity}`,
    description: `Delete "${name}"? This permanently removes this ${entity}. This cannot be undone.`,
  };
};

export const settingsDangerActionCopy = {
  regenerateApiKeys: {
    action: "Regenerate API keys",
    title: "Regenerate API keys",
    description: "Regenerating API keys revokes your current keys immediately. Any integrations using them will stop working until updated.",
  },
  unlinkDomain: {
    action: "Unlink domain",
    title: "Unlink domain",
    description: "Unlinking your domain removes this sending identity from your project. This cannot be undone.",
  },
  leaveProject: (isLastMember: boolean) => ({
    action: "Leave project",
    title: "Leave project",
    description: isLastMember
      ? "You are the last member in this project. Leaving will permanently delete this project and all of its data. This cannot be undone."
      : "Leaving this project removes your access immediately. You will need a new invite to rejoin. This cannot be undone.",
  }),
};
