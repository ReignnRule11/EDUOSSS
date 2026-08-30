import { NextResponse } from "next/server";

export const runtime = "nodejs";

interface ContactPayload {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  subject?: unknown;
  message?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON body." },
      { status: 400 },
    );
  }

  if (!isRecord(payload)) {
    return NextResponse.json(
      { success: false, message: "Invalid request body." },
      { status: 400 },
    );
  }

  const { name, email, subject, message } = payload as ContactPayload;

  if (
    typeof name !== "string" ||
    name.trim().length < 2 ||
    typeof email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    typeof subject !== "string" ||
    subject.trim().length < 2 ||
    typeof message !== "string" ||
    message.trim().length < 10
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "Please complete all required fields correctly.",
      },
      { status: 400 },
    );
  }

  // Preview mode: submissions are logged until a provider is configured.
  console.warn(`[CONTACT-PREVIEW] ${name} <${email}> | ${subject}\n${message}`);

  return NextResponse.json({ success: true });
}
