import { NextResponse } from "next/server";

export const runtime = "nodejs";

interface ApplicationPayload {
  childFirstName?: unknown;
  childLastName?: unknown;
  childDateOfBirth?: unknown;
  entryLevel?: unknown;
  parentFirstName?: unknown;
  parentLastName?: unknown;
  relationship?: unknown;
  email?: unknown;
  phone?: unknown;
  currentSchool?: unknown;
  notes?: unknown;
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

  const {
    childFirstName,
    childLastName,
    childDateOfBirth,
    entryLevel,
    parentFirstName,
    parentLastName,
    relationship,
    email,
    phone,
  } = payload as ApplicationPayload;

  const required = [
    childFirstName,
    childLastName,
    childDateOfBirth,
    entryLevel,
    parentFirstName,
    parentLastName,
    relationship,
    email,
    phone,
  ];

  if (
    required.some(
      (value) => typeof value !== "string" || value.trim().length === 0,
    ) ||
    typeof email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "Please complete all required fields correctly.",
      },
      { status: 400 },
    );
  }

  // Preview mode: applications are logged until a provider is configured.
  console.warn(
    `[APPLICATION-PREVIEW] ${parentFirstName} ${parentLastName} (${relationship}) <${email}> for ${childFirstName} ${childLastName} (${childDateOfBirth}) applying to ${entryLevel}`,
  );

  return NextResponse.json({ success: true });
}
