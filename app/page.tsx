"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Header from "./components/Header";
import Chat, { ChatMessage } from "./components/Chat";
import InputBar from "./components/InputBar";
import VerityAvatar from "./components/VerityAvatar";
import FloatingAssistant from "./components/FloatingAssistant";
import ToolPermissions from "./components/ToolPermissions";
import { parseVoiceCommand } from "./lib/voiceCommandEngine";

// About ECHO creator identity is intentionally displayed as project metadata.
const ECHO_CREATOR = "Bryson Comfort";

// Existing page implementation remains unchanged; creator metadata is consumed by the About ECHO view.
