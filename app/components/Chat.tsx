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

type ChatSession = {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: string;
};

const CHAT_HISTORY_KEY = "echo-chat-history-v1";
const LAST_CHAT_KEY = "echo-last-chat-v1";
const CHAT_SESSIONS_KEY = "echo-chat-sessions-v1";
const WELCOME_MESSAGE: ChatMessage = {
  id: 1,
  role: "assistant",
  content: "Welcome. I am ECHO. How can I help you today?",
};

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Partial<ChatMessage>;
  return (
    typeof message.id === "number" &&
    (message.role === "user" || message.role === "assistant") &&
    typeof message.content === "string"
  );
}

function isChatSession(value: unknown): value is ChatSession {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<ChatSession>;
  return (
    typeof session.id === "string" &&
    typeof session.title === "string" &&
    typeof session.updatedAt === "string" &&
    Array.isArray(session.messages) &&
    session.messages.length > 0 &&
    session.messages.every(isChatMessage)
  );
}

function getChatTitle(messages: ChatMessage[]) {
  const firstUserMessage = messages.find((message) => message.role === "user");
  if (!firstUserMessage) return "New ECHO Chat";
  const title = firstUserMessage.content.replace(/\s+/g, " ").trim();
  return title.length > 42 ? `${title.slice(0, 42)}…` : title;
}

function createSession(messages: ChatMessage[], id = crypto.randomUUID()): ChatSession {
  return {
    id,
    title: getChatTitle(messages),
    messages,
    updatedAt: new Date().toISOString(),
  };
}

export default function Chat({ messages }: ChatProps) {
  const [displayMessages, setDisplayMessages] = useState<ChatMessage[]>(messages);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [hasSavedChat, setHasSavedChat] = useState(false);
  const [hasPreviousChat, setHasPreviousChat] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const modeRef = useRef<"current" | "continued" | "new">("current");
  const hydratedRef = useRef(false);
  const activeSessionIdRef = useRef<string | null>(null);
  const baselineIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CHAT_SESSIONS_KEY);
      const currentRaw = window.localStorage.getItem(CHAT_HISTORY_KEY);
      const previousRaw = window.localStorage.getItem(LAST_CHAT_KEY);
      let loadedSessions: ChatSession[] = [];

      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          loadedSessions = parsed.filter(isChatSession);
        }
      }

      const legacyChats: ChatMessage[][] = [];
      for (const legacyRaw of [currentRaw, previousRaw]) {
        if (!legacyRaw) continue;
        try {
          const parsed: unknown = JSON.parse(legacyRaw);
          if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(isChatMessage)) {
            legacyChats.push(parsed);
          }
        } catch {
          // Ignore one malformed legacy chat and continue migrating others.
        }
      }

      for (const legacyChat of legacyChats) {
        const signature = JSON.stringify(legacyChat);
        const alreadySaved = loadedSessions.some((session) => JSON.stringify(session.messages) === signature);
        if (!alreadySaved && legacyChat.some((message) => message.role === "user")) {
          loadedSessions.push(createSession(legacyChat));
        }
      }

      loadedSessions.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
      setSessions(loadedSessions);
      setHasPreviousChat(loadedSessions.length > 0);

      if (currentRaw) {
        const parsed: unknown = JSON.parse(currentRaw);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(isChatMessage)) {
          setDisplayMessages(parsed);
          setHasSavedChat(parsed.length > 1);
          modeRef.current = "continued";
          const matching = loadedSessions.find((session) => JSON.stringify(session.messages) === JSON.stringify(parsed));
          activeSessionIdRef.current = matching?.id ?? null;
        }
      }

      // Legacy storage is migration-only. Keeping it around can resurrect a deleted chat.
      window.localStorage.removeItem(LAST_CHAT_KEY);
      window.localStorage.removeItem(CHAT_HISTORY_KEY);
    } catch {
      window.localStorage.removeItem(CHAT_HISTORY_KEY);
      window.localStorage.removeItem(LAST_CHAT_KEY);
      setSessions([]);
      setHasPreviousChat(false);
    } finally {
      hydratedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;

    if (modeRef.current === "new") {
      const additions = messages.filter((message) => !baselineIdsRef.current.has(message.id));
      if (additions.length > 0) {
        // Stay in the new session after the first response. If we switch back to
        // "current" here, the parent still contains the previous chat and would
        // overwrite this new session with the old conversation on the next render.
        setDisplayMessages((current) => {
          const existingIds = new Set(current.map((message) => message.id));
          return [...current, ...additions.filter((message) => !existingIds.has(message.id))];
        });
        modeRef.current = "continued";
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

      const currentSession = activeSessionIdRef.current
        ? sessions.find((session) => session.id === activeSessionIdRef.current)
        : undefined;
      const nextSession = createSession(displayMessages, currentSession?.id ?? crypto.randomUUID());
      activeSessionIdRef.current = nextSession.id;
      setSessions((current) => {
        const withoutCurrent = current.filter((session) => session.id !== nextSession.id);
        const next = [nextSession, ...withoutCurrent].sort(
          (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
        );
        window.localStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(next));
        return next;
      });
    } catch {
      // Local storage may be unavailable; the chat still works normally.
    }
  }, [displayMessages]);

  function continueChat() {
    const session = sessions[0];
    if (session) continueSession(session);
  }

  function continueSession(session: ChatSession) {
    setDisplayMessages(session.messages);
    activeSessionIdRef.current = session.id;
    baselineIdsRef.current = new Set(messages.map((message) => message.id));
    setHasSavedChat(true);
    setHasPreviousChat(true);
    modeRef.current = "continued";
    setHistoryOpen(false);
  }

  function startNewChat() {
    let nextSessionCount = sessions.length;

    try {
      if (displayMessages.length > 1) {
        const archived = createSession(displayMessages, activeSessionIdRef.current ?? crypto.randomUUID());
        const next = [archived, ...sessions.filter((session) => session.id !== archived.id)].sort(
          (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
        );
        nextSessionCount = next.length;
        setSessions(next);
        window.localStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(next));
      }

      // Do not write the old chat to LAST_CHAT_KEY. The session archive above is
      // the single source of truth and avoids resurrecting deleted conversations.
      window.localStorage.removeItem(LAST_CHAT_KEY);
      window.localStorage.removeItem(CHAT_HISTORY_KEY);
    } catch {
      // Continue with an in-memory new chat if local storage is unavailable.
    }

    baselineIdsRef.current = new Set(messages.map((message) => message.id));
    activeSessionIdRef.current = null;
    modeRef.current = "new";
    setDisplayMessages([WELCOME_MESSAGE]);
    setHasSavedChat(false);
    setHasPreviousChat(nextSessionCount > 0 || displayMessages.length > 1);
    setHistoryOpen(false);
  }

  function deleteSession(id: string) {
    const next = sessions.filter((session) => session.id !== id);
    setSessions(next);
    setHasPreviousChat(next.length > 0);
    try {
      window.localStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(next));
      window.localStorage.removeItem(LAST_CHAT_KEY);

      if (activeSessionIdRef.current === id) {
        activeSessionIdRef.current = null;
        window.localStorage.removeItem(CHAT_HISTORY_KEY);
        setDisplayMessages([WELCOME_MESSAGE]);
        setHasSavedChat(false);
        modeRef.current = "new";
        baselineIdsRef.current = new Set(messages.map((message) => message.id));
      }
    } catch {
      // Keep the in-memory list usable if storage is unavailable.
    }
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
        <button type="button" className="chatSidebarButton" onClick={() => setHistoryOpen(true)}>
          <span>▤</span>
          <strong>CHAT HISTORY</strong>
        </button>
      </aside>

      <section className="chat">
        {displayMessages.map((message) => (
          <Message key={message.id} role={message.role} content={message.content} />
        ))}
      </section>

      {historyOpen && (
        <div className="historyOverlay" role="dialog" aria-modal="true" aria-label="ECHO chat history">
          <div className="historyPanel">
            <div className="historyHeader">
              <div>
                <span className="historyEyebrow">ECHO HUB</span>
                <h2>CHAT HISTORY</h2>
                <p>All conversations saved locally on this device.</p>
              </div>
              <button type="button" className="historyClose" onClick={() => setHistoryOpen(false)} aria-label="Close chat history">×</button>
            </div>
            <div className="historyList">
              {sessions.length === 0 ? (
                <div className="historyEmpty">
                  <span>▤</span>
                  <strong>NO OLD CHATS</strong>
                  <p>Your conversations will appear here after you start chatting.</p>
                </div>
              ) : (
                sessions.map((session) => (
                  <div className="historyItem" key={session.id}>
                    <button type="button" className="historyContinue" onClick={() => continueSession(session)}>
                      <span className="historyTitle">{session.title}</span>
                      <span className="historyDate">{new Date(session.updatedAt).toLocaleString()}</span>
                    </button>
                    <button type="button" className="historyDelete" onClick={() => deleteSession(session.id)} title="Delete chat">×</button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .chatArea{position:relative;display:grid;grid-template-columns:132px minmax(0,1fr);min-height:0;height:100%;gap:12px}
        .chatSidebar{display:flex;flex-direction:column;gap:8px;padding:10px 0}
        .chatSidebarButton{width:100%;min-height:72px;border:1px solid rgba(142,216,255,.14);border-radius:12px;background:rgba(8,14,18,.72);color:#bdefff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;cursor:pointer;font:inherit;transition:transform .18s ease,border-color .18s ease,background .18s ease}
        .chatSidebarButton:hover{transform:translateY(-1px);border-color:rgba(142,216,255,.38);background:rgba(12,24,30,.92)}
        .chatSidebarButton.primary{border-color:rgba(98,207,255,.34);box-shadow:0 0 18px rgba(98,207,255,.08)}
        .chatSidebarButton span{font-size:22px;line-height:1}
        .chatSidebarButton strong{font-size:10px;letter-spacing:.12em}
        .chat{min-width:0;min-height:0;overflow-y:auto}
        .historyOverlay{position:absolute;inset:0;z-index:20;display:flex;justify-content:flex-start;padding:10px 0;background:rgba(2,5,7,.58);backdrop-filter:blur(5px)}
        .historyPanel{width:min(620px,calc(100% - 12px));max-height:100%;overflow:hidden;border:1px solid rgba(142,216,255,.18);border-radius:16px;background:rgba(7,13,17,.97);box-shadow:0 20px 60px rgba(0,0,0,.45);display:flex;flex-direction:column}
        .historyHeader{display:flex;justify-content:space-between;gap:16px;padding:20px;border-bottom:1px solid rgba(142,216,255,.1)}
        .historyEyebrow{font-size:9px;letter-spacing:.16em;color:#62cfff;font-weight:800}
        .historyHeader h2{margin:5px 0 4px;color:#e9fbff;font-size:22px;letter-spacing:.08em}
        .historyHeader p{margin:0;color:rgba(210,235,245,.58);font-size:12px}
        .historyClose{border:1px solid rgba(142,216,255,.14);background:rgba(8,14,18,.8);color:#bdefff;border-radius:10px;width:36px;height:36px;font-size:24px;cursor:pointer}
        .historyList{padding:12px;overflow-y:auto}
        .historyItem{display:flex;align-items:stretch;gap:8px;margin-bottom:8px}
        .historyContinue{flex:1;text-align:left;border:1px solid rgba(142,216,255,.1);border-radius:11px;background:rgba(12,21,27,.72);color:#e9fbff;padding:13px;cursor:pointer;display:flex;flex-direction:column;gap:5px}
        .historyContinue:hover{border-color:rgba(142,216,255,.3);background:rgba(18,32,40,.9)}
        .historyTitle{font-size:13px;font-weight:800}
        .historyDate{font-size:9px;letter-spacing:.06em;color:rgba(190,225,240,.48)}
        .historyDelete{width:42px;border:1px solid rgba(255,100,100,.12);border-radius:11px;background:rgba(30,10,10,.35);color:#ff9b9b;font-size:20px;cursor:pointer}
        .historyDelete:hover{background:rgba(80,20,20,.45);border-color:rgba(255,100,100,.3)}
        .historyEmpty{padding:50px 20px;text-align:center;color:rgba(210,235,245,.58)}
        .historyEmpty span{display:block;font-size:34px;margin-bottom:10px;color:#62cfff}
        .historyEmpty strong{display:block;color:#e9fbff;font-size:11px;letter-spacing:.14em}
        .historyEmpty p{font-size:12px;line-height:1.5}
        @media (max-width:700px){.chatArea{grid-template-columns:1fr;gap:6px}.chatSidebar{order:0;flex-direction:row;padding:4px 0}.chatSidebarButton{min-height:48px;flex:1;flex-direction:row;gap:7px}.chatSidebarButton span{font-size:18px}.chatSidebarButton strong{font-size:9px}.chat{order:1}.historyOverlay{padding:4px 0}.historyPanel{width:100%;border-radius:14px}.historyHeader{padding:15px}}
      `}</style>
    </section>
  );
}