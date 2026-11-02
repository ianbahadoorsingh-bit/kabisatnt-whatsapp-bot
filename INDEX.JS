require("dotenv").config();
const express = require("express");
const axios = require("axios");
const Anthropic = require("@anthropic-ai/sdk");
const { getProductCatalog, getProductsByCategory, products } = require("./products");
const { createOrder, getOrder, getCustomerOrders, formatOrder } = require("./orders");
const { townhouseProject, getTownhouseInfo } = require("./townhouses");

const app = express();
app.use(express.json());

// --- Config ---
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || "kabisatnt_verify_2024";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY; // enables AI voice answering of WhatsApp calls
const VOICE_MODEL = process.env.VOICE_MODEL || "gpt-realtime";
const VOICE_NAME = process.env.VOICE_NAME || "marin";
const { handleCallEvent } = require("./calls");

// --- Claude AI Client ---
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// --- Dashboard config ---
const DASHBOARD_USER = process.env.DASHBOARD_USER || "admin";
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || "kabisatnt2024";

// --- Conversation History (in-memory, per phone number) ---
const conversations = new Map();
const MAX_HISTORY = 20; // Keep last 20 messages per conversation

// --- Message Log for the Dashboard (in-memory, resets on redeploy) ---
// Structure: Map<phone, { phone, name, messages: [{ dir, text, ts }], lastTs }>
const inbox = new Map();
const MAX_MESSAGES_PER_CHAT = 200;

function logMessage(phone, name, dir, text) {
  if (!inbox.has(phone)) {
    inbox.set(phone, { phone, name: name || phone, messages: [], lastTs: 0 });
  }
  const chat = inbox.get(phone);
  if (name && name !== "Customer") chat.name = name;
  const ts = Date.now();
  chat.messages.push({ dir, text, ts });
  chat.lastTs = ts;
  if (chat.messages.length > MAX_MESSAGES_PER_CHAT) {
    chat.messages.splice(0, chat.messages.length - MAX_MESSAGES_PER_CHAT);
  }
}

function getConversationHistory(phone) {
  if (!conversations.has(phone)) {
    conversations.set(phone, []);
  }
  return conversations.get(phone);
}

function addToHistory(phone, role, content) {
  const history = getConversationHistory(phone);
  history.push({ role, content });
  // Trim to max history
  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY);
  }
}

// --- System Prompt for Claude ---
const SYSTEM_PROMPT = `You are the WhatsApp assistant for 868Market (868markettt.com), Trinidad & Tobago's free online marketplace to buy, sell, auction and rent.

What 868Market offers:
- Vehicles (cars, SUVs, pickups, RORO/foreign-used, plate series filters), real estate (sale and rent, commercial), rentals
- A separate Tobago portal: guest houses, pool villas, hotels, Tobago cars/jeeps, boats and land
- Jobs (vacancies and job seekers)
- A bilingual Latino services directory (construction/tiling, catering, beauty, translation, mechanics)
- Auctions on some listings

Key facts:
- Posting an ad is FREE at 868markettt.com (tap "+ Post Free Ad")
- If someone wants help posting, ask them to send photos, title, price, location and contact name here, and tell them the team will post it for them
- VIP / featured listings and storefronts are optional paid upgrades; never quote a price — say a team member will send the options
- Buyers contact sellers directly using the WhatsApp button on each listing
- Encourage people to post their ads and share the site

Your role:
- Help sellers post ads (free) and explain VIP upgrades
- Help buyers find what they need and point them to the right category on 868markettt.com
- Be friendly, professional and concise (this is WhatsApp: short paragraphs, emojis sparingly)
- Use WhatsApp formatting: *bold*, _italic_
- Never invent listings, prices or seller details. If unsure, say a team member will follow up.

Language: reply in Spanish if the customer writes in Spanish, otherwise in English.

IMPORTANT: Only help with 868Market. Politely decline unrelated requests (including product orders for beverages or tobacco).`;

// --- Claude AI Response ---
async function getAIResponse(userPhone, userMessage) {
  try {
    // Add user message to history
    addToHistory(userPhone, "user", userMessage);

    const history = getConversationHistory(userPhone);

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: history,
    });

    const assistantMessage = response.content[0].text;

    // Add assistant response to history
    addToHistory(userPhone, "assistant", assistantMessage);

    return assistantMessage;
  } catch (error) {
    console.error("Claude API Error:", error.message);
    return "Sorry, I'm having a bit of trouble right now. Please try again in a moment, or call us directly for assistance. 📞";
  }
}

// --- Send WhatsApp Message ---
async function sendWhatsAppMessage(to, message) {
  try {
    // WhatsApp has a 4096 character limit per message
    if (message.length > 4000) {
      // Split into chunks
      const chunks = [];
      let remaining = message;
      while (remaining.length > 0) {
        if (remaining.length <= 4000) {
          chunks.push(remaining);
          break;
        }
        // Find a good split point (newline near the limit)
        let splitAt = remaining.lastIndexOf("\n", 4000);
        if (splitAt === -1 || splitAt < 2000) splitAt = 4000;
        chunks.push(remaining.substring(0, splitAt));
        remaining = remaining.substring(splitAt).trim();
      }
      for (const chunk of chunks) {
        await sendSingleMessage(to, chunk);
      }
    } else {
      await sendSingleMessage(to, message);
    }
  } catch (error) {
    console.error("Error sending WhatsApp message:", error.response?.data || error.message);
  }
}

async function sendSingleMessage(to, message) {
  await axios.post(
    `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: to,
      type: "text",
      text: { preview_url: false, body: message },
    },
    {
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );
}

// --- Quick command handling ---
function handleQuickCommand(message) {
  const lower = message.toLowerCase().trim();

  if (["hi", "hello", "hey", "good morning", "good afternoon", "good evening", "start"].includes(lower)) {
    return `👋 Hi! Welcome — ¡Hola, bienvenido! 🇹🇹🇻🇪\n\n🛒 *868Market* — Trinidad & Tobago's FREE marketplace\nCars, houses, rentals, Tobago stays, jobs & services\n🆓 Post your ad FREE → 868markettt.com\n📸 Or send us photos + price and we'll post it for you!\n\nReply:\n📝 *post* – post a free ad\n⭐ *vip* – featured listing\n🔎 *buy* – find something\n🇪🇸 *español* – en español\n❓ Or just ask me anything!`;
  }

  if (["hola", "buenas", "buenos dias", "buenos días", "buenas tardes", "buenas noches", "español", "espanol", "spanish"].includes(lower)) {
    return `👋 ¡Hola! Bienvenido a *868Market* 🇹🇹🇻🇪\n\n🛒 El mercado GRATIS de Trinidad y Tobago\nCarros, casas, alquileres, Tobago, empleos y servicios latinos\n🆓 Publica tu anuncio GRATIS → 868markettt.com\n📸 ¡O envíanos fotos + precio y lo publicamos por ti!\n\nResponde:\n📝 *publicar* – anuncio gratis\n⭐ *vip* – anuncio destacado\n🔎 *comprar* – buscar algo\n❓ ¡O pregúntame lo que quieras!`;
  }

  if (["post", "post ad", "post an ad", "sell", "868", "868market", "market"].includes(lower)) {
    return `📝 *Post your FREE ad on 868Market*\n\n1️⃣ Go to *868markettt.com* and tap *+ Post Free Ad*\n— or —\n2️⃣ Send us here: photos, title, price, location and contact name, and we'll post it for you.\n\n🚗 Cars • 🏠 Real estate • 🔑 Rentals • 🌴 Tobago stays • 💼 Jobs • 🛠️ Services`;
  }

  if (["publicar", "vender", "anuncio"].includes(lower)) {
    return `📝 *Publica tu anuncio GRATIS en 868Market*\n\n1️⃣ Entra a *868markettt.com* y toca *+ Post Free Ad*\n— o —\n2️⃣ Envíanos aquí: fotos, título, precio, ubicación y nombre de contacto, y lo publicamos por ti.\n\n🚗 Carros • 🏠 Inmuebles • 🔑 Alquileres • 🌴 Tobago • 💼 Empleos • 🛠️ Servicios`;
  }

  if (lower === "vip") {
    return `⭐ *VIP / Featured listing on 868Market*\n\nVIP ads show at the top of 868markettt.com so more buyers see them first. Posting is always free; VIP is an optional upgrade.\n\nTell us which ad you want featured and a team member will send you the VIP options. 🙌\n\n🇪🇸 Los anuncios VIP aparecen primero. Dinos qué anuncio quieres destacar.`;
  }

  if (lower === "help" || lower === "menu" || lower === "ayuda") {
    return `*868Market Help* 🤖\n\n📝 *post* – post a FREE ad\n🔎 *buy* – find something to buy or rent\n⭐ *vip* – featured listing\n🇪🇸 *español* – en español\n\n🌐 868markettt.com\nOr just tell me what you need!`;
  }

  if (["buy", "find", "search", "comprar", "buscar"].includes(lower)) {
    return `🔎 *Find it on 868Market* / *Búscalo en 868Market*\n\n🌐 868markettt.com\n🚗 Cars & SUVs • 🏠 Real estate & rentals • 🌴 Tobago stays • 💼 Jobs • 🛠️ Latino services\n\nTell me what you're looking for (e.g. "Toyota Aqua under 100k" or "villa in Crown Point") and I'll point you to the right section. 👍`;
  }

  return null; // Not a quick command, use AI
}

// --- Webhook Verification (GET) ---
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified successfully!");
    res.status(200).send(challenge);
  } else {
    console.log("❌ Webhook verification failed");
    res.sendStatus(403);
  }
});

// --- Incoming Messages (POST) ---
app.post("/webhook", async (req, res) => {
  // Always respond 200 quickly to acknowledge receipt
  res.sendStatus(200);

  try {
    const body = req.body;

    // --- WhatsApp voice call events ---
    const callValue = body.entry?.[0]?.changes?.[0]?.value;
    if (body.object === "whatsapp_business_account" && callValue?.calls) {
      for (const call of callValue.calls) {
        logMessage(call.from || "unknown", callValue.contacts?.[0]?.profile?.name, "in", `[Voice call: ${call.event}]`);
        await handleCallEvent(call, {
          phoneNumberId: PHONE_NUMBER_ID,
          whatsappToken: WHATSAPP_TOKEN,
          openaiKey: OPENAI_API_KEY,
          model: VOICE_MODEL,
          voice: VOICE_NAME,
          instructions: SYSTEM_PROMPT + VOICE_ADDENDUM,
        });
      }
      return;
    }

    if (
      body.object === "whatsapp_business_account" &&
      body.entry &&
      body.entry[0]?.changes &&
      body.entry[0].changes[0]?.value?.messages
    ) {
      const change = body.entry[0].changes[0].value;
      const message = change.messages[0];
      const from = message.from; // sender's phone number
      const contactName = change.contacts?.[0]?.profile?.name || "Customer";

      console.log(`📩 Message from ${contactName} (${from}): ${message.type}`);

      let userMessage = "";

      // Handle different message types
      switch (message.type) {
        case "text":
          userMessage = message.text.body;
          break;
        case "image":
          userMessage = message.image.caption || "[Customer sent an image]";
          break;
        case "document":
          userMessage = "[Customer sent a document]";
          break;
        case "audio":
          userMessage = "[Customer sent a voice message]";
          break;
        case "location":
          userMessage = `[Customer shared location: ${message.location.latitude}, ${message.location.longitude}]`;
          break;
        case "interactive":
          if (message.interactive.type === "button_reply") {
            userMessage = message.interactive.button_reply.title;
          } else if (message.interactive.type === "list_reply") {
            userMessage = message.interactive.list_reply.title;
          }
          break;
        default:
          userMessage = `[Unsupported message type: ${message.type}]`;
      }

      if (!userMessage) return;

      console.log(`💬 ${contactName}: ${userMessage}`);

      // Log inbound message for the dashboard
      logMessage(from, contactName, "in", userMessage);

      // Check for quick commands first
      let response = handleQuickCommand(userMessage);

      // If not a quick command, use Claude AI
      if (!response) {
        // Prepend context about the customer
        const contextMessage = `[Customer: ${contactName}, Phone: ${from}]\n${userMessage}`;
        response = await getAIResponse(from, contextMessage);
      }

      // Log outbound reply for the dashboard
      logMessage(from, contactName, "out", response);

      // Send the response
      await sendWhatsAppMessage(from, response);
      console.log(`✅ Replied to ${contactName}`);
    }
  } catch (error) {
    console.error("Error processing webhook:", error);
  }
});

// --- Re-register Phone Number ---
app.post("/register", dashboardAuth, async (req, res) => {
  try {
    const pin = req.body.pin || process.env.WHATSAPP_PIN;
    console.log("📱 Attempting to re-register phone number...");
    const response = await axios.post(
      `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/register`,
      {
        messaging_product: "whatsapp",
        pin: pin,
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log("✅ Phone number registered successfully:", response.data);
    res.json({ success: true, data: response.data });
  } catch (error) {
    console.error("❌ Registration failed:", error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.response?.data || error.message });
  }
});

// --- Deregister Phone Number ---
app.post("/deregister", dashboardAuth, async (req, res) => {
  try {
    console.log("📱 Attempting to deregister phone number...");
    const response = await axios.post(
      `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/deregister`,
      {
        messaging_product: "whatsapp",
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log("✅ Phone number deregistered successfully:", response.data);
    res.json({ success: true, data: response.data });
  } catch (error) {
    console.error("❌ Deregistration failed:", error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.response?.data || error.message });
  }
});

// --- Dashboard Auth (HTTP Basic) ---
function dashboardAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.split(" ")[1] || "";
  const [user, pass] = Buffer.from(token, "base64").toString().split(":");
  if (user === DASHBOARD_USER && pass === DASHBOARD_PASSWORD) {
    return next();
  }
  res.set("WWW-Authenticate", 'Basic realm="KABISATNT Dashboard"');
  return res.status(401).send("Authentication required.");
}

// --- Dashboard API: all conversations, newest chat first ---
app.get("/api/messages", dashboardAuth, (req, res) => {
  const chats = Array.from(inbox.values())
    .sort((a, b) => b.lastTs - a.lastTs)
    .map((c) => ({
      phone: c.phone,
      name: c.name,
      lastTs: c.lastTs,
      messages: c.messages,
    }));
  res.json({ chats, serverTime: Date.now() });
});

// --- Dashboard API: send a manual reply to a customer ---
app.post("/api/send", dashboardAuth, async (req, res) => {
  const { phone, text } = req.body || {};
  if (!phone || !text || !String(text).trim()) {
    return res.status(400).json({ success: false, error: "Missing phone or text" });
  }
  try {
    await axios.post(
      `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: phone,
        type: "text",
        text: { preview_url: false, body: String(text) },
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
    const name = inbox.get(phone)?.name || phone;
    logMessage(phone, name, "out", String(text));
    res.json({ success: true });
  } catch (error) {
    const errData = error.response?.data?.error;
    const msg =
      errData?.error_data?.details ||
      errData?.message ||
      error.message ||
      "Send failed";
    console.error("Manual send failed:", msg);
    res.status(500).json({ success: false, error: msg });
  }
});

// --- Dashboard UI ---
app.get("/dashboard", dashboardAuth, (req, res) => {
  res.set("Content-Type", "text/html");
  res.send(DASHBOARD_HTML);
});

const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>KABISATNT Inbox</title>
<style>
  :root {
    --green:#075e54; --green2:#128c7e; --bg:#eae6df; --panel:#fff;
    --in:#fff; --out:#d9fdd3; --muted:#667781; --line:#e9edef;
  }
  * { box-sizing:border-box; }
  body { margin:0; font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif; background:var(--bg); color:#111b21; height:100vh; overflow:hidden; }
  header { background:var(--green); color:#fff; padding:12px 16px; display:flex; align-items:center; gap:10px; }
  header h1 { font-size:16px; margin:0; font-weight:600; }
  header .dot { width:9px; height:9px; border-radius:50%; background:#25d366; box-shadow:0 0 0 3px rgba(37,211,102,.3); }
  header .sub { font-size:12px; opacity:.85; margin-left:auto; }
  .wrap { display:flex; height:calc(100vh - 45px); }
  .list { width:340px; background:var(--panel); border-right:1px solid var(--line); overflow-y:auto; flex-shrink:0; }
  .chat-item { padding:12px 16px; border-bottom:1px solid var(--line); cursor:pointer; }
  .chat-item:hover { background:#f5f6f6; }
  .chat-item.active { background:#f0f2f5; }
  .chat-item .row { display:flex; justify-content:space-between; align-items:baseline; gap:8px; }
  .chat-item .name { font-weight:600; font-size:15px; }
  .chat-item .time { font-size:11px; color:var(--muted); flex-shrink:0; }
  .chat-item .preview { font-size:13px; color:var(--muted); margin-top:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .chat-item .phone { font-size:11px; color:#8696a0; }
  .thread { flex:1; display:flex; flex-direction:column; background:#efeae2; }
  .thread-head { background:#f0f2f5; padding:12px 16px; border-bottom:1px solid var(--line); font-weight:600; }
  .thread-head small { display:block; font-weight:400; color:var(--muted); font-size:12px; }
  .messages { flex:1; overflow-y:auto; padding:18px 8%; }
  .msg { max-width:70%; padding:7px 11px; border-radius:8px; margin-bottom:8px; font-size:14px; line-height:1.35; box-shadow:0 1px .5px rgba(0,0,0,.08); white-space:pre-wrap; word-wrap:break-word; }
  .msg.in { background:var(--in); align-self:flex-start; border-top-left-radius:0; }
  .msg.out { background:var(--out); margin-left:auto; border-top-right-radius:0; }
  .msg .t { display:block; font-size:10px; color:var(--muted); margin-top:3px; text-align:right; }
  .col { display:flex; flex-direction:column; }
  .empty { margin:auto; color:var(--muted); text-align:center; padding:40px; }
  .badge { background:#25d366; color:#fff; border-radius:10px; font-size:11px; padding:1px 7px; margin-left:6px; }
  .composer { display:none; flex-direction:column; gap:4px; padding:10px 12px; background:#f0f2f5; border-top:1px solid var(--line); }
  .composer .row2 { display:flex; gap:8px; }
  .composer input { flex:1; padding:10px 14px; border:1px solid var(--line); border-radius:22px; font-size:14px; outline:none; }
  .composer input:focus { border-color:var(--green2); }
  .composer button { padding:10px 18px; background:var(--green2); color:#fff; border:none; border-radius:22px; font-weight:600; cursor:pointer; }
  .composer button:disabled { opacity:.5; cursor:default; }
  .sendErr { color:#c0392b; font-size:12px; min-height:14px; }
</style>
</head>
<body>
<header>
  <span class="dot"></span>
  <h1>KABISATNT Inbox</h1>
  <span class="sub" id="status">Connecting…</span>
</header>
<div class="wrap">
  <div class="list" id="list"></div>
  <div class="thread">
    <div class="thread-head" id="threadHead">Select a conversation</div>
    <div class="messages col" id="messages"><div class="empty">Incoming customer messages appear here in real time.</div></div>
    <div class="composer" id="composer">
      <div class="sendErr" id="sendErr"></div>
      <div class="row2">
        <input id="replyInput" type="text" placeholder="Type a reply…" autocomplete="off" />
        <button id="sendBtn">Send</button>
      </div>
    </div>
  </div>
</div>
<script>
  let chats = [];
  let active = null;
  function fmt(ts){ if(!ts) return ""; const d=new Date(ts); return d.toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}); }
  function fmtTime(ts){ const d=new Date(ts); return d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}); }
  function renderList(){
    const el = document.getElementById('list');
    if(!chats.length){ el.innerHTML = '<div class="empty">No conversations yet.</div>'; return; }
    el.innerHTML = chats.map(c => {
      const last = c.messages[c.messages.length-1];
      const prev = last ? (last.dir==='out'?'You: ':'') + last.text : '';
      return '<div class="chat-item '+(c.phone===active?'active':'')+'" onclick="select(\\''+c.phone+'\\')">'
        + '<div class="row"><span class="name">'+esc(c.name)+'</span><span class="time">'+fmt(c.lastTs)+'</span></div>'
        + '<div class="phone">+'+esc(c.phone)+'</div>'
        + '<div class="preview">'+esc(prev)+'</div></div>';
    }).join('');
  }
  function renderThread(){
    const head = document.getElementById('threadHead');
    const box = document.getElementById('messages');
    const composer = document.getElementById('composer');
    const c = chats.find(x=>x.phone===active);
    if(!c){ head.textContent='Select a conversation'; box.innerHTML='<div class="empty">Incoming customer messages appear here in real time.</div>'; composer.style.display='none'; return; }
    composer.style.display='flex';
    head.innerHTML = esc(c.name) + '<small>+'+esc(c.phone)+'</small>';
    const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
    box.innerHTML = c.messages.map(m =>
      '<div class="msg '+(m.dir==='in'?'in':'out')+'">'+esc(m.text)+'<span class="t">'+fmtTime(m.ts)+'</span></div>'
    ).join('');
    if(atBottom) box.scrollTop = box.scrollHeight;
  }
  function select(phone){ active=phone; renderList(); renderThread(); }
  function esc(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  async function poll(){
    try {
      const r = await fetch('/api/messages', {cache:'no-store'});
      if(!r.ok){ document.getElementById('status').textContent='Auth error'; return; }
      const data = await r.json();
      chats = data.chats;
      if(!active && chats.length) active = chats[0].phone;
      document.getElementById('status').textContent = 'Live · '+chats.length+' chats · '+fmtTime(data.serverTime);
      renderList(); renderThread();
    } catch(e){ document.getElementById('status').textContent='Offline – retrying…'; }
  }
  async function sendReply(){
    const input = document.getElementById('replyInput');
    const btn = document.getElementById('sendBtn');
    const err = document.getElementById('sendErr');
    const text = input.value.trim();
    err.textContent = '';
    if(!text || !active) return;
    btn.disabled = true;
    try {
      const r = await fetch('/api/send', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({phone: active, text})});
      const d = await r.json().catch(()=>({}));
      if(!r.ok || !d.success){
        err.textContent = 'Could not send: ' + (d.error || 'error') + (r.status===500?' (customer must message first within 24h)':'');
      } else {
        input.value = '';
        await poll();
      }
    } catch(e){ err.textContent = 'Network error – please try again.'; }
    btn.disabled = false;
    input.focus();
  }
  document.getElementById('sendBtn').onclick = sendReply;
  document.getElementById('replyInput').addEventListener('keydown', e => { if(e.key === 'Enter'){ e.preventDefault(); sendReply(); } });
  poll();
  setInterval(poll, 4000);
</script>
</body>
</html>`;

// --- Extra guidance when the assistant is speaking on a phone call ---
const VOICE_ADDENDUM = `

You are now speaking to the customer on a live WhatsApp voice call, not chatting.
Speak naturally in short sentences. Do not use emojis, bullet points, markdown or links.
Greet the caller warmly as 868Market. If they want to post an ad, tell them posting is free at 868markettt.com
or that they can send photos and details on WhatsApp and the team will post it for them.`;

// --- Privacy Policy & Data Deletion (required by Meta to publish the app) ---
const LEGAL_STYLE = `<style>body{font-family:system-ui,sans-serif;max-width:760px;margin:40px auto;padding:0 16px;line-height:1.6;color:#222}h1{font-size:1.6em}h2{font-size:1.15em;margin-top:1.6em}</style>`;
app.get("/privacy", (req, res) => {
  res.type("html").send(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>KABISATNT Privacy Policy</title>${LEGAL_STYLE}</head><body>
<h1>KABISATNT Privacy Policy</h1><p>Last updated: 18 October 2026</p>
<p>KABISATNT ("we", "us") is a Trinidad and Tobago business. This policy explains how we handle information when you contact us on WhatsApp, including messages and voice calls answered by our automated assistant.</p>
<h2>What we collect</h2><p>Your WhatsApp phone number and profile name, the messages you send us, and the audio of voice calls you place to us while the call is in progress. If you place an order we keep the order details (items, quantities, delivery location).</p>
<h2>How we use it</h2><p>To answer your questions, take and fulfil orders, and provide customer service. Messages and call audio are processed by AI service providers (Anthropic and OpenAI) only to generate replies. We do not sell your information or use it for advertising.</p>
<h2>Sharing</h2><p>We share information only with the service providers needed to run the service (Meta/WhatsApp, our hosting provider, and the AI providers above), or where required by law.</p>
<h2>Retention</h2><p>Chat history is held temporarily to keep conversations in context. Order records are kept as long as needed for business and legal purposes. We do not record or store call audio.</p>
<h2>Your choices</h2><p>You can ask us to delete your information at any time; see <a href="/data-deletion">Data deletion</a>.</p>
<h2>Contact</h2><p>Message us on WhatsApp at +1 868-772-0094 or email ian.bahadoorsingh@gmail.com.</p>
</body></html>`);
});
app.get("/data-deletion", (req, res) => {
  res.type("html").send(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>KABISATNT Data Deletion</title>${LEGAL_STYLE}</head><body>
<h1>Data deletion instructions</h1>
<p>To have KABISATNT delete the information we hold about you, send the word <b>DELETE MY DATA</b> to us on WhatsApp at +1 868-772-0094, or email ian.bahadoorsingh@gmail.com from any address and include your WhatsApp number.</p>
<p>We will remove your chat history and personal details within 30 days and confirm once done. Records we are legally required to keep (such as invoices) are retained only for as long as the law requires.</p>
</body></html>`);
});

// --- Health Check ---
app.get("/", (req, res) => {
  res.json({
    status: "running",
    service: "KABISATNT WhatsApp Bot",
    timestamp: new Date().toISOString(),
  });
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`
  🤖 KABISATNT WhatsApp Bot is running!
  🌐 Server: http://localhost:${PORT}
  📱 Webhook: http://localhost:${PORT}/webhook
  ⚡ Ready to receive messages
  `);
});
