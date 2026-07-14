# Database Setup

## 1. Create MySQL Database

1. Open MySQL (command line, Workbench, or phpMyAdmin).
2. Run the schema file:

```bash
mysql -u YOUR_USER -p < database/schema.sql
```

Or paste the contents of `database/schema.sql` into your MySQL client.

## 2. Create a Database User (Optional)

For production, create a dedicated user:

```sql
CREATE USER 'ecommerce_app'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON ecommerce_support.* TO 'ecommerce_app'@'localhost';
FLUSH PRIVILEGES;
```

## 3. Configure `.env.local`

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Edit `.env.local` and set:

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Full connection string | `mysql://user:pass@localhost:3306/ecommerce_support` |
| `DB_HOST` | MySQL host | `localhost` |
| `DB_PORT` | MySQL port | `3306` |
| `DB_USER` | MySQL username | `root` or `ecommerce_app` |
| `DB_PASSWORD` | MySQL password | `your_password` |
| `DB_NAME` | Database name | `ecommerce_support` |
| `OPENAI_API_KEY` | OpenAI API key | `sk-...` |
| `AUTH_SECRET` | Secret for JWT signing (32+ chars) | `your-random-secret` |

## 4. Clear all data (fresh start)

**PowerShell / Windows** (recommended):

```bash
npm run db:clear
```

Or run the script directly:

```bash
node scripts/clear-db.js
```

**Bash / Mac / Linux**:

```bash
mysql -u root -p ecommerce_support < database/clear.sql
```

This truncates all tables but keeps the schema. Auth is now database-backed; clearing removes all users.

## 5. Migrations (existing database)

Run in order if your DB was created before these columns existed:

**001 – store_type on users:**
```bash
mysql -u root -p ecommerce_support < database/migrations/001_add_store_type.sql
```

**002 – forward_email on users; reply_text / replied_at on forwarded_conversations (for “forward to email” and support replies in chat):**
```bash
mysql -u root -p ecommerce_support < database/migrations/002_forward_email_and_replies.sql
```

## 6. Tables

| Table | Purpose |
|-------|---------|
| `users` | User accounts (email, plan, limits) |
| `chatbots` | Chatbots per user (website data, personality) |
| `conversations` | Chat sessions |
| `chat_messages` | Messages in each conversation |
| `forwarded_conversations` | Forwarded to email or ticket |
| `tickets` | Pro only: every query gets a ticket (AI resolved, forwarded, DB check, etc.) |
| `activity_log` | Recent activity |
| `conversation_usage` | Usage per month per user |
