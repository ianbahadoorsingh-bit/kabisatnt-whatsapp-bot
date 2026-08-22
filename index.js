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

// --- Claude AI Client ---
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// --- Conversation History (in-memory, per phone number) ---
const conversations = new Map();
const MAX_HISTORY = 20; // Keep last 20 messages per conversation

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
const SYSTEM_PROMPT = `You are the KABISATNT WhatsApp Business Assistant. KABISATNT is a company based in Trinidad and Tobago with two business lines:

1. **Distribution**: Beers, spirits/drinks, cigars, cigarettes, and vapes
2. **Real Estate**: Townhouse development project

Your role:
- Help customers browse products, get prices, and place orders for beverages/tobacco
- Answer questions about the townhouse development (availability, features, pricing, viewings)
- Be friendly, professional, and knowledgeable
- Use a warm Caribbean tone while remaining professional
- Keep responses concise since this is WhatsApp (short paragraphs, use emojis sparingly)

Important business info:
- Currency: Trinidad and Tobago Dollars (TTD)
- Business hours: Monday to Saturday, 8 AM - 6 PM
- Location: Trinidad and Tobago
- Delivery available for distribution products (details to be confirmed with the team)
- Minimum order may apply for delivery
- Age verification required: All beverage/tobacco products are for persons 18 years and older only

Current Product Catalog (Distribution):
${JSON.stringify(products, null, 2)}

Townhouse Project Details:
${JSON.stringify(townhouseProject, null, 2)}

When a customer wants to place a product order:
1. Confirm the items and quantities
2. Ask for their name if you don't have it
3. Ask for delivery address or if they'll pick up
4. Summarize the order with total price
5. Tell them the order has been placed and they'll receive confirmation

When a customer asks about townhouses:
1. Share available unit types and features
2. Offer to schedule a viewing/site visit
3. Collect their name and contact info for follow-up
4. Mention financing options if relevant
5. If they ask about specific pricing, tell them to contact the team for current pricing or share the listed price if available

When responding:
- Use WhatsApp formatting: *bold*, _italic_, ~strikethrough~
- Keep messages under 1000 characters when possible
- If asked about products not in the catalog, say you'll check availability
- Never make up prices - only quote prices from the catalog
- If someone asks for something you're unsure about, say you'll check with the team

IMPORTANT: You must decline any requests that are not related to KABISATNT's products, services, or townhouse project. Stay focused on helping with orders, product inquiries, and real estate questions.`;

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

  if (lower === "menu" || lower === "catalog" || lower === "products" || lower === "catalogue") {
    return getProductCatalog();
  }

  if (lower === "hi" || lower === "hello" || lower === "hey" || lower === "good morning" || lower === "good afternoon" || lower === "good evening") {
    return `Hey there! 👋 Welcome to *KABISATNT*!\n\nWe distribute beers, spirits, cigars, cigarettes, and vapes across Trinidad & Tobago. We also have a townhouse development project!\n\nHow can I help you today?\n\n📦 Type *menu* to see our product catalog\n🏠 Type *townhouses* for our real estate project\n🛒 Tell me what you'd like to order\n❓ Ask me anything!`;
  }

  if (lower === "help") {
    return `*KABISATNT Bot Commands* 🤖\n\n📦 *menu* - View full product catalog\n🍺 *beers* - View beer selection\n🥃 *spirits* - View spirits & drinks\n🚬 *cigars* - View cigar selection\n🚬 *cigarettes* - View cigarette brands\n💨 *vapes* - View vape products\n🏠 *townhouses* - View townhouse project\n📋 *orders* - Check your order status\n❓ *help* - Show this help message\n\nOr just tell me what you need in your own words!`;
  }

  if (lower === "townhouses" || lower === "townhouse" || lower === "houses" || lower === "house" || lower === "real estate" || lower === "property" || lower === "properties") {
    return getTownhouseInfo();
  }

  // Category shortcuts
  const categoryMap = {
    beers: "beer", beer: "beer",
    spirits: "spirit", drinks: "drink", liquor: "spirit",
    cigars: "cigar",
    cigarettes: "cigarette", smokes: "cigarette",
    vapes: "vape", vape: "vape",
  };

  if (categoryMap[lower]) {
    const result = getProductsByCategory(categoryMap[lower]);
    if (result) {
      let msg = `*${result.category.toUpperCase()}*\n\n`;
      result.items.forEach(p => {
        msg += `• ${p.name}`;
        if (p.size) msg += ` (${p.size})`;
        if (p.pack) msg += ` (${p.pack})`;
        msg += ` - $${p.price.toFixed(2)}`;
        if (p.case_price) msg += ` | Case of ${p.case_qty}: $${p.case_price.toFixed(2)}`;
        if (p.description) msg += ` - ${p.description}`;
        msg += "\n";
      });
      msg += "\n💰 All prices in TTD";
      return msg;
    }
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

      // Check for quick commands first
      let response = handleQuickCommand(userMessage);

      // If not a quick command, use Claude AI
      if (!response) {
        // Prepend context about the customer
        const contextMessage = `[Customer: ${contactName}, Phone: ${from}]\n${userMessage}`;
        response = await getAIResponse(from, contextMessage);
      }

      // Send the response
      await sendWhatsAppMessage(from, response);
      console.log(`✅ Replied to ${contactName}`);
    }
  } catch (error) {
    console.error("Error processing webhook:", error);
  }
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
