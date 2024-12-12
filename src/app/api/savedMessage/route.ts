import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redisCache";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    const id = uuidv4();
    
    // Ensure messages is properly stringified before saving
    await redis.set(id, JSON.stringify(messages));
    
    return NextResponse.json({ id });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Failed to save message" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  
  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  const message = await redis.get(id);
  if (!message) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  return NextResponse.json({ message });
}
