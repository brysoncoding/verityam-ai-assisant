"use client";

import { useEffect, useState } from "react";

import Header from "./components/Header";
import Chat, { ChatMessage } from "./components/Chat";
import InputBar from "./components/InputBar";
import BootScreen from "./components/BootScreen";

export default function Home() {
  const [message, setMessage] = useState("");

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: "assistant",
      content:
        "Welcome. I am VERITY. How can I help you today?",
    },
  ]);
const [booting, setBooting] = useState(true);

useEffect(() => {
  const timer = setTimeout(() => {
    setBooting(false);
  }, 3000);

  return () => clearTimeout(timer);
}, []);

  async function sendMessage() {
    if (!message.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now(),
      role: "user",
      content: message,
    };

    setMessages((prev) => [...prev, userMessage]);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
      }),
    });

    const data = await res.json();

    const aiMessage: ChatMessage = {
      id: Date.now() + 1,
      role: "assistant",
      content: data.reply,
    };

    setMessages((prev) => [...prev, aiMessage]);

    setMessage("");
  }
if (booting) {
  return <BootScreen visible={true} />;
}
  return (
    <main className="app">
      <Header />

      <Chat messages={messages} />

      <InputBar
        message={message}
        setMessage={setMessage}
        onSend={sendMessage}
      />
    </main>
  );
}