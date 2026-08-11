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
};

type BrowserRecognitionConstructor = new () => BrowserRecognition;
type BrowserRecognitionWindow = {
  SpeechRecognition?: BrowserRecognitionConstructor;
  webkitSpeechRecognition?: BrowserRecognitionConstructor;
};

const WAKE_WORD_PATTERN = /^(?:hey\s+)?echo\b[\s,:.!-]*/i;
const COMMAND_WAIT_MS = 6000;
const RESTART_DELAY_MS = 450;

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
  const thinkingRef = useRef(thinking);
  const speakingRef = useRef(speaking);
  const enabledRef = useRef(true);
  const runningRef = useRef(false);
  const restartTimerRef = useRef<number | null>(null);
  const commandTimerRef = useRef<number | null>(null);
  const waitingForCommandRef = useRef(false);
  const [supported, setSupported] = useState(true);
  const [expanded, setExpanded] = useState(false);

  listeningHandlerRef.current = onListeningChange;
  voiceCommandHandlerRef.current = onVoiceCommand;
  thinkingRef.current = thinking;
  speakingRef.current = speaking;

  useEffect(() => {
    const browserWindow = window as unknown as BrowserRecognitionWindow;
    const Recognition = browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition;

    if (!Recognition) {
      setSupported(false);
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    const clearCommandTimer = () => {
      if (commandTimerRef.current !== null) {
        window.clearTimeout(commandTimerRef.current);
        commandTimerRef.current = null;
      }
    };

    const scheduleRestart = () => {
      if (!enabledRef.current || thinkingRef.current || speakingRef.current) return;
      if (restartTimerRef.current !== null) return;

      restartTimerRef.current = window.setTimeout(() => {
        restartTimerRef.current = null;
        if (!enabledRef.current || thinkingRef.current || speakingRef.current || runningRef.current) return;
        try {
          recognition.start();
        } catch {
          scheduleRestart();
        }
      }, RESTART_DELAY_MS);
    };

    recognition.onstart = () => {
      runningRef.current = true;
      listeningHandlerRef.current(true);
    };

    recognition.onresult = (event) => {
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (!result?.isFinal) continue;

        const transcript = result[0]?.transcript?.trim() ?? "";
        if (!transcript) continue;

        if (waitingForCommandRef.current) {
          waitingForCommandRef.current = false;
          clearCommandTimer();
          voiceCommandHandlerRef.current(transcript);
          continue;
        }

        const wakeMatch = transcript.match(WAKE_WORD_PATTERN);
        if (!wakeMatch) continue;

        const command = transcript.slice(wakeMatch[0].length).trim();
        if (command) {
          voiceCommandHandlerRef.current(command);
          continue;
        }

        waitingForCommandRef.current = true;
        clearCommandTimer();
        commandTimerRef.current = window.setTimeout(() => {
          commandTimerRef.current = null;
          waitingForCommandRef.current = false;
        }, COMMAND_WAIT_MS);
      }
    };

    recognition.onend = () => {
      runningRef.current = false;
      if (!enabledRef.current || thinkingRef.current || speakingRef.current) {
        listeningHandlerRef.current(false);
        return;
      }
      scheduleRestart();
    };

    recognition.onerror = (event) => {
      runningRef.current = false;
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        enabledRef.current = false;
        waitingForCommandRef.current = false;
        clearCommandTimer();
        listeningHandlerRef.current(false);
        return;
      }
      if (event.error !== "aborted") scheduleRestart();
    };

    try {
      recognition.start();
    } catch {
      scheduleRestart();
    }

    return () => {
      enabledRef.current = false;
      runningRef.current = false;
      waitingForCommandRef.current = false;
      clearCommandTimer();
      if (restartTimerRef.current !== null) window.clearTimeout(restartTimerRef.current);
      recognition.onstart = null;
      recognition.onresult = null;
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

  useEffect(() => {
    const recognition = recognitionRef.current;
    if (!recognition || !supported) return;

    if (thinking || speaking) {
      waitingForCommandRef.current = false;
      try {
        recognition.stop();
      } catch {
        // Ignore browser transition errors.
      }
      return;
    }

    if (!enabledRef.current || runningRef.current) return;
    try {
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.start();
    } catch {
      // onend/onerror will schedule the next safe restart.
    }
  }, [thinking, speaking, supported]);

  function toggleListening() {
    const recognition = recognitionRef.current;
    if (!supported || !recognition) {
      setExpanded(true);
      return;
    }

    if (enabledRef.current) {
      enabledRef.current = false;
      runningRef.current = false;
      waitingForCommandRef.current = false;
      if (restartTimerRef.current !== null) {
        window.clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }
      if (commandTimerRef.current !== null) {
        window.clearTimeout(commandTimerRef.current);
        commandTimerRef.current = null;
      }
      try {
        recognition.abort?.();
        recognition.stop();
      } catch {
        // Ignore browser transition errors.
      }
      listeningHandlerRef.current(false);
      return;
    }

    enabledRef.current = true;
    try {
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.start();
    } catch {
      // The browser may still be finishing the previous session.
    }
  }

  const state = thinking ? "THINKING" : speaking ? "SPEAKING" : listening ? "LISTENING" : "READY";
  const helpText = waitingForCommandRef.current
    ? "ECHO heard the wake word. Say your command now."
    : "ECHO is waiting for the wake word. Say “ECHO” followed by a command.";

  return (
    <>
      <div className={`floatingAssistant ${expanded ? "expanded" : ""}`}>
        {expanded && (
          <div className="floatingAssistantPanel">
            <div>
              <span className="floatingEyebrow">ECHO ASSISTANT</span>
              <strong>{supported ? state : "VOICE UNAVAILABLE"}</strong>
              <p>{supported ? helpText : "Voice input is not supported by this browser."}</p>
            </div>
            <button type="button" className="floatingClose" onClick={() => setExpanded(false)} aria-label="Close ECHO assistant">×</button>
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
          aria-label={listening ? "Stop ECHO voice listening" : "Start ECHO voice listening"}
          title={listening ? "Listening for ECHO — click to stop" : "Start ECHO voice listening"}
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
        .floatingAssistant{position:fixed;right:22px;bottom:22px;z-index:5000;display:flex;flex-direction:column;align-items:flex-end;gap:10px}.floatingEcho{position:relative;width:78px;height:78px;padding:0;border:1px solid rgba(150,230,255,.65);border-radius:50%;background:transparent;color:#8ed8ff;box-shadow:0 0 22px rgba(30,150,255,.35),0 0 65px rgba(20,110,255,.18);transition:transform .2s ease,box-shadow .2s ease}.floatingEcho:hover{transform:scale(1.06);box-shadow:0 0 30px rgba(60,180,255,.55),0 0 80px rgba(20,110,255,.25)}.floatingBall{position:absolute;inset:6px;display:block;overflow:hidden;border-radius:50%;background:radial-gradient(circle at 32% 24%,#dff8ff 0%,#75d9ff 10%,#168cff 38%,#0751c7 68%,#032b78 100%);box-shadow:inset -10px -12px 18px rgba(0,20,80,.4),inset 8px 7px 15px rgba(220,250,255,.18);animation:floatingBounce 2.2s ease-in-out infinite}.floatingGlow{position:absolute;inset:-12px;border-radius:50%;background:rgba(70,180,255,.18);filter:blur(15px);animation:floatingPulse 2.5s ease-in-out infinite}.floatingHighlight{position:absolute;top:12px;left:14px;width:23px;height:12px;border-radius:50%;transform:rotate(-28deg);background:rgba(235,252,255,.7);filter:blur(2px)}.floatingEye{position:absolute;top:29px;width:6px;height:9px;border-radius:50%;background:#e9fbff;box-shadow:0 0 5px rgba(210,247,255,.95)}.floatingEye.left{left:24px}.floatingEye.right{right:24px}.floatingMouth{position:absolute;left:50%;top:43px;width:22px;height:10px;transform:translateX(-50%);border-bottom:2px solid #e9fbff;border-radius:0 0 20px 20px}.floatingState{position:absolute;left:50%;bottom:-17px;transform:translateX(-50%);font-size:7px;font-weight:800;letter-spacing:1.5px;white-space:nowrap;text-shadow:0 0 8px rgba(90,190,255,.8)}.floatingEcho.listening .floatingBall{animation:floatingListen .55s ease-in-out infinite alternate}.floatingEcho.listening{box-shadow:0 0 35px rgba(70,210,255,.75),0 0 90px rgba(20,140,255,.35)}.floatingEcho.thinking .floatingBall{animation:floatingThink .8s ease-in-out infinite alternate}.floatingEcho.speaking .floatingMouth{width:19px;height:8px;border:2px solid #e9fbff;border-top:0;animation:floatingTalk .18s ease-in-out infinite alternate}.floatingAssistantPanel{width:250px;padding:13px 14px;border:1px solid rgba(120,190,255,.16);border-radius:14px;background:rgba(5,9,13,.94);box-shadow:0 15px 45px rgba(0,0,0,.4),0 0 25px rgba(40,150,255,.08);backdrop-filter:blur(14px);display:flex;justify-content:space-between;gap:12px}.floatingEyebrow{display:block;margin-bottom:4px;color:#63808d;font-size:8px;letter-spacing:2px}.floatingAssistantPanel strong{color:#aee4f7;font-size:11px;letter-spacing:1px}.floatingAssistantPanel p{margin-top:5px;color:#67808a;font-size:10px;line-height:1.4}.floatingClose{width:26px;height:26px;border-radius:7px;background:#10171c;color:#8ca5af;font-size:18px}@keyframes floatingBounce{0%,100%{transform:translateY(3px)}50%{transform:translateY(-5px)}}@keyframes floatingPulse{0%,100%{opacity:.45;transform:scale(.92)}50%{opacity:.9;transform:scale(1.08)}}@keyframes floatingListen{from{transform:scale(.96)}to{transform:scale(1.05)}}@keyframes floatingThink{from{transform:scale(.95) rotate(-2deg)}to{transform:scale(1.04) rotate(2deg)}}@keyframes floatingTalk{from{transform:translateX(-50%) scaleY(.65)}to{transform:translateX(-50%) scaleY(1.3)}}@media(max-width:850px){.floatingAssistant{right:14px;bottom:74px}.floatingEcho{width:68px;height:68px}.floatingEye{top:26px}.floatingEye.left{left:21px}.floatingEye.right{right:21px}.floatingMouth{top:39px}}
      `}</style>
    </>
  );
}
