// --- WhatsApp voice calls answered by an AI voice agent ---
//
// Flow (WhatsApp Cloud API Calling, user-initiated calls):
//   1. Customer taps "call" in WhatsApp -> Meta sends a `calls` webhook with event "connect"
//      and an SDP offer (the caller's audio connection details).
//   2. We hand that offer to OpenAI's Realtime voice API, which returns an SDP answer.
//   3. We send the answer back to Meta with "pre_accept" then "accept".
//      Audio then flows directly between WhatsApp and the AI voice — no media server needed.
//   4. When the call ends Meta sends event "terminate".
//
// Requires: OPENAI_API_KEY set in Railway, calling enabled on the number in WhatsApp Manager,
// and the app subscribed to the `calls` webhook field.

const axios = require("axios");

const GRAPH = "https://graph.facebook.com/v23.0";

async function callAction(phoneNumberId, token, body) {
  return axios.post(`${GRAPH}/${phoneNumberId}/calls`, { messaging_product: "whatsapp", ...body }, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
}

// Ask OpenAI Realtime for an SDP answer to WhatsApp's SDP offer.
async function getAiAnswerSdp(offerSdp, { openaiKey, model, voice, instructions }) {
  const session = {
    type: "realtime",
    model,
    instructions,
    audio: { output: { voice } },
  };
  const form = new FormData();
  form.set("sdp", offerSdp);
  form.set("session", JSON.stringify(session));

  const res = await fetch("https://api.openai.com/v1/realtime/calls", {
    method: "POST",
    headers: { Authorization: `Bearer ${openaiKey}` },
    body: form,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`OpenAI realtime ${res.status}: ${text.slice(0, 300)}`);
  return text; // SDP answer
}

async function handleCallEvent(call, cfg) {
  const { phoneNumberId, whatsappToken, openaiKey } = cfg;
  console.log(`📞 Call event "${call.event}" from ${call.from} (call ${call.id})`);

  if (call.event === "terminate") {
    console.log(`📴 Call ${call.id} ended. Status: ${call.status || "n/a"}, duration: ${call.duration ?? "n/a"}s`);
    return;
  }
  if (call.event !== "connect") return;

  if (!openaiKey) {
    console.warn("⚠️ OPENAI_API_KEY not set — rejecting call so the caller isn't left ringing.");
    await callAction(phoneNumberId, whatsappToken, { call_id: call.id, action: "reject" }).catch(() => {});
    return;
  }

  try {
    const offer = call.session?.sdp;
    if (!offer) throw new Error("No SDP offer in call webhook");

    const answerSdp = await getAiAnswerSdp(offer, cfg);
    const session = { sdp_type: "answer", sdp: answerSdp };

    await callAction(phoneNumberId, whatsappToken, { call_id: call.id, action: "pre_accept", session });
    await callAction(phoneNumberId, whatsappToken, { call_id: call.id, action: "accept", session });
    console.log(`✅ AI answered call ${call.id}`);
  } catch (err) {
    console.error("❌ Could not answer call:", err.response?.data || err.message);
    await callAction(phoneNumberId, whatsappToken, { call_id: call.id, action: "reject" }).catch(() => {});
  }
}

module.exports = { handleCallEvent };
