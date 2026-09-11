"use client";

type MessageProps = {
  role: "user" | "assistant";
  content: string;
};

type Block =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "quote"; text: string }
  | { type: "code"; text: string }
  | { type: "table"; headers: string[]; rows: string[][] };

function cleanText(text: string) {
  return text
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/&nbsp;/gi, " ")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .trim();
}

function splitTableRow(line: string) {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((cell) => cell.trim());
}

function isTableSeparator(line: string) {
  const cells = splitTableRow(line);
  return cells.length >= 2 && cells.every((cell) => /^:?-{2,}:?$/.test(cell));
}

function isPipeRow(line: string) {
  return line.includes("|") && splitTableRow(line).length >= 2;
}

function looksLikePipeTable(lines: string[], start: number) {
  if (!isPipeRow(lines[start])) return false;
  if (start + 1 < lines.length && isTableSeparator(lines[start + 1])) return true;
  let count = 0;
  for (let i = start; i < Math.min(lines.length, start + 8); i += 1) {
    if (isPipeRow(lines[i])) count += 1;
    else if (lines[i].trim()) break;
  }
  return count >= 3;
}

function parsePipeTable(lines: string[], start: number) {
  const first = splitTableRow(lines[start]);
  const hasSeparator = start + 1 < lines.length && isTableSeparator(lines[start + 1]);
  const headers = hasSeparator ? first : first.map((_, i) => `Column ${i + 1}`);
  let index = start + (hasSeparator ? 2 : 0);
  const rows: string[][] = hasSeparator ? [] : [first];
  while (index < lines.length && isPipeRow(lines[index]) && lines[index].trim()) {
    const cells = splitTableRow(lines[index]);
    if (cells.length >= 2) rows.push(cells.slice(0, headers.length));
    index += 1;
  }
  return { headers, rows, nextIndex: index };
}

function parseBlocks(content: string): Block[] {
  const lines = cleanText(content).replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let listItems: string[] = [];
  let index = 0;

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      const text = paragraph.join(" ").trim();
      if (text) blocks.push({ type: "paragraph", text });
      paragraph = [];
    }
  };

  const flushList = () => {
    if (listType && listItems.length > 0) blocks.push({ type: listType, items: [...listItems] });
    listType = null;
    listItems = [];
  };

  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) {
      flushParagraph();
      flushList();
      index += 1;
      continue;
    }

    if (line.startsWith("```") || line.startsWith("~~~")) {
      flushParagraph();
      flushList();
      const fence = line.slice(0, 3);
      index += 1;
      const codeLines: string[] = [];
      while (index < lines.length && !lines[index].trim().startsWith(fence)) {
        codeLines.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push({ type: "code", text: codeLines.join("\n") });
      continue;
    }

    if (looksLikePipeTable(lines, index)) {
      flushParagraph();
      flushList();
      const table = parsePipeTable(lines, index);
      blocks.push({ type: "table", headers: table.headers, rows: table.rows });
      index = table.nextIndex;
      continue;
    }

    const heading = line.match(/^#{1,3}\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({ type: "heading", text: heading[1] });
      index += 1;
      continue;
    }

    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      flushParagraph();
      flushList();
      blocks.push({ type: "quote", text: quote[1] });
      index += 1;
      continue;
    }

    const unordered = line.match(/^[-*•]\s+(.+)$/);
    if (unordered) {
      flushParagraph();
      if (listType !== "ul") {
        flushList();
        listType = "ul";
      }
      listItems.push(unordered[1]);
      index += 1;
      continue;
    }

    const ordered = line.match(/^\d+[.)]\s+(.+)$/);
    if (ordered) {
      flushParagraph();
      if (listType !== "ol") {
        flushList();
        listType = "ol";
      }
      listItems.push(ordered[1]);
      index += 1;
      continue;
    }

    flushList();
    paragraph.push(line);
    index += 1;
  }

  flushParagraph();
  flushList();
  return blocks;
}

function renderInline(text: string) {
  const normalized = cleanText(text);
  const tokenPattern = /(\[[^\]]+\]\(https?:\/\/[^\s)]+\)|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|`[^`]+`)/g;
  const parts = normalized.split(tokenPattern);

  return parts.flatMap((part, index) => {
    const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
    if (link) return [<a key={index} href={link[2]} target="_blank" rel="noreferrer noopener">{link[1]}</a>];
    if ((part.startsWith("**") && part.endsWith("**")) || (part.startsWith("__") && part.endsWith("__"))) {
      return [<strong key={index}>{part.slice(2, -2)}</strong>];
    }
    if ((part.startsWith("*") && part.endsWith("*")) || (part.startsWith("_") && part.endsWith("_"))) {
      return [<em key={index}>{part.slice(1, -1)}</em>];
    }
    if (part.startsWith("`") && part.endsWith("`")) return [<code key={index}>{part.slice(1, -1)}</code>];
    return [<span key={index}>{part}</span>];
  });
}

export default function Message({ role, content }: MessageProps) {
  if (!content || !content.trim()) return null;
  const blocks = parseBlocks(content);
  const hasSources = /(^|\n)#{2,3}\s+Sources checked/i.test(content);

  return (
    <article className={`message ${role === "user" ? "user" : "ai"}`}>
      <div className="messageLabel"><span className="labelDot" />{role === "user" ? "YOU" : "ECHO"}</div>
      <div className={`messageContent${hasSources ? " hasSources" : ""}`}>
        {blocks.map((block, index) => {
          if (block.type === "heading") return <h3 key={index}>{renderInline(block.text)}</h3>;
          if (block.type === "ul") return <ul key={index}>{block.items.map((item, i) => <li key={i}>{renderInline(item)}</li>)}</ul>;
          if (block.type === "ol") return <ol key={index}>{block.items.map((item, i) => <li key={i}>{renderInline(item)}</li>)}</ol>;
          if (block.type === "quote") return <blockquote key={index}>{renderInline(block.text)}</blockquote>;
          if (block.type === "code") return <pre key={index}><code>{block.text}</code></pre>;
          if (block.type === "table") {
            return <div className="tableWrap" key={index}><table><thead><tr>{block.headers.map((header, i) => <th key={i}>{renderInline(header)}</th>)}</tr></thead><tbody>{block.rows.map((row, r) => <tr key={r}>{block.headers.map((_, c) => <td key={c}>{renderInline(row[c] ?? "")}</td>)}</tr>)}</tbody></table></div>;
          }
          return <p key={index}>{renderInline(block.text)}</p>;
        })}
      </div>
      <style jsx>{`
        .message{position:relative;max-width:min(88%,820px);margin:0 0 18px;padding:18px 20px;border:1px solid rgba(142,216,255,.12);border-radius:20px;box-shadow:0 12px 34px rgba(0,0,0,.16);overflow:hidden}
        .message::after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(120deg,rgba(126,220,255,.025),transparent 45%)}
        .messageLabel{display:flex;align-items:center;gap:8px;margin-bottom:10px;font-size:9px;font-weight:800;letter-spacing:.2em;color:#82dcff}
        .labelDot{width:6px;height:6px;border-radius:50%;background:#78d9ff;box-shadow:0 0 10px rgba(120,217,255,.55)}
        .user{margin-left:auto;background:linear-gradient(145deg,rgba(14,61,53,.9),rgba(10,43,39,.92));border-color:rgba(80,255,202,.18)}
        .user .labelDot{background:#63f1c1;box-shadow:0 0 10px rgba(99,241,193,.45)}
        .ai{margin-right:auto;background:linear-gradient(145deg,rgba(18,27,34,.97),rgba(9,15,20,.97));border-color:rgba(126,220,255,.14)}
        .messageContent{position:relative;z-index:1;line-height:1.65;color:#dceff5;overflow-wrap:anywhere}
        .messageContent p{margin:0 0 13px}.messageContent p:last-child{margin-bottom:0}
        .messageContent h3{margin:17px 0 10px;font-size:14px;line-height:1.45;letter-spacing:.1em;color:#9ee7ff}.messageContent h3:first-child{margin-top:0}
        .messageContent ul,.messageContent ol{margin:9px 0 15px;padding-left:27px}.messageContent li{margin:7px 0;padding-left:5px}.messageContent li::marker{color:#79d9ff;font-weight:700}
        .messageContent a{color:#8edcff;text-decoration:underline;text-decoration-color:rgba(142,220,255,.42);text-underline-offset:3px}.messageContent a:hover{color:#d1f6ff}
        .messageContent em{color:#cfe7ed}.messageContent strong{color:#f1fbff;font-weight:750}
        .messageContent blockquote{margin:12px 0;padding:10px 14px;border-left:3px solid #63d6ff;border-radius:0 10px 10px 0;background:rgba(98,207,255,.045);color:#c9e6ee}
        .messageContent pre{margin:13px 0;padding:13px 14px;overflow:auto;border:1px solid rgba(142,216,255,.1);border-radius:11px;background:#070c10}.messageContent pre code{padding:0;background:none;color:#cfeef7;white-space:pre;font-size:12px}
        .messageContent code{padding:2px 6px;border-radius:6px;background:rgba(98,207,255,.08);color:#9ee7ff;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.9em}
        .hasSources h3{margin-top:21px;padding-top:13px;border-top:1px solid rgba(142,216,255,.12);font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:#7fdcff}
        .hasSources h3+ul{margin-top:6px}.hasSources h3+ul li{font-size:12px;margin:5px 0}
        .tableWrap{width:100%;overflow-x:auto;margin:14px 0 17px;border:1px solid rgba(142,216,255,.14);border-radius:13px;background:rgba(3,9,13,.62);-webkit-overflow-scrolling:touch;box-shadow:inset 0 1px rgba(255,255,255,.025)}
        .messageContent table{width:100%;border-collapse:separate;border-spacing:0;min-width:460px;font-size:13px}.messageContent th,.messageContent td{padding:11px 13px;text-align:left;vertical-align:top;border-bottom:1px solid rgba(142,216,255,.08)}.messageContent th+th,.messageContent td+td{border-left:1px solid rgba(142,216,255,.055)}
        .messageContent th{color:#a5eaff;font-size:10px;letter-spacing:.12em;text-transform:uppercase;background:rgba(98,207,255,.065);font-weight:800;white-space:nowrap}.messageContent td{color:#d8edf4;line-height:1.55}.messageContent tbody tr:nth-child(even){background:rgba(142,216,255,.022)}.messageContent tbody tr:last-child td{border-bottom:0}
        @media(max-width:850px){.message{max-width:94%;padding:16px 16px;border-radius:18px}.messageContent{line-height:1.6}.messageContent table{min-width:0;table-layout:fixed}.messageContent th,.messageContent td{padding:9px 8px;font-size:12px;overflow-wrap:anywhere}.messageContent th{font-size:9px}}
        @media(max-width:520px){.message{max-width:96%;margin-bottom:14px;padding:15px 14px}.messageLabel{margin-bottom:8px}.messageContent h3{font-size:12px}.messageContent ul,.messageContent ol{padding-left:23px}.messageContent li{padding-left:2px}}
      `}</style>
    </article>
  );
}
