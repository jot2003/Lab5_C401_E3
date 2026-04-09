import { NextRequest, NextResponse } from "next/server";
import { streamAgent } from "@/lib/ai/agent";

export type ChatRequestBody = {
  message: string;
  history?: { role: "user" | "model"; text: string }[];
  aiConfig?: { provider: "gemini" | "chatgpt"; apiKey?: string };
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ChatRequestBody;
    const provider = body.aiConfig?.provider;
    const aiConfig =
      provider === "gemini" || provider === "chatgpt"
        ? { provider, apiKey: body.aiConfig?.apiKey?.trim() || undefined }
        : undefined;

    if (!body.message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of streamAgent(body.message, body.history || [], aiConfig)) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : "Agent error";
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error", message })}\n\n`)
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("[/api/chat] Error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
