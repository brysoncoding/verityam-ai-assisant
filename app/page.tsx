"use client";

import { useEffect, useRef, useState } from "react";
import Header from "./components/Header";
import Chat, { ChatMessage } from "./components/Chat";
import InputBar from "./components/InputBar";
import BootScreen from "./components/BootScreen";
import VerityAvatar from "./components/VerityAvatar";

type Tab = "CHAT" | "MEMORY" | "VOICE" | "SYSTEM" | "SETTINGS";
type MemoryCategory = "PREFERENCE" | "HOBBY" | "PROJECT" | "DEVICE" | "GOAL" | "OTHER";
type Memory = { id: number; text: string; category: MemoryCategory; createdAt: string };

const MEMORY_KEY = "echo-memories";
const CATEGORIES: MemoryCategory[] = ["PREFERENCE", "HOBBY", "PROJECT", "DEVICE", "GOAL", "OTHER"];

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
    { id: 1, role: "assistant", content: "Welcome. I am ECHO. How can I help you today?" },
  ]);

  useEffect(() => {
    const savedVoice = localStorage.getItem("echo-voice-enabled");
    const savedVoiceName = localStorage.getItem("echo-voice-name");
    const savedMemories = localStorage.getItem(MEMORY_KEY);
    if (savedVoice !== null) setVoiceEnabled(savedVoice === "true");
    if (savedVoiceName) setVoiceName(savedVoiceName);
    if (savedMemories) {
      try {
        const parsed = JSON.parse(savedMemories);
        if (Array.isArray(parsed)) {
          setMemories(parsed.map((memory) => ({ ...memory, category: CATEGORIES.includes(memory.category) ? memory.category : "OTHER" })));
        }
      } catch { localStorage.removeItem(MEMORY_KEY); }
    }
    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      setVoices(available);
      if (!savedVoiceName && available.length > 0) setVoiceName(available[0].name);
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { window.speechSynthesis.cancel(); window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  function persistMemories(next: Memory[]) {
    setMemories(next);
    localStorage.setItem(MEMORY_KEY, JSON.stringify(next));
  }

  function addMemory(text: string = memoryInput, category: MemoryCategory = "OTHER") {
    const trimmedText = text.trim();
    if (!trimmedText) return false;
    const normalize = (value: string) => value.toLowerCase().replace(/[.!?,]/g, "").replace(/\s+/g, " ").trim();
    if (memories.some((memory) => normalize(memory.text) === normalize(trimmedText))) { setMemoryInput(""); return false; }
    persistMemories([{ id: Date.now(), text: trimmedText, category, createdAt: new Date().toISOString() }, ...memories]);
    setMemoryInput("");
    return true;
  }

  function deleteMemory(id: number) { persistMemories(memories.filter((memory) => memory.id !== id)); }
  function clearMemories() {
    if (memories.length === 0 || !window.confirm("Clear all ECHO memories?")) return;
    setMemories([]); localStorage.removeItem(MEMORY_KEY);
  }
  function toggleVoice() {
    const next = !voiceEnabled; setVoiceEnabled(next); localStorage.setItem("echo-voice-enabled", String(next));
    if (!next) { window.speechSynthesis.cancel(); setSpeaking(false); }
  }
  function changeVoice(name: string) { setVoiceName(name); localStorage.setItem("echo-voice-name", name); }

  function speak(text: string) {
    if (!voiceEnabled || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const selectedVoice = voices.find((voice) => voice.name === voiceName);
    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.rate = 1; utterance.pitch = 1; utterance.volume = 1;
    utterance.onstart = () => setSpeaking(true); utterance.onend = () => setSpeaking(false); utterance.onerror = () => setSpeaking(false);
    speechRef.current = utterance; window.speechSynthesis.speak(utterance);
  }

  async function sendMessage() {
    if (!message.trim() || thinking) return;
    const currentMessage = message.trim();
    setThinking(true); setSpeaking(false); setListening(false); setMessage("");
    setMessages((prev) => [...prev, { id: Date.now(), role: "user", content: currentMessage }]);
    try {
      const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: currentMessage, memories }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.reply || "Unable to process request");
      if (data.suggestedMemory && typeof data.suggestedMemory === "string") {
        const category: MemoryCategory = CATEGORIES.includes(data.suggestedCategory) ? data.suggestedCategory : "OTHER";
        addMemory(data.suggestedMemory, category);
      }
      setMessages((prev) => [...prev, { id: Date.now() + 1, role: "assistant", content: data.reply }]);
      setThinking(false); speak(data.reply);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unable to process request";
      setThinking(false); setSpeaking(false);
      setMessages((prev) => [...prev, { id: Date.now() + 1, role: "assistant", content: `ERROR: ${errorMessage}` }]);
    }
  }

  function renderTabContent() {
    if (activeTab === "CHAT") return <><Chat messages={messages} /><InputBar message={message} setMessage={setMessage} onSend={sendMessage} listening={listening} setListening={setListening} /></>;

    if (activeTab === "MEMORY") {
      const categoryCounts = CATEGORIES.map((category) => ({ category, count: memories.filter((memory) => memory.category === category).length })).filter((item) => item.count > 0);
      return <div className="dashboardPage">
        <div className="hubPageTitle"><div><span className="eyebrow">ECHO KNOWLEDGE HUB</span><h2>MEMORY</h2><p>Long-term context stored locally on this device.</p></div><div className="memoryTotal"><strong>{memories.length}</strong><span>SAVED</span></div></div>
        <div className="memoryOverview">{categoryCounts.length === 0 ? <span>NO CATEGORIES ACTIVE</span> : categoryCounts.map(({ category, count }) => <div className="categoryStat" key={category}><span>{category}</span><strong>{count}</strong></div>)}</div>
        <div className="dashboardCard memoryCard">
          <div className="memoryHeader"><strong>SAVED MEMORIES</strong><span>{memories.length} {memories.length === 1 ? "MEMORY" : "MEMORIES"}</span></div>
          <div className="memoryAdd"><input type="text" value={memoryInput} onChange={(event) => setMemoryInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") addMemory(); }} placeholder="Tell ECHO something to remember..." /><button type="button" onClick={() => addMemory()}>+ ADD</button></div>
          {memories.length === 0 ? <div className="memoryEmpty"><span>🧠</span><strong>NO MEMORIES YET</strong><p>Add something ECHO should remember about you.</p></div> : <div className="memoryList">{memories.map((memory) => <div className="memoryItem" key={memory.id}><div className="memoryText"><div className="memoryMeta"><span className={`memoryCategory ${memory.category.toLowerCase()}`}>{memory.category}</span><span>{new Date(memory.createdAt).toLocaleDateString()}</span></div><p>{memory.text}</p></div><button type="button" className="memoryDelete" onClick={() => deleteMemory(memory.id)} title="Delete memory">×</button></div>)}</div>}
          {memories.length > 0 && <button type="button" className="clearMemoryButton" onClick={clearMemories}>CLEAR ALL MEMORIES</button>}
        </div>
      </div>;
    }

    if (activeTab === "VOICE") return <div className="dashboardPage"><div className="hubPageTitle"><div><span className="eyebrow">AUDIO INTERFACE</span><h2>VOICE CONTROL</h2><p>Control how ECHO speaks.</p></div></div><div className="dashboardCard"><div className="controlRow"><span>VOICE OUTPUT</span><button className={voiceEnabled ? "voiceToggle active" : "voiceToggle"} onClick={toggleVoice} type="button">{voiceEnabled ? "ON" : "OFF"}</button></div>{voiceEnabled && voices.length > 0 && <select value={voiceName} onChange={(event) => changeVoice(event.target.value)} className="voiceSelect">{voices.map((voice) => <option key={`${voice.name}-${voice.lang}`} value={voice.name}>{voice.name} ({voice.lang})</option>)}</select>}</div></div>;

    if (activeTab === "SYSTEM") return <div className="dashboardPage"><div className="hubPageTitle"><div><span className="eyebrow">CORE MONITOR</span><h2>SYSTEM</h2><p>Live ECHO system status.</p></div><div className="hubLive"><span /> LIVE</div></div><div className="dashboardCard"><div className="controlRow"><span>ECHO CORE</span><strong>ONLINE</strong></div><div className="controlRow"><span>AI PROVIDER</span><strong>CONNECTED</strong></div><div className="controlRow"><span>MEMORY</span><strong>{memories.length > 0 ? "ACTIVE" : "EMPTY"}</strong></div><div className="controlRow"><span>SPEECH ENGINE</span><strong>{voiceEnabled ? "ACTIVE" : "DISABLED"}</strong></div><div className="controlRow"><span>INTERFACE</span><strong>READY</strong></div></div></div>;

    return <div className="dashboardPage"><div className="hubPageTitle"><div><span className="eyebrow">ECHO CONFIGURATION</span><h2>SETTINGS</h2><p>Identity and local configuration.</p></div></div><div className="dashboardCard"><div className="controlRow"><span>ASSISTANT</span><strong>ECHO</strong></div><div className="controlRow"><span>INTERFACE</span><strong>ECHO SYSTEM</strong></div><div className="controlRow"><span>MEMORY</span><strong>LOCAL</strong></div><div className="controlRow"><span>VERSION</span><strong>1.0</strong></div></div></div>;
  }

  if (!started) return <BootScreen visible={true} onStart={() => setStarted(true)} />;
  const state = thinking ? "THINKING" : speaking ? "SPEAKING" : listening ? "LISTENING" : "READY";
  const tabs: Tab[] = ["CHAT", "MEMORY", "VOICE", "SYSTEM", "SETTINGS"];

  return <main className="app"><Header /><section className="dashboard">
    <aside className="echoPanel"><VerityAvatar speaking={speaking} thinking={thinking} /><div className="systemCard"><div className="systemTitle">SYSTEM STATUS</div><div className="statusRow"><span>CORE</span><strong>ONLINE</strong></div><div className="statusRow"><span>AI</span><strong>CONNECTED</strong></div><div className="statusRow"><span>MEMORY</span><strong>{memories.length > 0 ? "ACTIVE" : "EMPTY"}</strong></div><div className="statusRow"><span>VOICE</span><strong>{voiceEnabled ? "ON" : "OFF"}</strong></div><div className="statusRow"><span>STATE</span><strong>{state}</strong></div></div></aside>
    <section className="chatPanel"><div className="chatHeader"><div><span className="eyebrow">PERSONAL AI CORE</span><h2>ECHO</h2><span>{state}</span></div><div className="onlineIndicator"><span /> ONLINE</div></div>
      <div className="desktopTabs">{tabs.map((tab) => <button key={tab} className={activeTab === tab ? "dashboardTab active" : "dashboardTab"} onClick={() => setActiveTab(tab)} type="button">{tab}</button>)}</div>
      <div className="tabContent">{renderTabContent()}</div>
      <nav className="mobileTabs">{tabs.map((tab) => { const icon = tab === "CHAT" ? "💬" : tab === "MEMORY" ? "🧠" : tab === "VOICE" ? "🔊" : tab === "SYSTEM" ? "⚡" : "⚙️"; return <button key={tab} className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)} type="button"><span>{icon}</span><small>{tab}</small></button>; })}</nav>
    </section></section></main>;
}
