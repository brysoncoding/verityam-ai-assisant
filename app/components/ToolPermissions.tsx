"use client";

import { useEffect, useState } from "react";

type ToolId = "messages" | "phone" | "contacts" | "email" | "calendar";

type Tool = {
  id: ToolId;
  icon: string;
  name: string;
  description: string;
  note: string;
  google?: boolean;
};

const STORAGE_KEY = "echo-tool-permissions";
const GOOGLE_CONNECTED_KEY = "echo-google-connected";

const TOOLS: Tool[] = [
  { id: "messages", icon: "💬", name: "MESSAGES", description: "Let ECHO prepare and send messages after you approve them.", note: "Native phone integration required." },
  { id: "phone", icon: "📞", name: "PHONE", description: "Let ECHO start calls after you approve the contact and number.", note: "Native phone integration required." },
  { id: "contacts", icon: "👤", name: "CONTACTS", description: "Let ECHO look up contacts so commands like “call Mom” can resolve safely.", note: "Google Contacts connection or native contacts permission required.", google: true },
  { id: "email", icon: "✉️", name: "EMAIL", description: "Let ECHO prepare and send outgoing mail through a connected account.", note: "Google OAuth connection available; other providers will be added separately.", google: true },
  { id: "calendar", icon: "📅", name: "CALENDAR", description: "Let ECHO view, create, update, and remove calendar events.", note: "Google Calendar connection available; other providers will be added separately.", google: true },
];

function loadPermissions(): Record<ToolId, boolean> {
  const defaults = { messages: false, phone: false, contacts: false, email: false, calendar: false };
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return { ...defaults, ...saved };
  } catch {
    return defaults;
  }
}

export default function ToolPermissions() {
  const [permissions, setPermissions] = useState<Record<ToolId, boolean>>({
    messages: false,
    phone: false,
    contacts: false,
    email: false,
    calendar: false,
  });
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleStatus, setGoogleStatus] = useState<string | null>(null);

  useEffect(() => {
    setPermissions(loadPermissions());
    setGoogleConnected(localStorage.getItem(GOOGLE_CONNECTED_KEY) === "true");

    const params = new URLSearchParams(window.location.search);
    const status = params.get("google");
    if (!status) return;

    setGoogleStatus(status);
    if (status === "connected") {
      localStorage.setItem(GOOGLE_CONNECTED_KEY, "true");
      setGoogleConnected(true);
    }

    params.delete("google");
    const cleanQuery = params.toString();
    const cleanUrl = `${window.location.pathname}${cleanQuery ? `?${cleanQuery}` : ""}`;
    window.history.replaceState({}, "", cleanUrl);
  }, []);

  function setTool(id: ToolId, enabled: boolean) {
    const next = { ...permissions, [id]: enabled };
    setPermissions(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function setAll(enabled: boolean) {
    const next = Object.fromEntries(TOOLS.map((tool) => [tool.id, enabled])) as Record<ToolId, boolean>;
    setPermissions(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function googleStatusMessage() {
    switch (googleStatus) {
      case "connected":
        return "Google connected successfully. ECHO can now use the Google services you approve below.";
      case "denied":
        return "Google authorization was cancelled. No Google connection was added.";
      case "invalid-state":
        return "Google authorization could not be verified. Please try connecting again.";
      case "missing-refresh-token":
        return "Google did not return the required long-term authorization. Please try connecting again.";
      case "configuration-error":
      case "error":
        return "Google could not be connected. Check the OAuth configuration and try again.";
      default:
        return null;
    }
  }

  const statusMessage = googleStatusMessage();

  return (
    <section className="toolPermissions">
      <div className="toolPermissionsHeader">
        <div>
          <span className="eyebrow">ECHO ACCESS CONTROL</span>
          <h2>CONNECTED TOOLS</h2>
          <p>Choose which services ECHO is allowed to use. You can revoke access at any time.</p>
        </div>
        <div className="toolPermissionActions">
          <button type="button" onClick={() => setAll(true)}>APPROVE ALL</button>
          <button type="button" onClick={() => setAll(false)} className="secondary">REVOKE ALL</button>
        </div>
      </div>

      <div className="toolPermissionNotice">
        <span>🔐</span>
        <div>
          <strong>YOUR APPROVAL COMES FIRST</strong>
          <p>Approval switches control what ECHO may request or use. OAuth services must also be connected to the provider before ECHO can access them.</p>
        </div>
      </div>

      {statusMessage && (
        <div className={`toolPermissionStatus ${googleStatus === "connected" ? "success" : "warning"}`} role="status">
          <strong>{googleStatus === "connected" ? "GOOGLE CONNECTED" : "GOOGLE STATUS"}</strong>
          <p>{statusMessage}</p>
        </div>
      )}

      <div className="toolPermissionList">
        {TOOLS.map((tool) => {
          const enabled = permissions[tool.id];
          const needsGoogleConnection = Boolean(tool.google);
          return (
            <div className={`toolPermissionItem ${enabled ? "enabled" : ""}`} key={tool.id}>
              <div className="toolPermissionIcon">{tool.icon}</div>
              <div className="toolPermissionInfo">
                <strong>{tool.name}</strong>
                <p>{tool.description}</p>
                <small>{tool.note}</small>
                {needsGoogleConnection && (
                  <div className="toolPermissionConnection">
                    <span className={googleConnected ? "connectedDot" : "disconnectedDot"} aria-hidden="true" />
                    <span>{googleConnected ? "GOOGLE CONNECTED" : "GOOGLE NOT CONNECTED"}</span>
                    {!googleConnected && (
                      <a href="/api/integrations/google/connect" className="connectGoogleButton">
                        CONNECT GOOGLE
                      </a>
                    )}
                  </div>
                )}
              </div>
              <button
                type="button"
                className={`toolPermissionToggle ${enabled ? "active" : ""}`}
                onClick={() => setTool(tool.id, !enabled)}
                aria-pressed={enabled}
              >
                {enabled ? "APPROVED" : "OFF"}
              </button>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .toolPermissions{max-width:920px;margin:0 auto;padding:28px;color:#d7e8ed}.toolPermissionsHeader{display:flex;justify-content:space-between;gap:20px;align-items:flex-start}.toolPermissions h2{margin-top:6px;color:#b7e5f7;letter-spacing:3px;font-size:22px}.toolPermissionsHeader p{margin-top:9px;color:#66808e;font-size:13px}.toolPermissionActions{display:flex;gap:8px}.toolPermissionActions button,.toolPermissionToggle{padding:10px 12px;border-radius:9px;border:0;background:#8ed8ff;color:#061016;font-size:9px;font-weight:800;letter-spacing:1px;cursor:pointer}.toolPermissionActions .secondary,.toolPermissionToggle:not(.active){background:#11171b;color:#8da4ad;border:1px solid rgba(120,190,255,.12)}.toolPermissionNotice{display:flex;gap:12px;margin-top:20px;padding:15px;border:1px solid rgba(120,190,255,.12);border-radius:13px;background:rgba(8,16,21,.75)}.toolPermissionNotice>span{font-size:20px}.toolPermissionNotice strong{color:#8ed8ff;font-size:10px;letter-spacing:2px}.toolPermissionNotice p{margin-top:6px;color:#66808e;font-size:11px;line-height:1.5}.toolPermissionStatus{margin-top:12px;padding:13px 15px;border-radius:12px;border:1px solid rgba(120,190,255,.14);background:rgba(8,16,21,.75)}.toolPermissionStatus.success{border-color:rgba(100,230,180,.25)}.toolPermissionStatus.warning{border-color:rgba(255,190,100,.25)}.toolPermissionStatus strong{color:#8ed8ff;font-size:9px;letter-spacing:2px}.toolPermissionStatus p{margin-top:5px;color:#9db4bd;font-size:11px;line-height:1.5}.toolPermissionList{display:grid;gap:10px;margin-top:14px}.toolPermissionItem{display:flex;align-items:center;gap:14px;padding:15px;border:1px solid rgba(120,190,255,.09);border-radius:13px;background:rgba(5,10,14,.78)}.toolPermissionItem.enabled{border-color:rgba(120,210,255,.22);box-shadow:inset 2px 0 #72d7ff}.toolPermissionIcon{width:38px;text-align:center;font-size:22px}.toolPermissionInfo{flex:1;min-width:0}.toolPermissionInfo strong{color:#9edfff;font-size:10px;letter-spacing:2px}.toolPermissionInfo p{margin-top:5px;color:#b0c6cd;font-size:12px}.toolPermissionInfo small{display:block;margin-top:5px;color:#58717c;font-size:9px}.toolPermissionConnection{display:flex;align-items:center;gap:7px;margin-top:9px;color:#718994;font-size:8px;font-weight:800;letter-spacing:1px}.connectedDot,.disconnectedDot{width:7px;height:7px;border-radius:50%;display:inline-block}.connectedDot{background:#76e2b5}.disconnectedDot{background:#667780}.connectGoogleButton{display:inline-flex;align-items:center;margin-left:5px;padding:6px 8px;border-radius:7px;background:#111b20;border:1px solid rgba(120,190,255,.18);color:#8ed8ff;text-decoration:none;font-size:8px;font-weight:800;letter-spacing:1px}.connectGoogleButton:hover{border-color:rgba(120,190,255,.4)}.toolPermissionToggle{min-width:82px}.toolPermissionToggle.active{background:#8ed8ff;color:#061016}@media(max-width:650px){.toolPermissions{padding:18px}.toolPermissionsHeader{flex-direction:column}.toolPermissionActions{width:100%}.toolPermissionActions button{flex:1}.toolPermissionItem{align-items:flex-start}.toolPermissionToggle{margin-left:auto}.toolPermissionInfo p{line-height:1.4}.toolPermissionConnection{flex-wrap:wrap}}
      `}</style>
    </section>
  );
}
