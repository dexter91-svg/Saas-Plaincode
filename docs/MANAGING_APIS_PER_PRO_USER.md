# Different users, different API endpoints for their databases

Each customer (Pro or Free) may have **their own database or backend API** (products, orders, inventory). The chatbot should call **that user’s** API when answering **their** visitors — not someone else’s.

## How we manage it

- **One table, one row per endpoint per user (or per chatbot):**  
  `user_external_endpoints` stores each user’s API endpoints for their databases.

| Column        | Purpose |
|---------------|--------|
| `user_id`     | Which account this endpoint belongs to. |
| `chatbot_id`  | Optional: if set, only this chatbot uses it; else all chatbots of this user. |
| `name`        | Label, e.g. "Products API", "Orders API". |
| `base_url`    | Their API base URL, e.g. `https://api.theirstore.com`. |
| `auth_type`   | `none`, `bearer`, `api_key_header`, or `basic`. |
| `auth_value`  | Token or key (store encrypted in production). |

- **When a chat message comes in:**  
  The request has `chatbotId` → we know the **user** (and which chatbot). We load **that user’s** (or that chatbot’s) rows from `user_external_endpoints` and use those URLs and auth to call **their** APIs. No mixing between users.

So: **different users have different API endpoints for their databases; we store them per user/chatbot and the chatbot uses only the endpoints for the current user.**

## Migration

Run the migration that creates this table:

```bash
# If you use a migration runner:
npm run db:migrate
```

Or run by hand:

```sql
-- See database/migrations/003_user_external_api_endpoints.sql
```

## In the chat flow (what to build next)

1. **Settings UI** – Let the user (in dashboard/settings) add/edit their “Database API” endpoints (name, base URL, auth). Save into `user_external_endpoints` with their `user_id` (and optionally `chatbot_id`).
2. **Chat API** – When handling a message:
   - Resolve `user_id` (and optionally `chatbot_id`) from `chatbotId`.
   - Load `user_external_endpoints` for that user/chatbot.
   - When the AI needs live data (e.g. “check order status”, “list products”), call **that user’s** endpoint(s) (with their auth), then pass the result into the model so the reply uses their data.
3. **Security** – Never use one user’s endpoints for another user’s chat; always filter by `user_id` (and `chatbot_id` if you use it). In production, encrypt `auth_value` at rest.

Once this table and the chat logic use it, every user’s chatbot talks only to **their** database APIs.
