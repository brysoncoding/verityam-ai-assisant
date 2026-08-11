"use client";

import { useEffect, useRef, useState } from "react";

type FloatingAssistantProps = {
  listening: boolean;
  thinking: boolean;
  speaking: boolean;
  onListeningChange: (value: boolean) => void;
  onVoiceCommand: (text: string) => void;
};

type BrowserRecognitionResult = {
  isFinal: boolean;
  0?: { transcript: string };
};

type BrowserRecognition = {
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  lang: string;
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onresult: ((event: {
    resultIndex: number;
    results: ArrayLike<BrowserRecognitionResult>;
  }) => void) | null;
  onspeechend: (() => void) | null;
};

type BrowserRecognitionConstructor = new () => BrowserRecognition;
type BrowserRecognitionWindow = {
  SpeechRecognition?: BrowserRecognitionConstructor;
  webkitSpeechRecognition?: BrowserRecognitionConstructor;
};

export default function FloatingAssistant({
  listening,
  thinking,
  speaking,
  onListeningChange,
  onVoiceCommand,
}: FloatingAssistantProps) {
  const recognitionRef = useRef<BrowserRecognition | null>(null);
  const listeningHandlerRef = useRef(onListeningChange);
  const voiceCommandHandlerRef = useRef(onVoiceCommand);
  const activeRef = useRef(false);
  const resultSentRef = useRef(false);
  const [supported, setSupported] = useState(true);
  const [expanded, setExpanded] = useState(false);

  listeningHandlerRef.current = onListeningChange;
  voiceCommandHandlerRef.current = onVoiceCommand;

  useEffect(() => {
    const browserWindow = window as unknown as BrowserRecognitionWindow;
    const Recognition = browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition;

    if (!Recognition) {
      setSupported(false);
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      activeRef.current = true;
      resultSentRef.current = false;
      listeningHandlerRef.current(true);
    };

    recognition.onresult = (event) => {
      if (resultSentRef.current) return;

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (!result?.isFinal) continue;

        const transcript = result[0]?.transcript?.trim() ?? "";
        if (!transcript) continue;

        resultSentRef.current = true;
        activeRef.current = false;
        listeningHandlerRef.current(false);

        try {
          recognition.stop();
        } catch {
          // The browser may already be ending recognition.
        }

        voiceCommandHandlerRef.current(transcript);
        break;
      }
    };

    recognition.onspeechend = () => {
      if (!activeRef.current || resultSentRef.current) return;
      try {
        recognition.stop();
      } catch {
        // Ignore browser transition errors.
      }
    };

    recognition.onend = () => {
      activeRef.current = false;
      listeningHandlerRef.current(false);
    };

    recognition.onerror = (event) => {
      activeRef.current = false;
      listeningHandlerRef.current(false);
      if (event.error !== "aborted" && event.error !== "no-speech") {
        setExpanded(true);
      }
    };

    return () => {
      activeRef.current = false;
      resultSentRef.current = true;
      recognition.onstart = null;
      recognition.onresult = null;
      recognition.onspeechend = null;
      recognition.onend = null;
      recognition.onerror = null;
      try {
        recognition.abort?.();
        recognition.stop();
      } catch {
        // Recognition may already be stopped during unmount.
      }
      recognitionRef.current = null;
    };
  }, []);

  function startVoiceCommand() {
    const recognition = recognitionRef.current;
    if (!supported || !recognition || activeRef.current || thinking || speaking) return;

    resultSentRef.current = false;
    recognition.continuous = false;
    recognition.interimResults = false;

    try {
      recognition.start();
    } catch {
      // A rapid repeated tap can happen while the browser is changing state.
    }
  }

  function stopVoiceCommand() {
    const recognition = recognitionRef.current;
    if (!recognition || !activeRef.current) return;

    resultSentRef.current = true;
    activeRef.current = false;
    listeningHandlerRef.current(false);

    try {
      recognition.abort?.();
      recognition.stop();
    } catch {
      // Ignore browser transition errors.
    }
  }

  function toggleVoice() {
    if (activeRef.current) {
      stopVoiceCommand();
      return;
    }
    startVoiceCommand();
  }

  const state = thinking ? "THINKING" : speaking ? "SPEAKING" : listening ? "LISTENING" : "READY";
  const helpText = supported
    ? listening
      ? "ECHO is listening. Say your command now."
      : "Tap the ECHO ball when you want to speak. The microphone stays off until you tap it."
    : "Voice input is not supported by this browser.";

  return (
    <>
      <div className={`floatingAssistant ${expanded ? "expanded" : ""}`}>
        {expanded && (
          <div className="floatingAssistantPanel">
            <div>
              <span className="floatingEyebrow">ECHO ASSISTANT</span>
              <strong>{supported ? state : "VOICE UNAVAILABLE"}</strong>
              <p>{helpText}</p>
            </div>
            <button type="button" className="floatingClose" onClick={() => setExpanded(false)} aria-label="Close ECHO assistant">×</button>
          </div>
        )}

        <button
          type="button"
          className={`floatingEcho ${listening ? "listening" : ""} ${thinking ? "thinking" : ""} ${speaking ? "speaking" : ""}`}
          onClick={toggleVoice}
          onContextMenu={(event) => {
            event.preventDefault();
            setExpanded((open) => !open);
          }}
          aria-label={listening ? "Stop ECHO listening" : "Talk to ECHO"}
          title={listening ? "ECHO is listening — click to stop" : "Tap to talk to ECHO"}
          disabled={thinking || speaking || !supported}
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

      <style jsx>{`
        .floatingAssistant{position:fixed;right:22px;bottom:22px;z-index:5000;display:flex;flex-direction:column;align-items:flex-end;gap:10px}.floatingEcho{position:relative;width:78px;height:78px;padding:0;border:1px solid rgba(150,230,255,.65);border-radius:50%;background:transparent;color:#8ed8ff;box-shadow:0 0 22px rgba(30,150,255,.35),0 0 65px rgba(20,110,255,.18);transition:transform .2s ease,box-shadow .2s ease}.floatingEcho:hover:not(:disabled){transform:scale(1.06);box-shadow:0 0 30px rgba(60,180,255,.55),0 0 80px rgba(20,110,255,.25)}.floatingEcho:disabled{cursor:default;opacity:.9}.floatingBall{position:absolute;inset:6px;display:block;overflow:hidden;border-radius:50%;background:radial-gradient(circle at 32% 24%,#dff8ff 0%,#75d9ff 10%,#168cff 38%,#0751c7 68%,#032b78 100%);box-shadow:inset -10px -12px 18px rgba(0,20,80,.4),inset 8px 7px 15px rgba(220,250,255,.18);animation:floatingBounce 2.2s ease-in-out infinite}.floatingGlow{position:absolute;inset:-12px;border-radius:50%;background:rgba(70,180,255,.18);filter:blur(15px);animation:floatingPulse 2.5s ease-in-out infinite}.floatingHighlight{position:absolute;top:12px;left:14px;width:23px;height:12px;border-radius:50%;transform:rotate(-28deg);background:rgba(235,252,255,.7);filter:blur(2px)}.floatingEye{position:absolute;top:29px;width:6px;height:9px;border-radius:50%;background:#e9fbff;box-shadow:0 0 5px rgba(210,247,255,.95)}.floatingEye.left{left:24px}.floatingEye.right{right:24px}.floatingMouth{position:absolute;left:50%;top:43px;width:22px;height:10px;transform:translateX(-50%);border-bottom:2px solid #e9fbff;border-radius:0 0 20px 20px}.floatingState{position:absolute;left:50%;bottom:-17px;transform:translateX(-50%);font-size:7px;font-weight:800;letter-spacing:1.5px;white-space:nowrap;text-shadow:0 0 8px rgba(90,190,255,.8)}.floatingEcho.listening .floatingBall{animation:floatingListen .55s ease-in-out infinite alternate}.floatingEcho.listening{box-shadow:0 0 35px rgba(70,210,255,.75),0 0 90px rgba(20,140,255,.35)}.floatingEcho.thinking .floatingBall{animation:floatingThink .8s ease-in-out infinite alternate}.floatingEcho.speaking .floatingMouth{width:19px;height:8px;border:2px solid #e9fbff;border-top:0;animation:floatingTalk .18s ease-in-out infinite alternate}.floatingAssistantPanel{width:250px;padding:13px 14px;border:1px solid rgba(120,190,255,.16);border-radius:14px;background:rgba(5,9,13,.94);box-shadow:0 15px 45px rgba(0,0,0,.4),0 0 25px rgba(40,150,255,.08);backdrop-filter:blur(14px);display:flex;justify-content:space-between;gap:12px}.floatingEyebrow{display:block;margin-bottom:4px;color:#63808d;font-size:8px;letter-spacing:2px}.floatingAssistantPanel strong{color:#aee4f7;font-size:11px;letter-spacing:1px}.floatingAssistantPanel p{margin-top:5px;color:#67808a;font-size:10px;line-height:1.4}.floatingClose{width:26px;height:26px;border-radius:7px;background:#10171c;color:#8ca5af;font-size:18px}@keyframes floatingBounce{0%,100%{transform:translateY(3px)}50%{transform:translateY(-5px)}}@keyframes floatingPulse{0%,100%{opacity:.45;transform:scale(.92)}50%{opacity:.9;transform:scale(1.08)}}@keyframes floatingListen{from{transform:scale(.96)}to{transform:scale(1.05)}}@keyframes floatingThink{from{transform:scale(.95) rotate(-2deg)}to{transform:scale(1.04) rotate(2deg)}}@keyframes floatingTalk{from{transform:translateX(-50%) scaleY(.65)}to{transform:translateX(-50%) scaleY(1.3)}}@media(max-width:850px){.floatingAssistant{right:14px;bottom:74px}.floatingEcho{width:68px;height:68px}.floatingEye{top:26px}.floatingEye.left{left:21px}.floatingEye.right{right:21px}.floatingMouth{top:39px}}
      `}</style>
    </>
  );
}
