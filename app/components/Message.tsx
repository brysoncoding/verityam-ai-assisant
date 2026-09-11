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
  | { type: "table"; headers: string[]; rows: string[][] };

function splitTableRow(line: string) {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((cell) => cell.trim());
}

function isTableSeparator(line: string) {
  const cells = splitTableRow(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{2,}:?$/.test(cell));
}

function isTableRow(line: string) {
  return line.includes("|") && splitTableRow(line).length >= 2;
}

function cleanText(text: string) {
  return text
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+\n/g, "\n")
    .trim();
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
    if (listType && listItems.length > 0) {
      blocks.push({ type: listType, items: [...listItems] });
    }
    listType = null;
    listItems = [];
  };

  while (index < lines.length) {
    const rawLine = lines[index];
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      index += 1;
      continue;
    }

    if (isTableRow(line) && index + 1 < lines.length && isTableSeparator(lines[index + 1])) {
      flushParagraph();
      flushList();
      const headers = splitTableRow(line);
      index += 2;
      const rows: string[][] = [];
      while (index < lines.length && isTableRow(lines[index]) && lines[index].trim()) {
        const cells = splitTableRow(lines[index]);
        if (cells.length >= 2) rows.push(cells.slice(0, headers.length));
        index += 1;
      }
      blocks.push({ type: "table", headers, rows });
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
  const tokenPattern = /(\[[^\]]+\]\(https?:\/\/[^\s)]+\)|\*\*[^*]+\*\*|`[^`]+`)/g;
  const parts = normalized.split(tokenPattern);

  return parts.flatMap((part, index) => {
    const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
    if (link) {
      return [
        <a key={index} href={link[2]} target="_blank" rel="noreferrer noopener">
          {link[1]}
        </a>,
      ];
    }

    if (part.startsWith("**") && part.endsWith("**")) {
      return [<strong key={index}>{part.slice(2, -2)}</strong>];
    }

    if (part.startsWith("`") && part.endsWith("`")) {
      return [<code key={index}>{part.slice(1, -1)}</code>];
    }

    const lines = part.split("\n");
    return lines.flatMap((line, lineIndex) =>
      lineIndex === 0
        ? [<span key={`${index}-${lineIndex}`}>{line}</span>]
        : [<br key={`${index}-br-${lineIndex}`} />, <span key={`${index}-${lineIndex}`}>{line}</span>],
    );
  });
}

export default function Message({ role, content }: MessageProps) {
  if (!content || !content.trim()) return null;

  const blocks = parseBlocks(content);
  const hasSources = /###\s+Sources checked/i.test(content);

  return (
    <article className={`message ${role === "user" ? "user" : "ai"}`}>
      <strong>{role === "user" ? "You" : "ECHO"}</strong>

      <div className={`messageContent${hasSources ? " hasSources" : ""}`}>
        {blocks.map((block, index) => {
          if (block.type === "heading") {
            return <h3 key={index}>{renderInline(block.text)}</h3>;
          }

          if (block.type === "ul") {
            return (
              <ul key={index}>
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{renderInline(item)}</li>
                ))}
              </ul>
            );
          }

          if (block.type === "ol") {
            return (
              <ol key={index}>
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{renderInline(item)}</li>
                ))}
              </ol>
            );
          }

          if (block.type === "table") {
            return (
              <div className="tableWrap" key={index}>
                <table>
                  <thead>
                    <tr>
                      {block.headers.map((header, headerIndex) => (
                        <th key={headerIndex}>{renderInline(header)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {block.headers.map((_, cellIndex) => (
                          <td key={cellIndex}>{renderInline(row[cellIndex] ?? "")}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }

          return <p key={index}>{renderInline(block.text)}</p>;
        })}
      </div>

      <style jsx>{`
        .messageContent{margin-top:6px;line-height:1.55;overflow-wrap:anywhere}
        .messageContent p{margin:0 0 12px}
        .messageContent p:last-child{margin-bottom:0}
        .messageContent h3{margin:14px 0 9px;font-size:13px;line-height:1.4;letter-spacing:.08em;color:#e9fbff}
        .messageContent ul,.messageContent ol{margin:8px 0 14px;padding-left:25px}
        .messageContent li{margin:7px 0;padding-left:4px}
        .messageContent li::marker{color:#8ed8ff}
        .messageContent a{color:#8ed8ff;text-decoration:underline;text-decoration-color:rgba(142,216,255,.45);text-underline-offset:3px}
        .messageContent a:hover{color:#c8f2ff}
        .hasSources h3{margin-top:20px;padding-top:13px;border-top:1px solid rgba(142,216,255,.14);font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#8ed8ff}
        .hasSources h3+ul{margin-top:6px;padding-left:22px}
        .hasSources h3+ul li{font-size:12px;margin:4px 0}
        .tableWrap{width:100%;overflow-x:auto;margin:12px 0 16px;border:1px solid rgba(142,216,255,.16);border-radius:12px;background:rgba(5,12,16,.58);-webkit-overflow-scrolling:touch;box-shadow:0 8px 24px rgba(0,0,0,.16)}
        .messageContent table{width:100%;border-collapse:separate;border-spacing:0;min-width:420px;font-size:13px}
        .messageContent th,.messageContent td{padding:10px 12px;text-align:left;vertical-align:top;border-bottom:1px solid rgba(142,216,255,.09)}
        .messageContent th+th,.messageContent td+td{border-left:1px solid rgba(142,216,255,.07)}
        .messageContent th{color:#a7e8ff;font-size:10px;letter-spacing:.11em;text-transform:uppercase;background:rgba(98,207,255,.075);font-weight:800;white-space:nowrap}
        .messageContent td{color:#d8edf4;line-height:1.5}
        .messageContent tbody tr:last-child td{border-bottom:0}
        .messageContent tbody tr:nth-child(even){background:rgba(142,216,255,.025)}
        .messageContent code{padding:2px 5px;border-radius:5px;background:rgba(98,207,255,.09);color:#9ee6ff;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.92em}
        @media(max-width:640px){
          .messageContent table{min-width:0;table-layout:fixed}
          .messageContent th,.messageContent td{padding:9px 8px;font-size:12px;word-break:normal;overflow-wrap:anywhere}
          .messageContent th{font-size:9px}
        }
      `}</style>
    </article>
  );
}
