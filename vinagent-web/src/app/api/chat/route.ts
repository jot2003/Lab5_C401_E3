import { NextRequest, NextResponse } from "next/server";
import { runAgent, type AgentResponse } from "@/lib/ai/agent";

export type ChatRequestBody = {
  message: string;
  history?: { role: "user" | "model"; text: string }[];
};

export type ChatResponseBody = AgentResponse;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ChatRequestBody;

    if (!body.message?.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const result = await runAgent(body.message, body.history || []);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[/api/chat] Error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
