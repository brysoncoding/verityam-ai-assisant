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
  const target = Array.from(document.querySelectorAll<HTMLButtonElement>("button.hubMenuItem"))
    .find((button) => (button.textContent ?? "").toUpperCase().includes(tab));
  if (target) { target.click(); return true; }
  window.dispatchEvent(new CustomEvent("echo:navigate", { detail: { tab } }));
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
    <div className="mobileHubNav">
      <button type="button" className="mobileHubButton" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="mobile-echo-menu">
        <span className="mobileHubIcon">☰</span>
        <span className="mobileHubBrand"><strong>ECHO</strong><small>PERSONAL AI CORE</small></span>
        <span className="mobileHubStatus"><i /> ONLINE</span>
        <span className="mobileHubChevron">{open ? "×" : "⌄"}</span>
      </button>
      {open && (
        <div className="mobileHubMenu" id="mobile-echo-menu">
          <div className="mobileHubMenuHeader">
            <div><span>ECHO SYSTEM</span><strong>NAVIGATION</strong></div>
            <span className="mobileHubMenuState">{active}</span>
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
      <style jsx global>{`
        @media (max-width: 720px) {
          .hubNav { display: none !important; }
          .mobileHubNav { position: fixed; top: calc(8px + env(safe-area-inset-top)); left: 10px; right: 10px; z-index: 8500; pointer-events: none; }
          .mobileHubButton,.mobileHubMenu { pointer-events: auto; }
          .mobileHubButton { width:100%; min-height:52px; display:grid; grid-template-columns:28px 1fr auto 20px; align-items:center; gap:9px; padding:9px 13px; border:1px solid rgba(98,207,255,.24); border-radius:16px; background:linear-gradient(135deg,rgba(10,18,23,.98),rgba(5,10,13,.96)); color:#e9fbff; box-shadow:0 12px 36px rgba(0,0,0,.42),0 0 28px rgba(98,207,255,.08); backdrop-filter:blur(22px); font:inherit; cursor:pointer; transition:.18s ease; }
          .mobileHubButton:active { transform:scale(.985); }
          .mobileHubIcon { font-size:19px; color:#8ed8ff; }
          .mobileHubBrand { display:flex; flex-direction:column; align-items:flex-start; line-height:1.05; }
          .mobileHubBrand strong { font-size:12px; letter-spacing:.16em; }
          .mobileHubBrand small { margin-top:3px; color:#66808e; font-size:6px; font-weight:800; letter-spacing:.12em; }
          .mobileHubStatus { display:flex; align-items:center; gap:5px; color:#7fa4b2; font-size:7px; font-weight:900; letter-spacing:.1em; }
          .mobileHubStatus i { width:6px; height:6px; border-radius:50%; background:#72d9a1; box-shadow:0 0 9px rgba(114,217,161,.75); }
          .mobileHubChevron { color:#8ed8ff; font-size:18px; text-align:center; }
          .mobileHubMenu { margin-top:8px; overflow:hidden; border:1px solid rgba(98,207,255,.2); border-radius:17px; background:rgba(5,10,13,.98); box-shadow:0 22px 55px rgba(0,0,0,.58); backdrop-filter:blur(24px); animation:mobileHubIn .16s ease-out; }
          @keyframes mobileHubIn { from { opacity:0; transform:translateY(-6px) scale(.985); } to { opacity:1; transform:none; } }
          .mobileHubMenuHeader { display:flex; align-items:center; justify-content:space-between; padding:14px 15px 11px; border-bottom:1px solid rgba(98,207,255,.1); }
          .mobileHubMenuHeader div { display:flex; flex-direction:column; gap:3px; }
          .mobileHubMenuHeader span:first-child { color:#66808e; font-size:7px; font-weight:800; letter-spacing:.14em; }
          .mobileHubMenuHeader strong { color:#b7e5f7; font-size:12px; letter-spacing:.1em; }
          .mobileHubMenuState { color:#8ed8ff; font-size:7px; font-weight:900; letter-spacing:.1em; }
          .mobileHubItems { display:grid; gap:5px; padding:9px; }
          .mobileHubItem { width:100%; min-height:56px; display:grid; grid-template-columns:38px 1fr 18px; align-items:center; gap:9px; padding:8px 10px; border:1px solid transparent; border-radius:12px; background:rgba(255,255,255,.018); color:rgba(210,235,245,.62); text-align:left; font:inherit; cursor:pointer; transition:.16s ease; }
          .mobileHubItem:hover { background:rgba(98,207,255,.055); }
          .mobileHubItem.active { border-color:rgba(98,207,255,.18); background:rgba(98,207,255,.09); color:#e9fbff; box-shadow:inset 2px 0 0 rgba(142,216,255,.8); }
          .mobileHubItem:active { transform:scale(.985); }
          .mobileHubItemIcon { display:grid; place-items:center; width:34px; height:34px; border:1px solid rgba(98,207,255,.1); border-radius:10px; background:rgba(255,255,255,.025); font-size:17px; }
          .mobileHubItemText { min-width:0; display:flex; flex-direction:column; gap:3px; }
          .mobileHubItemText strong { font-size:9px; letter-spacing:.09em; }
          .mobileHubItemText small { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#66808e; font-size:8px; }
          .mobileHubArrow { color:#66808e; font-size:19px; text-align:center; }
          .chatPanel { min-height:100dvh; }
          .chatHeader { padding-top:74px !important; padding-bottom:12px !important; }
          .chatHeader h2 { font-size:22px !important; letter-spacing:.16em !important; }
          .chatHeader > div:first-child > span:last-child { font-size:8px !important; letter-spacing:.12em; }
          .onlineIndicator { padding:6px 8px !important; font-size:7px !important; }
          .tabContent { padding-bottom:max(12px,env(safe-area-inset-bottom)); }
        }
      `}</style>
    </div>
  );
}
