"use client";

import { useEffect, useRef } from "react";
import { parseVoiceCommand } from "../lib/voiceCommandEngine";

type InputBarProps = {
  message: string;
  setMessage: (value: string) => void;
  onSend: (input?: string) => void;
  listening: boolean;
  setListening: (value: boolean) => void;
};

type SpeechRecognitionEvent = Event & {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
        isFinal?: boolean;
      };
    };
  };
};

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: Event) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export default function InputBar({
  message,
  setMessage,
  onSend,
  listening,
  setListening,
}: InputBarProps) {
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const handlersRef = useRef({ onSend, setMessage, setListening });

  handlersRef.current = { onSend, setMessage, setListening };

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => handlersRef.current.setListening(true);

    recognition.onresult = (event) => {
      let transcript = "";
      const resultCount = Object.keys(event.results).length;

      for (let i = 0; i < resultCount; i += 1) {
        transcript += event.results[i]?.[0]?.transcript ?? "";
      }

      handlersRef.current.setMessage(transcript);

      const lastResult = event.results[resultCount - 1]?.[0];
      if (!lastResult?.isFinal || !transcript.trim()) return;

      const command = parseVoiceCommand(transcript);
      window.dispatchEvent(new CustomEvent("echo:voice-command", { detail: command }));

      if (command.type === "CHAT") {
        handlersRef.current.onSend(command.payload || transcript);
      }
    };

    recognition.onend = () => handlersRef.current.setListening(false);
    recognition.onerror = () => handlersRef.current.setListening(false);
    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, []);

  function toggleMicrophone() {
    const recognition = recognitionRef.current;
    if (!recognition) {
      alert("Voice input is not supported by this browser.");
      return;
    }

    if (listening) {
      recognition.stop();
      return;
    }

    try {
      recognition.start();
    } catch {
      setListening(false);
    }
  }

  return (
    <footer className="inputBar">
      <button
        className={`micButton ${listening ? "listening" : ""}`}
        title={listening ? "Stop listening" : "Speak to ECHO"}
        onClick={toggleMicrophone}
        type="button"
      >
        {listening ? "🔴" : "🎤"}
      </button>

      <input
        type="text"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder={listening ? "Listening..." : "Talk to ECHO..."}
        onKeyDown={(event) => {
          if (event.key === "Enter") onSend();
        }}
      />

      <button className="sendButton" onClick={() => onSend()} type="button">
        Send
      </button>
    </footer>
  );
}
