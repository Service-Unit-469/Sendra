import type { Contact } from "@sendra/shared";
import { useMemo } from "react";
import type { MetadataFilterGroupType, MetadataFilterType } from "../Input/MetadataFilter/types";

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
function filterContactsByMetadata(contacts: Contact[], filter: MetadataFilterGroupType) {
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
export default function useFilterContacts(contacts: Contact[], filter?: MetadataFilterGroupType) {
  return useMemo(() => {
    if (!contacts) {
      return [];
    }

    let filteredContacts = contacts;

    if (filter) {
      filteredContacts = filterContactsByMetadata(filteredContacts, filter);
    }

    return filteredContacts;
  }, [contacts, filter]);
}
