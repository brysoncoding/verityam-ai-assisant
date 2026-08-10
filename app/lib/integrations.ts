import type { ECHOPermission, PermissionState } from "./permissions";
import { canExecutePermission } from "./permissions";

export type IntegrationProvider =
  | "google"
  | "microsoft"
  | "apple"
  | "device";

export type IntegrationAction =
  | "calendar.read"
  | "calendar.write"
  | "email.send"
  | "messages.send"
  | "phone.call"
  | "contacts.read";

export type IntegrationResult =
  | { ok: true; provider: IntegrationProvider; action: IntegrationAction; status: "ready" }
  | { ok: false; reason: "permission_denied" | "not_connected"; permission: ECHOPermission };

const ACTION_PERMISSION: Record<IntegrationAction, ECHOPermission> = {
  "calendar.read": "calendar.read",
  "calendar.write": "calendar.write",
  "email.send": "email.send",
  "messages.send": "messages.send",
  "phone.call": "phone.call",
  "contacts.read": "contacts.read",
};

/**
 * Safe integration boundary. It verifies ECHO's permission before any
 * provider-specific API call is allowed. Provider OAuth/API work belongs
 * behind this boundary and is intentionally not faked here.
 */
export function authorizeIntegrationAction(
  permissions: PermissionState,
  provider: IntegrationProvider,
  action: IntegrationAction,
): IntegrationResult {
  const permission = ACTION_PERMISSION[action];

  if (!canExecutePermission(permissions, permission)) {
    return { ok: false, reason: "permission_denied", permission };
  }

  return {
    ok: true,
    provider,
    action,
    status: "ready",
  };
}

export const INTEGRATION_PROVIDERS = {
  google: {
    label: "Google",
    services: ["Google Calendar", "Gmail", "Google Contacts", "Google Messages / device bridge"],
  },
  microsoft: {
    label: "Microsoft",
    services: ["Outlook Calendar", "Outlook Mail", "Microsoft Contacts"],
  },
  apple: {
    label: "Apple",
    services: ["iCloud Calendar", "iCloud Mail", "iCloud Contacts"],
  },
  device: {
    label: "Device",
    services: ["Apple Phone / Messages", "Google Phone / Messages"],
  },
} as const;
