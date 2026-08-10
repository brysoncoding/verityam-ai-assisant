"use client";

import { useEffect, useRef, useState } from "react";
import Message from "./Message";

export type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
};

type ChatProps = {
  messages: ChatMessage[];
};

const CHAT_HISTORY_KEY = "echo-chat-history-v1";
const LAST_CHAT_KEY = "echo-last-chat-v1";
const WELCOME_MESSAGE: ChatMessage = {
  id: 1,
  role: "assistant",
  content: "Welcome. I am ECHO. How can I help you today?",
};

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Partial<ChatMessage>;
  return typeof message.id === "number" && (message.role === "user" || message.role === "assistant") && typeof message.content === "string";
}

export default function Chat({ messages }: ChatProps) {
  const [displayMessages, setDisplayMessages] = useState<ChatMessage[]>(messages);
  const [hasSavedChat, setHasSavedChat] = useState(false);
  const [hasPreviousChat, setHasPreviousChat] = useState(false);
  const modeRef = useRef<"current" | "continued" | "new">("current");
  const hydratedRef = useRef(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CHAT_HISTORY_KEY);
      const previousRaw = window.localStorage.getItem(LAST_CHAT_KEY);
      setHasPreviousChat(Boolean(previousRaw));
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(isChatMessage)) {
          setDisplayMessages(parsed);
          setHasSavedChat(true);
          modeRef.current = "continued";
        }
      }
    } catch {
      window.localStorage.removeItem(CHAT_HISTORY_KEY);
      setHasPreviousChat(false);
    } finally {
      hydratedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;

    if (modeRef.current === "new") {
      const hasNewParentMessage = messages.some((message) => message.id !== WELCOME_MESSAGE.id);
      if (hasNewParentMessage) {
        setDisplayMessages(messages);
        modeRef.current = "current";
      }
      return;
    }

    if (modeRef.current === "continued") {
      const existingIds = new Set(displayMessages.map((message) => message.id));
      const additions = messages.filter((message) => !existingIds.has(message.id));
      if (additions.length > 0) setDisplayMessages((current) => [...current, ...additions]);
      return;
    }

    setDisplayMessages(messages);
  }, [messages, displayMessages]);

  useEffect(() => {
    if (!hydratedRef.current || displayMessages.length <= 1) return;
    try {
      window.localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(displayMessages));
      setHasSavedChat(true);
    } catch {
      // Local storage may be unavailable; the chat still works normally.
    }
  }, [displayMessages]);

  function continueChat() {
    try {
      const raw = window.localStorage.getItem(LAST_CHAT_KEY) || window.localStorage.getItem(CHAT_HISTORY_KEY);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(isChatMessage)) {
        setDisplayMessages(parsed);
        setHasSavedChat(true);
        setHasPreviousChat(false);
        modeRef.current = "continued";
      }
    } catch {
      window.localStorage.removeItem(LAST_CHAT_KEY);
      window.localStorage.removeItem(CHAT_HISTORY_KEY);
      setHasSavedChat(false);
      setHasPreviousChat(false);
    }
  }

  function startNewChat() {
    try {
      const current = window.localStorage.getItem(CHAT_HISTORY_KEY);
      if (current) window.localStorage.setItem(LAST_CHAT_KEY, current);
    } catch {
      // Continue with an in-memory new chat if local storage is unavailable.
    }

    modeRef.current = "new";
    setDisplayMessages([WELCOME_MESSAGE]);
    try {
      window.localStorage.removeItem(CHAT_HISTORY_KEY);
    } catch {
      // Continue with an in-memory new chat if local storage is unavailable.
    }
    setHasSavedChat(false);
    setHasPreviousChat(Boolean(window.localStorage.getItem(LAST_CHAT_KEY)));
  }

  return (
    <section className="chatArea">
      <aside className="chatSidebar" aria-label="Chat controls">
        <button type="button" className="chatSidebarButton primary" onClick={startNewChat}>
          <span>＋</span>
          <strong>NEW CHAT</strong>
        </button>
        {(hasSavedChat || hasPreviousChat) && (
          <button type="button" className="chatSidebarButton" onClick={continueChat}>
            <span>↻</span>
            <strong>CONTINUE CHAT</strong>
          </button>
        )}
      </aside>
      <section className="chat">
        {displayMessages.map((message) => (
          <Message
            key={message.id}
            role={message.role}
            content={message.content}
          />
        ))}
      </section>
      <style jsx>{`
        .chatArea{display:grid;grid-template-columns:132px minmax(0,1fr);min-height:0;height:100%;gap:12px}
        .chatSidebar{display:flex;flex-direction:column;gap:8px;padding:10px 0}
        .chatSidebarButton{width:100%;min-height:72px;border:1px solid rgba(142,216,255,.14);border-radius:12px;background:rgba(8,14,18,.72);color:#bdefff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;cursor:pointer;font:inherit;transition:transform .18s ease,border-color .18s ease,background .18s ease}
        .chatSidebarButton:hover{transform:translateY(-1px);border-color:rgba(142,216,255,.38);background:rgba(12,24,30,.92)}
        .chatSidebarButton.primary{border-color:rgba(98,207,255,.34);box-shadow:0 0 18px rgba(98,207,255,.08)}
        .chatSidebarButton span{font-size:22px;line-height:1}
        .chatSidebarButton strong{font-size:10px;letter-spacing:.12em}
        .chat{min-width:0;min-height:0;overflow-y:auto}
        @media (max-width:700px){.chatArea{grid-template-columns:1fr;gap:6px}.chatSidebar{order:0;flex-direction:row;padding:4px 0}.chatSidebarButton{min-height:48px;flex:1;flex-direction:row;gap:7px}.chatSidebarButton span{font-size:18px}.chatSidebarButton strong{font-size:9px}.chat{order:1}}
      `}</style>
    </section>
  );
}