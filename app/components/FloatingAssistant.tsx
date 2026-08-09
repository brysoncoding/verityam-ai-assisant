"use client";

import { useEffect, useRef, useState } from "react";

type RecognitionResultEvent = Event & {
  results: {
    [index: number]: {
      [index: number]: { transcript: string };
    };
  };
};

type RecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: Event) => void) | null;
  onresult: ((event: RecognitionResultEvent) => void) | null;
};

type RecognitionConstructor = new () => RecognitionInstance;

declare global {
  interface Window {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  }
}

type FloatingAssistantProps = {
  listening: boolean;
  thinking: boolean;
  speaking: boolean;
  onListeningChange: (value: boolean) => void;
  onVoiceCommand: (text: string) => void;
};

export default function FloatingAssistant({
  listening,
  thinking,
  speaking,
  onListeningChange,
  onVoiceCommand,
}: FloatingAssistantProps) {
  const recognitionRef = useRef<RecognitionInstance | null>(null);
  const [supported, setSupported] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const Recognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!Recognition) {
      setSupported(false);
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => onListeningChange(true);

    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < Object.keys(event.results).length; i += 1) {
        transcript += event.results[i][0].transcript;
      }
      if (transcript.trim()) onVoiceCommand(transcript.trim());
    };

    recognition.onend = () => onListeningChange(false);
    recognition.onerror = () => onListeningChange(false);
    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [onListeningChange, onVoiceCommand]);

  function toggleListening() {
    if (!supported) {
      setExpanded(true);
      return;
    }

    const recognition = recognitionRef.current;
    if (!recognition || thinking || speaking) return;

    if (listening) {
      recognition.stop();
      return;
    }

    try {
      recognition.start();
    } catch {
      onListeningChange(false);
    }
  }

  const state = thinking
    ? "THINKING"
    : speaking
      ? "SPEAKING"
      : listening
        ? "LISTENING"
        : "READY";

  return (
    <div className={`floatingAssistant ${expanded ? "expanded" : ""}`}>
      {expanded && (
        <div className="floatingAssistantPanel">
          <div>
            <span className="floatingEyebrow">ECHO ASSISTANT</span>
            <strong>{supported ? state : "VOICE UNAVAILABLE"}</strong>
            <p>
              {supported
                ? "Tap ECHO and speak naturally."
                : "Voice input is not supported by this browser."}
            </p>
          </div>
          <button
            type="button"
            className="floatingClose"
            onClick={() => setExpanded(false)}
            aria-label="Close ECHO assistant"
          >
            ×
          </button>
        </div>
      )}

      <button
        type="button"
        className={`floatingEcho ${listening ? "listening" : ""} ${thinking ? "thinking" : ""} ${speaking ? "speaking" : ""}`}
        onClick={toggleListening}
        onContextMenu={(event) => {
          event.preventDefault();
          setExpanded((open) => !open);
        }}
        aria-label={listening ? "Stop listening to ECHO" : "Talk to ECHO"}
        title={listening ? "Stop listening" : "Talk to ECHO"}
      >
        <span className="floatingGlow" />
        <span className="floatingBall">
          <span className="floatingHighlight" />
          <span className="floatingEye left" />
          <span className="floatingEye right" />
          <span className="floatingMouth" />
        </span>
        <span className="floatingState">{state}</span>
      </button>
    </div>
  );
}
