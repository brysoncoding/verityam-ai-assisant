export type VoiceCommandType =
  | "CHAT"
  | "OPEN_HUB"
  | "OPEN_TAB"
  | "TOGGLE_FLOATING"
  | "TOGGLE_VOICE"
  | "CLEAR_MEMORY"
  | "CALENDAR_ADD"
  | "CALENDAR_REMOVE"
  | "CALENDAR_LIST"
  | "MESSAGE"
  | "CALL"
  | "VOICEMAIL_SUMMARY"
  | "UNKNOWN";

export type VoiceCommand = {
  type: VoiceCommandType;
  raw: string;
  tab?: "CHAT" | "MEMORY" | "VOICE" | "SYSTEM" | "SETTINGS";
  enabled?: boolean;
  payload?: string;
  reply?: string;
};

const TAB_ALIASES: Record<string, VoiceCommand["tab"]> = {
  chat: "CHAT",
  home: "CHAT",
  memory: "MEMORY",
  memories: "MEMORY",
  voice: "VOICE",
  system: "SYSTEM",
  settings: "SETTINGS",
};

function normalize(input: string) {
  return input.trim()
    .replace(/^(hey|okay|ok)\s+echo[\s,:-]*/i, "")
    .replace(/^echo[\s,:-]*/i, "")
    .replace(/[.!?]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Converts natural-language ECHO commands into deterministic actions.
 * External actions are classified here but not executed until the
 * platform integrations are connected.
 */
export function parseVoiceCommand(input: string): VoiceCommand {
  const raw = input.trim();
  const command = normalize(raw);
  const lower = command.toLowerCase();

  if (!command) return { type: "UNKNOWN", raw };

  if (/^(open|show|go to|take me to)\s+(the\s+)?(hub|menu|navigation)$/.test(lower)) {
    return { type: "OPEN_HUB", raw, reply: "Opening the ECHO Hub." };
  }

  const tabMatch = lower.match(
    /^(open|show|go to|take me to)\s+(the\s+)?(chat|home|memory|memories|voice|system|settings)$/
  );
  if (tabMatch) {
    const tab = TAB_ALIASES[tabMatch[3]];
    if (tab) return { type: "OPEN_TAB", raw, tab, reply: `Opening ${tab.toLowerCase()}.` };
  }

  if (/^(turn|switch|set)\s+(the\s+)?floating\s+echo\s+(on|enable|enabled)$/.test(lower) ||
      /^enable\s+(the\s+)?floating\s+echo$/.test(lower)) {
    return { type: "TOGGLE_FLOATING", raw, enabled: true, reply: "Floating ECHO is on." };
  }
  if (/^(turn|switch|set)\s+(the\s+)?floating\s+echo\s+(off|disable|disabled)$/.test(lower) ||
      /^disable\s+(the\s+)?floating\s+echo$/.test(lower)) {
    return { type: "TOGGLE_FLOATING", raw, enabled: false, reply: "Floating ECHO is off." };
  }

  if (/^(turn|switch|set)\s+(voice|voice output)\s+(on|enable|enabled)$/.test(lower)) {
    return { type: "TOGGLE_VOICE", raw, enabled: true, reply: "Voice output is on." };
  }
  if (/^(turn|switch|set)\s+(voice|voice output)\s+(off|disable|disabled)$/.test(lower)) {
    return { type: "TOGGLE_VOICE", raw, enabled: false, reply: "Voice output is off." };
  }

  if (/^(clear|delete|erase)\s+(all\s+)?(my\s+)?memories$/.test(lower)) {
    return { type: "CLEAR_MEMORY", raw, reply: "I can clear your saved memories after confirmation." };
  }

  if (/^(what('?s| is)|show|list)\s+(on\s+)?(my\s+)?calendar$/.test(lower) ||
      /^what do i have (today|tomorrow)$/.test(lower)) {
    return { type: "CALENDAR_LIST", raw, payload: command, reply: "Calendar access is ready to connect." };
  }

  const addCalendar = command.match(/^(?:add|put|schedule|create)\s+(?:to|on|in)\s+(?:my\s+)?calendar\s+(.+)$/i) ||
    command.match(/^schedule\s+(.+)$/i);
  if (addCalendar?.[1]) {
    return { type: "CALENDAR_ADD", raw, payload: addCalendar[1].trim(), reply: `I heard the calendar event: ${addCalendar[1].trim()}.` };
  }

  const removeCalendar = command.match(/^(?:remove|delete|cancel)\s+(.+?)\s+(?:from|off)\s+(?:my\s+)?calendar$/i);
  if (removeCalendar?.[1]) {
    return { type: "CALENDAR_REMOVE", raw, payload: removeCalendar[1].trim(), reply: `I heard the calendar item to remove: ${removeCalendar[1].trim()}.` };
  }

  if (/^(?:summari[sz]e|read|check)\s+(?:my\s+)?voicemail(?:s)?$/i.test(command)) {
    return { type: "VOICEMAIL_SUMMARY", raw, reply: "Voicemail summarization is ready to connect." };
  }

  const messageMatch = command.match(/^(?:text|message|send a message to)\s+(.+)$/i);
  if (messageMatch?.[1]) {
    return { type: "MESSAGE", raw, payload: messageMatch[1].trim(), reply: `I heard the message request for ${messageMatch[1].trim()}.` };
  }

  const callMatch = command.match(/^(?:call|phone)\s+(.+)$/i);
  if (callMatch?.[1]) {
    return { type: "CALL", raw, payload: callMatch[1].trim(), reply: `I heard the call request for ${callMatch[1].trim()}.` };
  }

  return { type: "CHAT", raw, payload: command };
}

export function isLocalVoiceCommand(input: string): boolean {
  return parseVoiceCommand(input).type !== "CHAT";
}
