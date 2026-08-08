"use client";
import { useEffect, useRef, useState } from "react";
import Header from "./components/Header";
import Chat, { ChatMessage } from "./components/Chat";
import InputBar from "./components/InputBar";
import BootScreen from "./components/BootScreen";
import VerityAvatar from "./components/VerityAvatar";
export default function Home() {
  const [message, setMessage] = useState("");
  const [thinking, setThinking] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: "assistant",
      content: "Welcome. I am ECHO. How can I help you today?",
    },
  ]);
  const [booting, setBooting] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => {
      setBooting(false);
    }, 3000);
    return () => {
      clearTimeout(timer);
      window.speechSynthesis?.cancel();
    };
  }, []);
  // ECHO text-to-speech
  function speak(text: string) {
    if (
      typeof window === "undefined" ||
      !("speechSynthesis" in window)
    ) {
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;
    // Start mouth animation
    utterance.onstart = () => {
      setSpeaking(true);
    };
    // Stop mouth animation
    utterance.onend = () => {
      setSpeaking(false);
    };
    // Stop mouth animation if speech errors
    utterance.onerror = () => {
      setSpeaking(false);
    };
    speechRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }
  async function sendMessage() {
    if (!message.trim() || thinking) return;
    const currentMessage = message.trim();
    setThinking(true);
    setSpeaking(false);
    const userMessage: ChatMessage = {
      id: Date.now(),
      role: "user",
      content: currentMessage,
    };
    setMessages((prev) => [...prev, userMessage]);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: currentMessage,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.reply || "Unable to process request"
        );
      }
      const aiMessage: ChatMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content: data.reply,
      };
      setMessages((prev) => [...prev, aiMessage]);
      setThinking(false);
      setMessage("");
      // Make ECHO speak the response
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
      setMessage("");
    }
  }
  if (booting) {
    return <BootScreen visible={true} />;
  }
  return (
    <main className="app">
      <Header />
      {/* ECHO avatar + speaking animation */}
      <VerityAvatar
        speaking={speaking}
        thinking={thinking}
      />
      <Chat messages={messages} />
      <InputBar
        message={message}
        setMessage={setMessage}
        onSend={sendMessage}
      />
    </main>
  );
}