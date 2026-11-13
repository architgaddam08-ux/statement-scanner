// Vercel serverless function: POST /api/scan
// Body: { image: "<base64 jpeg>", mediaType: "image/jpeg" }
// The API key lives in the GEMINI_API_KEY environment variable and never reaches the browser.

const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const FALLBACK_MODELS = (process.env.GEMINI_FALLBACK_MODELS || "gemini-3.5-flash-lite,gemini-3.1-flash-lite").split(",").map((m) => m.trim()).filter(Boolean);
const MAX_IMAGE_CHARS = 4_000_000; // ~3 MB of base64, keeps usage and abuse down

const PROMPT = `You are a careful personal-finance assistant. The image is a bank statement, card statement, or receipt.

Extract every transaction you can read and return ONLY valid JSON (no markdown, no commentary) in exactly this shape:
{
  "document_type": "bank statement" | "card statement" | "receipt" | "unknown",
  "currency": "USD",
  "transactions": [
    { "date": "YYYY-MM-DD or as printed", "description": "string", "amount": 12.34, "category": "one of the categories below" }
  ],
  "insights": ["2-4 short, specific observations about the spending"],
  "tips": ["2-3 practical, specific suggestions to save money"]
}

Rules:
- amount is a positive number for spending. Skip deposits, payments to the card, and transfers.
- category must be one of: Groceries, Dining, Transport, Housing & Utilities, Shopping, Entertainment, Health, Subscriptions, Travel, Education, Fees & Interest, Other.
- Never invent transactions. If something is unreadable, leave it out.
- If the image is not a financial document, return {"error": "This does not look like a statement or receipt."}.`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST." });
  }
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: "Server is missing GEMINI_API_KEY." });
  }

  const { image, mediaType } = req.body || {};
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (typeof image !== "string" || !allowed.includes(mediaType)) {
    return res.status(400).json({ error: "Send a JPEG, PNG or WebP image." });
  }
  if (image.length > MAX_IMAGE_CHARS) {
    return res.status(413).json({ error: "Image is too large. Try a smaller one." });
  }

  const body = JSON.stringify({
    contents: [
      {
        parts: [
          { inline_data: { mime_type: mediaType, data: image } },
          { text: PROMPT },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      maxOutputTokens: 4000,
      temperature: 0.2,
    },
  });

  // Try the main model first. If Google is busy (503) or the model is unavailable (404),
  // wait a moment and move on to the next model in the list.
  const models = [MODEL, ...FALLBACK_MODELS.filter((m) => m !== MODEL)];

  try {
    let apiRes, data;
    for (let i = 0; i < models.length; i++) {
      apiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${models[i]}:generateContent`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-goog-api-key": process.env.GEMINI_API_KEY,
          },
          body,
        }
      );
      data = await apiRes.json();
      if (apiRes.ok) break;
      console.error("Gemini error", models[i], JSON.stringify(data));
      const retryable = [404, 429, 500, 503].includes(apiRes.status);
      if (!retryable) break;
      await new Promise((r) => setTimeout(r, 1200));
    }

    if (apiRes.status === 429) {
      return res.status(429).json({ error: "Too many scans right now (free-tier limit). Wait a minute and try again." });
    }
    if (apiRes.status === 503) {
      return res.status(503).json({ error: "Google's AI is busy right now. Please try again in a minute." });
    }
    if (!apiRes.ok) {
      return res.status(502).json({ error: "The AI service returned an error. Try again." });
    }

    const parts = data?.candidates?.[0]?.content?.parts || [];
    const text = parts.map((p) => p.text || "").join("");
    const clean = text.replace(/```json|```/g, "").trim();
    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch {
      return res.status(502).json({ error: "Could not read the AI response. Try a clearer image." });
    }
    return res.status(200).json(parsed);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Something went wrong. Try again." });
  }
}
