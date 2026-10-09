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
  var lastSupportReplyShown = null;
  var supportReplyPollTimer = null;
  var waitNoticeLock = false;
  var showForwardForm = false;
  var forwardFormSubmitted = false;
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

  function determineFollowUpChips(lastUserText, lastAssistantText) {
    var normUser = (lastUserText || "").toLowerCase().trim();
    var normAssistant = (lastAssistantText || "").toLowerCase().trim();

    // 1. If assistant is waiting for information from the customer (e.g. order number, email, details),
    // or a contact/support form is active, NEVER show any chips.
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

    // 2. Chips should ONLY be offered once an inquiry is COMPLETED / RESOLVED.
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

    // 3. When resolved, offer the remaining high-intent topics:
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

  var styles =
    ".ecom-widget-btn{position:fixed;bottom:20px;right:20px;width:56px;height:56px;border-radius:50%;border:none;background:#BE5B37;color:#FBF7F2;cursor:pointer;box-shadow:0 10px 24px -10px rgba(190,91,55,0.7);z-index:2147483646;display:flex;align-items:center;justify-content:center;padding:0;transition:transform 0.15s ease,background-color 0.15s ease;}.ecom-widget-btn:hover{transform:scale(1.05);background:#9C4A2B;}.ecom-widget-btn:active{transform:scale(0.95);}.ecom-widget-btn svg{display:block;flex-shrink:0;}.ecom-widget-panel{position:fixed;bottom:86px;right:20px;width:380px;max-width:calc(100vw - 40px);height:530px;max-height:80vh;background:#FBF7F2;border:1px solid rgba(43,34,28,0.15);border-radius:24px;box-shadow:0 24px 60px -20px rgba(43,34,28,0.28);display:flex;flex-direction:column;z-index:2147483645;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif;color:#2B221C;overflow:hidden;animation:ecomWidgetFadeIn 0.25s cubic-bezier(0.16,1,0.3,1);}.ecom-widget-panel.hidden{display:none !important;}@keyframes ecomWidgetFadeIn{from{opacity:0;transform:translateY(12px) scale(0.97);}to{opacity:1;transform:translateY(0) scale(1);}}.ecom-widget-head{flex-shrink:0;padding:12px 16px;border-bottom:1px solid rgba(190,91,55,0.25);background:linear-gradient(135deg,#2B221C 0%,#382B22 100%);font-weight:600;font-size:14px;color:#FBF7F2;line-height:1.3;display:flex;align-items:center;justify-content:space-between;gap:10px;}.ecom-widget-head-info{display:flex;align-items:center;gap:10px;overflow:hidden;}.ecom-widget-head img{width:24px;height:24px;border-radius:6px;object-fit:contain;background:rgba(251,247,242,0.15);flex-shrink:0;}.ecom-widget-head .ecom-widget-title{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:700;font-size:14px;color:#FBF7F2;}.ecom-widget-head-close{background:rgba(255,255,255,0.1);border:none;color:#D1C7BD;font-size:18px;line-height:1;cursor:pointer;padding:4px 6px;border-radius:9999px;display:flex;align-items:center;justify-content:center;transition:all 0.15s ease;}.ecom-widget-head-close:hover{color:#FBF7F2;background:rgba(255,255,255,0.2);}.ecom-widget-messages{flex:1;min-height:0;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;scroll-behavior:smooth;background:#FBF7F2;}.ecom-widget-msg{margin:0;padding:10px 14px;border-radius:16px;font-size:13px;line-height:1.45;word-break:break-word;}.ecom-widget-msg.user{background:#2B221C;color:#FBF7F2;margin-left:28px;align-self:flex-end;border-bottom-right-radius:4px;box-shadow:0 1px 3px rgba(43,34,28,0.1);}.ecom-widget-msg.assistant{background:#F3E3D6;color:#2B221C;margin-right:28px;align-self:flex-start;border:1px solid rgba(43,34,28,0.08);border-bottom-left-radius:4px;}.ecom-widget-msg.note{background:#F3E3D6;color:#2B221C;margin-right:24px;border:1px solid rgba(190,91,55,0.3);font-size:12px;border-radius:12px;}.ecom-widget-msg.note .ecom-widget-note-h{font-size:10px;font-weight:700;letter-spacing:0.02em;color:#BE5B37;margin-bottom:4px;text-transform:uppercase;}.ecom-widget-chips{display:flex;flex-wrap:wrap;gap:6px;padding:4px 0 6px 0;margin:2px 0 6px 0;align-self:flex-start;max-width:100%;}.ecom-widget-chip{background:#F3E3D6;border:1px solid rgba(190,91,55,0.35);color:#2B221C;border-radius:9999px;padding:5px 12px;font-size:12px;font-weight:600;line-height:1.2;cursor:pointer;font-family:inherit;transition:all 0.15s ease;white-space:nowrap;user-select:none;box-shadow:0 1px 2px rgba(43,34,28,0.06);}.ecom-widget-chip:hover{background:#BE5B37;border-color:#BE5B37;color:#fff;transform:translateY(-1px);}.ecom-widget-chip:disabled{opacity:0.4;cursor:not-allowed;transform:none;}.ecom-widget-toolbar{display:flex;align-items:center;justify-content:center;gap:8px;padding:4px 12px 6px;background:#FBF7F2;flex-shrink:0;}.ecom-widget-human-btn{background:transparent;border:1px solid rgba(43,34,28,0.2);color:#6E5E52;border-radius:9999px;padding:4px 10px;font-size:11px;font-weight:500;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:5px;transition:all 0.15s ease;}.ecom-widget-human-btn:hover{background:#F3E3D6;border-color:#BE5B37;color:#BE5B37;}.ecom-widget-human-btn:disabled{opacity:0.4;cursor:not-allowed;}.ecom-widget-human-btn svg{width:12px;height:12px;flex-shrink:0;}.ecom-widget-form{display:flex;gap:8px;padding:12px;border-top:1px solid rgba(43,34,28,0.1);background:#FBF7F2;}.ecom-widget-input{flex:1;padding:10px 14px;border:1px solid rgba(43,34,28,0.18);border-radius:9999px;background:#ffffff;color:#2B221C;font-size:13px;font-family:inherit;outline:none;caret-color:#BE5B37;transition:border-color 0.15s ease;}.ecom-widget-input::placeholder{color:#8C7C6E;opacity:1;}.ecom-widget-input:focus{border-color:#BE5B37;}.ecom-widget-send{padding:10px 16px;border:none;border-radius:9999px;background:#BE5B37;color:#fff;font-weight:600;font-family:inherit;cursor:pointer;font-size:13px;flex-shrink:0;transition:all 0.15s ease;}.ecom-widget-send:hover{background:#9C4A2B;}.ecom-widget-send:disabled{opacity:0.4;cursor:not-allowed;}.ecom-widget-powered{flex-shrink:0;padding:6px 12px 8px;border-top:1px solid rgba(43,34,28,0.08);font-size:11px;color:#8C7C6E;text-align:center;background:#FBF7F2;}.ecom-widget-forward{display:none;flex-shrink:0;padding:12px;border-top:1px solid rgba(43,34,28,0.1);background:#ffffff;border-radius:16px;margin:8px 12px;box-shadow:0 2px 8px rgba(43,34,28,0.06);}.ecom-widget-forward.visible{display:block;}.ecom-widget-forward h4{margin:0 0 4px;font-size:13px;font-weight:700;color:#2B221C;}.ecom-widget-forward p{margin:0 0 8px;font-size:11px;color:#8C7C6E;}.ecom-widget-forward input,.ecom-widget-forward textarea{width:100%;box-sizing:border-box;margin-bottom:8px;padding:8px 10px;border:1px solid rgba(43,34,28,0.18);border-radius:8px;background:#FBF7F2;color:#2B221C;font-size:12px;font-family:inherit;outline:none;}.ecom-widget-forward textarea{resize:vertical;min-height:52px;}.ecom-widget-forward-btns{display:flex;gap:8px;}.ecom-widget-forward-btns button{padding:8px 12px;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;}.ecom-widget-forward-submit{background:#BE5B37;color:#fff;}.ecom-widget-forward-submit:disabled{opacity:0.5;cursor:not-allowed;}.ecom-widget-forward-cancel{background:transparent;color:#8C7C6E;}@media (max-width:480px){.ecom-widget-panel{bottom:0 !important;right:0 !important;left:0 !important;width:100% !important;max-width:100vw !important;height:85vh !important;max-height:85vh !important;border-radius:20px 20px 0 0 !important;}.ecom-widget-btn{bottom:16px !important;right:16px !important;}}";

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

  /** Dark text on light accents, white on dark — matches dashboard embed behaviour. */
  function contrastingForeground(hex) {
    var L = relativeLuminanceFromRgb(parseHex(hex));
    if (L == null) return "#ffffff";
    return L > 0.55 ? "#0f172a" : "#ffffff";
  }

  function applyWidgetAccent(hex, btnEl, sendEl, inputEl) {
    var p = parseHex(hex);
    if (!p) return;
    var r = p.r;
    var g = p.g;
    var b = p.b;
    var fg = contrastingForeground(hex);
    if (btnEl) {
      btnEl.style.background = "rgb(" + r + "," + g + "," + b + ")";
      btnEl.style.boxShadow = "0 4px 14px rgba(" + r + "," + g + "," + b + ",0.45)";
      btnEl.style.color = fg;
    }
    if (sendEl) {
      sendEl.style.background = "rgb(" + r + "," + g + "," + b + ")";
      sendEl.style.color = fg;
    }
    if (inputEl) {
      var defBorder = "#475569";
      inputEl.addEventListener("focus", function accentFocus() {
        inputEl.style.borderColor = "rgb(" + r + "," + g + "," + b + ")";
      });
      inputEl.addEventListener("blur", function accentBlur() {
        inputEl.style.borderColor = defBorder;
      });
    }
  }

  function inject(cfg) {
    // Idempotency: prevent double injection on SPA navigation or duplicate script tags
    if (document.getElementById("plainbot-widget-root") || document.getElementById("ecom-support-widget")) return;

    cfg = cfg || { headerTitle: "Plainbot", showPoweredBy: true };
    var accentHex =
      typeof cfg.accentColor === "string" && cfg.accentColor.trim().charAt(0) === "#"
        ? cfg.accentColor.trim()
        : "#f97316";

    // Create host element with style isolation resets
    root = document.createElement("div");
    root.id = "plainbot-widget-root";
    root.setAttribute("data-plainbot-encapsulated", "shadow-dom");
    root.style.cssText = "all: initial !important; position: static !important; z-index: 2147483647 !important; pointer-events: none;";

    // Attach open Shadow DOM to isolate styles completely from host Shopify / WooCommerce theme
    var shadowRoot = root.attachShadow({ mode: "open" });

    // Inject styles exclusively inside the Shadow DOM
    var styleEl = document.createElement("style");
    styleEl.textContent =
      ":host { all: initial !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; color-scheme: dark !important; }\n" +
      "*, *::before, *::after { box-sizing: border-box !important; margin: 0; padding: 0; }\n" +
      ".ecom-widget-btn, .ecom-widget-panel { pointer-events: auto !important; }\n" +
      styles;
    shadowRoot.appendChild(styleEl);

    btn = document.createElement("button");
    btn.className = "ecom-widget-btn";
    btn.setAttribute("type", "button");
    btn.setAttribute("aria-label", "Open chat — " + cfg.headerTitle);
    btn.innerHTML =
      '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
    btn.onclick = function () {
      open = !open;
      if (panel) panel.classList.toggle("hidden", !open);
      if (open && conversationId) startSupportReplyPoll();
      else if (!open) stopSupportReplyPoll();
    };

    panel = document.createElement("div");
    panel.className = "ecom-widget-panel hidden";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", cfg.headerTitle || "Customer Support Chat");

    var head = document.createElement("div");
    head.className = "ecom-widget-head";
    head.setAttribute("title", cfg.headerTitle);

    var headInfo = document.createElement("div");
    headInfo.className = "ecom-widget-head-info";

    if (cfg.logoDataUrl && typeof cfg.logoDataUrl === "string") {
      var img = document.createElement("img");
      img.src = cfg.logoDataUrl;
      img.alt = cfg.headerTitle ? cfg.headerTitle + " logo" : "Store logo";
      headInfo.appendChild(img);
    }
    var titleSpan = document.createElement("span");
    titleSpan.className = "ecom-widget-title";
    titleSpan.textContent = cfg.headerTitle;
    headInfo.appendChild(titleSpan);

    var closeBtn = document.createElement("button");
    closeBtn.className = "ecom-widget-head-close";
    closeBtn.setAttribute("type", "button");
    closeBtn.setAttribute("aria-label", "Close chat window");
    closeBtn.innerHTML =
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    closeBtn.onclick = function () {
      open = false;
      if (panel) panel.classList.add("hidden");
      stopSupportReplyPoll();
    };

    head.appendChild(headInfo);
    head.appendChild(closeBtn);
    var messagesDiv = document.createElement("div");
    messagesDiv.className = "ecom-widget-messages";
    var forwardBlock = document.createElement("div");
    forwardBlock.className = "ecom-widget-forward";
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
    fwdBtns.className = "ecom-widget-forward-btns";
    var fwdSubmit = document.createElement("button");
    fwdSubmit.type = "button";
    fwdSubmit.className = "ecom-widget-forward-submit";
    fwdSubmit.textContent = "Send to support";
    var fwdCancel = document.createElement("button");
    fwdCancel.type = "button";
    fwdCancel.className = "ecom-widget-forward-cancel";
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
    var form = document.createElement("form");
    form.className = "ecom-widget-form";
    var input = document.createElement("input");
    input.className = "ecom-widget-input";
    input.placeholder = "Type your question…";
    input.type = "text";
    var send = document.createElement("button");
    send.className = "ecom-widget-send";
    send.type = "submit";
    send.textContent = "Send";

    form.appendChild(input);
    form.appendChild(send);

    var chipsDiv = document.createElement("div");
    chipsDiv.className = "ecom-widget-chips";

    var toolbarDiv = document.createElement("div");
    toolbarDiv.className = "ecom-widget-toolbar";

    var humanToolbarBtn = document.createElement("button");
    humanToolbarBtn.className = "ecom-widget-human-btn";
    humanToolbarBtn.type = "button";
    humanToolbarBtn.innerHTML =
      '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>Talk to a human';
    humanToolbarBtn.onclick = function () {
      setForwardFormVisible(true);
    };
    toolbarDiv.appendChild(humanToolbarBtn);

    panel.appendChild(head);
    panel.appendChild(messagesDiv);
    panel.appendChild(forwardBlock);
    panel.appendChild(toolbarDiv);
    panel.appendChild(form);
    if (cfg.showPoweredBy === true) {
      var powered = document.createElement("div");
      powered.className = "ecom-widget-powered";
      powered.textContent = "Powered by Plainbot";
      panel.appendChild(powered);
    }
    shadowRoot.appendChild(btn);
    shadowRoot.appendChild(panel);
    document.body.appendChild(root);

    input.style.setProperty("background-color", "#0f172a", "important");
    input.style.setProperty("color", "#f1f5f9", "important");
    input.style.setProperty("caret-color", "#f1f5f9", "important");

    applyWidgetAccent(accentHex, btn, send, input);
    applyWidgetAccent(accentHex, null, fwdSubmit, null);

    function renderChips(chipList) {
      chipsDiv.innerHTML = "";
      if (!chipList || !chipList.length || showForwardForm) {
        if (chipsDiv.parentNode) chipsDiv.parentNode.removeChild(chipsDiv);
        return;
      }
      chipList.forEach(function (chip) {
        var chipBtn = document.createElement("button");
        chipBtn.className = "ecom-widget-chip";
        chipBtn.type = "button";
        var iconHtml = "";
        if (chip.id === "track" || chip.id.indexOf("track") >= 0) {
          iconHtml = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;vertical-align:middle;display:inline-block;"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>';
        } else if (chip.id === "return" || chip.id.indexOf("return") >= 0) {
          iconHtml = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;vertical-align:middle;display:inline-block;"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>';
        } else if (chip.id === "shipping" || chip.id.indexOf("ship") >= 0) {
          iconHtml = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;vertical-align:middle;display:inline-block;"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>';
        }
        var cleanLabel = (chip.label || "").replace(/^[^\w\s]+\s*/, "");
        chipBtn.innerHTML = iconHtml + '<span>' + escapeHtmlW(cleanLabel) + '</span>';
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

    addAssistantMessage("Hi, I'm your AI assistant for " + (cfg.headerTitle || "your store") + ". How can I help you today?");
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
      messagesDiv.querySelectorAll(".ecom-widget-msg").forEach(function (el) {
        var role = el.classList.contains("user") ? "Customer" : "Assistant";
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

    function escapeHtmlW(s) {
      return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }
    function linkifyForWidget(raw) {
      var e = escapeHtmlW(raw);
      e = e.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, function (_, label, href) {
        return (
          '<a href="' +
          href +
          '" target="_blank" rel="noopener noreferrer" style="color:#38bdf8;text-decoration:underline;word-break:break-all;">' +
          label +
          "</a>"
        );
      });
      return e.replace(/(https?:\/\/[^\s<]+?)(?=[\s<]|$)/g, function (u) {
        var href = u.replace(/[.,;:!?)\]']+$/g, "");
        return (
          '<a href="' +
          href +
          '" target="_blank" rel="noopener noreferrer" style="color:#38bdf8;text-decoration:underline;word-break:break-all;">' +
          u +
          "</a>"
        );
      });
    }

    function addMsg(role, text) {
      var p = document.createElement("p");
      p.className = "ecom-widget-msg " + role;
      p.textContent = text;
      messagesDiv.appendChild(p);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    function addAssistantMessage(content) {
      var p = document.createElement("p");
      p.className = "ecom-widget-msg assistant";
      if (content && (String(content).indexOf("http") >= 0 || /\[[^\]]+\]\(https?:/.test(String(content)))) {
        p.innerHTML = linkifyForWidget(content);
      } else {
        p.textContent = content;
      }
      messagesDiv.appendChild(p);
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
        })
        .catch(function () {});
    }
    hydrateThreadFromServer();
    checkForwardFormState();

    function addNoteMsg(text) {
      var wrap = document.createElement("div");
      wrap.className = "ecom-widget-msg note";
      var h = document.createElement("div");
      h.className = "ecom-widget-note-h";
      h.textContent = "Update";
      var body = document.createElement("div");
      body.textContent = text;
      wrap.appendChild(h);
      wrap.appendChild(body);
      messagesDiv.appendChild(wrap);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

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
      (messages || []).forEach(function (m) {
        if (m.role === "user") addMsg("user", m.content || "");
        else if (m.role === "agent") addMsg("assistant", "Support: " + (m.content || ""));
        else addAssistantMessage(m.content || "");
      });
      if (messages && messages.length > 0) {
        var lastUser = "";
        var lastAsst = "";
        for (var i = messages.length - 1; i >= 0; i--) {
          if (!lastUser && messages[i].role === "user") lastUser = messages[i].content || "";
          if (!lastAsst && (messages[i].role === "assistant" || messages[i].role === "agent")) lastAsst = messages[i].content || "";
        }
        renderChips(determineFollowUpChips(lastUser, lastAsst));
      } else {
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
        })
        .catch(function () {});
    }

    function pollSupportReply() {
      if (!conversationId || !open) return;
      syncThreadMessages();
      var waitKey = "plainbot-wait-2m:" + botId + ":" + conversationId;
      fetch(base + "/api/forwarded/by-conversation?conversationId=" + encodeURIComponent(conversationId), { method: "GET", mode: "cors" })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.needsForm && !forwardFormSubmitted) {
            setForwardFormVisible(true);
          }
          if (data.replyText && data.replyText !== lastSupportReplyShown) {
            lastSupportReplyShown = data.replyText;
            addMsg("assistant", "Support: " + data.replyText);
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
      addMsg("user", q);
      send.disabled = true;
      chipsDiv.querySelectorAll(".ecom-widget-chip").forEach(function (c) { c.disabled = true; });
      humanToolbarBtn.disabled = true;
      addMsg("assistant", "…");

      function updateFollowUpChips() {
        chipsDiv.querySelectorAll(".ecom-widget-chip").forEach(function (c) { c.disabled = false; });
        humanToolbarBtn.disabled = false;
        var lastUserMsgEl = messagesDiv.querySelector(".ecom-widget-msg.user:last-of-type");
        var lastAssistantMsgEl = messagesDiv.querySelector(".ecom-widget-msg.assistant:last-of-type");
        var nextChips = determineFollowUpChips(
          lastUserMsgEl ? lastUserMsgEl.textContent : "",
          lastAssistantMsgEl ? lastAssistantMsgEl.textContent : ""
        );
        renderChips(nextChips);
      }

      function collectRecentHistoryFromDom(limit) {
        var arr = [];
        messagesDiv.querySelectorAll(".ecom-widget-msg").forEach(function (el) {
          var role = el.classList.contains("user") ? "user" : "assistant";
          var t = (el.textContent || "").trim();
          if (t && t !== "…" && t !== q) arr.push({ role: role, content: t });
        });
        return arr.slice(-(limit || 4));
      }

      var body = {
        question: q,
        chatbotId: botId,
        history: collectRecentHistoryFromDom(4)
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
          if (!res.ok) {
            return res.json().catch(function () { return {}; }).then(function (data) {
              var last = messagesDiv.querySelector(".ecom-widget-msg.assistant:last-child");
              if (last) {
                if (res.status === 402 && data.limitReached) {
                  last.textContent = "This chatbot has reached its conversation limit. The store owner can upgrade at plainbot.io/pricing to continue.";
                } else {
                  last.textContent = data.error || "Sorry, something went wrong. Try again.";
                }
              }
              send.disabled = false;
              updateFollowUpChips();
            });
          }
          if (!res.body) {
            var last = messagesDiv.querySelector(".ecom-widget-msg.assistant:last-child");
            if (last) last.textContent = "Sorry, no response. Try again.";
            send.disabled = false;
            updateFollowUpChips();
            return;
          }
          var decoder = new TextDecoder();
          var last = messagesDiv.querySelector(".ecom-widget-msg.assistant:last-child");
          if (last) last.textContent = "";
          var streamBuf = "";
          var reader = res.body.getReader();
          function read() {
            reader.read().then(function (r) {
              if (r.done) {
                if (last && streamBuf) {
                  var showFwd =
                    needsForwardFromHeader ||
                    streamBuf.indexOf(FORWARD_MARKER) >= 0 ||
                    streamBuf.indexOf("[REFUND_ESCALATE]") >= 0;
                  var cleaned = streamBuf
                    .replace(/\s*\[FORWARD_TO_SUPPORT\]\s*/gi, " ")
                    .replace(/\s*\[REFUND_APPROVED\]\s*/gi, " ")
                    .replace(/\s*\[REFUND_ESCALATE\]\s*/gi, " ")
                    .trim();
                  last.innerHTML = linkifyForWidget(cleaned || streamBuf);
                  if (showFwd && !forwardFormSubmitted) setForwardFormVisible(true);
                }
                send.disabled = false;
                updateFollowUpChips();
                if (conversationId) {
                  if (open) startSupportReplyPoll();
                  setTimeout(syncThreadMessages, 400);
                }
                return;
              }
              var chunk = decoder.decode(r.value, { stream: true });
              streamBuf += chunk;
              if (last) last.textContent = streamBuf;
              messagesDiv.scrollTop = messagesDiv.scrollHeight;
              read();
            });
          }
          read();
        })
        .catch(function (err) {
          var last = messagesDiv.querySelector(".ecom-widget-msg.assistant:last-child");
          if (last) last.textContent = "Network error. Check your connection or try again.";
          send.disabled = false;
          updateFollowUpChips();
        });
    }

    form.onsubmit = function (e) {
      if (e && typeof e.preventDefault === "function") e.preventDefault();
      sendMessage();
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
            : "#f97316";
        inject({
          headerTitle:
            typeof data.headerTitle === "string" && data.headerTitle.trim()
              ? data.headerTitle.trim()
              : powered
                ? "Plainbot"
                : "Chat",
          showPoweredBy: powered,
          accentColor: accent,
          logoDataUrl: typeof data.logoDataUrl === "string" && data.logoDataUrl.trim() ? data.logoDataUrl.trim() : null,
        });
      })
      .catch(function () {
        inject({ headerTitle: "Plainbot", showPoweredBy: true, accentColor: "#f97316" });
      });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
