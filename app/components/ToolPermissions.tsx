"use client";

import { useEffect, useState } from "react";

type ToolId = "messages" | "phone";
type Tool = { id: ToolId; icon: string; name: string; description: string; note: string };

const STORAGE_KEY = "echo-tool-permissions";
const TOOLS: Tool[] = [
  { id: "messages", icon: "💬", name: "MESSAGES", description: "Control whether ECHO may prepare messages for you to review.", note: "Native phone integration required. Approval does not grant access by itself." },
  { id: "phone", icon: "📞", name: "PHONE", description: "Control whether ECHO may prepare a call request for you to review.", note: "Native phone integration required. Approval does not grant access by itself." },
];

function loadPermissions(): Record<ToolId, boolean> {
  const defaults = { messages: false, phone: false };
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return { ...defaults, messages: saved.messages === true, phone: saved.phone === true };
  } catch {
    return defaults;
  }
}

export default function ToolPermissions() {
  const [permissions, setPermissions] = useState<Record<ToolId, boolean>>({ messages: false, phone: false });

  useEffect(() => {
    setPermissions(loadPermissions());
  }, []);

  function setTool(id: ToolId, enabled: boolean) {
    const next = { ...permissions, [id]: enabled };
    setPermissions(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function setAll(enabled: boolean) {
    const next = { messages: enabled, phone: enabled };
    setPermissions(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function scrollToPermissions() {
    document.getElementById("echo-permission-options")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section className="toolPermissions" id="echo-permissions" aria-labelledby="echo-access-title">
      <div className="toolPermissionsHeader">
        <div>
          <span className="eyebrow">ECHO ACCESS CONTROL</span>
          <h2 id="echo-access-title">LOCAL PERMISSIONS</h2>
          <p>Control the non-Google assistant options available in ECHO.</p>
        </div>
        <div className="toolPermissionActions">
          <button type="button" onClick={() => setAll(true)}>APPROVE ALL</button>
          <button type="button" onClick={() => setAll(false)} className="secondary">REVOKE ALL</button>
        </div>
      </div>

      <button type="button" className="scrollPermissionsButton" onClick={scrollToPermissions} aria-label="Scroll to permission options">
        SCROLL TO PERMISSIONS ↓
      </button>

      <div className="toolPermissionNotice">
        <span>🔒</span>
        <div>
          <strong>GOOGLE FEATURES REMOVED</strong>
          <p>Google account, Calendar, Gmail, and Google Contacts options are no longer shown here. These local switches only store your ECHO preference; they do not connect an account or grant device access.</p>
        </div>
      </div>

      <div className="toolPermissionList" id="echo-permission-options">
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

      <style jsx global>{`
        /* Restore the useful Settings controls while keeping every Google control hidden. */
        .settingsPage > .dashboardCard { display: block !important; }
        .settingsPage > .googleSettingsCard { display: none !important; }
        .settingsPage > .settingsPermissions { display: block !important; }
        .settingsPage > .settingsPermissions > .toolPermissions { display: block !important; }

        .toolPermissions{max-width:920px;margin:0 auto;padding:28px 0;color:#d7e8ed}
        .toolPermissionsHeader{display:flex;justify-content:space-between;gap:20px;align-items:flex-start}
        .toolPermissions h2{margin-top:6px;color:#b7e5f7;letter-spacing:3px;font-size:22px}
        .toolPermissionsHeader p{margin-top:9px;color:#66808e;font-size:13px;line-height:1.5}
        .toolPermissionActions{display:flex;gap:8px}
        .toolPermissionActions button,.toolPermissionToggle,.scrollPermissionsButton{padding:10px 12px;border-radius:9px;border:0;background:#8ed8ff;color:#061016;font-size:9px;font-weight:800;letter-spacing:1px;cursor:pointer}
        .toolPermissionActions .secondary,.toolPermissionToggle:not(.active){background:#11171b;color:#8da4ad;border:1px solid rgba(120,190,255,.12)}
        .scrollPermissionsButton{display:block;margin:16px auto 0;box-shadow:0 5px 22px rgba(0,0,0,.3)}
        .toolPermissionNotice{display:flex;gap:12px;margin-top:20px;padding:17px;border:1px solid rgba(120,190,255,.12);border-radius:13px;background:rgba(8,16,21,.75)}
        .toolPermissionNotice>span{font-size:20px}
        .toolPermissionNotice strong{color:#8ed8ff;font-size:10px;letter-spacing:2px}
        .toolPermissionNotice p{margin-top:7px;color:#8099a3;font-size:11px;line-height:1.55}
        .toolPermissionList{display:grid;gap:10px;margin-top:14px;scroll-margin-top:20px}
        .toolPermissionItem{display:flex;align-items:center;gap:14px;padding:15px;border:1px solid rgba(120,190,255,.09);border-radius:13px;background:rgba(5,10,14,.78)}
        .toolPermissionItem.enabled{border-color:rgba(120,210,255,.22);box-shadow:inset 2px 0 #72d7ff}
        .toolPermissionIcon{width:38px;text-align:center;font-size:22px}
        .toolPermissionInfo{flex:1;min-width:0}
        .toolPermissionInfo strong{color:#9edfff;font-size:10px;letter-spacing:2px}
        .toolPermissionInfo p{margin-top:5px;color:#b0c6cd;font-size:12px;line-height:1.45}
        .toolPermissionInfo small{display:block;margin-top:6px;color:#58717c;font-size:9px;line-height:1.4}
        .toolPermissionToggle{min-width:82px}
        .toolPermissionToggle.active{background:#8ed8ff;color:#061016}
        @media(max-width:650px){.toolPermissions{padding:22px 0}.toolPermissionsHeader{flex-direction:column}.toolPermissionActions{width:100%}.toolPermissionActions button{flex:1}.toolPermissionItem{align-items:flex-start}.toolPermissionToggle{margin-left:auto}.toolPermissionInfo p{line-height:1.4}}
      `}</style>
    </section>
  );
}
