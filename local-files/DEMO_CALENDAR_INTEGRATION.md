# Schedule Demo – Google Calendar & Meet Integration

The **Schedule a demo** flow (navbar **Demo** button) is implemented in the UI: users pick a date/time, then enter name and email. To actually create events and send Google Meet links, you need to connect your calendar (svdvw50@gmail.com) with a backend.

## What you need

1. **Google Cloud project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a project (or use an existing one).

2. **Enable APIs**
   - **Google Calendar API** – to create events and add them to your calendar and the attendee’s.
   - **Google Meet** – Meet links are created automatically when you create a Calendar event with `conferenceData` (see below). No separate “Meet API” enable is required; Calendar API is enough.

3. **OAuth 2.0 credentials (for your Gmail)**
   - In Cloud Console: **APIs & Services → Credentials → Create credentials → OAuth client ID**.
   - Application type: **Web application** (or **Desktop** for local testing).
   - Add authorized redirect URIs for your app (e.g. `http://localhost:3000/api/auth/callback` for dev).
   - Download the client JSON and store the **Client ID** and **Client secret** in environment variables (e.g. `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`). Never commit these to git.

4. **OAuth consent and scopes**
   - Scopes to request:
     - `https://www.googleapis.com/auth/calendar` (create/update events).
     - `https://www.googleapis.com/auth/calendar.events` (if you need more granular control).
   - Run the OAuth flow once with your svdvw50@gmail.com account and store the **refresh token** securely (e.g. in env or a secrets store). The backend will use this to create events as you.

5. **Backend API route**
   - Add a server route (e.g. `POST /api/schedule-demo`) that:
     - Accepts: `{ date, time, name, email }` (and optionally timezone).
     - Converts `date` + `time` to a start/end `DateTime` (e.g. 30 min duration).
     - Calls Google Calendar API to create an event with:
       - **Summary**: e.g. “Wilmo demo – [name]”
       - **Attendees**: `[{ email: attendeeEmail }]` and optionally your svdvw50@gmail.com.
       - **conferenceData**: request a **Google Meet** link (see [Calendar API docs](https://developers.google.com/calendar/api/guides/create-events#conference)).
     - Returns the created event (or the Meet link) so the frontend can show a confirmation.

6. **Sending the Meet link to the attendee**
   - When you create the event with the attendee’s email, Google Calendar automatically sends a calendar invite to that email (including the Meet link). No separate Gmail API is required for the invite.
   - Optionally, you can use **Gmail API** or a transactional email service (SendGrid, Resend, etc.) to send a custom “Your demo is scheduled” email that includes the same Meet link and details.

7. **Frontend**
   - In `components/ScheduleDemoModal.tsx`, replace the placeholder “Schedule demo” submit handler with a `fetch` to your `POST /api/schedule-demo` (or similar). On success, keep the current “You’re all set!” step; you can optionally display the Meet link or “Check your email” message.

## Summary

| Need | Purpose |
|------|--------|
| Google Cloud project | Enable Calendar API and create OAuth client |
| OAuth 2.0 (Client ID + Secret + Refresh token for svdvw50@gmail.com) | Let your backend create events as you |
| Backend route (e.g. `POST /api/schedule-demo`) | Create Calendar event with Meet link, add attendee |
| Calendar API event with `conferenceData` | Get a Google Meet link and send invite to attendee |
| (Optional) Gmail API or email service | Custom confirmation email with Meet link |

Once the backend is in place, wire `ScheduleDemoModal` to it and the demo will appear on your calendar and the attendee will receive the invite (and Meet link) by email.

---

## Re-authorize when you see "Calendar access expired"

If the modal shows **"Calendar access expired. Please re-authorize"** or the terminal shows **`invalid_grant`**, your **refresh token** is no longer valid. Get a new one:

1. **Google OAuth 2.0 Playground** (easiest):
   - Open [OAuth 2.0 Playground](https://developers.google.com/oauthplayground).
   - Click the gear (⚙️) and check **"Use your own OAuth credentials"**.
   - Enter your **Client ID** and **Client secret** (same as in `.env.local`).
   - In the left list, under **Calendar API v3**, select **`https://www.googleapis.com/auth/calendar`**.
   - Click **"Authorize APIs"** and sign in with **svdvw50@gmail.com** (or the Gmail you use for the calendar).
   - Click **"Exchange authorization code for tokens"**.
   - Copy the **refresh_token** from the response (long string starting with `1//`).
   - Put it in `.env.local` as `GOOGLE_REFRESH_TOKEN=<paste_the_new_token_here>`, then restart the dev server.

2. **If the refresh token keeps expiring**: Use a **Desktop** OAuth client in Google Cloud Console and run the OAuth flow from a small script (or an app route) that saves the refresh token. For production, consider a proper OAuth callback route so users can re-authorize from the app.

### Why you might still get `invalid_grant` after pasting a new token

- **Redirect URI for OAuth Playground**  
  If you use [OAuth 2.0 Playground](https://developers.google.com/oauthplayground) with “Use your own OAuth credentials”, your **OAuth 2.0 Client** (Web application) in [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials) must have this **Authorized redirect URI**:
  - `https://developers.google.com/oauthplayground`  
  Add it, save, then in Playground use the same Client ID and Client secret as in `.env.local`, authorize again, exchange the code for tokens, and copy the new **refresh_token**.

- **Client ID and Client secret must match**  
  The refresh token is tied to the OAuth client. `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env.local` must be exactly the ones from the same OAuth client you use in Playground (or in the app that obtained the token).

- **No quotes or extra spaces in `.env.local`**  
  Use one line, no quotes around the value:
  - `GOOGLE_REFRESH_TOKEN=1//04abc...`  
  Not `GOOGLE_REFRESH_TOKEN="1//04abc..."` and no space before or after `=`.

- **Token revoked**  
  If the user revokes access in [Google Account → Security → Third-party access](https://myaccount.google.com/connections) or changes password, the refresh token can be invalidated. Generate a new token (step 1 above) and update `.env.local`, then restart the dev server.
