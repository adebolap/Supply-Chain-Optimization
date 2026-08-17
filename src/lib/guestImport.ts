// Header-agnostic mapping from an arbitrary spreadsheet/CSV row to guest
// fields. Real-world guest sheets vary a lot ("Name" vs "Guest Name" vs
// "First Name"/"Last Name", "Phone" vs "Phone Number", etc.), so this
// matches by normalized meaning instead of requiring exact column names.

export type RawGuestRow = Record<string, string | undefined>;

export interface MappedGuestRow {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  household: string;
  dietaryNotes: string;
  notes: string;
  rsvpStatus: "ATTENDING" | "DECLINED" | null;
}

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const FIELD_SYNONYMS: Record<string, string[]> = {
  firstName: ["firstname", "fname", "givenname"],
  lastName: ["lastname", "lname", "surname", "familyname"],
  fullName: ["name", "guestname", "fullname", "guest"],
  email: ["email", "emailaddress"],
  phone: [
    "phone",
    "phonenumber",
    "mobile",
    "mobilenumber",
    "cell",
    "cellphone",
    "telephone",
    "contactnumber",
  ],
  household: ["household", "family", "group", "party"],
  dietaryNotes: [
    "dietarynotes",
    "dietary",
    "allergies",
    "diet",
    "dietaryrestrictions",
  ],
  notes: ["notes", "note", "address", "comment", "comments", "additionalnotes"],
  rsvpStatus: ["rsvpstatus", "rsvp", "status", "attending", "response"],
};

function findValue(
  normalizedRow: Record<string, string>,
  keys: string[]
): string {
  for (const key of keys) {
    const value = normalizedRow[key];
    if (value) return value.trim();
  }
  return "";
}

interface HeaderEntry {
  normalized: string;
  original: string;
  value: string;
}

// Some target fields (like "notes") absorb several distinct source columns
// (Address, Notes, Comments, ...) that can all be present on the same row.
// Collect every match instead of only the first, so nothing gets silently
// dropped, labeling each with its original header when there's more than one.
function collectValues(entries: HeaderEntry[], keys: string[]): string {
  const matches = entries.filter((e) => keys.includes(e.normalized) && e.value);
  if (matches.length === 0) return "";
  if (matches.length === 1) return matches[0].value;
  return matches.map((m) => `${m.original}: ${m.value}`).join("; ");
}

function parseRsvpStatus(raw: string): "ATTENDING" | "DECLINED" | null {
  const value = raw.trim().toLowerCase();
  if (!value) return null;
  if (["yes", "y", "attending", "confirmed", "going", "true", "1"].includes(value)) {
    return "ATTENDING";
  }
  if (["no", "n", "declined", "decline", "notattending", "notgoing", "false", "0"].includes(value)) {
    return "DECLINED";
  }
  return null;
}

export function mapGuestRow(row: RawGuestRow): MappedGuestRow {
  const normalizedRow: Record<string, string> = {};
  const entries: HeaderEntry[] = [];
  for (const [header, value] of Object.entries(row)) {
    if (value === undefined || !value.trim()) continue;
    const normalized = normalizeHeader(header);
    normalizedRow[normalized] = value;
    entries.push({ normalized, original: header, value: value.trim() });
  }

  let firstName = findValue(normalizedRow, FIELD_SYNONYMS.firstName);
  let lastName = findValue(normalizedRow, FIELD_SYNONYMS.lastName);
  if (!firstName) {
    const fullName = findValue(normalizedRow, FIELD_SYNONYMS.fullName);
    if (fullName) {
      const [first, ...rest] = fullName.split(/\s+/);
      firstName = first;
      lastName = lastName || rest.join(" ");
    }
  }

  return {
    firstName,
    lastName,
    email: findValue(normalizedRow, FIELD_SYNONYMS.email),
    phone: findValue(normalizedRow, FIELD_SYNONYMS.phone),
    household: findValue(normalizedRow, FIELD_SYNONYMS.household),
    dietaryNotes: findValue(normalizedRow, FIELD_SYNONYMS.dietaryNotes),
    notes: collectValues(entries, FIELD_SYNONYMS.notes),
    rsvpStatus: parseRsvpStatus(findValue(normalizedRow, FIELD_SYNONYMS.rsvpStatus)),
  };
}
