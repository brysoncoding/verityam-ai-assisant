"use client";

import { useEffect, useState } from "react";

type ToolId = "messages" | "phone" | "contacts" | "email" | "calendar";

type Tool = {
  id: ToolId;
  icon: string;
  name: string;
  description: string;
  note: string;
};

const STORAGE_KEY = "echo-tool-permissions";

const TOOLS: Tool[] = [
  { id: "messages", icon: "💬", name: "MESSAGES", description: "Let ECHO prepare and send messages after you approve them.", note: "Native phone integration required." },
  { id: "phone", icon: "📞", name: "PHONE", description: "Let ECHO start calls after you approve the contact and number.", note: "Native phone integration required." },
  { id: "contacts", icon: "👤", name: "CONTACTS", description: "Let ECHO look up contacts so commands like “call Mom” can resolve safely.", note: "Native contacts permission required." },
  { id: "email", icon: "✉️", name: "EMAIL", description: "Let ECHO read and summarize email or prepare outgoing mail.", note: "OAuth connection required." },
  { id: "calendar", icon: "📅", name: "CALENDAR", description: "Let ECHO view, create, update, and remove calendar events.", note: "Calendar OAuth/native permission required." },
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

  useEffect(() => setPermissions(loadPermissions()), []);

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
          <p>These switches record ECHO&apos;s permission preference. Actual access to phone, contacts, messages, email, and calendar still requires the platform&apos;s native permission or OAuth connection when that integration is available.</p>
        </div>
      </div>

      <div className="toolPermissionList">
        {TOOLS.map((tool) => {
          const enabled = permissions[tool.id];
          return (
            <div className={`toolPermissionItem ${enabled ? "enabled" : ""}`} key={tool.id}>
              <div className="toolPermissionIcon">{tool.icon}</div>
              <div className="toolPermissionInfo">
                <strong>{tool.name}</strong>
                <p>{tool.description}</p>
                <small>{tool.note}</small>
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
        .toolPermissions{max-width:920px;margin:0 auto;padding:28px;color:#d7e8ed}.toolPermissionsHeader{display:flex;justify-content:space-between;gap:20px;align-items:flex-start}.toolPermissions h2{margin-top:6px;color:#b7e5f7;letter-spacing:3px;font-size:22px}.toolPermissionsHeader p{margin-top:9px;color:#66808e;font-size:13px}.toolPermissionActions{display:flex;gap:8px}.toolPermissionActions button,.toolPermissionToggle{padding:10px 12px;border-radius:9px;border:0;background:#8ed8ff;color:#061016;font-size:9px;font-weight:800;letter-spacing:1px;cursor:pointer}.toolPermissionActions .secondary,.toolPermissionToggle:not(.active){background:#11171b;color:#8da4ad;border:1px solid rgba(120,190,255,.12)}.toolPermissionNotice{display:flex;gap:12px;margin-top:20px;padding:15px;border:1px solid rgba(120,190,255,.12);border-radius:13px;background:rgba(8,16,21,.75)}.toolPermissionNotice>span{font-size:20px}.toolPermissionNotice strong{color:#8ed8ff;font-size:10px;letter-spacing:2px}.toolPermissionNotice p{margin-top:6px;color:#66808e;font-size:11px;line-height:1.5}.toolPermissionList{display:grid;gap:10px;margin-top:14px}.toolPermissionItem{display:flex;align-items:center;gap:14px;padding:15px;border:1px solid rgba(120,190,255,.09);border-radius:13px;background:rgba(5,10,14,.78)}.toolPermissionItem.enabled{border-color:rgba(120,210,255,.22);box-shadow:inset 2px 0 #72d7ff}.toolPermissionIcon{width:38px;text-align:center;font-size:22px}.toolPermissionInfo{flex:1;min-width:0}.toolPermissionInfo strong{color:#9edfff;font-size:10px;letter-spacing:2px}.toolPermissionInfo p{margin-top:5px;color:#b0c6cd;font-size:12px}.toolPermissionInfo small{display:block;margin-top:5px;color:#58717c;font-size:9px}.toolPermissionToggle{min-width:82px}.toolPermissionToggle.active{background:#8ed8ff;color:#061016}@media(max-width:650px){.toolPermissions{padding:18px}.toolPermissionsHeader{flex-direction:column}.toolPermissionActions{width:100%}.toolPermissionActions button{flex:1}.toolPermissionItem{align-items:flex-start}.toolPermissionToggle{margin-left:auto}.toolPermissionInfo p{line-height:1.4}}
      `}</style>
    </section>
  );
}
