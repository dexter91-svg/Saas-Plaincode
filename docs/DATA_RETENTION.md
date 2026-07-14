# Data retention and deletion

## Retention policy

- **Conversations and chat messages**: Retained until the account owner deletes their account or requests deletion. No automatic purge by default.
- **Forwarded conversations and tickets**: Same as above; tied to the user account and conversation lifecycle.
- **Activity and usage logs**: Retained for the life of the account; removed when the account is deleted.

You can enforce automatic retention (e.g. delete conversations older than 90 days) by running a scheduled job that deletes or anonymizes rows; this is not implemented by default.

## Delete my data

Users can request deletion of all their data:

1. **Authenticated "delete my data"**: Call `POST /api/account/delete-my-data` while logged in. This permanently deletes the user account and all associated data (chatbots, conversations, chat messages, forwarded conversations, tickets, activity log, usage). The action is irreversible.

2. **Compliance**: Use this flow to satisfy "right to erasure" / "delete my data" requests. After deletion, the user is logged out and must sign up again to use the service.
