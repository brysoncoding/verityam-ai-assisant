"use client";

import { useEffect, useRef, useState } from "react";
import Header from "./components/Header";
import Chat, { ChatMessage } from "./components/Chat";
import InputBar from "./components/InputBar";
import BootScreen from "./components/BootScreen";
import VerityAvatar from "./components/VerityAvatar";

type Tab =
  | "CHAT"
  | "MEMORY"
  | "VOICE"
  | "SYSTEM"
  | "SETTINGS";

export default function Home() {
  const [message, setMessage] = useState("");
  const [thinking, setThinking] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [started, setStarted] = useState(false);

  const [activeTab, setActiveTab] =
    useState<Tab>("CHAT");

  const [voiceEnabled, setVoiceEnabled] =
    useState(true);

  const [voiceName, setVoiceName] =
    useState("");

  const [voices, setVoices] =
    useState<SpeechSynthesisVoice[]>([]);

  const speechRef =
    useRef<SpeechSynthesisUtterance | null>(null);

  const [messages, setMessages] =
    useState<ChatMessage[]>([
      {
        id: 1,
        role: "assistant",
        content:
          "Welcome. I am ECHO. How can I help you today?",
      },
    ]);

  useEffect(() => {
    const savedVoice =
      localStorage.getItem("echo-voice-enabled");

    const savedVoiceName =
      localStorage.getItem("echo-voice-name");

    if (savedVoice !== null) {
      setVoiceEnabled(savedVoice === "true");
    }

    if (savedVoiceName) {
      setVoiceName(savedVoiceName);
    }

    const loadVoices = () => {
      if (!("speechSynthesis" in window)) {
        return;
      }

      const available =
        window.speechSynthesis.getVoices();

      setVoices(available);

      if (
        !savedVoiceName &&
        available.length > 0
      ) {
        setVoiceName(available[0].name);
      }
    };

    loadVoices();

    if ("speechSynthesis" in window) {
      window.speechSynthesis.onvoiceschanged =
        loadVoices;
    }

    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        window.speechSynthesis.onvoiceschanged =
          null;
      }
    };
  }, []);

  function toggleVoice() {
    const next = !voiceEnabled;

    setVoiceEnabled(next);

    localStorage.setItem(
      "echo-voice-enabled",
      String(next)
    );

    if (!next) {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }

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
    if (!voiceEnabled) {
      return;
    }

    if (!("speechSynthesis" in window)) {
      return;
    }

    window.speechSynthesis.cancel();

    const utterance =
      new SpeechSynthesisUtterance(text);

    const selectedVoice =
      voices.find(
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
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: currentMessage,
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

  function getStatus() {
    if (thinking) return "THINKING";
    if (speaking) return "SPEAKING";
    if (listening) return "LISTENING";
    return "READY";
  }

  if (!started) {
    return (
      <BootScreen
        visible={true}
        onStart={() => setStarted(true)}
      />
    );
  }

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
              <strong>ONLINE</strong>
            </div>

            <div className="statusRow">
              <span>AI</span>
              <strong>CONNECTED</strong>
            </div>

            <div className="statusRow">
              <span>VOICE</span>
              <strong>
                {voiceEnabled ? "ON" : "OFF"}
              </strong>
            </div>

            <div className="statusRow">
              <span>STATE</span>
              <strong>{getStatus()}</strong>
            </div>
          </div>
        </aside>

        <section className="chatPanel">
          <nav
            className="dashboardTabs"
            aria-label="ECHO Dashboard"
          >
            <button
              type="button"
              className={
                activeTab === "CHAT"
                  ? "dashboardTab active"
                  : "dashboardTab"
              }
              onClick={() =>
                setActiveTab("CHAT")
              }
            >
              <span className="tabIcon">
                💬
              </span>
              <span>CHAT</span>
            </button>

            <button
              type="button"
              className={
                activeTab === "MEMORY"
                  ? "dashboardTab active"
                  : "dashboardTab"
              }
              onClick={() =>
                setActiveTab("MEMORY")
              }
            >
              <span className="tabIcon">
                🧠
              </span>
              <span>MEMORY</span>
            </button>

            <button
              type="button"
              className={
                activeTab === "VOICE"
                  ? "dashboardTab active"
                  : "dashboardTab"
              }
              onClick={() =>
                setActiveTab("VOICE")
              }
            >
              <span className="tabIcon">
                🎙️
              </span>
              <span>VOICE</span>
            </button>

            <button
              type="button"
              className={
                activeTab === "SYSTEM"
                  ? "dashboardTab active"
                  : "dashboardTab"
              }
              onClick={() =>
                setActiveTab("SYSTEM")
              }
            >
              <span className="tabIcon">
                🖥️
              </span>
              <span>SYSTEM</span>
            </button>

            <button
              type="button"
              className={
                activeTab === "SETTINGS"
                  ? "dashboardTab active"
                  : "dashboardTab"
              }
              onClick={() =>
                setActiveTab("SETTINGS")
              }
            >
              <span className="tabIcon">
                ⚙️
              </span>
              <span>SETTINGS</span>
            </button>
          </nav>

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

          {activeTab === "CHAT" && (
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
          )}

          {activeTab === "MEMORY" && (
            <div className="dashboardPage">
              <h2>MEMORY</h2>

              <p>
                ECHO memory systems are ready
                for future integration.
              </p>

              <div className="dashboardCard">
                <strong>MEMORY STATUS</strong>
                <span>NOT CONFIGURED</span>
              </div>
            </div>
          )}

          {activeTab === "VOICE" && (
            <div className="dashboardPage">
              <h2>VOICE CONTROL</h2>

              <p>
                Control how ECHO speaks.
              </p>

              <div className="dashboardCard">
                <div className="controlRow">
                  <span>VOICE OUTPUT</span>

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
                      {voices.map((voice) => (
                        <option
                          key={`${voice.name}-${voice.lang}`}
                          value={voice.name}
                        >
                          {voice.name} (
                          {voice.lang})
                        </option>
                      ))}
                    </select>
                  )}
              </div>
            </div>
          )}

          {activeTab === "SYSTEM" && (
            <div className="dashboardPage">
              <h2>SYSTEM</h2>

              <div className="dashboardCard">
                <div className="controlRow">
                  <span>ECHO CORE</span>
                  <strong>ONLINE</strong>
                </div>

                <div className="controlRow">
                  <span>AI PROVIDER</span>
                  <strong>CONNECTED</strong>
                </div>

                <div className="controlRow">
                  <span>SPEECH ENGINE</span>
                  <strong>
                    {voiceEnabled
                      ? "ACTIVE"
                      : "DISABLED"}
                  </strong>
                </div>

                <div className="controlRow">
                  <span>INTERFACE</span>
                  <strong>READY</strong>
                </div>
              </div>
            </div>
          )}

          {activeTab === "SETTINGS" && (
            <div className="dashboardPage">
              <h2>SETTINGS</h2>

              <div className="dashboardCard">
                <div className="controlRow">
                  <span>ASSISTANT</span>
                  <strong>ECHO</strong>
                </div>

                <div className="controlRow">
                  <span>INTERFACE</span>
                  <strong>ECHO SYSTEM</strong>
                </div>

                <div className="controlRow">
                  <span>VERSION</span>
                  <strong>1.0</strong>
                </div>
              </div>
            </div>
          )}
        </section>
      </section>

      <nav
        className="mobileBottomNav"
        aria-label="Mobile navigation"
      >
        <button
          type="button"
          className={
            activeTab === "CHAT"
              ? "mobileNavItem active"
              : "mobileNavItem"
          }
          onClick={() =>
            setActiveTab("CHAT")
          }
        >
          <span>💬</span>
          <small>Chat</small>
        </button>

        <button
          type="button"
          className={
            activeTab === "MEMORY"
              ? "mobileNavItem active"
              : "mobileNavItem"
          }
          onClick={() =>
            setActiveTab("MEMORY")
          }
        >
          <span>🧠</span>
          <small>Memory</small>
        </button>

        <button
          type="button"
          className={
            activeTab === "VOICE"
              ? "mobileNavItem active"
              : "mobileNavItem"
          }
          onClick={() =>
            setActiveTab("VOICE")
          }
        >
          <span>🎙️</span>
          <small>Voice</small>
        </button>

        <button
          type="button"
          className={
            activeTab === "SETTINGS"
              ? "mobileNavItem active"
              : "mobileNavItem"
          }
          onClick={() =>
            setActiveTab("SETTINGS")
          }
        >
          <span>⚙️</span>
          <small>More</small>
        </button>
      </nav>
    </main>
  );
}