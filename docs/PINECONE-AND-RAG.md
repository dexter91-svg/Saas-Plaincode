# Pinecone & RAG — What you need

## Flow in the app

1. **Preview your assistant** (Step 3) → **Continue to knowledge & memory**  
2. **Knowledge & memory** (Step 4) — RAG, uploads, system prompt, conversation memory, confidence threshold  
3. **Continue to integration** → **Integration** (Step 5) — **This is the integration page preview** where you copy the snippet and paste it on your store.  
4. When the AI is not confident (vector score &lt; threshold), it replies with “I’m not confident… let me connect you with support” and **forwards / creates a ticket**. The customer sees the same flow (form, ticket #, replies in chat).

So: **tickets are forwarded when the AI is not confident**, and the **integration page (snippet preview)** is **Step 5** — right after the Knowledge step.

---

## What to do in Pinecone

1. **Sign up** at [pinecone.io](https://www.pinecone.io/).
2. **Create an index**
   - **Dimension:** `1536` if you use OpenAI `text-embedding-3-small`, or `3072` for `text-embedding-3-large`.
   - **Metric:** `cosine`.
   - **Name:** e.g. `ecom-support` (you’ll put this in env as `PINECONE_INDEX_NAME`).
3. **Get credentials**
   - **API key:** Pinecone dashboard → API Keys → Create key → copy.
   - **Environment:** e.g. `us-east-1-aws` (shown in dashboard).
   - **Index name:** the name you gave the index (e.g. `ecom-support`).

---

## What the app needs (env vars)

Add to `.env.local` (and to Vercel/hosting env when you deploy):

| Variable | Example | Description |
|----------|---------|-------------|
| `PINECONE_API_KEY` | `your-pinecone-api-key` | From Pinecone → API Keys. |
| `PINECONE_INDEX_NAME` | `ecom-support` | Name of the index you created. |
| `PINECONE_ENVIRONMENT` | `us-east-1-aws` | Index environment (see Pinecone dashboard). |

When these are set, the app can:

- Store uploaded docs (manuals, policies, guides) as embeddings in Pinecone.
- Retrieve relevant chunks before answering the user.
- If the best match score is below a threshold, reply “I’m not confident…” and **forward to support / create a ticket** instead of guessing.

---

## Where is the integration page preview?

- **URL:** `/integration` (e.g. `https://your-app.com/integration`).
- **In the flow:** It is **Step 5: Install Widget**. You get there by:  
  **Preview your assistant** → **Continue to knowledge & memory** → **Knowledge & memory** → **Continue to integration** → **Integration (Step 5)**.  
  There you see the snippet to copy and the instructions. Tickets are created/forwarded when the AI is not confident; the integration page itself is where you get the widget snippet.
