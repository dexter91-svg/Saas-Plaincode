const HUMAN_REQUEST_RE = new RegExp(
  [
    // "speak/talk/chat/connect to/with a human/agent/person/representative..."
    "(speak|talk|chat|connect)\\s+(to|with)\\s+(a\\s+|an\\s+)?(human|person|agent|representative|rep|staff|live\\s+agent|real\\s+person|someone|somebody)",
    // "want/need/like to speak to..."
    "(want|need|would\\s+like|can\\s+i\\s+get|get\\s+me)\\s+(to\\s+)?(speak|talk|chat|connect)\\s+(to|with)\\s+(a\\s+|an\\s+)?(human|person|agent|representative|rep|staff|live\\s+agent|real\\s+person|someone|somebody)",
    // "transfer/escalate/forward me to..."
    "(transfer|escalate|forward|put)\\s+(me\\s+)?(to\\s+|through\\s+to\\s+)?(a\\s+|an\\s+)?(human|person|agent|representative|rep|staff|live\\s+agent|real\\s+person|someone)",
    // "I want/need a human/agent"
    "i\\s+(want|need|require)\\s+(a\\s+|an\\s+)?(human|live\\s+agent|real\\s+agent|real\\s+person|actual\\s+person|agent)",
    // "let me talk to someone/a human"
    "let\\s+me\\s+(talk|speak|chat)\\s+(to|with)\\s+(a\\s+|an\\s+)?(human|person|agent|someone|somebody|real\\s+person)",
    // "live agent/support/chat/help"
    "live\\s+(agent|support|chat|help|person|representative)",
    // "real person/human/agent"
    "real\\s+(person|human|agent|support)",
    // "speak to someone"
    "speak\\s+to\\s+(someone|somebody|a\\s+person|a\\s+human|an\\s+agent)",
    // "can I speak to" / "can you connect me"
    "can\\s+(i\\s+speak|i\\s+talk|you\\s+connect\\s+me|you\\s+transfer\\s+me|you\\s+put\\s+me\\s+through)",
    // direct: "human agent", "human support"
    "human\\s+(agent|support|rep|representative|assistance|help)",
  ].join("|"),
  "i"
);

/** Returns true if the message content indicates the customer wants to speak to a human/agent. */
export function detectsHumanRequest(content: string): boolean {
  return HUMAN_REQUEST_RE.test(content);
}
