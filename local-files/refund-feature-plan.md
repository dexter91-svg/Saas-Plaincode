# Refund Feature Plan & AI Model Notes

---

## Refund Flow — Build Steps

**Step 1 — Detection**
Customer types anything refund-related in chat → system recognises it → refund form appears instead of a normal AI reply.
- Test: Type "I want a refund" → form should appear

**Step 2 — Form works**
Customer fills in order number, amount, date, reason → hits submit → gets a response.
- Test: Fill and submit the form → no errors, gets a response

**Step 3 — Rules are applied**
Submitted form gets checked against what the merchant set in Settings → customer gets told approved or needs review.
- Test: Submit with $20, 5 days ago (within rules) → approved
- Test: Submit with $200, 60 days ago (outside rules) → escalated

**Step 4 — Merchant sees it**
After approval or escalation, merchant sees a ticket appear in the escalations dashboard with high priority.
- Test: After any refund submission → check dashboard → ticket is there

**Step 5 — Full flow end to end**
Real customer conversation → detects refund → form → decision → merchant notified. Everything works together smoothly.
- Test: Do the whole thing from scratch as if you're a real customer

---

## Refund Flow — How It Works

1. Customer sends a message
2. AI reads it — one small call just to classify intent (refund / question / human / other)
3. If intent = refund → AI stops, system takes over
4. Refund form appears in chat (order number, amount, date, reason)
5. System checks against merchant's rules (no AI needed):
   - Amount within limit AND within return window → auto-approve
   - Otherwise → escalate to high-priority ticket
6. Merchant gets notified via escalations dashboard

### Future upgrade (when store is connected)
- Instead of trusting customer's claimed amount/date, system queries merchant's API to verify actual order data
- Same rule check, but bulletproof

---

## AI Models Considered

| Model | Speed | Quality | Cost | Notes |
|---|---|---|---|---|
| gpt-4o-mini | Fast | Great for support | Very cheap | Recommended short term — one line change |
| gpt-4o | Medium | Excellent | Mid | Current default |
| Claude Haiku 4.5 | Fastest | Good, concise | Cheapest | Best long-term option for chat |
| Claude Sonnet | Medium | Excellent | Mid | Good middle ground |
| Gemini 1.5 Flash | Fast | Good | Very cheap | Alternative option |

---

## Model Decision

**Short term (now):**
- Get new OpenAI key
- Switch to `gpt-4o-mini` — one line in `.env.local`:
  ```
  OPENAI_MODEL=gpt-4o-mini
  ```
- No code changes needed

**Long term (at scale):**
- Chat replies → Claude Haiku (Anthropic key)
- Embeddings → keep OpenAI (cheap, rarely called)
- Two API keys required for this setup

---

## Notes

- "HiQ" mentioned = Claude Haiku (Anthropic's fastest/cheapest model)
- RAG/embeddings use OpenAI separately from chat replies
- Full Claude swap deferred until scale justifies the effort
- Refund import from policy text: replacing AI extraction with regex (no API call needed)
