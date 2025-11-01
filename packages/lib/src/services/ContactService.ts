import type { Contact } from "@sendra/shared";
import { rootLogger } from "../logging";
import type { ContactPersistence } from "../persistence/ContactPersistence";
import { EventPersistence } from "../persistence/EventPersistence";

const logger = rootLogger.child({
  module: "ContactService",
});

export class ContactService {
  /**
   * Updates a contact and automatically tracks subscription changes as events.
   * If the contact's subscription status changes, a "subscribe" or "unsubscribe" event is created.
   *
   * @param oldContact - The contact before the update
   * @param newContact - The contact with updated fields
   * @param contactPersistence - The ContactPersistence instance for the project
   * @returns The updated contact
   */
  public static async updateContact({ oldContact, newContact, contactPersistence }: { oldContact: Contact; newContact: Contact; contactPersistence: ContactPersistence }): Promise<Contact> {
    // Check if subscription status changed
    const oldSubscribed = oldContact.subscribed;
    const newSubscribed = newContact.subscribed;

    if (oldSubscribed !== newSubscribed && newSubscribed !== undefined) {
      const eventType = newSubscribed ? "subscribe" : "unsubscribe";

      logger.info(
        {
          contact: newContact.id,
          project: newContact.project,
          eventType,
          oldSubscribed,
          newSubscribed,
        },
        `Contact subscription status changed, creating ${eventType} event`,
      );

      // Note: subscribe/unsubscribe are OOTB events and should not be added to project.eventTypes
      // Create the subscription event
      const eventPersistence = new EventPersistence(newContact.project);
      await eventPersistence.create({
        eventType,
        contact: newContact.id,
        project: newContact.project,
      });

      logger.info({ contact: newContact.id, eventType, project: newContact.project }, `Created ${eventType} event`);
    }

    // Update the contact
    return await contactPersistence.put(newContact);
  }
}
