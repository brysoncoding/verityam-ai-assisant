"use client";

const DISABLED_TOOLS = [
  ["💬", "MESSAGES", "ECHO cannot send or access your messages."],
  ["📞", "PHONE", "ECHO cannot start or manage phone calls."],
  ["👤", "CONTACTS", "ECHO cannot access your contacts."],
  ["✉️", "EMAIL", "ECHO cannot read, write, or send email."],
  ["📅", "CALENDAR", "ECHO cannot view, create, update, or remove calendar events."],
] as const;

export default function ToolPermissions() {
  return (
    <section className="toolPermissions" id="echo-permissions" aria-labelledby="echo-access-title">
      <div className="toolPermissionsHeader">
        <div>
          <span className="eyebrow">ECHO ACCESS CONTROL</span>
          <h2 id="echo-access-title">PERSONAL SERVICES DISABLED</h2>
          <p>ECHO does not have access to your personal accounts, communications, contacts, calendar, or phone.</p>
        </div>
      </div>

      <div className="toolPermissionNotice">
        <span>🔒</span>
        <div>
          <strong>NO PERSONAL ACCOUNT ACCESS</strong>
          <p>These integrations have been disabled. There are no approval switches or Google connection controls here, and ECHO will reject these external actions even if an old browser permission remains stored.</p>
        </div>
      </div>

      <div className="toolPermissionList" id="echo-permission-options">
        {DISABLED_TOOLS.map(([icon, name, description]) => (
          <div className="toolPermissionItem disabled" key={name}>
            <div className="toolPermissionIcon">{icon}</div>
            <div className="toolPermissionInfo">
              <strong>{name}</strong>
              <p>{description}</p>
              <small>ACCESS DISABLED</small>
            </div>
            <span className="disabledBadge">OFF</span>
          </div>
        ))}
      </div>

      <a href="/" className="backToMainButton" aria-label="Return to the ECHO main page">↑ BACK TO MAIN</a>

      <style jsx>{`
        .toolPermissions{max-width:920px;margin:0 auto;padding:28px;color:#d7e8ed}.toolPermissionsHeader{display:flex;justify-content:space-between;gap:20px;align-items:flex-start}.toolPermissions h2{margin-top:6px;color:#b7e5f7;letter-spacing:3px;font-size:22px}.toolPermissionsHeader p{margin-top:9px;color:#66808e;font-size:13px;line-height:1.5}.toolPermissionNotice{display:flex;gap:12px;margin-top:20px;padding:17px;border:1px solid rgba(120,190,255,.12);border-radius:13px;background:rgba(8,16,21,.75)}.toolPermissionNotice>span{font-size:20px}.toolPermissionNotice strong{color:#8ed8ff;font-size:10px;letter-spacing:2px}.toolPermissionNotice p{margin-top:7px;color:#8099a3;font-size:11px;line-height:1.55}.toolPermissionList{display:grid;gap:10px;margin-top:14px}.toolPermissionItem{display:flex;align-items:center;gap:14px;padding:15px;border:1px solid rgba(120,190,255,.07);border-radius:13px;background:rgba(5,10,14,.78);opacity:.8}.toolPermissionIcon{width:38px;text-align:center;font-size:22px}.toolPermissionInfo{flex:1;min-width:0}.toolPermissionInfo strong{color:#9edfff;font-size:10px;letter-spacing:2px}.toolPermissionInfo p{margin-top:5px;color:#8da4ad;font-size:12px;line-height:1.45}.toolPermissionInfo small{display:block;margin-top:7px;color:#667b84;font-size:9px;font-weight:800;letter-spacing:1.5px}.disabledBadge{min-width:62px;padding:9px 10px;text-align:center;border-radius:9px;background:#11171b;border:1px solid rgba(255,255,255,.08);color:#70828a;font-size:9px;font-weight:800;letter-spacing:1.5px}.backToMainButton{display:block;width:max-content;margin:18px auto 0;padding:10px 12px;border-radius:9px;background:#8ed8ff;color:#061016;font-size:9px;font-weight:800;letter-spacing:1px;text-decoration:none}@media(max-width:650px){.toolPermissions{padding:18px}.toolPermissionItem{align-items:flex-start}.disabledBadge{margin-left:auto}}
      `}</style>
    </section>
  );
}
