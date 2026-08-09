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

export function canExecutePermission(
  permissions: PermissionState,
  permission: ECHOPermission,
): boolean {
  return hasPermission(permissions, permission);
}

export function loadPermissions(): PermissionState {
  if (typeof window === "undefined") return { ...DEFAULT_PERMISSIONS };

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return { ...DEFAULT_PERMISSIONS };

    const parsed = JSON.parse(stored) as Partial<PermissionState>;
    return {
      ...DEFAULT_PERMISSIONS,
      ...parsed,
    };
  } catch {
    return { ...DEFAULT_PERMISSIONS };
  }
}

export function savePermissions(permissions: PermissionState): void {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(permissions));
}

export function setPermission(
  permissions: PermissionState,
  permission: ECHOPermission,
  enabled: boolean,
): PermissionState {
  const next = {
    ...permissions,
    [permission]: enabled,
  };

  savePermissions(next);
  return next;
}

export function resetPermissions(): PermissionState {
  const next = { ...DEFAULT_PERMISSIONS };
  savePermissions(next);
  return next;
}

/**
 * Maps an ECHO voice command to the permission it would need before an
 * external action is executed. This layer intentionally does not execute
 * anything; callers must check the returned permission first.
 */
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
      return "phone.call";
    case "VOICEMAIL_SUMMARY":
      return "phone.call";
    default:
      return null;
  }
}
