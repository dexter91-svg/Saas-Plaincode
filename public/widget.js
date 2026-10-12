(function () {
  var script = document.currentScript;
  if (!script) {
    var scripts = document.querySelectorAll('script[src*="widget.js"][data-bot-id]');
    script = scripts.length ? scripts[scripts.length - 1] : null;
  }
  if (!script) return;
  var botId = script.getAttribute("data-bot-id");
  var base = (script.src || "").replace(/\/widget\.js.*$/, "").replace(/\/$/, "");
  if (!botId || !base) return;

  var conversationId = null;
  var conversationStorageKey = "plainbot-conversation-id:" + botId;
  try {
    var savedCid = window.sessionStorage && window.sessionStorage.getItem(conversationStorageKey);
    if (savedCid && typeof savedCid === "string") conversationId = savedCid;
  } catch (e) {}

  var open = false;
  var root = null;
  var panel = null;
  var btn = null;
  var hasStartedChat = false;
  var lastSupportReplyShown = null;
  var supportReplyPollTimer = null;
  var waitNoticeLock = false;
  var showForwardForm = false;
  var forwardFormSubmitted = false;
  var historyDrawerOpen = false;
  var FORWARD_MARKER = "[FORWARD_TO_SUPPORT]";
  var lastThreadFingerprint = "";
  var widgetHandoffMode = "ai";
  var SUPPORT_WAIT_TEXT =
    "No one is available in chat right this moment. Your request has been sent to our team—they will follow up with you by email when they respond. Feel free to ask anything else here in the meantime.";

  var DEFAULT_INITIAL_CHIPS = [
    { id: "track", label: "Track Order", query: "Track order" },
    { id: "return", label: "Return Policy", query: "What is your return policy?" },
    { id: "shipping", label: "Shipping Info", query: "What are your shipping rates and times?" }
  ];

  var LOGO_DATA_URI =
    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCIgd2lkdGg9IjUxMiIgaGVpZ2h0PSI1MTIiPgogIDxkZWZzPgogICAgPGNsaXBQYXRoIGlkPSJhIj4KICAgICAgPHBvbHlnb24gcG9pbnRzPSItMTAsLTEwIDg1LC0xMCAtMTAsODUiIC8+CiAgICA8L2NsaXBQYXRoPgogICAgPGNsaXBQYXRoIGlkPSJiIj4KICAgICAgPHBvbHlnb24gcG9pbnRzPSI5MSwtMTAgMTAwLC0xMCAxMDAsMTAwIC0xMCwxMDAgLTEwLDkxIiAvPgogICAgPC9jbGlwUGF0aD4KICA8L2RlZnM+CiAgPHBhdGggY2xpcC1wYXRoPSJ1cmwoI2EpIiBkPSJNMTkuOCA0Ny44IEw3LjUgNTYuNSBMMTEuNCAzNi45IEEyMyAyMyAwIDEgMSAxOS44IDQ3LjggWiIgZmlsbD0iI0UwN0E0NSIgc3Ryb2tlPSIjRTA3QTQ1IiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIC8+CiAgPHBhdGggY2xpcC1wYXRoPSJ1cmwoI2IpIiBkPSJNMTkuOCA0Ny44IEw3LjUgNTYuNSBMMTEuNCAzNi45IEEyMyAyMyAwIDEgMSAxOS44IDQ3LjggWiIgZmlsbD0iIzFBMUExQSIgc3Ryb2tlPSIjMUExQTFBIiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIC8+Cjwvc3ZnPg==";

  var LOGO_SVG =
    '<img src="' +
    LOGO_DATA_URI +
    '" alt="Plainbot" class="plainbot-logo-img" style="display:block;width:100%;height:100%;object-fit:contain;pointer-events:none;"/>';

  var PLANE_SVG =
    '<svg viewBox="0.5 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true" style="display:block;margin:auto;">' +
    '<path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>' +
    '</svg>';

  var HUMAN_SVG =
    '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>' +
    '<circle cx="12" cy="7" r="4"/>' +
    '</svg>';

  var CLOSE_SVG =
    '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<line x1="18" y1="6" x2="6" y2="18"/>' +
    '<line x1="6" y1="6" x2="18" y2="18"/>' +
    '</svg>';

  var MINIMIZE_SVG = CLOSE_SVG;

  var HISTORY_SVG =
    '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>' +
    '<path d="M3 3v5h5"/>' +
    '<path d="M12 7v5l4 2"/>' +
    '</svg>';

  function determineFollowUpChips(lastUserText, lastAssistantText) {
    var normUser = (lastUserText || "").toLowerCase().trim();
    var normAssistant = (lastAssistantText || "").toLowerCase().trim();

    var isAwaitingCustomerInput =
      normAssistant.indexOf("is there anything else") < 0 &&
      (normAssistant.indexOf("email address") >= 0 ||
        normAssistant.indexOf("order number") >= 0 ||
        normAssistant.indexOf("protect your privacy") >= 0 ||
        normAssistant.indexOf("please provide") >= 0 ||
        normAssistant.indexOf("please reply") >= 0 ||
        normAssistant.indexOf("reply with") >= 0 ||
        normAssistant.indexOf("refund amount") >= 0 ||
        normAssistant.indexOf("how much") >= 0 ||
        normAssistant.indexOf("could you") >= 0 ||
        normAssistant.indexOf("can you") >= 0 ||
        normAssistant.indexOf("item you wish to return") >= 0 ||
        normAssistant.indexOf("the reason") >= 0 ||
        normAssistant.indexOf("contact form") >= 0 ||
        normAssistant.indexOf("support form") >= 0 ||
        normAssistant.indexOf("[forward_to_support]") >= 0 ||
        normAssistant.indexOf("[refund_escalate]") >= 0);

    if (isAwaitingCustomerInput) {
      return [];
    }

    var isResolved =
      normAssistant.indexOf("is there anything else") >= 0 ||
      normAssistant.indexOf("[refund_approved]") >= 0 ||
      (normAssistant.indexOf("located order") >= 0 && normAssistant.indexOf("in fulfillment") >= 0) ||
      normAssistant.indexOf("standard policy allows returns") >= 0 ||
      normAssistant.indexOf("our shipping information") >= 0 ||
      normAssistant.indexOf("we offer standard shipping") >= 0;

    if (!isResolved) {
      return [];
    }

    if (
      normAssistant.indexOf("located order") >= 0 ||
      normAssistant.indexOf("in fulfillment") >= 0 ||
      normUser.indexOf("track") >= 0
    ) {
      return [
        { id: "return", label: "Return Policy", query: "What is your return policy?" },
        { id: "shipping", label: "Shipping Info", query: "What are your shipping rates and times?" }
      ];
    }

    if (
      normUser.indexOf("return") >= 0 ||
      normUser.indexOf("refund") >= 0 ||
      normAssistant.indexOf("refund") >= 0 ||
      normAssistant.indexOf("return") >= 0
    ) {
      return [
        { id: "track", label: "Track Order", query: "Track order" },
        { id: "shipping", label: "Shipping Info", query: "What are your shipping rates and times?" }
      ];
    }

    if (
      (normUser.indexOf("shipping") >= 0 || normUser.indexOf("delivery") >= 0) &&
      normUser.indexOf("@") < 0
    ) {
      return [
        { id: "track", label: "Track Order", query: "Track order" },
        { id: "return", label: "Return Policy", query: "What is your return policy?" }
      ];
    }

    return [
      { id: "track", label: "Track Order", query: "Track order" },
      { id: "return", label: "Return Policy", query: "What is your return policy?" },
      { id: "shipping", label: "Shipping Info", query: "What are your shipping rates and times?" }
    ];
  }

  /* Comprehensive Defensive Stylesheet for Shadow DOM */
  var styles =
    ":host {" +
    "  all: initial !important;" +
    "  display: block !important;" +
    "  position: static !important;" +
    "  z-index: 2147483647 !important;" +
    "  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;" +
    "  font-size: 13px !important;" +
    "  line-height: 1.4 !important;" +
    "  color: #2B221C !important;" +
    "  letter-spacing: normal !important;" +
    "  text-transform: none !important;" +
    "  text-align: left !important;" +
    "  direction: ltr !important;" +
    "  box-sizing: border-box !important;" +
    "  -webkit-font-smoothing: antialiased !important;" +
    "  -moz-osx-font-smoothing: grayscale !important;" +
    "  color-scheme: light !important;" +
    "}\n" +
    "*, *::before, *::after {" +
    "  box-sizing: border-box !important;" +
    "  margin: 0 !important;" +
    "  padding: 0 !important;" +
    "  font-family: inherit !important;" +
    "  line-height: inherit !important;" +
    "  color: inherit !important;" +
    "  letter-spacing: normal !important;" +
    "  text-transform: none !important;" +
    "  text-shadow: none !important;" +
    "  -webkit-tap-highlight-color: transparent !important;" +
    "}\n" +
    ".plainbot-btn, .plainbot-panel { pointer-events: auto !important; }\n" +
    "/* Floating Launcher Button */\n" +
    ".plainbot-btn {" +
    "  position: fixed !important;" +
    "  bottom: 20px;" +
    "  right: 20px;" +
    "  width: 56px !important;" +
    "  height: 56px !important;" +
    "  border-radius: 50% !important;" +
    "  border: 1px solid rgba(43, 34, 28, 0.08) !important;" +
    "  background: #FFFFFF !important;" +
    "  cursor: grab !important;" +
    "  box-shadow: 0 10px 28px -4px rgba(43, 34, 28, 0.22), 0 4px 10px rgba(43, 34, 28, 0.06) !important;" +
    "  z-index: 2147483646 !important;" +
    "  display: flex !important;" +
    "  align-items: center !important;" +
    "  justify-content: center !important;" +
    "  padding: 0 !important;" +
    "  outline: none !important;" +
    "  user-select: none !important;" +
    "  -webkit-user-select: none !important;" +
    "  touch-action: none !important;" +
    "  transform-origin: center center !important;" +
    "  animation: plainbotLauncherPop 0.45s cubic-bezier(0.22, 1, 0.36, 1) forwards !important;" +
    "  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease !important;" +
    "}\n" +
    ".plainbot-btn:hover {" +
    "  transform: scale(1.06) !important;" +
    "  box-shadow: 0 14px 34px -4px rgba(43, 34, 28, 0.32) !important;" +
    "}\n" +
    ".plainbot-btn:active {" +
    "  transform: scale(0.96) !important;" +
    "}\n" +
    ".plainbot-btn.hidden {" +
    "  display: none !important;" +
    "}\n" +
    "@keyframes plainbotLauncherPop {" +
    "  0% { opacity: 0; transform: scale(0.55); }" +
    "  100% { opacity: 1; transform: scale(1); }" +
    "}\n" +
    ".plainbot-btn-icon {" +
    "  width: 28px !important;" +
    "  height: 28px !important;" +
    "  display: flex !important;" +
    "  align-items: center !important;" +
    "  justify-content: center !important;" +
    "  pointer-events: none !important;" +
    "}\n" +
    ".plainbot-btn-icon img, .plainbot-hero-avatar img, .plainbot-compact-avatar img, .plainbot-msg-avatar img, img.plainbot-logo-img {" +
    "  display: block !important;" +
    "  width: 100% !important;" +
    "  height: 100% !important;" +
    "  object-fit: contain !important;" +
    "  pointer-events: none !important;" +
    "  border: none !important;" +
    "}\n" +
    "/* Chat Window Panel - Dynamic Origin Morphing & Soft Borders */\n" +
    ".plainbot-panel {" +
    "  position: fixed !important;" +
    "  bottom: 20px;" +
    "  right: 20px;" +
    "  width: 380px !important;" +
    "  max-width: calc(100vw - 32px) !important;" +
    "  height: 580px !important;" +
    "  max-height: calc(88vh) !important;" +
    "  background: #2B221C !important;" +
    "  border: 1px solid rgba(43, 34, 28, 0.12) !important;" +
    "  border-radius: 24px !important;" +
    "  box-shadow: 0 20px 50px -10px rgba(43, 34, 28, 0.28), 0 8px 16px -4px rgba(43, 34, 28, 0.08) !important;" +
    "  display: flex !important;" +
    "  flex-direction: column !important;" +
    "  z-index: 2147483647 !important;" +
    "  overflow: hidden !important;" +
    "  transform-origin: var(--plainbot-origin, bottom right) !important;" +
    "  animation: plainbotWidgetMorphOpen 0.36s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;" +
    "  pointer-events: auto !important;" +
    "}\n" +
    ".plainbot-panel.hidden {" +
    "  display: none !important;" +
    "}\n" +
    ".plainbot-panel.closing {" +
    "  animation: plainbotWidgetMorphClose 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;" +
    "  pointer-events: none !important;" +
    "}\n" +
    "@keyframes plainbotWidgetMorphOpen {" +
    "  0% { opacity: 0; transform: scale(0.72) translateY(10px); }" +
    "  100% { opacity: 1; transform: scale(1) translateY(0); }" +
    "}\n" +
    "@keyframes plainbotWidgetMorphClose {" +
    "  0% { opacity: 1; transform: scale(1) translateY(0); }" +
    "  100% { opacity: 0; transform: scale(0.72) translateY(10px); }" +
    "}\n" +
    "@keyframes plainbotWidgetOpen {" +
    "  0% { opacity: 0; transform: scale(0.72) translateY(10px); }" +
    "  100% { opacity: 1; transform: scale(1) translateY(0); }" +
    "}\n" +
    "@keyframes plainbotWidgetClose {" +
    "  0% { opacity: 1; transform: scale(1) translateY(0); }" +
    "  100% { opacity: 0; transform: scale(0.72) translateY(10px); }" +
    "}\n" +
    "/* Modern Slow Smooth Component Entrance Micro-Animations */\n" +
    "@keyframes plainbotCompPop {" +
    "  0% { opacity: 0; transform: scale(0.78) translateY(8px); }" +
    "  100% { opacity: 1; transform: scale(1) translateY(0); }" +
    "}\n" +
    "@keyframes plainbotCompSlideUp {" +
    "  0% { opacity: 0; transform: translateY(14px); }" +
    "  100% { opacity: 1; transform: translateY(0); }" +
    "}\n" +
    "@keyframes plainbotBubbleIn {" +
    "  0% { opacity: 0; transform: translateY(8px) scale(0.97); }" +
    "  100% { opacity: 1; transform: translateY(0) scale(1); }" +
    "}\n" +
    "/* Collapsible Header: Rich Dark Brown (#2B221C) Spacious Layout */\n" +
    ".plainbot-head {" +
    "  flex-shrink: 0 !important;" +
    "  background: #2B221C !important;" +
    "  color: #FFFFFF !important;" +
    "  position: relative !important;" +
    "  padding: 22px 18px 24px 18px !important;" +
    "  min-height: 204px !important;" +
    "  box-sizing: border-box !important;" +
    "  transition: padding 0.4s cubic-bezier(0.16, 1, 0.3, 1), min-height 0.4s cubic-bezier(0.16, 1, 0.3, 1) !important;" +
    "}\n" +
    ".plainbot-head.compact {" +
    "  padding: 12px 18px !important;" +
    "  min-height: 54px !important;" +
    "}\n" +
    ".plainbot-head-top {" +
    "  display: flex !important;" +
    "  align-items: center !important;" +
    "  justify-content: flex-end !important;" +
    "  gap: 6px !important;" +
    "  position: absolute !important;" +
    "  top: 12px !important;" +
    "  right: 14px !important;" +
    "  z-index: 5 !important;" +
    "}\n" +
    ".plainbot-top-btn {" +
    "  background: rgba(255, 255, 255, 0.12) !important;" +
    "  border: none !important;" +
    "  color: #FFFFFF !important;" +
    "  width: 28px !important;" +
    "  height: 28px !important;" +
    "  border-radius: 50% !important;" +
    "  cursor: pointer !important;" +
    "  display: flex !important;" +
    "  align-items: center !important;" +
    "  justify-content: center !important;" +
    "  padding: 0 !important;" +
    "  transition: background-color 0.2s ease, transform 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;" +
    "}\n" +
    ".plainbot-top-btn:hover {" +
    "  background: rgba(255, 255, 255, 0.22) !important;" +
    "  transform: scale(1.08) !important;" +
    "}\n" +
    ".plainbot-top-btn:active {" +
    "  transform: scale(0.92) !important;" +
    "}\n" +
    "/* Header Hero Layout (Spacious Initial Pre-Chat State) */\n" +
    ".plainbot-hero {" +
    "  display: flex !important;" +
    "  flex-direction: column !important;" +
    "  align-items: center !important;" +
    "  justify-content: center !important;" +
    "  text-align: center !important;" +
    "  padding-top: 6px !important;" +
    "  padding-bottom: 2px !important;" +
    "  transition: opacity 0.35s ease, transform 0.45s cubic-bezier(0.22, 1, 0.36, 1) !important;" +
    "}\n" +
    ".plainbot-hero-avatar {" +
    "  width: 56px !important;" +
    "  height: 56px !important;" +
    "  border-radius: 50% !important;" +
    "  background: #FFFFFF !important;" +
    "  display: flex !important;" +
    "  align-items: center !important;" +
    "  justify-content: center !important;" +
    "  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.16) !important;" +
    "  padding: 10px !important;" +
    "  margin-bottom: 2px !important;" +
    "  animation: plainbotCompPop 0.48s cubic-bezier(0.16, 1, 0.3, 1) 0.08s both !important;" +
    "}\n" +
    ".plainbot-hero-title {" +
    "  margin-top: 8px !important;" +
    "  font-size: 14px !important;" +
    "  font-weight: 700 !important;" +
    "  color: #FFFFFF !important;" +
    "  animation: plainbotCompSlideUp 0.44s cubic-bezier(0.16, 1, 0.3, 1) 0.14s both !important;" +
    "}\n" +
    ".plainbot-hero-subtitle {" +
    "  margin-top: 3px !important;" +
    "  font-size: 11px !important;" +
    "  color: rgba(255, 255, 255, 0.8) !important;" +
    "  animation: plainbotCompSlideUp 0.44s cubic-bezier(0.16, 1, 0.3, 1) 0.18s both !important;" +
    "}\n" +
    ".plainbot-hero-human-btn {" +
    "  margin-top: 12px !important;" +
    "  margin-bottom: 4px !important;" +
    "  display: inline-flex !important;" +
    "  align-items: center !important;" +
    "  gap: 6px !important;" +
    "  padding: 6px 16px !important;" +
    "  border-radius: 9999px !important;" +
    "  background: #FFFFFF !important;" +
    "  color: #2B221C !important;" +
    "  font-size: 11px !important;" +
    "  font-weight: 600 !important;" +
    "  cursor: pointer !important;" +
    "  border: none !important;" +
    "  box-shadow: 0 2px 8px rgba(0,0,0,0.12) !important;" +
    "  animation: plainbotCompSlideUp 0.44s cubic-bezier(0.16, 1, 0.3, 1) 0.22s both !important;" +
    "  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.2s ease, box-shadow 0.2s ease !important;" +
    "}\n" +
    ".plainbot-hero-human-btn:hover {" +
    "  background: #FAF7F2 !important;" +
    "  transform: translateY(-1px) scale(1.02) !important;" +
    "  box-shadow: 0 4px 10px rgba(0,0,0,0.14) !important;" +
    "}\n" +
    ".plainbot-hero-human-btn:active {" +
    "  transform: scale(0.97) !important;" +
    "}\n" +
    "/* Header Compact Layout (After chat starts) */\n" +
    ".plainbot-compact-bar {" +
    "  display: none !important;" +
    "  align-items: center !important;" +
    "  gap: 10px !important;" +
    "  padding-right: 68px !important;" +
    "  animation: plainbotCompSlideUp 0.42s cubic-bezier(0.16, 1, 0.3, 1) both !important;" +
    "}\n" +
    ".plainbot-head.compact .plainbot-hero { display: none !important; }\n" +
    ".plainbot-head.compact .plainbot-compact-bar { display: flex !important; }\n" +
    ".plainbot-compact-avatar {" +
    "  width: 32px !important;" +
    "  height: 32px !important;" +
    "  border-radius: 50% !important;" +
    "  background: #FFFFFF !important;" +
    "  display: flex !important;" +
    "  align-items: center !important;" +
    "  justify-content: center !important;" +
    "  padding: 6px !important;" +
    "  flex-shrink: 0 !important;" +
    "}\n" +
    ".plainbot-compact-info {" +
    "  display: flex !important;" +
    "  flex-direction: column !important;" +
    "  overflow: hidden !important;" +
    "}\n" +
    ".plainbot-compact-title {" +
    "  font-size: 13px !important;" +
    "  font-weight: 700 !important;" +
    "  color: #FFFFFF !important;" +
    "  white-space: nowrap !important;" +
    "  overflow: hidden !important;" +
    "  text-overflow: ellipsis !important;" +
    "}\n" +
    ".plainbot-compact-status {" +
    "  display: flex !important;" +
    "  align-items: center !important;" +
    "  gap: 4px !important;" +
    "  font-size: 10px !important;" +
    "  color: rgba(255, 255, 255, 0.75) !important;" +
    "}\n" +
    ".plainbot-status-dot {" +
    "  width: 6px !important;" +
    "  height: 6px !important;" +
    "  border-radius: 50% !important;" +
    "  background: #6B8F71 !important;" +
    "}\n" +
    "/* White Chat Body Container */\n" +
    ".plainbot-body {" +
    "  flex: 1 !important;" +
    "  display: flex !important;" +
    "  flex-direction: column !important;" +
    "  min-height: 0 !important;" +
    "  background: #FFFFFF !important;" +
    "  border-top-left-radius: 28px !important;" +
    "  border-top-right-radius: 28px !important;" +
    "  box-shadow: 0 -6px 24px rgba(43, 34, 28, 0.08) !important;" +
    "  overflow: hidden !important;" +
    "  animation: plainbotCompSlideUp 0.46s cubic-bezier(0.16, 1, 0.3, 1) 0.14s both !important;" +
    "}\n" +
    "/* Messages Scroll Container */\n" +
    ".plainbot-messages {" +
    "  flex: 1 !important;" +
    "  min-height: 0 !important;" +
    "  overflow-y: auto !important;" +
    "  padding: 12px 14px !important;" +
    "  display: flex !important;" +
    "  flex-direction: column !important;" +
    "  gap: 10px !important;" +
    "  background: #FFFFFF !important;" +
    "  scroll-behavior: smooth !important;" +
    "}\n" +
    ".plainbot-messages::-webkit-scrollbar { width: 5px; }\n" +
    ".plainbot-messages::-webkit-scrollbar-thumb { background: rgba(43, 34, 28, 0.15); border-radius: 4px; }\n" +
    "/* Timestamp Pill */\n" +
    ".plainbot-timestamp {" +
    "  text-align: center !important;" +
    "  margin: 2px 0 6px 0 !important;" +
    "  font-size: 10.5px !important;" +
    "  color: #8C7C6E !important;" +
    "  font-weight: 500 !important;" +
    "  user-select: none !important;" +
    "  animation: plainbotCompSlideUp 0.42s cubic-bezier(0.16, 1, 0.3, 1) 0.18s both !important;" +
    "}\n" +
    "/* Message Rows */\n" +
    ".plainbot-msg-row {" +
    "  display: flex !important;" +
    "  align-items: flex-end !important;" +
    "  gap: 8px !important;" +
    "  width: 100% !important;" +
    "  animation: plainbotCompSlideUp 0.44s cubic-bezier(0.16, 1, 0.3, 1) 0.22s both !important;" +
    "}\n" +
    ".plainbot-msg-row.user { justify-content: flex-end !important; }\n" +
    ".plainbot-msg-row.assistant { justify-content: flex-start !important; }\n" +
    ".plainbot-msg-avatar {" +
    "  width: 28px !important;" +
    "  height: 28px !important;" +
    "  border-radius: 50% !important;" +
    "  background: #FFFFFF !important;" +
    "  border: 1px solid rgba(43, 34, 28, 0.15) !important;" +
    "  display: flex !important;" +
    "  align-items: center !important;" +
    "  justify-content: center !important;" +
    "  padding: 5px !important;" +
    "  flex-shrink: 0 !important;" +
    "  margin-bottom: 2px !important;" +
    "  box-shadow: 0 1px 3px rgba(43,34,28,0.06) !important;" +
    "}\n" +
    "/* Bubbles */\n" +
    ".plainbot-bubble {" +
    "  margin: 0 !important;" +
    "  padding: 9px 13px !important;" +
    "  border-radius: 14px !important;" +
    "  font-size: 12.5px !important;" +
    "  line-height: 1.45 !important;" +
    "  word-break: break-word !important;" +
    "  max-width: 80% !important;" +
    "  animation: plainbotBubbleIn 0.34s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;" +
    "}\n" +
    ".plainbot-bubble.user {" +
    "  background: #2B221C !important;" +
    "  color: #FFFFFF !important;" +
    "  border-bottom-right-radius: 4px !important;" +
    "  box-shadow: 0 1px 3px rgba(43, 34, 28, 0.12) !important;" +
    "}\n" +
    ".plainbot-bubble.assistant {" +
    "  background: #F3E3D6 !important;" +
    "  color: #2B221C !important;" +
    "  border: 1px solid rgba(43, 34, 28, 0.08) !important;" +
    "  border-bottom-left-radius: 4px !important;" +
    "}\n" +
    ".plainbot-bubble.note {" +
    "  background: #F3E3D6 !important;" +
    "  color: #2B221C !important;" +
    "  border: 1px solid rgba(43, 34, 28, 0.22) !important;" +
    "  font-size: 11.5px !important;" +
    "  border-radius: 12px !important;" +
    "  margin-left: 36px !important;" +
    "  max-width: 88% !important;" +
    "}\n" +
    ".plainbot-note-tag {" +
    "  font-size: 9.5px !important;" +
    "  font-weight: 700 !important;" +
    "  color: #BE5B37 !important;" +
    "  margin-bottom: 3px !important;" +
    "  text-transform: uppercase !important;" +
    "  letter-spacing: 0.04em !important;" +
    "}\n" +
    ".plainbot-live-agent-badge {" +
    "  background: #EAF0E9 !important;" +
    "  border: 1px solid rgba(107, 143, 113, 0.35) !important;" +
    "  color: #4E6E52 !important;" +
    "  border-radius: 10px !important;" +
    "  padding: 8px 12px !important;" +
    "  font-size: 11.5px !important;" +
    "  font-weight: 500 !important;" +
    "  margin-bottom: 4px !important;" +
    "}\n" +
    "/* Animated 3-Dots Typing Indicator with Organic Buttery Bubble Pop */\n" +
    "@keyframes plainbotBubblePop {" +
    "  0% { opacity: 0; transform: scale(0.88) translateY(4px); }" +
    "  100% { opacity: 1; transform: scale(1) translateY(0); }" +
    "}\n" +
    ".plainbot-typing-bubble {" +
    "  display: flex !important;" +
    "  align-items: center !important;" +
    "  justify-content: center !important;" +
    "  gap: 4px !important;" +
    "  height: 20px !important;" +
    "  padding: 2px 10px !important;" +
    "  border-radius: 12px !important;" +
    "  border-bottom-left-radius: 3px !important;" +
    "  background: #F3E3D6 !important;" +
    "  border: 1px solid rgba(43, 34, 28, 0.1) !important;" +
    "  box-shadow: 0 1px 2px rgba(43, 34, 28, 0.05) !important;" +
    "  width: fit-content !important;" +
    "  animation: plainbotBubblePop 0.28s cubic-bezier(0.16, 1, 0.3, 1) both !important;" +
    "  transform-origin: bottom left !important;" +
    "}\n" +
    ".plainbot-dot {" +
    "  width: 5px !important;" +
    "  height: 5px !important;" +
    "  border-radius: 50% !important;" +
    "  background: #2B221C !important;" +
    "  animation: plainbotBounce 1.4s infinite ease-in-out !important;" +
    "}\n" +
    ".plainbot-dot:nth-child(1) { animation-delay: -0.32s !important; }\n" +
    ".plainbot-dot:nth-child(2) { animation-delay: -0.16s !important; }\n" +
    "@keyframes plainbotBounce {" +
    "  0%, 80%, 100% { transform: scale(0.6); opacity: 0.45; }" +
    "  40% { transform: scale(1); opacity: 1; }" +
    "}\n" +
    "/* User-side Typing Indicator */\n" +
    ".plainbot-user-typing-row {" +
    "  display: flex !important;" +
    "  justify-content: flex-end !important;" +
    "  width: 100% !important;" +
    "  padding-top: 2px !important;" +
    "  user-select: none !important;" +
    "  animation: plainbotBubblePop 0.28s cubic-bezier(0.16, 1, 0.3, 1) both !important;" +
    "  transform-origin: bottom right !important;" +
    "}\n" +
    ".plainbot-user-typing-row.hidden { display: none !important; }\n" +
    ".plainbot-user-typing-bubble {" +
    "  display: flex !important;" +
    "  align-items: center !important;" +
    "  justify-content: center !important;" +
    "  gap: 4px !important;" +
    "  height: 20px !important;" +
    "  padding: 2px 10px !important;" +
    "  border-radius: 12px !important;" +
    "  border-bottom-right-radius: 3px !important;" +
    "  background: #2B221C !important;" +
    "  box-shadow: 0 1px 3px rgba(43, 34, 28, 0.12) !important;" +
    "  width: fit-content !important;" +
    "}\n" +
    ".plainbot-dot-white {" +
    "  width: 5px !important;" +
    "  height: 5px !important;" +
    "  border-radius: 50% !important;" +
    "  background: #FFFFFF !important;" +
    "  animation: plainbotBounce 1.4s infinite ease-in-out !important;" +
    "}\n" +
    ".plainbot-dot-white:nth-child(1) { animation-delay: -0.32s !important; }\n" +
    ".plainbot-dot-white:nth-child(2) { animation-delay: -0.16s !important; }\n" +
    "/* Action Chips */\n" +
    ".plainbot-chips {" +
    "  display: flex !important;" +
    "  flex-direction: column !important;" +
    "  align-items: flex-start !important;" +
    "  gap: 6px !important;" +
    "  padding-left: 36px !important;" +
    "  margin: 4px 0 6px 0 !important;" +
    "}\n" +
    ".plainbot-chip {" +
    "  background: #F3E3D6 !important;" +
    "  border: 1px solid rgba(43, 34, 28, 0.2) !important;" +
    "  color: #2B221C !important;" +
    "  border-radius: 9999px !important;" +
    "  padding: 6px 14px !important;" +
    "  font-size: 11.5px !important;" +
    "  font-weight: 600 !important;" +
    "  cursor: pointer !important;" +
    "  display: inline-flex !important;" +
    "  align-items: center !important;" +
    "  gap: 6px !important;" +
    "  box-shadow: 0 1px 2px rgba(43, 34, 28, 0.05) !important;" +
    "  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease !important;" +
    "  user-select: none !important;" +
    "  white-space: nowrap !important;" +
    "  animation: plainbotCompSlideUp 0.42s cubic-bezier(0.16, 1, 0.3, 1) var(--plainbot-chip-delay, 0.28s) both !important;" +
    "}\n" +
    ".plainbot-chip:hover {" +
    "  background: #2B221C !important;" +
    "  border-color: #2B221C !important;" +
    "  color: #FFFFFF !important;" +
    "  transform: translateY(-2px) scale(1.02) !important;" +
    "  box-shadow: 0 4px 10px rgba(43, 34, 28, 0.12) !important;" +
    "}\n" +
    ".plainbot-chip:active {" +
    "  transform: scale(0.96) !important;" +
    "}\n" +
    ".plainbot-chip:disabled {" +
    "  opacity: 0.4 !important;" +
    "  cursor: not-allowed !important;" +
    "  transform: none !important;" +
    "}\n" +
    "/* Contact Support Forward Form */\n" +
    ".plainbot-forward {" +
    "  display: none !important;" +
    "  background: #FFFFFF !important;" +
    "  border: 1px solid rgba(43, 34, 28, 0.15) !important;" +
    "  border-radius: 14px !important;" +
    "  padding: 12px !important;" +
    "  margin: 6px 0 !important;" +
    "  box-shadow: 0 2px 8px rgba(43, 34, 28, 0.06) !important;" +
    "}\n" +
    ".plainbot-forward.visible { display: block !important; }\n" +
    ".plainbot-forward h4 { margin: 0 0 3px 0 !important; font-size: 12.5px !important; font-weight: 700 !important; color: #2B221C !important; }\n" +
    ".plainbot-forward p { margin: 0 0 8px 0 !important; font-size: 11px !important; color: #8C7C6E !important; }\n" +
    ".plainbot-forward input, .plainbot-forward textarea {" +
    "  width: 100% !important;" +
    "  box-sizing: border-box !important;" +
    "  margin-bottom: 7px !important;" +
    "  padding: 7px 10px !important;" +
    "  border: 1px solid rgba(43, 34, 28, 0.18) !important;" +
    "  border-radius: 8px !important;" +
    "  background: #FBF7F2 !important;" +
    "  color: #2B221C !important;" +
    "  font-size: 12px !important;" +
    "  outline: none !important;" +
    "}\n" +
    ".plainbot-forward textarea { resize: vertical !important; min-height: 48px !important; }\n" +
    ".plainbot-forward-btns { display: flex !important; gap: 8px !important; }\n" +
    ".plainbot-forward-btns button {" +
    "  padding: 7px 12px !important;" +
    "  border: none !important;" +
    "  border-radius: 8px !important;" +
    "  font-size: 12px !important;" +
    "  font-weight: 600 !important;" +
    "  cursor: pointer !important;" +
    "}\n" +
    ".plainbot-forward-submit { background: #2B221C !important; color: #FFFFFF !important; }\n" +
    ".plainbot-forward-submit:disabled { opacity: 0.5 !important; cursor: not-allowed !important; }\n" +
    ".plainbot-forward-cancel { background: transparent !important; color: #8C7C6E !important; }\n" +
    "/* Past Chat History Drawer Overlay - Slow smooth slide in from right */\n" +
    "@keyframes plainbotHistorySlideIn {" +
    "  0% { opacity: 0; transform: translateX(100%); }" +
    "  100% { opacity: 1; transform: translateX(0); }" +
    "}\n" +
    "@keyframes plainbotHistorySlideOut {" +
    "  0% { opacity: 1; transform: translateX(0); }" +
    "  100% { opacity: 0; transform: translateX(100%); }" +
    "}\n" +
    ".plainbot-history-drawer {" +
    "  position: absolute !important;" +
    "  inset: 0 !important;" +
    "  z-index: 50 !important;" +
    "  display: flex !important;" +
    "  flex-direction: column !important;" +
    "  background: #FFFFFF !important;" +
    "  color: #2B221C !important;" +
    "  padding: 16px !important;" +
    "  border-radius: 24px !important;" +
    "  border: 1px solid rgba(43, 34, 28, 0.12) !important;" +
    "  box-shadow: 0 16px 40px rgba(43, 34, 28, 0.25) !important;" +
    "  overflow: hidden !important;" +
    "  animation: plainbotHistorySlideIn 0.52s cubic-bezier(0.22, 1, 0.36, 1) forwards !important;" +
    "  pointer-events: auto !important;" +
    "}\n" +
    ".plainbot-history-drawer.closing {" +
    "  animation: plainbotHistorySlideOut 0.40s cubic-bezier(0.22, 1, 0.36, 1) forwards !important;" +
    "  pointer-events: none !important;" +
    "}\n" +
    ".plainbot-history-drawer.hidden { display: none !important; }\n" +
    ".plainbot-history-head {" +
    "  display: flex !important;" +
    "  align-items: center !important;" +
    "  justify-content: space-between !important;" +
    "  padding-bottom: 12px !important;" +
    "  border-bottom: 1px solid rgba(43, 34, 28, 0.15) !important;" +
    "}\n" +
    ".plainbot-history-title {" +
    "  display: flex !important;" +
    "  align-items: center !important;" +
    "  gap: 8px !important;" +
    "  font-size: 13px !important;" +
    "  font-weight: 700 !important;" +
    "  color: #2B221C !important;" +
    "}\n" +
    ".plainbot-history-close {" +
    "  width: 26px !important;" +
    "  height: 26px !important;" +
    "  border-radius: 50% !important;" +
    "  background: rgba(43, 34, 28, 0.08) !important;" +
    "  border: none !important;" +
    "  color: #2B221C !important;" +
    "  font-size: 12px !important;" +
    "  font-weight: 700 !important;" +
    "  cursor: pointer !important;" +
    "  display: flex !important;" +
    "  align-items: center !important;" +
    "  justify-content: center !important;" +
    "  transition: background 0.15s ease !important;" +
    "}\n" +
    ".plainbot-history-close:hover { background: rgba(43, 34, 28, 0.16) !important; }\n" +
    ".plainbot-history-new-btn {" +
    "  margin-top: 12px !important;" +
    "  width: 100% !important;" +
    "  border-radius: 9999px !important;" +
    "  background: #2B221C !important;" +
    "  color: #FFFFFF !important;" +
    "  padding: 8px 14px !important;" +
    "  font-size: 11.5px !important;" +
    "  font-weight: 600 !important;" +
    "  border: none !important;" +
    "  cursor: pointer !important;" +
    "  display: flex !important;" +
    "  align-items: center !important;" +
    "  justify-content: center !important;" +
    "  gap: 6px !important;" +
    "  transition: background 0.15s ease, transform 0.15s ease !important;" +
    "}\n" +
    ".plainbot-history-new-btn:hover { background: #3D3027 !important; transform: scale(1.01) !important; }\n" +
    ".plainbot-history-list {" +
    "  flex: 1 !important;" +
    "  overflow-y: auto !important;" +
    "  margin-top: 12px !important;" +
    "  display: flex !important;" +
    "  flex-direction: column !important;" +
    "  gap: 8px !important;" +
    "  padding-right: 2px !important;" +
    "}\n" +
    ".plainbot-history-item {" +
    "  padding: 10px 12px !important;" +
    "  border-radius: 12px !important;" +
    "  background: #FFFFFF !important;" +
    "  border: 1px solid rgba(43, 34, 28, 0.15) !important;" +
    "  cursor: pointer !important;" +
    "  transition: border-color 0.15s ease, box-shadow 0.15s ease !important;" +
    "}\n" +
    ".plainbot-history-item:hover {" +
    "  border-color: #2B221C !important;" +
    "  box-shadow: 0 2px 8px rgba(43, 34, 28, 0.08) !important;" +
    "}\n" +
    ".plainbot-history-item-top {" +
    "  display: flex !important;" +
    "  align-items: center !important;" +
    "  justify-content: space-between !important;" +
    "  font-size: 10.5px !important;" +
    "  color: #8C7C6E !important;" +
    "  margin-bottom: 4px !important;" +
    "}\n" +
    ".plainbot-history-badge {" +
    "  font-size: 9.5px !important;" +
    "  background: #F3E3D6 !important;" +
    "  color: #2B221C !important;" +
    "  font-weight: 600 !important;" +
    "  padding: 2px 7px !important;" +
    "  border-radius: 9999px !important;" +
    "}\n" +
    ".plainbot-history-item-title {" +
    "  font-size: 11.5px !important;" +
    "  font-weight: 600 !important;" +
    "  color: #2B221C !important;" +
    "  white-space: nowrap !important;" +
    "  overflow: hidden !important;" +
    "  text-overflow: ellipsis !important;" +
    "}\n" +
    ".plainbot-history-empty {" +
    "  text-align: center !important;" +
    "  padding: 40px 10px !important;" +
    "  font-size: 11.5px !important;" +
    "  color: #8C7C6E !important;" +
    "  line-height: 1.5 !important;" +
    "}\n" +
    ".plainbot-history-footer {" +
    "  padding-top: 10px !important;" +
    "  border-top: 1px solid rgba(43, 34, 28, 0.15) !important;" +
    "  display: flex !important;" +
    "  align-items: center !important;" +
    "  justify-content: space-between !important;" +
    "  font-size: 11px !important;" +
    "}\n" +
    ".plainbot-history-clear-btn {" +
    "  background: transparent !important;" +
    "  border: none !important;" +
    "  color: #ef4444 !important;" +
    "  cursor: pointer !important;" +
    "  font-size: 11px !important;" +
    "  font-weight: 500 !important;" +
    "}\n" +
    ".plainbot-history-clear-btn:hover { text-decoration: underline !important; }\n" +
    "/* Bottom Input Bar with Pill Wrapper */\n" +
    ".plainbot-input-bar {" +
    "  border-top: 1px solid rgba(43, 34, 28, 0.1) !important;" +
    "  padding: 10px 12px !important;" +
    "  background: #FFFFFF !important;" +
    "  flex-shrink: 0 !important;" +
    "  animation: plainbotCompSlideUp 0.48s cubic-bezier(0.16, 1, 0.3, 1) 0.26s both !important;" +
    "}\n" +
    ".plainbot-pill-wrapper {" +
    "  display: flex !important;" +
    "  align-items: center !important;" +
    "  gap: 6px !important;" +
    "  background: #FBF7F2 !important;" +
    "  border: 1px solid rgba(43, 34, 28, 0.12) !important;" +
    "  border-radius: 9999px !important;" +
    "  padding: 4px 6px 4px 14px !important;" +
    "  box-shadow: 0 1px 2px rgba(43, 34, 28, 0.04) !important;" +
    "  transition: border-color 0.15s ease, box-shadow 0.15s ease !important;" +
    "}\n" +
    ".plainbot-pill-wrapper:focus-within {" +
    "  border-color: #2B221C !important;" +
    "  box-shadow: 0 0 0 1px #2B221C !important;" +
    "}\n" +
    ".plainbot-input {" +
    "  flex: 1 !important;" +
    "  border: none !important;" +
    "  background: transparent !important;" +
    "  outline: none !important;" +
    "  font-size: 12px !important;" +
    "  color: #2B221C !important;" +
    "  caret-color: #2B221C !important;" +
    "  padding: 4px 0 !important;" +
    "}\n" +
    ".plainbot-input::placeholder { color: #8C7C6E !important; opacity: 1 !important; }\n" +
    ".plainbot-human-icon-btn {" +
    "  background: transparent !important;" +
    "  border: none !important;" +
    "  border-radius: 50% !important;" +
    "  width: 26px !important;" +
    "  height: 26px !important;" +
    "  display: flex !important;" +
    "  align-items: center !important;" +
    "  justify-content: center !important;" +
    "  color: #8C7C6E !important;" +
    "  cursor: pointer !important;" +
    "  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;" +
    "  flex-shrink: 0 !important;" +
    "}\n" +
    ".plainbot-human-icon-btn.hidden { display: none !important; }\n" +
    ".plainbot-human-icon-btn:hover {" +
    "  color: #2B221C !important;" +
    "  background: rgba(43, 34, 28, 0.08) !important;" +
    "  transform: scale(1.08) !important;" +
    "}\n" +
    ".plainbot-human-icon-btn:active {" +
    "  transform: scale(0.92) !important;" +
    "}\n" +
    ".plainbot-send-btn {" +
    "  width: 28px !important;" +
    "  height: 28px !important;" +
    "  padding: 0 !important;" +
    "  margin: 0 !important;" +
    "  line-height: 0 !important;" +
    "  box-sizing: border-box !important;" +
    "  border-radius: 50% !important;" +
    "  border: none !important;" +
    "  background: #2B221C !important;" +
    "  color: #FFFFFF !important;" +
    "  cursor: pointer !important;" +
    "  display: flex !important;" +
    "  align-items: center !important;" +
    "  justify-content: center !important;" +
    "  flex-shrink: 0 !important;" +
    "  transition: transform 0.15s ease, background 0.15s ease !important;" +
    "}\n" +
    ".plainbot-send-btn svg {" +
    "  display: block !important;" +
    "  width: 14px !important;" +
    "  height: 14px !important;" +
    "  margin: auto !important;" +
    "}\n" +
    ".plainbot-send-btn:hover {" +
    "  background: #3D3027 !important;" +
    "  transform: scale(1.05) !important;" +
    "}\n" +
    ".plainbot-send-btn:disabled {" +
    "  opacity: 0.4 !important;" +
    "  cursor: not-allowed !important;" +
    "  transform: none !important;" +
    "}\n" +
    "/* Powered by Plainbot */\n" +
    ".plainbot-powered {" +
    "  flex-shrink: 0 !important;" +
    "  padding: 5px 12px 6px 12px !important;" +
    "  border-top: 1px solid rgba(43, 34, 28, 0.06) !important;" +
    "  font-size: 10px !important;" +
    "  color: #8C7C6E !important;" +
    "  text-align: center !important;" +
    "  background: #FFFFFF !important;" +
    "}\n" +
    "/* Mobile Screen Responsiveness (<480px) */\n" +
    "@media (max-width: 480px) {" +
    "  .plainbot-panel {" +
    "    bottom: 0 !important;" +
    "    right: 0 !important;" +
    "    left: 0 !important;" +
    "    width: 100% !important;" +
    "    max-width: 100vw !important;" +
    "    height: 85vh !important;" +
    "    max-height: 85vh !important;" +
    "    border-radius: 20px 20px 0 0 !important;" +
    "    border-bottom: none !important;" +
    "  }" +
    "  .plainbot-btn {" +
    "    bottom: 16px !important;" +
    "    right: 16px !important;" +
    "  }" +
    "}";

  function parseHex(hex) {
    var h = (hex || "").replace(/^#/, "");
    if (h.length === 3) {
      h = h.split("").map(function (c) { return c + c; }).join("");
    }
    if (h.length !== 6 || /[^0-9a-fA-F]/.test(h)) return null;
    var r = parseInt(h.slice(0, 2), 16);
    var g = parseInt(h.slice(2, 4), 16);
    var b = parseInt(h.slice(4, 6), 16);
    if ([r, g, b].some(function (x) { return isNaN(x); })) return null;
    return { r: r, g: g, b: b };
  }

  function linearizeChannel(c) {
    var s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  }

  function relativeLuminanceFromRgb(p) {
    if (!p) return null;
    var R = linearizeChannel(p.r);
    var G = linearizeChannel(p.g);
    var B = linearizeChannel(p.b);
    return 0.2126 * R + 0.7152 * G + 0.0722 * B;
  }

  function contrastingForeground(hex) {
    var L = relativeLuminanceFromRgb(parseHex(hex));
    if (L == null) return "#ffffff";
    return L > 0.55 ? "#1B120C" : "#ffffff";
  }

  function applyWidgetAccent(hex, sendEl) {
    var p = parseHex(hex);
    if (!p) return;
    var r = p.r;
    var g = p.g;
    var b = p.b;
    var fg = contrastingForeground(hex);
    if (sendEl) {
      sendEl.style.setProperty("background", "rgb(" + r + "," + g + "," + b + ")", "important");
      sendEl.style.setProperty("color", fg, "important");
    }
  }

  function escapeHtmlW(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function linkifyForWidget(raw) {
    if (!raw) return "";
    var links = [];

    // 1. Extract markdown links [label](url) first and replace with safe placeholder
    var text = String(raw).replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, function (_, label, href) {
      var idx = links.length;
      links.push(
        '<a href="' +
        escapeHtmlW(href) +
        '" target="_blank" rel="noopener noreferrer" style="color:#BE5B37;text-decoration:underline;word-break:break-all;">' +
        escapeHtmlW(label) +
        "</a>"
      );
      return "___PLAINBOT_LINK_" + idx + "___";
    });

    // 2. Extract standalone URLs and replace with safe placeholder
    text = text.replace(/(https?:\/\/[^\s<]+?)(?=[\s<]|$)/g, function (u) {
      var clean = u.replace(/[.,;:!?)\]']+$/, "");
      var trailing = u.slice(clean.length);
      var idx = links.length;
      links.push(
        '<a href="' +
        escapeHtmlW(clean) +
        '" target="_blank" rel="noopener noreferrer" style="color:#BE5B37;text-decoration:underline;word-break:break-all;">' +
        escapeHtmlW(clean) +
        "</a>" +
        escapeHtmlW(trailing)
      );
      return "___PLAINBOT_LINK_" + idx + "___";
    });

    // 3. Escape HTML on the rest of the text
    var html = escapeHtmlW(text);

    // 4. Restore the link placeholders with their sanitized HTML anchor tags
    return html.replace(/___PLAINBOT_LINK_(\d+)___/g, function (_, idx) {
      return links[Number(idx)] || "";
    });
  }

  function inject(cfg) {
    // Idempotency: prevent double injection on SPA navigation or duplicate script tags
    if (document.getElementById("plainbot-widget-root")) return;

    cfg = cfg || { headerTitle: "Plainbot", showPoweredBy: true };
    var accentHex =
      typeof cfg.accentColor === "string" && cfg.accentColor.trim().charAt(0) === "#"
        ? cfg.accentColor.trim()
        : "#2B221C";

    // 1. Create Isolated Host Root Container
    root = document.createElement("plainbot-widget-root");
    root.id = "plainbot-widget-root";
    root.setAttribute("data-plainbot-encapsulated", "shadow-dom");
    root.style.cssText =
      "all: initial !important; position: static !important; display: block !important; z-index: 2147483647 !important; pointer-events: none !important;";

    // 2. Attach Open Shadow DOM
    var shadowRoot = root.attachShadow({ mode: "open" });

    // 3. Inject Scoped Defensive CSS into Shadow Root
    var styleEl = document.createElement("style");
    styleEl.textContent = styles;
    shadowRoot.appendChild(styleEl);

    // 4. Launcher Floating Button - Draggable Clean Emblem
    btn = document.createElement("button");
    btn.className = "plainbot-btn";
    btn.setAttribute("type", "button");
    btn.setAttribute("aria-label", "Open chat — " + cfg.headerTitle);
    btn.innerHTML =
      '<div class="plainbot-btn-icon">' +
      (cfg.logoDataUrl
        ? '<img src="' + escapeHtmlW(cfg.logoDataUrl) + '" alt="Logo" style="width:28px;height:28px;object-fit:contain;pointer-events:none;"/>'
        : LOGO_SVG) +
      '</div>';

    var isDragging = false;
    var dragMoved = false;
    var dragStartX = 0;
    var dragStartY = 0;
    var dragElemStartX = 0;
    var dragElemStartY = 0;
    var customPos = null;

    try {
      var savedPos = window.sessionStorage && window.sessionStorage.getItem("plainbot-pos:" + botId);
      if (savedPos) customPos = JSON.parse(savedPos);
    } catch (e) {}

    function applyPosition(pos) {
      if (!pos) return;
      if (typeof pos.left === "number") {
        btn.style.setProperty("left", pos.left + "px", "important");
        btn.style.setProperty("right", "auto", "important");
      }
      if (typeof pos.top === "number") {
        btn.style.setProperty("top", pos.top + "px", "important");
        btn.style.setProperty("bottom", "auto", "important");
      }
    }

    if (customPos) {
      applyPosition(customPos);
    }

    btn.addEventListener("pointerdown", function (e) {
      if (e.button !== 0) return;
      isDragging = true;
      dragMoved = false;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      var rect = btn.getBoundingClientRect();
      dragElemStartX = rect.left;
      dragElemStartY = rect.top;
      try { btn.setPointerCapture(e.pointerId); } catch (err) {}
    });

    window.addEventListener("pointermove", function (e) {
      if (!isDragging) return;
      var dx = e.clientX - dragStartX;
      var dy = e.clientY - dragStartY;
      if (!dragMoved && Math.hypot(dx, dy) > 4) {
        dragMoved = true;
        btn.style.cursor = "grabbing";
      }
      if (dragMoved) {
        var newLeft = dragElemStartX + dx;
        var newTop = dragElemStartY + dy;
        var maxLeft = window.innerWidth - (btn.offsetWidth || 56) - 12;
        var maxTop = window.innerHeight - (btn.offsetHeight || 56) - 12;
        newLeft = Math.max(12, Math.min(maxLeft, newLeft));
        newTop = Math.max(12, Math.min(maxTop, newTop));
        btn.style.setProperty("left", newLeft + "px", "important");
        btn.style.setProperty("top", newTop + "px", "important");
        btn.style.setProperty("right", "auto", "important");
        btn.style.setProperty("bottom", "auto", "important");
      }
    });

    function endDrag(e) {
      if (!isDragging) return;
      isDragging = false;
      btn.style.cursor = "grab";
      try { if (e && e.pointerId) btn.releasePointerCapture(e.pointerId); } catch (err) {}
      if (dragMoved) {
        var rect = btn.getBoundingClientRect();
        customPos = { left: rect.left, top: rect.top };
        try {
          if (window.sessionStorage) {
            window.sessionStorage.setItem("plainbot-pos:" + botId, JSON.stringify(customPos));
          }
        } catch (err) {}
      }
    }

    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);

    function openWidget() {
      open = true;
      var btnRect = btn.getBoundingClientRect();
      var panelWidth = Math.min(380, window.innerWidth - 24);
      var panelHeight = Math.min(580, window.innerHeight - 24);

      var isRightHalf = (btnRect.left + btnRect.width / 2) > (window.innerWidth / 2);
      var isBottomHalf = (btnRect.top + btnRect.height / 2) > (window.innerHeight / 2);

      var panelLeft = isRightHalf ? (btnRect.right - panelWidth) : btnRect.left;
      var panelTop = isBottomHalf ? (btnRect.bottom - panelHeight) : btnRect.top;

      panelLeft = Math.max(12, Math.min(window.innerWidth - panelWidth - 12, panelLeft));
      panelTop = Math.max(12, Math.min(window.innerHeight - panelHeight - 12, panelTop));

      panel.style.setProperty("left", panelLeft + "px", "important");
      panel.style.setProperty("top", panelTop + "px", "important");
      panel.style.setProperty("right", "auto", "important");
      panel.style.setProperty("bottom", "auto", "important");

      var originX_px = Math.round((btnRect.left + btnRect.width / 2) - panelLeft);
      var originY_px = Math.round((btnRect.top + btnRect.height / 2) - panelTop);
      var originStr = originX_px + "px " + originY_px + "px";
      panel.style.transformOrigin = originStr;
      panel.style.setProperty("--plainbot-origin", originStr);

      btn.classList.add("hidden");
      panel.classList.remove("hidden");
      panel.classList.remove("closing");
      if (conversationId) startSupportReplyPoll();

      requestAnimationFrame(function () {
        try { if (input) input.focus(); } catch (err) {}
      });
    }

    function closeWidget() {
      open = false;
      panel.classList.add("closing");
      setTimeout(function () {
        if (!open) {
          panel.classList.add("hidden");
          panel.classList.remove("closing");
          btn.classList.remove("hidden");
          if (customPos) applyPosition(customPos);
        }
      }, 300);
      stopSupportReplyPoll();
    }

    btn.onclick = function () {
      if (dragMoved) {
        dragMoved = false;
        return;
      }
      openWidget();
    };

    // 5. Chat Window Panel
    panel = document.createElement("div");
    panel.className = "plainbot-panel hidden";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", cfg.headerTitle || "Customer Support Chat");

    // Header Container
    var head = document.createElement("div");
    head.className = "plainbot-head";

    // Top Right Controls (History Button & Close Button)
    var headTop = document.createElement("div");
    headTop.className = "plainbot-head-top";

    var histBtn = document.createElement("button");
    histBtn.className = "plainbot-top-btn";
    histBtn.setAttribute("type", "button");
    histBtn.setAttribute("title", "Past Chat History");
    histBtn.setAttribute("aria-label", "Past Chat History");
    histBtn.innerHTML = HISTORY_SVG;
    histBtn.onclick = function () {
      toggleHistoryDrawer();
    };

    var minBtn = document.createElement("button");
    minBtn.className = "plainbot-top-btn";
    minBtn.setAttribute("type", "button");
    minBtn.setAttribute("title", "Close chat window");
    minBtn.setAttribute("aria-label", "Close chat window");
    minBtn.innerHTML = CLOSE_SVG;
    minBtn.onclick = function () {
      closeWidget();
    };

    headTop.appendChild(histBtn);
    headTop.appendChild(minBtn);
    head.appendChild(headTop);

    // Hero Header Layout (Initial Pre-Chat State)
    var heroDiv = document.createElement("div");
    heroDiv.className = "plainbot-hero";
    var heroAvatar = document.createElement("div");
    heroAvatar.className = "plainbot-hero-avatar";
    heroAvatar.innerHTML = cfg.logoDataUrl
      ? '<img src="' + escapeHtmlW(cfg.logoDataUrl) + '" alt="Logo" style="width:32px;height:32px;object-fit:contain;"/>'
      : LOGO_SVG;
    var heroTitle = document.createElement("h2");
    heroTitle.className = "plainbot-hero-title";
    heroTitle.textContent = cfg.headerTitle || "Store Support";
    var heroSubtitle = document.createElement("p");
    heroSubtitle.className = "plainbot-hero-subtitle";
    heroSubtitle.textContent = "You can ask me anything";
    var heroHumanBtn = document.createElement("button");
    heroHumanBtn.className = "plainbot-hero-human-btn";
    heroHumanBtn.setAttribute("type", "button");
    heroHumanBtn.innerHTML = HUMAN_SVG + "<span>Talk to a human</span>";
    heroHumanBtn.onclick = function () {
      setForwardFormVisible(true);
    };

    heroDiv.appendChild(heroAvatar);
    heroDiv.appendChild(heroTitle);
    heroDiv.appendChild(heroSubtitle);
    heroDiv.appendChild(heroHumanBtn);
    head.appendChild(heroDiv);

    // Compact Header Layout (Active Chat State)
    var compactBar = document.createElement("div");
    compactBar.className = "plainbot-compact-bar";
    var compactAvatar = document.createElement("div");
    compactAvatar.className = "plainbot-compact-avatar";
    compactAvatar.innerHTML = cfg.logoDataUrl
      ? '<img src="' + escapeHtmlW(cfg.logoDataUrl) + '" alt="Logo" style="width:20px;height:20px;object-fit:contain;"/>'
      : LOGO_SVG;
    var compactInfo = document.createElement("div");
    compactInfo.className = "plainbot-compact-info";
    var compactTitle = document.createElement("span");
    compactTitle.className = "plainbot-compact-title";
    compactTitle.textContent = cfg.headerTitle || "Store Support";
    var compactStatus = document.createElement("div");
    compactStatus.className = "plainbot-compact-status";
    compactStatus.innerHTML = '<span class="plainbot-status-dot"></span><span>Online</span>';
    compactInfo.appendChild(compactTitle);
    compactInfo.appendChild(compactStatus);
    compactBar.appendChild(compactAvatar);
    compactBar.appendChild(compactInfo);
    head.appendChild(compactBar);

    function updateHeaderMode(started) {
      hasStartedChat = started;
      if (hasStartedChat) {
        head.classList.add("compact");
        if (humanIconBtn) humanIconBtn.classList.remove("hidden");
      } else {
        head.classList.remove("compact");
        if (humanIconBtn) humanIconBtn.classList.add("hidden");
      }
    }

    // 6. Body Container (Crisp White Card with Curved Top Corners)
    var bodyDiv = document.createElement("div");
    bodyDiv.className = "plainbot-body";

    // Messages View
    var messagesDiv = document.createElement("div");
    messagesDiv.className = "plainbot-messages";

    // Centered Timestamp Pill
    var tsPill = document.createElement("div");
    tsPill.className = "plainbot-timestamp";
    var now = new Date();
    var timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
    tsPill.textContent = "Today, " + timeStr;
    messagesDiv.appendChild(tsPill);

    // Forward Form
    var forwardBlock = document.createElement("div");
    forwardBlock.className = "plainbot-forward";
    var fwdTitle = document.createElement("h4");
    fwdTitle.textContent = "Contact our team";
    var fwdHint = document.createElement("p");
    fwdHint.textContent = "We'll email your details and full chat to support.";
    var fwdName = document.createElement("input");
    fwdName.type = "text";
    fwdName.placeholder = "Your name";
    var fwdEmail = document.createElement("input");
    fwdEmail.type = "email";
    fwdEmail.placeholder = "Your email *";
    fwdEmail.required = true;
    var fwdOrder = document.createElement("input");
    fwdOrder.type = "text";
    fwdOrder.placeholder = "Order number (optional)";
    var fwdMsg = document.createElement("textarea");
    fwdMsg.placeholder = "How can we help? (optional)";
    fwdMsg.rows = 2;
    var fwdBtns = document.createElement("div");
    fwdBtns.className = "plainbot-forward-btns";
    var fwdSubmit = document.createElement("button");
    fwdSubmit.type = "button";
    fwdSubmit.className = "plainbot-forward-submit";
    fwdSubmit.textContent = "Send to support";
    var fwdCancel = document.createElement("button");
    fwdCancel.type = "button";
    fwdCancel.className = "plainbot-forward-cancel";
    fwdCancel.textContent = "Cancel";
    fwdBtns.appendChild(fwdSubmit);
    fwdBtns.appendChild(fwdCancel);
    forwardBlock.appendChild(fwdTitle);
    forwardBlock.appendChild(fwdHint);
    forwardBlock.appendChild(fwdName);
    forwardBlock.appendChild(fwdEmail);
    forwardBlock.appendChild(fwdOrder);
    forwardBlock.appendChild(fwdMsg);
    forwardBlock.appendChild(fwdBtns);

    // Action Chips Container
    var chipsDiv = document.createElement("div");
    chipsDiv.className = "plainbot-chips";

    // Bottom Input Bar
    var form = document.createElement("form");
    form.className = "plainbot-input-bar";
    var pillWrapper = document.createElement("div");
    pillWrapper.className = "plainbot-pill-wrapper";

    var input = document.createElement("input");
    input.className = "plainbot-input";
    input.placeholder = "Ask a question…";
    input.type = "text";
    input.setAttribute("aria-label", "Type your question");
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        if (e.preventDefault) e.preventDefault();
        sendMessage();
        requestAnimationFrame(function () {
          try { input.focus(); } catch (err) {}
        });
      }
    });

    var humanIconBtn = document.createElement("button");
    humanIconBtn.className = "plainbot-human-icon-btn hidden";
    humanIconBtn.type = "button";
    humanIconBtn.setAttribute("title", "Talk to a human");
    humanIconBtn.setAttribute("aria-label", "Talk to a human");
    humanIconBtn.innerHTML = HUMAN_SVG;
    humanIconBtn.onclick = function () {
      setForwardFormVisible(true);
    };

    var send = document.createElement("button");
    send.className = "plainbot-send-btn";
    send.type = "submit";
    send.setAttribute("aria-label", "Send message");
    send.innerHTML = PLANE_SVG;

    pillWrapper.appendChild(input);
    pillWrapper.appendChild(humanIconBtn);
    pillWrapper.appendChild(send);
    form.appendChild(pillWrapper);

    var userTypingRow = document.createElement("div");
    userTypingRow.className = "plainbot-user-typing-row hidden";
    var userTypingBubble = document.createElement("div");
    userTypingBubble.className = "plainbot-user-typing-bubble";
    userTypingBubble.setAttribute("aria-label", "You are typing");
    userTypingBubble.innerHTML =
      '<span class="plainbot-dot-white"></span>' +
      '<span class="plainbot-dot-white"></span>' +
      '<span class="plainbot-dot-white"></span>';
    userTypingRow.appendChild(userTypingBubble);
    messagesDiv.appendChild(userTypingRow);

    var userTypingTimer = null;

    input.addEventListener("input", function () {
      var val = (input.value || "").trim();
      if (val.length > 0) {
        if (userTypingRow.classList.contains("hidden")) {
          userTypingRow.classList.remove("hidden");
          if (userTypingRow.nextSibling) {
            messagesDiv.appendChild(userTypingRow);
          }
          messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
        if (userTypingTimer) clearTimeout(userTypingTimer);
        userTypingTimer = setTimeout(function () {
          userTypingRow.classList.add("hidden");
        }, 2200);
      } else {
        if (userTypingTimer) clearTimeout(userTypingTimer);
        userTypingRow.classList.add("hidden");
      }
    });

    bodyDiv.appendChild(messagesDiv);
    bodyDiv.appendChild(forwardBlock);
    bodyDiv.appendChild(form);

    if (cfg.showPoweredBy === true) {
      var powered = document.createElement("div");
      powered.className = "plainbot-powered";
      powered.textContent = "Powered by Plainbot";
      bodyDiv.appendChild(powered);
    }

    // Past Chat History Drawer Overlay
    var historyDrawer = document.createElement("div");
    historyDrawer.className = "plainbot-history-drawer hidden";

    var histHead = document.createElement("div");
    histHead.className = "plainbot-history-head";
    var histTitle = document.createElement("div");
    histTitle.className = "plainbot-history-title";
    histTitle.innerHTML = HISTORY_SVG + "<span>Chat History</span>";
    var histCloseBtn = document.createElement("button");
    histCloseBtn.className = "plainbot-history-close";
    histCloseBtn.type = "button";
    histCloseBtn.setAttribute("aria-label", "Close chat history");
    histCloseBtn.textContent = "✕";
    histCloseBtn.onclick = function () {
      closeHistoryDrawer();
    };
    histHead.appendChild(histTitle);
    histHead.appendChild(histCloseBtn);

    var newChatBtn = document.createElement("button");
    newChatBtn.className = "plainbot-history-new-btn";
    newChatBtn.type = "button";
    newChatBtn.innerHTML =
      '<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg><span>Start New Conversation</span>';
    newChatBtn.onclick = function () {
      startNewConversation();
    };

    var histList = document.createElement("div");
    histList.className = "plainbot-history-list";

    var histFooter = document.createElement("div");
    histFooter.className = "plainbot-history-footer";
    var histFooterHuman = document.createElement("button");
    histFooterHuman.type = "button";
    histFooterHuman.style.cssText =
      "background:none;border:none;color:#2B221C;font-size:11px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:5px;";
    histFooterHuman.innerHTML = HUMAN_SVG + "<span>Talk to a human</span>";
    histFooterHuman.onclick = function () {
      closeHistoryDrawer();
      setForwardFormVisible(true);
    };

    var histClearBtn = document.createElement("button");
    histClearBtn.className = "plainbot-history-clear-btn";
    histClearBtn.type = "button";
    histClearBtn.textContent = "Clear all";
    histClearBtn.onclick = function () {
      try {
        if (window.localStorage) window.localStorage.removeItem("plainbot_sessions_" + botId);
      } catch (e) {}
      renderHistorySessionsList();
    };

    histFooter.appendChild(histFooterHuman);
    histFooter.appendChild(histClearBtn);

    historyDrawer.appendChild(histHead);
    historyDrawer.appendChild(newChatBtn);
    historyDrawer.appendChild(histList);
    historyDrawer.appendChild(histFooter);

    panel.appendChild(head);
    panel.appendChild(bodyDiv);
    panel.appendChild(historyDrawer);

    shadowRoot.appendChild(btn);
    shadowRoot.appendChild(panel);
    document.body.appendChild(root);

    if (accentHex && accentHex !== "#2B221C") {
      applyWidgetAccent(accentHex, send);
      applyWidgetAccent(accentHex, fwdSubmit);
      userTypingBubble.style.setProperty("background", accentHex, "important");
    }

    function openHistoryDrawer() {
      historyDrawerOpen = true;
      historyDrawer.classList.remove("closing");
      historyDrawer.classList.remove("hidden");
      renderHistorySessionsList();
    }

    function closeHistoryDrawer() {
      if (!historyDrawerOpen) return;
      historyDrawerOpen = false;
      historyDrawer.classList.add("closing");
      setTimeout(function () {
        if (!historyDrawerOpen) {
          historyDrawer.classList.add("hidden");
          historyDrawer.classList.remove("closing");
        }
      }, 400);
    }

    function toggleHistoryDrawer(force) {
      var next = typeof force === "boolean" ? force : !historyDrawerOpen;
      if (next) {
        openHistoryDrawer();
      } else {
        closeHistoryDrawer();
      }
    }

    function renderHistorySessionsList() {
      histList.innerHTML = "";
      var sessions = [];
      try {
        var raw = window.localStorage ? window.localStorage.getItem("plainbot_sessions_" + botId) : null;
        if (raw) sessions = JSON.parse(raw);
      } catch (e) {}

      if (!Array.isArray(sessions) || sessions.length === 0) {
        var emptyDiv = document.createElement("div");
        emptyDiv.className = "plainbot-history-empty";
        emptyDiv.innerHTML =
          '<p style="font-weight:600;color:#2B221C;">No past conversations yet.</p>' +
          '<p style="margin-top:4px;">Conversations with the store assistant will be saved and accessible here.</p>';
        histList.appendChild(emptyDiv);
        histClearBtn.style.display = "none";
        return;
      }

      histClearBtn.style.display = "block";
      sessions.forEach(function (s) {
        var card = document.createElement("div");
        card.className = "plainbot-history-item";
        var topRow = document.createElement("div");
        topRow.className = "plainbot-history-item-top";
        var ts = document.createElement("span");
        ts.textContent = s.timestamp || "Today";
        var badge = document.createElement("span");
        badge.className = "plainbot-history-badge";
        var count = Array.isArray(s.messages) ? s.messages.length : 0;
        badge.textContent = count + " msgs";
        topRow.appendChild(ts);
        topRow.appendChild(badge);

        var titleP = document.createElement("p");
        titleP.className = "plainbot-history-item-title";
        titleP.textContent = s.title || "Conversation";

        card.appendChild(topRow);
        card.appendChild(titleP);

        card.onclick = function () {
          loadSession(s);
          closeHistoryDrawer();
        };
        histList.appendChild(card);
      });
    }

    function loadSession(s) {
      if (!s || !Array.isArray(s.messages)) return;
      if (userTypingTimer) clearTimeout(userTypingTimer);
      userTypingRow.classList.add("hidden");
      messagesDiv.innerHTML = "";
      messagesDiv.appendChild(tsPill);
      s.messages.forEach(function (m) {
        if (m.role === "user") {
          addMsg("user", m.content || "");
        } else if (m.role === "agent") {
          addMsg("assistant", "Support: " + (m.content || ""));
        } else {
          addAssistantMessage(m.content || "");
        }
      });
      messagesDiv.appendChild(userTypingRow);
      updateHeaderMode(true);
      if (s.id) {
        conversationId = s.id;
        try {
          if (window.sessionStorage) window.sessionStorage.setItem(conversationStorageKey, s.id);
        } catch (e) {}
      }
    }

    function startNewConversation() {
      if (userTypingTimer) clearTimeout(userTypingTimer);
      userTypingRow.classList.add("hidden");
      messagesDiv.innerHTML = "";
      messagesDiv.appendChild(tsPill);
      conversationId = null;
      try {
        if (window.sessionStorage) window.sessionStorage.removeItem(conversationStorageKey);
      } catch (e) {}
      updateHeaderMode(false);
      addAssistantGreeting();
      renderChips(DEFAULT_INITIAL_CHIPS);
      messagesDiv.appendChild(userTypingRow);
      closeHistoryDrawer();
    }

    function saveSessionToStorage() {
      try {
        var rawMsgs = [];
        messagesDiv.querySelectorAll(".plainbot-msg-row").forEach(function (row) {
          var isUser = row.classList.contains("user");
          var bubble = row.querySelector(".plainbot-bubble");
          var txt = bubble ? (bubble.textContent || "").trim() : "";
          if (txt && txt !== "…" && !txt.startsWith("Update")) {
            rawMsgs.push({ role: isUser ? "user" : "assistant", content: txt });
          }
        });
        var firstUser = rawMsgs.find(function (m) { return m.role === "user"; });
        if (!firstUser || rawMsgs.length < 2) return;
        var sKey = "plainbot_sessions_" + botId;
        var raw = window.localStorage ? window.localStorage.getItem(sKey) : null;
        var list = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(list)) list = [];
        var curId = conversationId || ("session_" + Date.now());
        var nowD = new Date();
        var timeS = nowD.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
        var item = {
          id: curId,
          timestamp: "Today, " + timeS,
          title: firstUser.content.slice(0, 38) + (firstUser.content.length > 38 ? "…" : ""),
          messages: rawMsgs,
        };
        var idx = list.findIndex(function (x) { return x.id === curId; });
        if (idx >= 0) {
          list[idx] = item;
        } else {
          list.unshift(item);
        }
        list = list.slice(0, 15);
        if (window.localStorage) window.localStorage.setItem(sKey, JSON.stringify(list));
      } catch (e) {}
    }

    function renderChips(chipList) {
      chipsDiv.innerHTML = "";
      if (!chipList || !chipList.length || showForwardForm) {
        if (chipsDiv.parentNode) chipsDiv.parentNode.removeChild(chipsDiv);
        return;
      }
      chipList.forEach(function (chip, idx) {
        var chipBtn = document.createElement("button");
        chipBtn.className = "plainbot-chip";
        chipBtn.style.setProperty("--plainbot-chip-delay", (0.24 + idx * 0.08) + "s");
        chipBtn.type = "button";
        var iconHtml = "";
        if (chip.id === "track" || chip.id.indexOf("track") >= 0) {
          iconHtml =
            '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>';
        } else if (chip.id === "return" || chip.id.indexOf("return") >= 0) {
          iconHtml =
            '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>';
        } else if (chip.id === "shipping" || chip.id.indexOf("ship") >= 0) {
          iconHtml =
            '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>';
        }
        var cleanLabel = (chip.label || "").replace(/^[^\w\s]+\s*/, "");
        chipBtn.innerHTML = iconHtml + "<span>" + escapeHtmlW(cleanLabel) + "</span>";
        chipBtn.disabled = send.disabled;
        chipBtn.onclick = function () {
          if (send.disabled) return;
          chipsDiv.innerHTML = "";
          if (chipsDiv.parentNode) chipsDiv.parentNode.removeChild(chipsDiv);
          if (chip.action === "human" || chip.id.indexOf("human") >= 0) {
            setForwardFormVisible(true);
          } else {
            sendMessage(chip.query);
          }
        };
        chipsDiv.appendChild(chipBtn);
      });
      messagesDiv.appendChild(chipsDiv);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    function addAssistantGreeting() {
      var row = document.createElement("div");
      row.className = "plainbot-msg-row assistant";
      var av = document.createElement("div");
      av.className = "plainbot-msg-avatar";
      av.innerHTML = cfg.logoDataUrl
        ? '<img src="' + escapeHtmlW(cfg.logoDataUrl) + '" alt="Avatar" style="width:16px;height:16px;object-fit:contain;"/>'
        : LOGO_SVG;
      var bubble = document.createElement("div");
      bubble.className = "plainbot-bubble assistant";
      bubble.innerHTML =
        '<p style="font-weight:700;color:#2B221C;margin-bottom:2px;">Hi There,</p>' +
        '<p style="color:#2B221C;">How can I help you today?</p>';
      row.appendChild(av);
      row.appendChild(bubble);
      messagesDiv.appendChild(row);
    }

    addAssistantGreeting();
    renderChips(DEFAULT_INITIAL_CHIPS);

    function setForwardFormVisible(visible) {
      showForwardForm = visible;
      if (visible) {
        forwardBlock.classList.add("visible");
        if (chipsDiv.parentNode) chipsDiv.parentNode.removeChild(chipsDiv);
      } else {
        forwardBlock.classList.remove("visible");
      }
    }

    function collectConversationTextFromDom() {
      var lines = [];
      messagesDiv.querySelectorAll(".plainbot-bubble").forEach(function (el) {
        var isUser = el.classList.contains("user");
        var role = isUser ? "Customer" : "Assistant";
        var t = (el.textContent || "").trim();
        if (t && t !== "…") lines.push(role + ": " + t);
      });
      return lines.join("\n");
    }

    function submitForwardForm() {
      if (!conversationId || forwardFormSubmitted) return;
      var email = (fwdEmail.value || "").trim();
      if (!email) {
        fwdEmail.focus();
        return;
      }
      fwdSubmit.disabled = true;
      var payload = {
        chatbotId: botId,
        conversationId: conversationId,
        customer: (fwdName.value || "").trim() || "Customer",
        customerEmail: email,
        orderRef: (fwdOrder.value || "").trim() || null,
        customerMessage: (fwdMsg.value || "").trim() || null,
        preview: (fwdMsg.value || "").trim() || "Support request",
        conversationText: collectConversationTextFromDom(),
      };
      fetch(base + "/api/forwarded/submit", {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then(function (r) {
          return r.json().then(function (data) {
            if (!r.ok) throw new Error(data.error || "Failed to send");
            return data;
          });
        })
        .then(function () {
          forwardFormSubmitted = true;
          setForwardFormVisible(false);
          fwdName.value = "";
          fwdEmail.value = "";
          fwdOrder.value = "";
          fwdMsg.value = "";
          addAssistantMessage(
            "Thanks — we've sent your details to our team. You'll see their reply here when they respond."
          );
          if (open) startSupportReplyPoll();
        })
        .catch(function () {
          addAssistantMessage("Sorry, we couldn't send your form. Please try again.");
        })
        .finally(function () {
          fwdSubmit.disabled = false;
        });
    }

    fwdSubmit.onclick = submitForwardForm;
    fwdCancel.onclick = function () {
      setForwardFormVisible(false);
    };

    function addMsg(role, text) {
      var row = document.createElement("div");
      row.className = "plainbot-msg-row " + role;
      if (role === "assistant") {
        var av = document.createElement("div");
        av.className = "plainbot-msg-avatar";
        av.innerHTML = cfg.logoDataUrl
          ? '<img src="' + escapeHtmlW(cfg.logoDataUrl) + '" alt="Avatar" style="width:16px;height:16px;object-fit:contain;"/>'
          : LOGO_SVG;
        row.appendChild(av);
      }
      var bubble = document.createElement("div");
      bubble.className = "plainbot-bubble " + role;
      bubble.textContent = text;
      row.appendChild(bubble);
      messagesDiv.appendChild(row);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    function addAssistantMessage(content) {
      var row = document.createElement("div");
      row.className = "plainbot-msg-row assistant";
      var av = document.createElement("div");
      av.className = "plainbot-msg-avatar";
      av.innerHTML = cfg.logoDataUrl
        ? '<img src="' + escapeHtmlW(cfg.logoDataUrl) + '" alt="Avatar" style="width:16px;height:16px;object-fit:contain;"/>'
        : LOGO_SVG;
      row.appendChild(av);
      var bubble = document.createElement("div");
      bubble.className = "plainbot-bubble assistant";
      if (content && (String(content).indexOf("http") >= 0 || /\[[^\]]+\]\(https?:/.test(String(content)))) {
        bubble.innerHTML = linkifyForWidget(content);
      } else {
        bubble.textContent = content;
      }
      row.appendChild(bubble);
      messagesDiv.appendChild(row);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    function addTypingIndicator() {
      var row = document.createElement("div");
      row.className = "plainbot-msg-row assistant plainbot-typing-row";
      var av = document.createElement("div");
      av.className = "plainbot-msg-avatar";
      av.innerHTML = cfg.logoDataUrl
        ? '<img src="' + escapeHtmlW(cfg.logoDataUrl) + '" alt="Avatar" style="width:16px;height:16px;object-fit:contain;"/>'
        : LOGO_SVG;
      var typingBubble = document.createElement("div");
      typingBubble.className = "plainbot-typing-bubble";
      typingBubble.innerHTML =
        '<span class="plainbot-dot"></span>' +
        '<span class="plainbot-dot"></span>' +
        '<span class="plainbot-dot"></span>';
      row.appendChild(av);
      row.appendChild(typingBubble);
      messagesDiv.appendChild(row);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
      return row;
    }

    function removeTypingIndicator() {
      var typingRows = messagesDiv.querySelectorAll(".plainbot-typing-row");
      typingRows.forEach(function (el) {
        if (el.parentNode) el.parentNode.removeChild(el);
      });
    }

    function addNoteMsg(text) {
      var wrap = document.createElement("div");
      wrap.className = "plainbot-bubble note";
      var h = document.createElement("div");
      h.className = "plainbot-note-tag";
      h.textContent = "Update";
      var body = document.createElement("div");
      body.textContent = text;
      wrap.appendChild(h);
      wrap.appendChild(body);
      messagesDiv.appendChild(wrap);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    function hydrateThreadFromServer() {
      if (!conversationId) return;
      fetch(
        base +
          "/api/conversations/messages?conversationId=" +
          encodeURIComponent(conversationId) +
          "&chatbotId=" +
          encodeURIComponent(botId),
        { method: "GET", mode: "cors" }
      )
        .then(function (r) {
          if (!r.ok) return null;
          return r.json();
        })
        .then(function (data) {
          if (!data || !Array.isArray(data.messages) || data.messages.length === 0) return;
          lastThreadFingerprint = data.messages.map(function (m) { return m.id; }).join("|");
          renderThreadFromServer(data.messages, data.handoffMode);
          pollSupportReply();
          checkForwardFormState();
          saveSessionToStorage();
        })
        .catch(function () {});
    }
    hydrateThreadFromServer();
    checkForwardFormState();

    function checkForwardFormState() {
      if (!conversationId || forwardFormSubmitted) return;
      fetch(base + "/api/forwarded/by-conversation?conversationId=" + encodeURIComponent(conversationId), {
        method: "GET",
        mode: "cors",
      })
        .then(function (r) {
          return r.json();
        })
        .then(function (data) {
          if (data.needsForm) setForwardFormVisible(true);
        })
        .catch(function () {});
    }

    function renderThreadFromServer(messages, handoff) {
      if (handoff === "human" || handoff === "ai") widgetHandoffMode = handoff;
      messagesDiv.innerHTML = "";
      messagesDiv.appendChild(tsPill);

      var hasUser = false;
      (messages || []).forEach(function (m) {
        if (m.role === "user") {
          hasUser = true;
          addMsg("user", m.content || "");
        } else if (m.role === "agent") {
          addMsg("assistant", "Support: " + (m.content || ""));
        } else {
          addAssistantMessage(m.content || "");
        }
      });

      if (hasUser) updateHeaderMode(true);

      if (messages && messages.length > 0) {
        var lastUser = "";
        var lastAsst = "";
        for (var i = messages.length - 1; i >= 0; i--) {
          if (!lastUser && messages[i].role === "user") lastUser = messages[i].content || "";
          if (!lastAsst && (messages[i].role === "assistant" || messages[i].role === "agent"))
            lastAsst = messages[i].content || "";
        }
        renderChips(determineFollowUpChips(lastUser, lastAsst));
      } else {
        addAssistantGreeting();
        renderChips(DEFAULT_INITIAL_CHIPS);
      }
    }

    function syncThreadMessages() {
      if (!conversationId || send.disabled) return;
      fetch(
        base +
          "/api/conversations/messages?conversationId=" +
          encodeURIComponent(conversationId) +
          "&chatbotId=" +
          encodeURIComponent(botId),
        { method: "GET", mode: "cors" }
      )
        .then(function (r) {
          if (!r.ok) return null;
          return r.json();
        })
        .then(function (data) {
          if (!data || !Array.isArray(data.messages)) return;
          var fp = data.messages.map(function (m) { return m.id; }).join("|");
          if (fp === lastThreadFingerprint) return;
          lastThreadFingerprint = fp;
          renderThreadFromServer(data.messages, data.handoffMode);
          saveSessionToStorage();
        })
        .catch(function () {});
    }

    function pollSupportReply() {
      if (!conversationId || !open) return;
      syncThreadMessages();
      var waitKey = "plainbot-wait-2m:" + botId + ":" + conversationId;
      fetch(base + "/api/forwarded/by-conversation?conversationId=" + encodeURIComponent(conversationId), {
        method: "GET",
        mode: "cors",
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.needsForm && !forwardFormSubmitted) {
            setForwardFormVisible(true);
          }
          if (data.replyText && data.replyText !== lastSupportReplyShown) {
            lastSupportReplyShown = data.replyText;
            addMsg("assistant", "Support: " + data.replyText);
            saveSessionToStorage();
          }
          if (data.forwardPending && data.forwardedAt && !data.repliedAt && !data.replyText) {
            var age = Date.now() - new Date(data.forwardedAt).getTime();
            var already = false;
            try {
              if (window.sessionStorage) already = window.sessionStorage.getItem(waitKey) === "1";
            } catch (e) {}
            if (age >= 120000 && !already && !waitNoticeLock) {
              waitNoticeLock = true;
              try {
                if (window.sessionStorage) window.sessionStorage.setItem(waitKey, "1");
              } catch (e) {}
              addNoteMsg(SUPPORT_WAIT_TEXT);
            }
          }
        })
        .catch(function () {});
    }

    function startSupportReplyPoll() {
      if (supportReplyPollTimer) return;
      pollSupportReply();
      supportReplyPollTimer = setInterval(pollSupportReply, 3000);
    }
    function stopSupportReplyPoll() {
      if (supportReplyPollTimer) {
        clearInterval(supportReplyPollTimer);
        supportReplyPollTimer = null;
      }
    }

    function sendMessage(text) {
      var q = (text !== undefined ? text : input.value).trim();
      if (!q) return;
      if (text === undefined) input.value = "";
      if (userTypingTimer) clearTimeout(userTypingTimer);
      userTypingRow.classList.add("hidden");
      requestAnimationFrame(function () {
        try { input.focus(); } catch (err) {}
      });

      // 1. Shrink header to compact mode immediately on first user message
      updateHeaderMode(true);

      // 2. Append user bubble & disable inputs
      addMsg("user", q);
      send.disabled = true;
      chipsDiv.querySelectorAll(".plainbot-chip").forEach(function (c) { c.disabled = true; });
      humanIconBtn.disabled = true;

      // 3. Show animated 3-dot typing indicator
      addTypingIndicator();

      function updateFollowUpChips() {
        chipsDiv.querySelectorAll(".plainbot-chip").forEach(function (c) { c.disabled = false; });
        humanIconBtn.disabled = false;
        requestAnimationFrame(function () {
          try { input.focus(); } catch (err) {}
        });
        var lastUserMsgEl = messagesDiv.querySelector(".plainbot-bubble.user:last-of-type");
        var lastAssistantMsgEl = messagesDiv.querySelector(".plainbot-bubble.assistant:last-of-type");
        var nextChips = determineFollowUpChips(
          lastUserMsgEl ? lastUserMsgEl.textContent : "",
          lastAssistantMsgEl ? lastAssistantMsgEl.textContent : ""
        );
        renderChips(nextChips);
      }

      function collectRecentHistoryFromDom(limit) {
        var arr = [];
        messagesDiv.querySelectorAll(".plainbot-bubble").forEach(function (el) {
          var role = el.classList.contains("user") ? "user" : "assistant";
          var t = (el.textContent || "").trim();
          if (t && t !== "…" && t !== q) arr.push({ role: role, content: t });
        });
        return arr.slice(-(limit || 4));
      }

      var body = {
        question: q,
        chatbotId: botId,
        history: collectRecentHistoryFromDom(4),
      };
      if (conversationId) body.conversationId = conversationId;

      var chatUrl = base + "/api/chat";
      var needsForwardFromHeader = false;
      fetch(chatUrl, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
        .then(function (res) {
          needsForwardFromHeader =
            res.headers.get("X-Needs-Forward-Form") === "1" ||
            res.headers.get("X-Forwarded-Support") === "1";
          var cid = res.headers.get("X-Conversation-Id");
          if (cid) {
            conversationId = cid;
            waitNoticeLock = false;
            try {
              if (window.sessionStorage) window.sessionStorage.setItem(conversationStorageKey, cid);
            } catch (e) {}
            if (open) startSupportReplyPoll();
          }

          removeTypingIndicator();

          if (!res.ok) {
            return res.json().catch(function () { return {}; }).then(function (data) {
              if (res.status === 402 && data.limitReached) {
                addAssistantMessage(
                  "This chatbot has reached its conversation limit. The store owner can upgrade at plainbot.io/pricing to continue."
                );
              } else {
                addAssistantMessage(data.error || "Sorry, something went wrong. Try again.");
              }
              send.disabled = false;
              updateFollowUpChips();
              saveSessionToStorage();
            });
          }

          if (!res.body) {
            addAssistantMessage("Sorry, no response. Try again.");
            send.disabled = false;
            updateFollowUpChips();
            saveSessionToStorage();
            return;
          }

          // Prepare assistant bubble for incoming stream
          var row = document.createElement("div");
          row.className = "plainbot-msg-row assistant";
          var av = document.createElement("div");
          av.className = "plainbot-msg-avatar";
          av.innerHTML = cfg.logoDataUrl
            ? '<img src="' + escapeHtmlW(cfg.logoDataUrl) + '" alt="Avatar" style="width:16px;height:16px;object-fit:contain;"/>'
            : LOGO_SVG;
          var bubble = document.createElement("div");
          bubble.className = "plainbot-bubble assistant";
          row.appendChild(av);
          row.appendChild(bubble);
          messagesDiv.appendChild(row);

          var decoder = new TextDecoder();
          var streamBuf = "";
          var reader = res.body.getReader();

          function read() {
            reader.read().then(function (r) {
              if (r.done) {
                var showFwd =
                  needsForwardFromHeader ||
                  streamBuf.indexOf(FORWARD_MARKER) >= 0 ||
                  streamBuf.indexOf("[REFUND_ESCALATE]") >= 0;
                var cleaned = streamBuf
                  .replace(/\s*\[FORWARD_TO_SUPPORT\]\s*/gi, " ")
                  .replace(/\s*\[REFUND_APPROVED\]\s*/gi, " ")
                  .replace(/\s*\[REFUND_ESCALATE\]\s*/gi, " ")
                  .trim();
                bubble.innerHTML = linkifyForWidget(cleaned || streamBuf);
                if (showFwd && !forwardFormSubmitted) setForwardFormVisible(true);
                send.disabled = false;
                updateFollowUpChips();
                saveSessionToStorage();
                if (conversationId) {
                  if (open) startSupportReplyPoll();
                  setTimeout(syncThreadMessages, 400);
                }
                return;
              }
              var chunk = decoder.decode(r.value, { stream: true });
              streamBuf += chunk;
              bubble.textContent = streamBuf;
              messagesDiv.scrollTop = messagesDiv.scrollHeight;
              read();
            });
          }
          read();
        })
        .catch(function () {
          removeTypingIndicator();
          addAssistantMessage("Network error. Check your connection or try again.");
          send.disabled = false;
          updateFollowUpChips();
          saveSessionToStorage();
        });
    }

    form.onsubmit = function (e) {
      if (e && typeof e.preventDefault === "function") e.preventDefault();
      sendMessage();
      requestAnimationFrame(function () {
        try { input.focus(); } catch (err) {}
      });
    };
  }

  function start() {
    fetch(base + "/api/chatbots/widget-config?chatbotId=" + encodeURIComponent(botId), {
      method: "GET",
      mode: "cors",
    })
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        var powered = data && data.showPoweredBy === true;
        var accent =
          typeof data.accentColor === "string" && data.accentColor.trim()
            ? data.accentColor.trim()
            : "#2B221C";
        inject({
          headerTitle:
            typeof data.headerTitle === "string" && data.headerTitle.trim()
              ? data.headerTitle.trim()
              : powered
                ? "Plainbot"
                : "Chat",
          showPoweredBy: powered,
          accentColor: accent,
          logoDataUrl:
            typeof data.logoDataUrl === "string" && data.logoDataUrl.trim() ? data.logoDataUrl.trim() : null,
        });
      })
      .catch(function () {
        inject({ headerTitle: "Plainbot", showPoweredBy: true, accentColor: "#2B221C" });
      });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
