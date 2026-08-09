"use client";

import { useEffect, useRef } from "react";

type FloatingAssistantProps = {
  listening: boolean;
  thinking: boolean;
  speaking: boolean;
  onListeningChange: (value: boolean) => void;
  onVoiceCommand: (text: string) => void;
};

type SimpleRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: unknown) => void) | null;
  onresult: ((event: { results: ArrayLike<{ [index: number]: { transcript?: string } }> }) => void) | null;
};

type RecognitionFactory = new () => SimpleRecognition;

export default function FloatingAssistant({ listening, thinking, speaking, onListeningChange, onVoiceCommand }: FloatingAssistantProps) {
  const recognitionRef = useRef<SimpleRecognition | null>(null);
  const handlersRef = useRef({ onListeningChange, onVoiceCommand });
  handlersRef.current = { onListeningChange, onVoiceCommand };

  useEffect(() => {
    const browserWindow = window as Window & {
      SpeechRecognition?: RecognitionFactory;
      webkitSpeechRecognition?: RecognitionFactory;
    };
    const Recognition = browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition;
    if (!Recognition) return;

    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onstart = () => handlersRef.current.onListeningChange(true);
    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i += 1) {
        transcript += event.results[i]?.[0]?.transcript ?? "";
      }
      if (transcript.trim()) handlersRef.current.onVoiceCommand(transcript.trim());
    };
    recognition.onend = () => handlersRef.current.onListeningChange(false);
    recognition.onerror = () => handlersRef.current.onListeningChange(false);
    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, []);

  const toggleListening = () => {
    const recognition = recognitionRef.current;
    if (!recognition || thinking || speaking) return;
    if (listening) {
      recognition.stop();
      return;
    }
    try {
      recognition.start();
    } catch {
      // Recognition may already be starting.
    }
  };

  const state = thinking ? "THINKING" : speaking ? "SPEAKING" : listening ? "LISTENING" : "READY";

  return (
    <div className="floatingAssistant">
      <button type="button" className={`floatingEcho ${listening ? "listening" : ""} ${thinking ? "thinking" : ""} ${speaking ? "speaking" : ""}`} onClick={toggleListening} aria-label={listening ? "Stop listening to ECHO" : "Talk to ECHO"} title={listening ? "Stop listening" : "Talk to ECHO"}>
        <span className="floatingGlow" />
        <span className="floatingBall"><span className="floatingHighlight" /><span className="floatingEye left" /><span className="floatingEye right" /><span className="floatingMouth" /></span>
        <span className="floatingState">{state}</span>
      </button>
      <style jsx>{`
        .floatingAssistant{position:fixed;right:22px;bottom:22px;z-index:5000}.floatingEcho{position:relative;width:78px;height:78px;padding:0;border:1px solid rgba(150,230,255,.65);border-radius:50%;background:transparent;color:#8ed8ff;cursor:pointer;box-shadow:0 0 22px rgba(30,150,255,.35),0 0 65px rgba(20,110,255,.18);transition:transform .2s ease,box-shadow .2s ease}.floatingEcho:hover{transform:scale(1.06);box-shadow:0 0 30px rgba(60,180,255,.55),0 0 80px rgba(20,110,255,.25)}.floatingBall{position:absolute;inset:6px;display:block;overflow:hidden;border-radius:50%;background:radial-gradient(circle at 32% 24%,#dff8ff 0%,#75d9ff 10%,#168cff 38%,#0751c7 68%,#032b78 100%);box-shadow:inset -10px -12px 18px rgba(0,20,80,.4),inset 8px 7px 15px rgba(220,250,255,.18);animation:floatingBounce 2.2s ease-in-out infinite}.floatingGlow{position:absolute;inset:-12px;border-radius:50%;background:rgba(70,180,255,.18);filter:blur(15px);animation:floatingPulse 2.5s ease-in-out infinite}.floatingHighlight{position:absolute;top:12px;left:14px;width:23px;height:12px;border-radius:50%;transform:rotate(-28deg);background:rgba(235,252,255,.7);filter:blur(2px)}.floatingEye{position:absolute;top:29px;width:6px;height:9px;border-radius:50%;background:#e9fbff;box-shadow:0 0 5px rgba(210,247,255,.95)}.floatingEye.left{left:24px}.floatingEye.right{right:24px}.floatingMouth{position:absolute;left:50%;top:43px;width:22px;height:10px;transform:translateX(-50%);border-bottom:2px solid #e9fbff;border-radius:0 0 20px 20px}.floatingState{position:absolute;left:50%;bottom:-17px;transform:translateX(-50%);font-size:7px;font-weight:800;letter-spacing:1.5px;white-space:nowrap;text-shadow:0 0 8px rgba(90,190,255,.8)}.floatingEcho.listening .floatingBall{animation:floatingListen .55s ease-in-out infinite alternate}.floatingEcho.listening{box-shadow:0 0 35px rgba(70,210,255,.75),0 0 90px rgba(20,140,255,.35)}.floatingEcho.thinking .floatingBall{animation:floatingThink .8s ease-in-out infinite alternate}.floatingEcho.speaking .floatingMouth{width:19px;height:8px;border:2px solid #e9fbff;border-top:0;animation:floatingTalk .18s ease-in-out infinite alternate}@keyframes floatingBounce{0%,100%{transform:translateY(3px)}50%{transform:translateY(-5px)}}@keyframes floatingPulse{0%,100%{opacity:.45;transform:scale(.92)}50%{opacity:.9;transform:scale(1.08)}}@keyframes floatingListen{from{transform:scale(.96)}to{transform:scale(1.05)}}@keyframes floatingThink{from{transform:scale(.95) rotate(-2deg)}to{transform:scale(1.04) rotate(2deg)}}@keyframes floatingTalk{from{transform:translateX(-50%) scaleY(.65)}to{transform:translateX(-50%) scaleY(1.3)}}@media(max-width:850px){.floatingAssistant{right:14px;bottom:74px}.floatingEcho{width:68px;height:68px}.floatingEye{top:26px}.floatingEye.left{left:21px}.floatingEye.right{right:21px}.floatingMouth{top:39px}}
      `}</style>
    </div>
  );
}
