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

  var styles =
    ".ecom-widget-btn{position:fixed;bottom:20px;right:20px;width:56px;height:56px;border-radius:50%;border:none;background:#f97316;color:#fff;cursor:pointer;box-shadow:0 4px 14px rgba(249,115,22,0.4);z-index:2147483646;display:flex;align-items:center;justify-content:center;padding:0;}.ecom-widget-btn:hover{opacity:0.95;}.ecom-widget-btn svg{display:block;flex-shrink:0;}.ecom-widget-panel{position:fixed;bottom:86px;right:20px;width:380px;max-width:calc(100vw - 40px);height:420px;max-height:70vh;background:#1e293b;border:1px solid #334155;border-radius:16px;box-shadow:0 20px 50px rgba(0,0,0,0.4);display:flex;flex-direction:column;z-index:2147483645;font-family:system-ui,-apple-system,sans-serif;color-scheme:dark;}.ecom-widget-panel.hidden{display:none;}.ecom-widget-head{flex-shrink:0;padding:10px 12px;border-bottom:1px solid #334155;font-weight:600;font-size:15px;color:#f1f5f9;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:flex;align-items:center;gap:10px;}.ecom-widget-head img{width:22px;height:22px;border-radius:6px;object-fit:contain;background:rgba(15,23,42,0.5);flex-shrink:0;}.ecom-widget-head .ecom-widget-title{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}.ecom-widget-messages{flex:1;min-height:0;overflow-y:auto;padding:12px;}.ecom-widget-msg{margin-bottom:10px;padding:10px 12px;border-radius:12px;font-size:14px;line-height:1.4;}.ecom-widget-msg.user{background:#334155;color:#f1f5f9;margin-left:24px;}.ecom-widget-msg.assistant{background:#0f172a;color:#e2e8f0;margin-right:24px;}.ecom-widget-msg.note{background:#1e1b4b;color:#e0e7ff;margin-right:24px;border:1px solid #3730a3;font-size:13px;}.ecom-widget-msg.note .ecom-widget-note-h{font-size:11px;font-weight:600;color:#a5b4fc;margin-bottom:6px;}.ecom-widget-form{display:flex;gap:8px;padding:12px;border-top:1px solid #334155;}.ecom-widget-input{flex:1;padding:10px 14px;border:1px solid #475569;border-radius:10px;background:#0f172a;color:#f1f5f9;font-size:14px;outline:none;}.ecom-widget-input::placeholder{color:#94a3b8;opacity:1;}.ecom-widget-input:focus{border-color:#f97316;}.ecom-widget-send{padding:10px 16px;border:none;border-radius:10px;background:#f97316;color:#fff;font-weight:600;cursor:pointer;font-size:14px;}.ecom-widget-send:hover{opacity:0.9;}.ecom-widget-send:disabled{opacity:0.5;cursor:not-allowed;}.ecom-widget-powered{flex-shrink:0;padding:6px 12px 8px;border-top:1px solid #334155;font-size:11px;color:#64748b;text-align:center;}.ecom-widget-forward{display:none;flex-shrink:0;padding:10px 12px;border-top:1px solid #334155;background:#0f172a;}.ecom-widget-forward.visible{display:block;}.ecom-widget-forward h4{margin:0 0 4px;font-size:13px;font-weight:600;color:#f1f5f9;}.ecom-widget-forward p{margin:0 0 8px;font-size:11px;color:#94a3b8;}.ecom-widget-forward input,.ecom-widget-forward textarea{width:100%;box-sizing:border-box;margin-bottom:8px;padding:8px 10px;border:1px solid #475569;border-radius:8px;background:#1e293b;color:#f1f5f9;font-size:13px;font-family:inherit;}.ecom-widget-forward textarea{resize:vertical;min-height:52px;}.ecom-widget-forward-btns{display:flex;gap:8px;}.ecom-widget-forward-btns button{padding:8px 12px;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;}.ecom-widget-forward-submit{background:#f97316;color:#fff;}.ecom-widget-forward-submit:disabled{opacity:0.5;cursor:not-allowed;}.ecom-widget-forward-cancel{background:transparent;color:#94a3b8;}";

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
    cfg = cfg || { headerTitle: "Plainbot", showPoweredBy: true };
    var accentHex =
      typeof cfg.accentColor === "string" && cfg.accentColor.trim().charAt(0) === "#"
        ? cfg.accentColor.trim()
        : "#f97316";
    var styleEl = document.createElement("style");
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);

    root = document.createElement("div");
    root.id = "ecom-support-widget";

    btn = document.createElement("button");
    btn.className = "ecom-widget-btn";
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
    var head = document.createElement("div");
    head.className = "ecom-widget-head";
    head.setAttribute("title", cfg.headerTitle);
    if (cfg.logoDataUrl && typeof cfg.logoDataUrl === "string") {
      var img = document.createElement("img");
      img.src = cfg.logoDataUrl;
      img.alt = cfg.headerTitle ? cfg.headerTitle + " logo" : "Store logo";
      head.appendChild(img);
    }
    var titleSpan = document.createElement("span");
    titleSpan.className = "ecom-widget-title";
    titleSpan.textContent = cfg.headerTitle;
    head.appendChild(titleSpan);
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
    panel.appendChild(head);
    panel.appendChild(messagesDiv);
    panel.appendChild(forwardBlock);
    panel.appendChild(form);
    if (cfg.showPoweredBy === true) {
      var powered = document.createElement("div");
      powered.className = "ecom-widget-powered";
      powered.textContent = "Powered by Plainbot";
      panel.appendChild(powered);
    }
    root.appendChild(btn);
    root.appendChild(panel);
    document.body.appendChild(root);

    input.style.setProperty("background-color", "#0f172a", "important");
    input.style.setProperty("color", "#f1f5f9", "important");
    input.style.setProperty("caret-color", "#f1f5f9", "important");

    applyWidgetAccent(accentHex, btn, send, input);
    applyWidgetAccent(accentHex, null, fwdSubmit, null);

    function setForwardFormVisible(visible) {
      showForwardForm = visible;
      if (visible) forwardBlock.classList.add("visible");
      else forwardBlock.classList.remove("visible");
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

    form.onsubmit = function (e) {
      e.preventDefault();
      var q = input.value.trim();
      if (!q) return;
      input.value = "";
      addMsg("user", q);
      send.disabled = true;
      addMsg("assistant", "…");

      var body = { question: q, chatbotId: botId };
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
            });
          }
          if (!res.body) {
            var last = messagesDiv.querySelector(".ecom-widget-msg.assistant:last-child");
            if (last) last.textContent = "Sorry, no response. Try again.";
            send.disabled = false;
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
                    needsForwardFromHeader || streamBuf.indexOf(FORWARD_MARKER) >= 0;
                  var cleaned = streamBuf.replace(/\s*\[FORWARD_TO_SUPPORT\]\s*$/i, "").trim();
                  last.innerHTML = linkifyForWidget(cleaned || streamBuf);
                  if (showFwd && !forwardFormSubmitted) setForwardFormVisible(true);
                }
                send.disabled = false;
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
