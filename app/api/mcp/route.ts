import { createMcpHandler } from "mcp-handler";
import { z } from "zod";

export const runtime = "nodejs";

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "echo_chat",
      {
        title: "Chat with ECHO",
        description: "Send a message to the live ECHO assistant and receive its response.",
        inputSchema: z.object({
          message: z.string().min(1).max(12000),
        }),
      },
      async ({ message }) => {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://verityam-ai-assisant.vercel.app";
        const response = await fetch(new URL("/api/chat", baseUrl), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, memories: [] }),
        });
        const payload = (await response.json().catch(() => ({}))) as { reply?: string };
        if (!response.ok) {
          return {
            isError: true,
            content: [{ type: "text", text: payload.reply || `ECHO chat failed with HTTP ${response.status}.` }],
          };
        }
        return {
          content: [{ type: "text", text: payload.reply || "ECHO returned an empty response." }],
        };
      },
    );

    server.registerTool(
      "echo_generate_image",
      {
        title: "Generate an image with ECHO",
        description: "Ask ECHO's existing image-generation service to create an image.",
        inputSchema: z.object({
          prompt: z.string().min(1).max(4000),
        }),
      },
      async ({ prompt }) => {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://verityam-ai-assisant.vercel.app";
        const response = await fetch(new URL("/api/image", baseUrl), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
        });
        const payload = (await response.json().catch(() => ({}))) as { imageUrl?: string; error?: string };
        if (!response.ok || !payload.imageUrl) {
          return {
            isError: true,
            content: [{ type: "text", text: payload.error || `ECHO image generation failed with HTTP ${response.status}.` }],
          };
        }
        return {
          content: [
            { type: "text", text: `ECHO generated the image for: ${prompt}` },
            { type: "text", text: payload.imageUrl },
          ],
        };
      },
    );

    server.registerTool(
      "echo_health",
      {
        title: "Check ECHO health",
        description: "Check whether the live ECHO deployment is reachable.",
        inputSchema: z.object({}),
      },
      async () => {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://verityam-ai-assisant.vercel.app";
        const response = await fetch(new URL("/", baseUrl), { method: "GET" });
        return {
          content: [
            {
              type: "text",
              text: response.ok
                ? `ECHO is reachable. HTTP ${response.status} from ${baseUrl}.`
                : `ECHO is reachable but returned HTTP ${response.status} from ${baseUrl}.`,
            },
          ],
        };
      },
    );
  },
  {
    serverInfo: { name: "ECHO / Verityam MCP", version: "0.1.0" },
  },
);

export { handler as GET, handler as POST };