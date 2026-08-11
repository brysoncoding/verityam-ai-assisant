"use client";

import { useEffect, useState } from "react";

type MobileTab = "CHAT" | "MEMORY" | "VOICE" | "SYSTEM" | "SETTINGS";

const tabs: { id: MobileTab; icon: string; label: string }[] = [
  { id: "CHAT", icon: "⌂", label: "CHAT" },
  { id: "MEMORY", icon: "◈", label: "MEMORY" },
  { id: "VOICE", icon: "◉", label: "VOICE" },
  { id: "SYSTEM", icon: "ϟ", label: "SYSTEM" },
  { id: "SETTINGS", icon: "⚙", label: "SETTINGS" },
];

function getHashTab(): MobileTab {
  const value = window.location.hash.replace(/^#/, "").toUpperCase();
  return tabs.some((tab) => tab.id === value) ? (value as MobileTab) : "CHAT";
}

function activateExistingTab(tab: MobileTab) {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("button"));
  const target = buttons.find((button) => button.textContent?.trim() === tab);
  if (target) {
    target.click();
    return true;
  }
  return false;
}

export default function MobileNavigation() {
  const [active, setActive] = useState<MobileTab>("CHAT");

  useEffect(() => {
    const sync = () => {
      const tab = getHashTab();
      setActive(tab);
      window.setTimeout(() => activateExistingTab(tab), 0);
    };

    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  function navigate(tab: MobileTab) {
    setActive(tab);
    const nextHash = `#${tab.toLowerCase()}`;
    if (window.location.hash !== nextHash) {
      window.history.pushState(null, "", `${window.location.pathname}${nextHash}`);
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    } else {
      activateExistingTab(tab);
    }
  }

  return (
    <nav className="mobileNavigation" aria-label="ECHO mobile navigation">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={active === tab.id ? "mobileNavItem active" : "mobileNavItem"}
          onClick={() => navigate(tab.id)}
          aria-label={tab.label}
          aria-current={active === tab.id ? "page" : undefined}
        >
          <span className="mobileNavIcon" aria-hidden="true">{tab.icon}</span>
          <span className="mobileNavLabel">{tab.label}</span>
        </button>
      ))}
      <style jsx>{`
        .mobileNavigation{display:none}
        @media (max-width:720px){
          .mobileNavigation{position:fixed;left:10px;right:10px;bottom:calc(10px + env(safe-area-inset-bottom));z-index:8500;display:grid;grid-template-columns:repeat(5,1fr);gap:4px;padding:7px;border:1px solid rgba(98,207,255,.2);border-radius:18px;background:rgba(5,10,13,.94);box-shadow:0 18px 45px rgba(0,0,0,.45),0 0 25px rgba(98,207,255,.06);backdrop-filter:blur(18px);padding-bottom:calc(7px + env(safe-area-inset-bottom))}
          .mobileNavItem{min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;border:0;border-radius:12px;background:transparent;color:rgba(210,235,245,.48);padding:7px 2px 6px;font:inherit;cursor:pointer;transition:background .15s ease,color .15s ease,transform .15s ease}
          .mobileNavItem:active{transform:scale(.96)}
          .mobileNavItem.active{background:rgba(98,207,255,.1);color:#e9fbff;box-shadow:inset 0 0 0 1px rgba(98,207,255,.12)}
          .mobileNavIcon{font-size:18px;line-height:1;font-weight:800;text-shadow:0 0 12px rgba(98,207,255,.35)}
          .mobileNavLabel{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:7px;font-weight:800;letter-spacing:.07em}
        }
      `}</style>
    </nav>
  );
}
