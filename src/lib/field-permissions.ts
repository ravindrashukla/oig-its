/**
 * Field-Level Read/Write Permissions (DMR2)
 *
 * Controls which case fields are editable based on user role and case status.
 */

const FIELD_PERMISSIONS: Record<string, Record<string, string[]>> = {
  INVESTIGATOR: {
    INTAKE: ["title", "description", "priority", "dueDate", "complaintSource", "crimeType", "caseType", "status", "jurisdiction", "partnerAgencies", "leadAgency", "investigationApproach", "affectedProgram", "suspectType", "followUpDate", "followUpNotes", "followUpStatus", "hasPendingFollowUp"],
    OPEN: ["title", "description", "priority", "dueDate", "status", "complaintSource", "crimeType", "jurisdiction", "partnerAgencies", "leadAgency", "investigationApproach", "affectedProgram", "suspectType", "followUpDate", "followUpNotes", "followUpStatus"],
    ACTIVE: ["title", "description", "priority", "dueDate", "status", "caseType", "complaintSource", "crimeType", "jurisdiction", "partnerAgencies", "leadAgency", "investigationApproach", "affectedProgram", "suspectType", "followUpDate", "followUpNotes", "followUpStatus"],
    UNDER_REVIEW: ["description", "followUpDate", "followUpNotes", "followUpStatus"],
    PENDING_ACTION: ["description", "followUpDate", "followUpNotes", "followUpStatus"],
    CLOSED: ["followUpNotes", "followUpStatus"],
    ARCHIVED: [],
  },
  SUPERVISOR: {
    INTAKE: ["*"],
    OPEN: ["*"],
    ACTIVE: ["*"],
    UNDER_REVIEW: ["title", "description", "priority", "status"],
    PENDING_ACTION: ["title", "description", "priority", "status"],
    CLOSED: ["followUpNotes", "followUpStatus"],
    ARCHIVED: [],
  },
  ADMIN: {
    "*": ["*"],
  },
  ANALYST: {
    "*": [],
  },
  AUDITOR: {
    "*": [],
  },
  READONLY: {
    "*": [],
  },
};

/**
 * Returns the list of editable fields for a given role and case status.
 * Returns "*" if all fields are editable, or a string array of field names.
 */
export function getEditableFields(
  role: string,
  caseStatus: string,
): string[] | "*" {
  const rolePerms = FIELD_PERMISSIONS[role];
  if (!rolePerms) return [];

  // Check for wildcard status first (e.g., ADMIN has "*": ["*"])
  if (rolePerms["*"]) {
    const fields = rolePerms["*"];
    if (fields.length === 1 && fields[0] === "*") return "*";
    if (fields.length === 0) return [];
    return fields;
  }

  const statusPerms = rolePerms[caseStatus];
  if (!statusPerms) return [];

  if (statusPerms.length === 1 && statusPerms[0] === "*") return "*";
  return statusPerms;
}

/**
 * Checks whether a specific field is editable for the given role and case status.
 */
export function isFieldEditable(
  role: string,
  caseStatus: string,
  fieldName: string,
): boolean {
  const editable = getEditableFields(role, caseStatus);
  if (editable === "*") return true;
  return editable.includes(fieldName);
}
