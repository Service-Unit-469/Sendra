import type { Contact, Event } from "@sendra/shared";
import dayjs from "dayjs";
import { useMemo } from "react";
import type { MetadataFilterGroupType, MetadataFilterType } from "../../components";

/**
 * Mapping of the filter conditions to the functions to use
 */
const functionMapping = {
  contains: "includes",
  "starts with": "startsWith",
  "ends with": "endsWith",
  "does not contain": "includes",
  "does not start with": "startsWith",
  "does not end with": "endsWith",
} as const;

/**
 * Check if the contact matches the filter
 * @param contact Contact to filter
 * @param data Data to filter
 * @param filter Filter to filter contacts
 * @returns True if the contact matches the filter, false otherwise
 */
function matchesMetadataFilter(contact: Contact, filter: MetadataFilterType) {
  if (!filter.field || !filter.condition) {
    return true;
  }
  const value = filter.field === "email" ? contact.email : contact.data[filter.field];

  if (typeof filter.value === "undefined" && value === null) {
    return true;
  } else if (typeof filter.value === "undefined" || filter.value === null) {
    return false;
  }

  let _letFilterValue: string | number | boolean = filter.value;
  if (typeof value === "number") {
    _letFilterValue = Number(filter.value);
  } else if (typeof filter.value === "boolean") {
    _letFilterValue = Boolean(filter.value);
  }
  switch (filter.condition) {
    case "is":
      return value === filter.value;
    case "is not":
      return value !== filter.value;
    default: {
      // biome-ignore lint/suspicious/noExplicitAny: Needed for dynamic function detection
      if (typeof (value as any)[functionMapping[filter.condition]] !== "function") {
        return false;
      }
      // biome-ignore lint/suspicious/noExplicitAny: Needed for dynamic function detection
      const matches = (value as any)[functionMapping[filter.condition]](filter.value) as boolean;
      if (filter.condition.includes("does not")) {
        return !matches;
      }
      return matches;
    }
  }
}

/**
 * Filter contacts based on the metadata filter
 * @param contacts Contacts to filter
 * @param filter Metadata filter to filter contacts
 * @returns Filtered contacts
 */
function filterContactsByMetadata(
  contacts: (Contact & {
    _embed: { events: Event[] };
  })[],
  filter: MetadataFilterGroupType,
) {
  return contacts.filter((contact) => {
    if (!filter.filters || !filter.filters.length) {
      return true;
    }

    let matches = false;
    if (filter.combination !== "or") {
      matches = filter.filters.every((filter) => matchesMetadataFilter(contact, filter));
    } else {
      matches = filter.filters.some((filter) => matchesMetadataFilter(contact, filter));
    }
    return matches;
  });
}

/**
 * Filter contacts based on the query
 * @param contacts Contacts to filter
 * @param query Query to filter contacts
 * @returns Filtered contacts
 */
export default function useFilterContacts(
  contacts: (Contact & {
    _embed: { events: Event[] };
  })[],
  query: {
    events?: string[];
    last?: "day" | "week" | "month";
    notevents?: string[];
    notlast?: "day" | "week" | "month";
    metadataFilter?: MetadataFilterGroupType;
  },
) {
  return useMemo(() => {
    if (!contacts) {
      return [];
    }

    let filteredContacts = contacts;

    if (query.events && query.events.length > 0) {
      query.events.forEach((e) => {
        filteredContacts = filteredContacts.filter((c) => c._embed.events.some((t) => t.eventType === e));
      });
    }

    if (query.last) {
      filteredContacts = filteredContacts.filter((c) => {
        if (c._embed.events.length === 0) {
          return false;
        }

        const lastTrigger = c._embed.events.sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));

        if (lastTrigger.length === 0) {
          return false;
        }

        return dayjs(lastTrigger[0].createdAt).isAfter(dayjs().subtract(1, query.last));
      });
    }

    if (query.notevents && query.notevents.length > 0 && query.notlast) {
      query.notevents.forEach((e) => {
        filteredContacts = filteredContacts.filter((c) => {
          if (c._embed.events.length === 0) {
            return true;
          }

          const lastTrigger = c._embed.events.filter((t) => t.eventType === e).sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));

          if (lastTrigger.length === 0) {
            return true;
          }

          return dayjs(lastTrigger[0].createdAt).isAfter(dayjs().subtract(1, query.last));
        });
      });
    } else if (query.notevents && query.notevents.length > 0) {
      query.notevents.forEach((e) => {
        filteredContacts = filteredContacts.filter((c) => c._embed.events.every((t) => t.eventType !== e));
      });
    } else if (query.notlast) {
      filteredContacts = filteredContacts.filter((c) => {
        if (c._embed.events.length === 0) {
          return true;
        }

        const lastTrigger = c._embed.events.sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));

        if (lastTrigger.length === 0) {
          return true;
        }

        return !dayjs(lastTrigger[0].createdAt).isAfter(dayjs().subtract(1, query.notlast));
      });
    }

    if (query.metadataFilter) {
      filteredContacts = filterContactsByMetadata(filteredContacts, query.metadataFilter);
    }

    return filteredContacts;
  }, [contacts, query]);
}
