"use client";

import { useEffect, useRef, useState } from "react";
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
  const [imageMode, setImageMode] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [imageError, setImageError] = useState("");

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

  async function generateImage() {
    const prompt = message.trim();
    if (!prompt || generatingImage) return;

    setGeneratingImage(true);
    setImageError("");
    setGeneratedImage(null);
    setMessage("");

    try {
      const response = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = (await response.json()) as { imageUrl?: string; error?: string };
      if (!response.ok || !data.imageUrl) throw new Error(data.error || "ECHO could not create that image.");
      setGeneratedImage(data.imageUrl);
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "ECHO could not create that image.");
    } finally {
      setGeneratingImage(false);
    }
  }

  function looksLikeImageRequest(value: string) {
    return /\b(create|generate|make|draw|design|render)\b[\s\S]{0,80}\b(image|picture|artwork|illustration|poster|wallpaper|logo)\b/i.test(value.trim());
  }

  function handleSend() {
    if (imageMode || looksLikeImageRequest(message)) {
      if (!imageMode) setImageMode(true);
      void generateImage();
      return;
    }
    onSend();
  }

  return (
    <footer className={`inputBar ${imageMode ? "imageComposerActive" : ""}`}>
      <button
        className={`micButton ${listening ? "listening" : ""}`}
        title={listening ? "Stop listening" : "Speak to ECHO"}
        onClick={toggleMicrophone}
        type="button"
        disabled={generatingImage}
      >
        {listening ? "🔴" : "🎤"}
      </button>

      <button
        className={`imageButton ${imageMode ? "active" : ""}`}
        title={imageMode ? "Return to normal chat" : "Create an image"}
        onClick={() => {
          setImageMode((current) => !current);
          setImageError("");
          setGeneratedImage(null);
        }}
        type="button"
        disabled={generatingImage}
      >
        🖼️
      </button>

      <input
        type="text"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder={imageMode ? "Describe the image ECHO should create..." : listening ? "Listening..." : "Talk to ECHO..."}
        onKeyDown={(event) => {
          if (event.key === "Enter") handleSend();
        }}
        disabled={generatingImage}
      />

      <button className="sendButton" onClick={handleSend} type="button" disabled={generatingImage || !message.trim()}>
        {generatingImage ? "Creating..." : imageMode ? "Create" : "Send"}
      </button>

      {(generatedImage || imageError) && (
        <div className="imageResult" role="status">
          <div className="imageResultHeader">
            <div>
              <span className="imageEyebrow">ECHO IMAGE CORE</span>
              <strong>{imageError ? "IMAGE FAILED" : "IMAGE CREATED"}</strong>
            </div>
            <button type="button" onClick={() => { setGeneratedImage(null); setImageError(""); }} aria-label="Close image result">×</button>
          </div>
          {generatedImage ? (
            <img src={generatedImage} alt="Image generated by ECHO" />
          ) : (
            <p>{imageError}</p>
          )}
        </div>
      )}

      <style jsx>{`
        .imageButton{width:46px;height:46px;border:1px solid rgba(142,216,255,.12);border-radius:12px;background:rgba(8,14,18,.82);color:#bdefff;font-size:20px;cursor:pointer;flex:0 0 auto;transition:transform .18s ease,border-color .18s ease,background .18s ease}
        .imageButton:hover,.imageButton.active{border-color:rgba(98,207,255,.42);background:rgba(18,35,43,.94);box-shadow:0 0 18px rgba(98,207,255,.08);transform:translateY(-1px)}
        .imageButton:disabled{opacity:.45;cursor:not-allowed;transform:none}
        .imageResult{position:absolute;right:0;bottom:calc(100% + 12px);width:min(520px,calc(100vw - 28px));max-height:min(70vh,620px);overflow:auto;padding:12px;border:1px solid rgba(142,216,255,.2);border-radius:16px;background:rgba(5,11,15,.98);box-shadow:0 24px 70px rgba(0,0,0,.5);backdrop-filter:blur(14px);z-index:30}
        .imageResultHeader{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px;padding:2px 2px 9px;border-bottom:1px solid rgba(142,216,255,.1)}
        .imageResultHeader div{display:flex;flex-direction:column;gap:3px}.imageEyebrow{font-size:8px;letter-spacing:.16em;color:#62cfff;font-weight:800}.imageResultHeader strong{font-size:12px;letter-spacing:.08em;color:#e9fbff}
        .imageResultHeader button{width:30px;height:30px;border:1px solid rgba(142,216,255,.14);border-radius:8px;background:rgba(8,14,18,.8);color:#bdefff;font-size:20px;cursor:pointer}
        .imageResult img{display:block;width:100%;height:auto;border-radius:11px;border:1px solid rgba(142,216,255,.1)}
        .imageResult p{margin:8px 2px;color:#ffb5b5;font-size:12px;line-height:1.5}
        @media(max-width:620px){.imageButton{width:42px;height:42px}.imageResult{right:-6px;width:calc(100vw - 20px)}}
      `}</style>
    </footer>
  );
}
