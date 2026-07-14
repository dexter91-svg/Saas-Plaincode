import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

export const runtime = "nodejs";
export const maxDuration = 30;

const DEMO_DURATION_MINUTES = 30;

function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Missing Google env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN"
    );
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    "https://developers.google.com/oauthplayground" // redirect not used when only refresh_token
  );
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const date = typeof body.date === "string" ? body.date.trim() : "";
    const time = typeof body.time === "string" ? body.time.trim() : "";

    if (!name || !email || !date || !time) {
      return NextResponse.json(
        { error: "Missing required fields: name, email, date, time" },
        { status: 400 }
      );
    }

    const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";

    const [year, month, day] = date.split("-").map(Number);
    const [hour, minute] = time.split(":").map(Number);
    if (
      !year ||
      !month ||
      !day ||
      hour === undefined ||
      minute === undefined
    ) {
      return NextResponse.json(
        { error: "Invalid date or time format" },
        { status: 400 }
      );
    }

    const timeZone = typeof body.timeZone === "string" && body.timeZone
      ? body.timeZone
      : process.env.GOOGLE_CALENDAR_TIMEZONE || "UTC";

    const startDateTime = `${date}T${time.padStart(5, "0")}:00`;
    const startDate = new Date(year, month - 1, day, hour, minute, 0);
    const endDate = new Date(
      startDate.getTime() + DEMO_DURATION_MINUTES * 60 * 1000
    );
    const endDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;
    const endTimeStr = `${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}:00`;
    const endDateTime = `${endDateStr}T${endTimeStr}`;

    if (startDate.getTime() < Date.now()) {
      return NextResponse.json(
        { error: "Demo must be scheduled in the future" },
        { status: 400 }
      );
    }

    const auth = getOAuth2Client();
    const calendar = google.calendar({ version: "v3", auth });

    const requestId = `demo-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    const event = {
      summary: `Wilmo demo – ${name}`,
      description: `Scheduled demo with ${name} (${email}).`,
      start: {
        dateTime: startDateTime,
        timeZone,
      },
      end: {
        dateTime: endDateTime,
        timeZone,
      },
      attendees: [{ email }],
      conferenceData: {
        createRequest: {
          requestId,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    };

    const res = await calendar.events.insert({
      calendarId,
      conferenceDataVersion: 1,
      requestBody: event,
    });

    const meetLink =
      res.data.conferenceData?.entryPoints?.find(
        (e) => e.entryPointType === "video"
      )?.uri || res.data.hangoutLink || null;

    return NextResponse.json({
      success: true,
      meetLink,
      eventId: res.data.id,
      start: res.data.start?.dateTime,
      end: res.data.end?.dateTime,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Schedule demo API error:", err);

    if (
      message.includes("Missing Google env") ||
      message.includes("GOOGLE_")
    ) {
      return NextResponse.json(
        { error: "Calendar integration is not configured." },
        { status: 503 }
      );
    }
    if (message.includes("invalid_grant") || message.includes("Refresh token")) {
      return NextResponse.json(
        { error: "Calendar access expired. Please re-authorize." },
        { status: 503 }
      );
    }
    if (message.includes("invalid") || message.includes("401") || message.includes("403")) {
      return NextResponse.json(
        { error: "Could not create calendar event. Please try again later." },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { error: "Failed to schedule demo. Please try again." },
      { status: 500 }
    );
  }
}
