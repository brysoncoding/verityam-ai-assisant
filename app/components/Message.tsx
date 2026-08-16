"use client";

type MessageProps = {
  role: "user" | "assistant";
  content: string;
};

type Block =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] };

function normalizeListFormatting(content: string): string {
  return content
    .replace(/\r\n/g, "\n")
    .replace(/([.!?:])\s+(?=\d+[.)]\s+)/g, "$1\n")
    .replace(/([.!?:])\s+(?=[-*•]\s+)/g, "$1\n");
}

function shouldRenderOrderedItemsAsBullets(items: string[]): boolean {
  return items.length > 1 && items.every((item) => /\?\s*$/.test(item));
}

function parseBlocks(content: string): Block[] {
  const lines = normalizeListFormatting(content).split("\n");
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let listItems: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ type: "paragraph", text: paragraph.join(" ").trim() });
      paragraph = [];
    }
  };

  const flushList = () => {
    if (listType && listItems.length > 0) {
      const type = listType === "ol" && shouldRenderOrderedItemsAsBullets(listItems) ? "ul" : listType;
      blocks.push({ type, items: [...listItems] });
    }
    listType = null;
    listItems = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = line.match(/^#{1,3}\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({ type: "heading", text: heading[1] });
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
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();
  return blocks;
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }

    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={index}>{part.slice(1, -1)}</code>;
    }

    return <span key={index}>{part}</span>;
  });
}

export default function Message({ role, content }: MessageProps) {
  const blocks = parseBlocks(content);

  return (
    <article className={`message ${role === "user" ? "user" : "ai"}`}>
      <strong>{role === "user" ? "You" : "ECHO"}</strong>

      <div className="messageContent">
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

          return <p key={index}>{renderInline(block.text)}</p>;
        })}
      </div>

      <style jsx>{`
        .messageContent{margin-top:6px;line-height:1.55;overflow-wrap:anywhere}
        .messageContent p{margin:0 0 10px}
        .messageContent p:last-child{margin-bottom:0}
        .messageContent h3{margin:12px 0 7px;font-size:13px;letter-spacing:.05em;color:#e9fbff}
        .messageContent ul,.messageContent ol{margin:7px 0 12px;padding-left:24px}
        .messageContent li{margin:5px 0;padding-left:3px}
        .messageContent code{padding:2px 5px;border-radius:5px;background:rgba(98,207,255,.09);color:#9ee6ff;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.92em}
      `}</style>
    </article>
  );
}
