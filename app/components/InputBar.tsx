"use client";

import { useEffect, useRef, useState } from "react";

type InputBarProps = {
  message: string;
  setMessage: (value: string) => void;
  onSend: () => void;
  listening: boolean;
  setListening: (value: boolean) => void;
};

type SpeechRecognitionEvent = Event & {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
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

type SpeechRecognitionConstructor =
  new () => SpeechRecognitionInstance;

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
  const recognitionRef =
    useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onresult = (event) => {
      let transcript = "";

      for (
        let i = 0;
        i < Object.keys(event.results).length;
        i++
      ) {
        transcript +=
          event.results[i][0].transcript;
      }

      setMessage(transcript);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [setMessage, setListening]);

  function toggleMicrophone() {
    const recognition =
      recognitionRef.current;

    if (!recognition) {
      alert(
        "Voice input is not supported by this browser."
      );
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
        className={`micButton ${
          listening ? "listening" : ""
        }`}
        title={
          listening
            ? "Stop listening"
            : "Speak to ECHO"
        }
        onClick={toggleMicrophone}
        type="button"
      >
        {listening ? "🔴" : "🎤"}
      </button>

      <input
        type="text"
        value={message}
        onChange={(e) =>
          setMessage(e.target.value)
        }
        placeholder={
          listening
            ? "Listening..."
            : "Talk to ECHO..."
        }
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onSend();
          }
        }}
      />

      <button
        className="sendButton"
        onClick={onSend}
        type="button"
      >
        Send
      </button>
    </footer>
  );
}