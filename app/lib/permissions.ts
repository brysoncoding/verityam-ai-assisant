export type ECHOPermission =
  | "calendar.read"
  | "calendar.write"
  | "messages.send"
  | "phone.call"
  | "contacts.read"
  | "email.send";

export type PermissionState = Record<ECHOPermission, boolean>;

export const DEFAULT_PERMISSIONS: PermissionState = {
  "calendar.read": false,
  "calendar.write": false,
  "messages.send": false,
  "phone.call": false,
  "contacts.read": false,
  "email.send": false,
};

export const PERMISSION_LABELS: Record<ECHOPermission, string> = {
  "calendar.read": "Read calendar",
  "calendar.write": "Create, edit, or delete calendar events",
  "messages.send": "Send messages",
  "phone.call": "Make phone calls",
  "contacts.read": "Read contacts",
  "email.send": "Send email",
};

const STORAGE_KEY = "echo-permissions-v1";

export function hasPermission(
  permissions: PermissionState,
  permission: ECHOPermission,
): boolean {
  return permissions[permission] === true;
}

/**
 * Personal-account actions are intentionally disabled in ECHO.
 * This is a server-side safety gate, so client-side permission state cannot
 * re-enable calendar, email, messages, phone, or contacts access.
 */
export function canExecutePermission(
  _permissions: PermissionState,
  _permission: ECHOPermission,
): boolean {
  return false;
}

export function loadPermissions(): PermissionState {
  return { ...DEFAULT_PERMISSIONS };
}

export function savePermissions(_permissions: PermissionState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PERMISSIONS));
}

export function setPermission(
  permissions: PermissionState,
  permission: ECHOPermission,
  _enabled: boolean,
): PermissionState {
  const next = { ...permissions, [permission]: false };
  savePermissions(next);
  return next;
}

export function resetPermissions(): PermissionState {
  const next = { ...DEFAULT_PERMISSIONS };
  savePermissions(next);
  return next;
}

export function requiredPermissionForCommand(
  commandType:
    | "CALENDAR_ADD"
    | "CALENDAR_REMOVE"
    | "CALENDAR_LIST"
    | "MESSAGE"
    | "CALL"
    | "VOICEMAIL_SUMMARY",
): ECHOPermission | null {
  switch (commandType) {
    case "CALENDAR_LIST":
      return "calendar.read";
    case "CALENDAR_ADD":
    case "CALENDAR_REMOVE":
      return "calendar.write";
    case "MESSAGE":
      return "messages.send";
    case "CALL":
    case "VOICEMAIL_SUMMARY":
      return "phone.call";
    default:
      return null;
  }
}
