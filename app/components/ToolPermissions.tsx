"use client";

export default function ToolPermissions() {
  return (
    <style jsx global>{`
      .settingsPage > .dashboardCard,
      .settingsPage > .googleSettingsCard,
      .settingsPage > .settingsPermissions {
        display: none !important;
      }

      .settingsPage .hubPageTitle::after {
        content: "NO CONFIGURABLE OPTIONS";
        display: block;
        margin-top: 18px;
        padding: 18px;
        border: 1px solid rgba(98, 207, 255, 0.12);
        border-radius: 14px;
        background: rgba(8, 16, 21, 0.72);
        color: #66808e;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 2px;
        text-align: center;
      }
    `}</style>
  );
}
