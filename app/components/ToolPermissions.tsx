"use client";

export default function ToolPermissions() {
  return (
    <section className="toolPermissions" id="echo-permissions" aria-labelledby="echo-access-title">
      <div className="toolPermissionsHeader">
        <div>
          <span className="eyebrow">ECHO CONFIGURATION</span>
          <h2 id="echo-access-title">SETTINGS</h2>
          <p>Manage ECHO configuration and preferences.</p>
        </div>
      </div>

      <div className="toolPermissionNotice" role="status">
        <span>⚙️</span>
        <div>
          <strong>NO CONNECTED SERVICES</strong>
          <p>External account and device-control options have been removed from ECHO Settings.</p>
        </div>
      </div>

      <div className="toolPermissionEmpty">
        NO CONFIGURABLE OPTIONS
      </div>

      <style jsx global>{`
        .settingsPage > .dashboardCard { display: block !important; }
        .settingsPage > .googleSettingsCard { display: none !important; }
        .settingsPage > .settingsPermissions { display: block !important; }
        .settingsPage > .settingsPermissions > .toolPermissions { display: block !important; }

        .toolPermissions{max-width:920px;margin:0 auto;padding:28px 0;color:#d7e8ed}
        .toolPermissionsHeader{display:flex;justify-content:space-between;gap:20px;align-items:flex-start}
        .toolPermissions h2{margin-top:6px;color:#b7e5f7;letter-spacing:3px;font-size:22px}
        .toolPermissionsHeader p{margin-top:9px;color:#66808e;font-size:13px;line-height:1.5}
        .toolPermissionNotice{display:flex;gap:12px;margin-top:20px;padding:17px;border:1px solid rgba(120,190,255,.12);border-radius:13px;background:rgba(8,16,21,.75)}
        .toolPermissionNotice>span{font-size:20px}
        .toolPermissionNotice strong{color:#8ed8ff;font-size:10px;letter-spacing:2px}
        .toolPermissionNotice p{margin-top:7px;color:#8099a3;font-size:11px;line-height:1.55}
        .toolPermissionEmpty{margin-top:14px;padding:24px 18px;border:1px solid rgba(120,190,255,.12);border-radius:13px;background:rgba(5,10,14,.55);text-align:center;color:#718994;font-size:11px;font-weight:800;letter-spacing:3px}
      `}</style>
    </section>
  );
}
