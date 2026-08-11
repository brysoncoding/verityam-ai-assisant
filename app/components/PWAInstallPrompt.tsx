"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type StoredChatMessage = {
  id?: number;
  role?: "user" | "assistant";
  content?: string;
};

const CHAT_HISTORY_KEY = "echo-chat-history-v1";
const CHAT_CONTEXT_LIMIT = 12;

function buildConversationContext(messages: StoredChatMessage[]): string {
  return messages
    .filter((message) => (message.role === "user" || message.role === "assistant") && typeof message.content === "string" && message.content.trim())
    .slice(-CHAT_CONTEXT_LIMIT)
    .map((message) => `${message.role === "user" ? "User" : "ECHO"}: ${message.content!.trim()}`)
    .join("\n");
}

export default function PWAInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
    setInstalled(standalone);

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setInstalled(true);
      setInstallEvent(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

      if (!url.includes("/api/chat") || !init?.body || typeof init.body !== "string") {
        return originalFetch(input, init);
      }

      try {
        const payload = JSON.parse(init.body) as { message?: unknown; memories?: unknown };
        if (typeof payload.message !== "string" || !payload.message.trim()) {
          return originalFetch(input, init);
        }

        const rawHistory = window.localStorage.getItem(CHAT_HISTORY_KEY);
        if (!rawHistory) return originalFetch(input, init);

        const parsed: unknown = JSON.parse(rawHistory);
        if (!Array.isArray(parsed)) return originalFetch(input, init);

        const context = buildConversationContext(parsed as StoredChatMessage[]);
        if (!context) return originalFetch(input, init);

        const existingMemories = Array.isArray(payload.memories) ? payload.memories : [];
        const contextMemory = {
          category: "OTHER",
          text: `Recent conversation context for the current chat. Use this only to understand references and follow-ups; do not treat it as a saved user memory.\n${context}`,
        };

        const nextPayload = {
          ...payload,
          memories: [...existingMemories, contextMemory],
        };

        return originalFetch(input, {
          ...init,
          body: JSON.stringify(nextPayload),
        });
      } catch {
        return originalFetch(input, init);
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  if (installed || dismissed || !installEvent) return null;

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setInstallEvent(null);
  }

  return (
    <aside className="pwaInstallPrompt" aria-label="Install ECHO">
      <div className="pwaInstallIcon">E</div>
      <div className="pwaInstallCopy">
        <strong>INSTALL ECHO</strong>
        <span>Add ECHO to your phone or computer for an app-like experience.</span>
      </div>
      <button type="button" className="pwaInstallButton" onClick={install}>INSTALL</button>
      <button type="button" className="pwaInstallDismiss" onClick={() => setDismissed(true)} aria-label="Dismiss install prompt">×</button>
      <style jsx>{`
        .pwaInstallPrompt{position:fixed;left:16px;right:16px;bottom:16px;z-index:9000;display:flex;align-items:center;gap:12px;padding:12px 14px;border:1px solid rgba(98,207,255,.24);border-radius:14px;background:rgba(5,10,13,.96);box-shadow:0 18px 45px rgba(0,0,0,.42);backdrop-filter:blur(12px)}
        .pwaInstallIcon{width:38px;height:38px;flex:0 0 38px;display:grid;place-items:center;border:1px solid rgba(98,207,255,.28);border-radius:10px;color:#e9fbff;font-weight:900;font-size:18px;box-shadow:0 0 18px rgba(98,207,255,.1)}
        .pwaInstallCopy{min-width:0;display:flex;flex-direction:column;gap:3px}.pwaInstallCopy strong{color:#e9fbff;font-size:11px;letter-spacing:.12em}.pwaInstallCopy span{color:rgba(210,235,245,.62);font-size:11px;line-height:1.35}
        .pwaInstallButton{margin-left:auto;border:1px solid rgba(98,207,255,.36);border-radius:9px;background:rgba(20,70,90,.35);color:#dff9ff;padding:9px 13px;font:inherit;font-size:10px;font-weight:800;letter-spacing:.1em;cursor:pointer}.pwaInstallButton:hover{background:rgba(30,95,120,.45)}
        .pwaInstallDismiss{border:0;background:transparent;color:rgba(210,235,245,.55);font-size:20px;cursor:pointer;padding:4px}.pwaInstallDismiss:hover{color:#e9fbff}
        @media(max-width:600px){.pwaInstallPrompt{left:10px;right:10px;bottom:10px;align-items:flex-start}.pwaInstallCopy span{font-size:10px}.pwaInstallButton{align-self:center;padding:8px 10px}}
      `}</style>
    </aside>
  );
}
