"use client";

import { useState } from "react";

export default function Home() {
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("Welcome. I am VERITY.");

  async function sendMessage() {
    if (!message.trim()) return;

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    });

    const data = await res.json();
    setReply(data.reply);
    setMessage("");
  }

  return (
    <main className="app">
      <header className="header">
        <h1 className="title glow">VERITY</h1>
        <p className="subtitle">Signal received • AI Assistant Online</p>
      </header>

      <section className="chat">
        <div className="message ai">
          <strong>VERITY</strong>
          <br />
          {reply}
        </div>
      </section>

      <footer className="inputBar">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Talk to VERITY..."
        />

        <button
          className="sendButton"
          onClick={sendMessage}
        >
          Send
        </button>
      </footer>
    </main>
  );
}