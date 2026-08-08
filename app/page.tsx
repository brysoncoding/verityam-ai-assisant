"use client";

import { useEffect, useRef, useState } from "react";
import Header from "./components/Header";
import Chat, { ChatMessage } from "./components/Chat";
import InputBar from "./components/InputBar";
import BootScreen from "./components/BootScreen";
import VerityAvatar from "./components/VerityAvatar";

type Tab = "CHAT" | "MEMORY" | "VOICE" | "SYSTEM" | "SETTINGS";

type Memory = {
  id: number;
  text: string;
  createdAt: string;
};

const MEMORY_KEY = "echo-memories";

export default function Home() {
  const [message, setMessage] = useState("");
  const [thinking, setThinking] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [started, setStarted] = useState(false);

  const [activeTab, setActiveTab] = useState<Tab>("CHAT");

  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [voiceName, setVoiceName] = useState("");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  const [memoryInput, setMemoryInput] = useState("");
  const [memories, setMemories] = useState<Memory[]>([]);

  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: "assistant",
      content: "Welcome. I am ECHO. How can I help you today?",
    },
  ]);

  /*
   * LOAD SAVED SETTINGS + MEMORY
   */
  useEffect(() => {
    const savedVoice = localStorage.getItem("echo-voice-enabled");
    const savedVoiceName = localStorage.getItem("echo-voice-name");
    const savedMemories = localStorage.getItem(MEMORY_KEY);

    if (savedVoice !== null) {
      setVoiceEnabled(savedVoice === "true");
    }

    if (savedVoiceName) {
      setVoiceName(savedVoiceName);
    }

    if (savedMemories) {
      try {
        const parsed = JSON.parse(savedMemories);

        if (Array.isArray(parsed)) {
          setMemories(parsed);
        }
      } catch {
        localStorage.removeItem(MEMORY_KEY);
      }
    }

    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();

      setVoices(available);

      if (!savedVoiceName && available.length > 0) {
        setVoiceName(available[0].name);
      }
    };

    loadVoices();

    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.cancel();
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  /*
   * SAVE MEMORY
   */
  function addMemory(text: string = memoryInput) {
  const trimmedText = text.trim();

  if (!trimmedText) {
    return false;
  }
function removeMemoryByText(text: string) {
  const searchText = text
    .trim()
    .toLowerCase();

  const updatedMemories = memories.filter(
    (memory) =>
      !memory.text
        .toLowerCase()
        .includes(searchText)
  );

  if (
    updatedMemories.length === memories.length
  ) {
    return false;
  }

  setMemories(updatedMemories);

  localStorage.setItem(
    MEMORY_KEY,
    JSON.stringify(updatedMemories)
  );

  return true;
}

function getMemoryRecall() {
  if (memories.length === 0) {
    return "I don't have any saved memories about you yet.";
  }

  return `Here is what I currently remember:\n\n${memories
    .map(
      (memory) => `• ${memory.text}`
    )
    .join("\n")}`;
}

function handleMemoryCommand(
  text: string
): string | null {
  const normalized = text
    .trim()
    .toLowerCase();

  /*
   * REMEMBER
   */
  if (
    normalized.startsWith("remember that ") ||
    normalized.startsWith("remember ")
  ) {
    let memoryText = text.trim();

    if (
      normalized.startsWith("remember that ")
    ) {
      memoryText = memoryText.substring(
        "remember that ".length
      );
    } else {
      memoryText = memoryText.substring(
        "remember ".length
      );
    }

    if (addMemory(memoryText)) {
      return `Got it. I'll remember that: "${memoryText}"`;
    }

    return "I need something to remember.";
  }

  /*
   * FORGET
   */
  if (
    normalized.startsWith("forget that ") ||
    normalized.startsWith("forget ")
  ) {
    let memoryText = text.trim();

    if (
      normalized.startsWith("forget that ")
    ) {
      memoryText = memoryText.substring(
        "forget that ".length
      );
    } else {
      memoryText = memoryText.substring(
        "forget ".length
      );
    }

    if (removeMemoryByText(memoryText)) {
      return `Okay. I've forgotten that memory.`;
    }

    return "I couldn't find a saved memory matching that.";
  }

  /*
   * RECALL
   */
  if (
    normalized.includes(
      "what do you remember"
    ) ||
    normalized.includes(
      "what can you remember"
    ) ||
    normalized.includes(
      "show my memories"
    ) ||
    normalized.includes(
      "what are my memories"
    )
  ) {
    return getMemoryRecall();
  }

  return null;
}
  const newMemory: Memory = {
    id: Date.now(),
    text: trimmedText,
    createdAt: new Date().toISOString(),
  };

  const updatedMemories = [
    newMemory,
    ...memories,
  ];

  setMemories(updatedMemories);

  localStorage.setItem(
    MEMORY_KEY,
    JSON.stringify(updatedMemories)
  );

  setMemoryInput("");

  return true;
}

    const newMemory: Memory = {
      id: Date.now(),
      text,
      createdAt: new Date().toISOString(),
    };

    const updatedMemories = [newMemory, ...memories];

    setMemories(updatedMemories);

    localStorage.setItem(
      MEMORY_KEY,
      JSON.stringify(updatedMemories)
    );

    setMemoryInput("");
  }

  /*
   * DELETE ONE MEMORY
   */
  function deleteMemory(id: number) {
    const updatedMemories = memories.filter(
      (memory) => memory.id !== id
    );

    setMemories(updatedMemories);

    localStorage.setItem(
      MEMORY_KEY,
      JSON.stringify(updatedMemories)
    );
  }

  /*
   * CLEAR ALL MEMORY
   */
  function clearMemories() {
    if (memories.length === 0) {
      return;
    }

    const confirmed = window.confirm(
      "Clear all ECHO memories?"
    );

    if (!confirmed) {
      return;
    }

    setMemories([]);

    localStorage.removeItem(MEMORY_KEY);
  }

  /*
   * VOICE
   */
  function toggleVoice() {
    const next = !voiceEnabled;

    setVoiceEnabled(next);

    localStorage.setItem(
      "echo-voice-enabled",
      String(next)
    );

    if (!next) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    }
  }

  function changeVoice(name: string) {
    setVoiceName(name);

    localStorage.setItem(
      "echo-voice-name",
      name
    );
  }

  function speak(text: string) {
    if (
      !voiceEnabled ||
      !("speechSynthesis" in window)
    ) {
      return;
    }

    window.speechSynthesis.cancel();

    const utterance =
      new SpeechSynthesisUtterance(text);

    const selectedVoice = voices.find(
      (voice) => voice.name === voiceName
    );

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => {
      setSpeaking(true);
    };

    utterance.onend = () => {
      setSpeaking(false);
    };

    utterance.onerror = () => {
      setSpeaking(false);
    };

    speechRef.current = utterance;

    window.speechSynthesis.speak(utterance);
  }

  /*
   * CHAT
   */
  async function sendMessage() {
    if (!message.trim() || thinking) {
      return;
    }

    const currentMessage = message.trim();

    setThinking(true);
    setSpeaking(false);
    setListening(false);
    setMessage("");

    const userMessage: ChatMessage = {
      id: Date.now(),
      role: "user",
      content: currentMessage,
    };

    setMessages((prev) => [
      ...prev,
      userMessage,
    ]);

    try {
      /*
       * Send ECHO's saved memories with the message.
       */
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: currentMessage,
          memories,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.reply ||
            "Unable to process request"
        );
      }

      const assistantMessage: ChatMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content: data.reply,
      };

      setMessages((prev) => [
        ...prev,
        assistantMessage,
      ]);

      setThinking(false);

      speak(data.reply);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unable to process request";

      setThinking(false);
      setSpeaking(false);

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: `ERROR: ${errorMessage}`,
        },
      ]);
    }
  }

  /*
   * TAB CONTENT
   */
  function renderTabContent() {
    /*
     * CHAT
     */
    if (activeTab === "CHAT") {
      return (
        <>
          <Chat messages={messages} />

          <InputBar
            message={message}
            setMessage={setMessage}
            onSend={sendMessage}
            listening={listening}
            setListening={setListening}
          />
        </>
      );
    }

    /*
     * MEMORY
     */
    if (activeTab === "MEMORY") {
      return (
        <div className="dashboardPage">
          <h2>MEMORY</h2>

          <p>
            Memories are stored locally on this
            device and provided to ECHO during
            conversations.
          </p>

          <div className="dashboardCard">
            <div className="memoryHeader">
              <strong>
                SAVED MEMORIES
              </strong>

              <span>
                {memories.length}{" "}
                {memories.length === 1
                  ? "MEMORY"
                  : "MEMORIES"}
              </span>
            </div>

            <div className="memoryAdd">
              <input
                type="text"
                value={memoryInput}
                onChange={(event) =>
                  setMemoryInput(
                    event.target.value
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter"
                  ) {
                    addMemory();
                  }
                }}
                placeholder="Tell ECHO something to remember..."
              />

              <button
                type="button"
                onClick={addMemory}
              >
                + ADD
              </button>
            </div>

            {memories.length === 0 ? (
              <div className="memoryEmpty">
                <span>🧠</span>

                <strong>
                  NO MEMORIES YET
                </strong>

                <p>
                  Add something ECHO should
                  remember about you.
                </p>
              </div>
            ) : (
              <div className="memoryList">
                {memories.map((memory) => (
                  <div
                    className="memoryItem"
                    key={memory.id}
                  >
                    <div className="memoryText">
                      <span>MEMORY</span>

                      <p>{memory.text}</p>
                    </div>

                    <button
                      type="button"
                      className="memoryDelete"
                      onClick={() =>
                        deleteMemory(
                          memory.id
                        )
                      }
                      title="Delete memory"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {memories.length > 0 && (
              <button
                type="button"
                className="clearMemoryButton"
                onClick={clearMemories}
              >
                CLEAR ALL MEMORIES
              </button>
            )}
          </div>
        </div>
      );
    }

    /*
     * VOICE
     */
    if (activeTab === "VOICE") {
      return (
        <div className="dashboardPage">
          <h2>VOICE CONTROL</h2>

          <p>
            Control how ECHO speaks.
          </p>

          <div className="dashboardCard">
            <div className="controlRow">
              <span>
                VOICE OUTPUT
              </span>

              <button
                className={
                  voiceEnabled
                    ? "voiceToggle active"
                    : "voiceToggle"
                }
                onClick={toggleVoice}
                type="button"
              >
                {voiceEnabled
                  ? "ON"
                  : "OFF"}
              </button>
            </div>

            {voiceEnabled &&
              voices.length > 0 && (
                <select
                  value={voiceName}
                  onChange={(event) =>
                    changeVoice(
                      event.target.value
                    )
                  }
                  className="voiceSelect"
                >
                  {voices.map(
                    (voice) => (
                      <option
                        key={`${voice.name}-${voice.lang}`}
                        value={voice.name}
                      >
                        {voice.name} (
                        {voice.lang})
                      </option>
                    )
                  )}
                </select>
              )}
          </div>
        </div>
      );
    }

    /*
     * SYSTEM
     */
    if (activeTab === "SYSTEM") {
      return (
        <div className="dashboardPage">
          <h2>SYSTEM</h2>

          <div className="dashboardCard">
            <div className="controlRow">
              <span>ECHO CORE</span>
              <strong>
                ONLINE
              </strong>
            </div>

            <div className="controlRow">
              <span>AI PROVIDER</span>
              <strong>
                CONNECTED
              </strong>
            </div>

            <div className="controlRow">
              <span>
                MEMORY
              </span>
              <strong>
                {memories.length > 0
                  ? "ACTIVE"
                  : "EMPTY"}
              </strong>
            </div>

            <div className="controlRow">
              <span>
                SPEECH ENGINE
              </span>

              <strong>
                {voiceEnabled
                  ? "ACTIVE"
                  : "DISABLED"}
              </strong>
            </div>

            <div className="controlRow">
              <span>
                INTERFACE
              </span>

              <strong>
                READY
              </strong>
            </div>
          </div>
        </div>
      );
    }

    /*
     * SETTINGS
     */
    return (
      <div className="dashboardPage">
        <h2>SETTINGS</h2>

        <div className="dashboardCard">
          <div className="controlRow">
            <span>ASSISTANT</span>
            <strong>ECHO</strong>
          </div>

          <div className="controlRow">
            <span>INTERFACE</span>
            <strong>
              ECHO SYSTEM
            </strong>
          </div>

          <div className="controlRow">
            <span>MEMORY</span>
            <strong>
              LOCAL
            </strong>
          </div>

          <div className="controlRow">
            <span>VERSION</span>
            <strong>1.0</strong>
          </div>
        </div>
      </div>
    );
  }

  /*
   * BOOT SCREEN
   */
  if (!started) {
    return (
      <BootScreen
        visible={true}
        onStart={() =>
          setStarted(true)
        }
      />
    );
  }

  /*
   * APP
   */
  return (
    <main className="app">
      <Header />

      <section className="dashboard">
        <aside className="echoPanel">
          <VerityAvatar
            speaking={speaking}
            thinking={thinking}
          />

          <div className="systemCard">
            <div className="systemTitle">
              SYSTEM STATUS
            </div>

            <div className="statusRow">
              <span>CORE</span>
              <strong>
                ONLINE
              </strong>
            </div>

            <div className="statusRow">
              <span>AI</span>
              <strong>
                CONNECTED
              </strong>
            </div>

            <div className="statusRow">
              <span>MEMORY</span>
              <strong>
                {memories.length > 0
                  ? "ACTIVE"
                  : "EMPTY"}
              </strong>
            </div>

            <div className="statusRow">
              <span>VOICE</span>
              <strong>
                {voiceEnabled
                  ? "ON"
                  : "OFF"}
              </strong>
            </div>

            <div className="statusRow">
              <span>STATE</span>
              <strong>
                {thinking
                  ? "THINKING"
                  : speaking
                    ? "SPEAKING"
                    : listening
                      ? "LISTENING"
                      : "READY"}
              </strong>
            </div>
          </div>
        </aside>

        <section className="chatPanel">
          <div className="chatHeader">
            <div>
              <h2>ECHO</h2>

              <span>
                {thinking
                  ? "PROCESSING..."
                  : speaking
                    ? "SPEAKING..."
                    : listening
                      ? "LISTENING..."
                      : "READY"}
              </span>
            </div>

            <div className="onlineIndicator">
              <span />
              ONLINE
            </div>
          </div>

          <div className="desktopTabs">
            {(
              [
                "CHAT",
                "MEMORY",
                "VOICE",
                "SYSTEM",
                "SETTINGS",
              ] as Tab[]
            ).map((tab) => (
              <button
                key={tab}
                className={
                  activeTab === tab
                    ? "dashboardTab active"
                    : "dashboardTab"
                }
                onClick={() =>
                  setActiveTab(tab)
                }
                type="button"
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="tabContent">
            {renderTabContent()}
          </div>

          <nav className="mobileTabs">
            <button
              className={
                activeTab === "CHAT"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveTab("CHAT")
              }
              type="button"
            >
              <span>💬</span>
              <small>CHAT</small>
            </button>

            <button
              className={
                activeTab === "MEMORY"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveTab("MEMORY")
              }
              type="button"
            >
              <span>🧠</span>
              <small>MEMORY</small>
            </button>

            <button
              className={
                activeTab === "VOICE"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveTab("VOICE")
              }
              type="button"
            >
              <span>🔊</span>
              <small>VOICE</small>
            </button>

            <button
              className={
                activeTab === "SYSTEM"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveTab("SYSTEM")
              }
              type="button"
            >
              <span>⚡</span>
              <small>SYSTEM</small>
            </button>

            <button
              className={
                activeTab === "SETTINGS"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveTab("SETTINGS")
              }
              type="button"
            >
              <span>⚙️</span>
              <small>SETTINGS</small>
            </button>
          </nav>
        </section>
      </section>
    </main>
  );
}