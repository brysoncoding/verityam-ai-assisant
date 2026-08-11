"use client";

import { useEffect, useState } from "react";

type MobileTab = "CHAT" | "MEMORY" | "VOICE" | "SYSTEM" | "SETTINGS";

const tabs: { id: MobileTab; icon: string; label: string; description: string }[] = [
  { id: "CHAT", icon: "💬", label: "CHAT", description: "Return to ECHO" },
  { id: "MEMORY", icon: "🧠", label: "MEMORY", description: "Manage saved context" },
  { id: "VOICE", icon: "🔊", label: "VOICE", description: "Speech controls" },
  { id: "SYSTEM", icon: "⚡", label: "SYSTEM", description: "Core status" },
  { id: "SETTINGS", icon: "⚙️", label: "SETTINGS", description: "Accounts & permissions" },
];

function activateExistingTab(tab: MobileTab) {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("button"));
  const target = buttons.find((button) => {
    const text = button.textContent?.trim() ?? "";
    return text === tab || text.startsWith(tab);
  });
  if (target) {
    target.click();
    return true;
  }
  return false;
}

export default function MobileNavigation() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<MobileTab>("CHAT");

  useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash.replace(/^#/, "").toUpperCase() as MobileTab;
      if (tabs.some((tab) => tab.id === hash)) setActive(hash);
    };
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  function navigate(tab: MobileTab) {
    setActive(tab);
    setOpen(false);
    activateExistingTab(tab);
  }

  return (
    <>
      <div className="mobileHubNav">
        <button type="button" className="mobileHubButton" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="mobile-echo-menu">
          <span className="mobileHubIcon">☰</span>
          <span className="mobileHubTitle">ECHO</span>
          <span className="mobileHubCurrent">{active}</span>
          <span className="mobileHubChevron">{open ? "×" : "⌄"}</span>
        </button>
        {open && (
          <div className="mobileHubMenu" id="mobile-echo-menu">
            <div className="mobileHubMenuHeader">
              <div><span>ECHO SYSTEM</span><strong>NAVIGATION</strong></div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close navigation">×</button>
            </div>
            <div className="mobileHubItems">
              {tabs.map((tab) => (
                <button key={tab.id} type="button" className={active === tab.id ? "mobileHubItem active" : "mobileHubItem"} onClick={() => navigate(tab.id)}>
                  <span className="mobileHubItemIcon" aria-hidden="true">{tab.icon}</span>
                  <span className="mobileHubItemText"><strong>{tab.label}</strong><small>{tab.description}</small></span>
                  <span className="mobileHubArrow" aria-hidden="true">›</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @media (max-width: 720px) {
          /* Replace the old in-page Hub with the compact mobile dropdown. */
          .hubNav { display: none !important; }

          .mobileHubNav {
            position: fixed;
            top: calc(8px + env(safe-area-inset-top));
            left: 10px;
            right: 10px;
            z-index: 8500;
            pointer-events: none;
          }
          .mobileHubButton,.mobileHubMenu { pointer-events: auto; }
          .mobileHubButton {
            width: 100%; min-height: 44px; display: grid;
            grid-template-columns: 24px auto 1fr 20px; align-items: center; gap: 8px;
            padding: 9px 12px; border: 1px solid rgba(98,207,255,.22); border-radius: 14px;
            background: rgba(5,10,13,.95); color: #e9fbff;
            box-shadow: 0 12px 32px rgba(0,0,0,.35),0 0 22px rgba(98,207,255,.06);
            backdrop-filter: blur(18px); font: inherit; cursor: pointer;
          }
          .mobileHubIcon { font-size: 18px; line-height: 1; }
          .mobileHubTitle { font-size: 11px; font-weight: 900; letter-spacing: .12em; }
          .mobileHubCurrent { justify-self: end; color: rgba(210,235,245,.55); font-size: 8px; font-weight: 800; letter-spacing: .08em; }
          .mobileHubChevron { font-size: 18px; color: #8ed8ff; text-align: center; }
          .mobileHubMenu {
            margin-top: 7px; overflow: hidden; border: 1px solid rgba(98,207,255,.2); border-radius: 15px;
            background: rgba(5,10,13,.98); box-shadow: 0 20px 48px rgba(0,0,0,.5); backdrop-filter: blur(20px);
          }
          .mobileHubMenuHeader {
            display: flex; align-items: center; justify-content: space-between;
            padding: 12px 13px 9px; border-bottom: 1px solid rgba(98,207,255,.1);
          }
          .mobileHubMenuHeader div { display: flex; flex-direction: column; gap: 2px; }
          .mobileHubMenuHeader span { color: #66808e; font-size: 7px; font-weight: 800; letter-spacing: .13em; }
          .mobileHubMenuHeader strong { color: #b7e5f7; font-size: 11px; letter-spacing: .08em; }
          .mobileHubMenuHeader button { border: 0; background: transparent; color: #8ed8ff; font-size: 21px; cursor: pointer; padding: 2px 5px; }
          .mobileHubItems { display: grid; gap: 5px; padding: 8px; }
          .mobileHubItem {
            width: 100%; min-height: 52px; display: grid; grid-template-columns: 34px 1fr 18px;
            align-items: center; gap: 8px; padding: 7px 9px; border: 1px solid transparent;
            border-radius: 11px; background: rgba(255,255,255,.015); color: rgba(210,235,245,.58);
            text-align: left; font: inherit; cursor: pointer;
          }
          .mobileHubItem.active { border-color: rgba(98,207,255,.14); background: rgba(98,207,255,.08); color: #e9fbff; }
          .mobileHubItem:active { transform: scale(.99); }
          .mobileHubItemIcon { display: grid; place-items: center; font-size: 18px; }
          .mobileHubItemText { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
          .mobileHubItemText strong { font-size: 9px; letter-spacing: .08em; }
          .mobileHubItemText small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #66808e; font-size: 8px; }
          .mobileHubArrow { color: #66808e; font-size: 18px; text-align: center; }

          /* Keep the navigation above the content without covering the message composer. */
          .chatPanel { min-height: 100dvh; }
          .chatHeader { padding-top: 64px !important; }
          .tabContent { padding-bottom: env(safe-area-inset-bottom); }
        }
      `}</style>
    </>
  );
}
