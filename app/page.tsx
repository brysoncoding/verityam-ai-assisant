"use client";

import { useEffect, useRef, useState } from "react";
import Header from "./components/Header";
import Chat, { ChatMessage } from "./components/Chat";
import InputBar from "./components/InputBar";
import BootScreen from "./components/BootScreen";
import VerityAvatar from "./components/VerityAvatar";

type Tab = "CHAT" | "MEMORY" | "VOICE" | "SYSTEM" | "SETTINGS";

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
      localStorage.getItem(
        "echo-voice-enabled"
      );

    const savedVoiceName =
      localStorage.getItem(
        "echo-voice-name"
      );

    if (savedVoice !== null) {
      setVoiceEnabled(
        savedVoice === "true"
      );
    }

    if (savedVoiceName) {
      setVoiceName(savedVoiceName);
    }

    const loadVoices = () => {
      const available =
        window.speechSynthesis.getVoices();

      setVoices(available);

      if (
        !savedVoiceName &&
        available.length > 0
      ) {
        setVoiceName(
          available[0].name
        );
      }
    };

    loadVoices();

    window.speechSynthesis.onvoiceschanged =
      loadVoices;

    return () => {
      window.speechSynthesis.cancel();

      window.speechSynthesis.onvoiceschanged =
        null;
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

    const selectedVoice =
      voices.find(
        (voice) =>
          voice.name === voiceName
      );

    if (selectedVoice) {
      utterance.voice =
        selectedVoice;
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

    speechRef.current =
      utterance;

    window.speechSynthesis.speak(
      utterance
    );
  }

  async function sendMessage() {
    if (
      !message.trim() ||
      thinking
    ) {
      return;
    }

    const currentMessage =
      message.trim();

    setThinking(true);
    setSpeaking(false);

    const userMessage: ChatMessage = {
      id: Date.now(),
      role: "user",
      content: currentMessage,
    };

    setMessages((prev) => [
      ...prev,
      userMessage,
    ]);

    setMessage("");

    try {
      const res =
        await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            message:
              currentMessage,
          }),
        });

      const data =
        await res.json();

      if (!res.ok) {
        throw new Error(
          data.reply ||
            "Unable to process request"
        );
      }

      const aiMessage:
        ChatMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content: data.reply,
      };

      setMessages((prev) => [
        ...prev,
        aiMessage,
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
          content:
            `ERROR: ${errorMessage}`,
        },
      ]);
    }
  }

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
          <nav className="dashboardTabs">
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
              >
                {tab}
              </button>
            ))}
          </nav>

          <div className="chatHeader">
            <div>
              <h2>
                ECHO
              </h2>

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
              <Chat
                messages={
                  messages
                }
              />

              <InputBar
                message={message}
                setMessage={
                  setMessage
                }
                onSend={
                  sendMessage
                }
              />
            </>
          )}

          {activeTab === "MEMORY" && (
            <div className="dashboardPage">
              <h2>MEMORY</h2>

              <p>
                ECHO memory systems
                are ready for future
                integration.
              </p>

              <div className="dashboardCard">
                <strong>
                  MEMORY STATUS
                </strong>

                <span>
                  NOT CONFIGURED
                </span>
              </div>
            </div>
          )}

          {activeTab === "VOICE" && (
            <div className="dashboardPage">
              <h2>
                VOICE CONTROL
              </h2>

              <p>
                Control how ECHO
                speaks.
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
                    onClick={
                      toggleVoice
                    }
                  >
                    {voiceEnabled
                      ? "ON"
                      : "OFF"}
                  </button>
                </div>

                {voiceEnabled &&
                  voices.length >
                    0 && (
                    <select
                      value={
                        voiceName
                      }
                      onChange={(e) =>
                        changeVoice(
                          e.target
                            .value
                        )
                      }
                      className="voiceSelect"
                    >
                      {voices.map(
                        (voice) => (
                          <option
                            key={`${voice.name}-${voice.lang}`}
                            value={
                              voice.name
                            }
                          >
                            {
                              voice.name
                            }{" "}
                            (
                            {
                              voice.lang
                            }
                            )
                          </option>
                        )
                      )}
                    </select>
                  )}
              </div>
            </div>
          )}

          {activeTab === "SYSTEM" && (
            <div className="dashboardPage">
              <h2>
                SYSTEM
              </h2>

              <div className="dashboardCard">
                <div className="controlRow">
                  <span>
                    ECHO CORE
                  </span>

                  <strong>
                    ONLINE
                  </strong>
                </div>

                <div className="controlRow">
                  <span>
                    AI PROVIDER
                  </span>

                  <strong>
                    CONNECTED
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
          )}

          {activeTab === "SETTINGS" && (
            <div className="dashboardPage">
              <h2>
                SETTINGS
              </h2>

              <div className="dashboardCard">
                <div className="controlRow">
                  <span>
                    ASSISTANT
                  </span>

                  <strong>
                    ECHO
                  </strong>
                </div>

                <div className="controlRow">
                  <span>
                    INTERFACE
                  </span>

                  <strong>
                    ECHO SYSTEM
                  </strong>
                </div>

                <div className="controlRow">
                  <span>
                    VERSION
                  </span>

                  <strong>
                    1.0
                  </strong>
                </div>
              </div>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}