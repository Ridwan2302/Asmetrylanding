import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

const APP_URL = "https://asmetryapp.vercel.app/home";
const EXPECTED_FCFA = 616;
const MERCHANT_NAME = "Asmetry";
const ALLOWED_MEDIA_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

const VerificationSchema = z.object({
  valid: z.boolean(),
  reason: z.string(),
});

async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, reason: "Method not allowed." });
    return;
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    res.status(400).json({ ok: false, reason: "Invalid request body." });
    return;
  }

  const { image, mediaType, lang } = body || {};
  const language = lang === "fr" ? "fr" : "en";

  if (!image || typeof image !== "string") {
    res.status(400).json({
      ok: false,
      reason: language === "fr" ? "Aucune image reçue." : "No image received.",
    });
    return;
  }

  const safeMediaType = ALLOWED_MEDIA_TYPES.includes(mediaType) ? mediaType : "image/jpeg";
  const base64Data = image.includes(",") ? image.split(",").pop() : image;

  try {
    const client = new Anthropic();

    const response = await client.messages.parse({
      model: "claude-opus-5",
      max_tokens: 1024,
      system:
        "You verify screenshots of Jèko payment confirmations for Asmetry, a Côte d'Ivoire merchant. " +
        "Jèko is a real, BCEAO-approved mobile payment gateway supporting Wave, Orange Money, MTN, Moov, Djamo and cards. " +
        `A screenshot is valid ONLY if it clearly shows: (1) a genuine Jèko payment confirmation/success screen — not an unrelated photo, chat screenshot, or an image that looks edited or fabricated, (2) a completed/successful status, not pending or failed, (3) an amount at or reasonably close to ${EXPECTED_FCFA} FCFA (roughly $1 USD — allow for small provider fee or rounding differences), and (4) a merchant or recipient name matching "${MERCHANT_NAME}" (allow minor case, spacing, or accent differences). ` +
        `Respond with "reason" written in ${language === "fr" ? "French" : "English"}, one short sentence: if valid, briefly confirm what you saw; if invalid, briefly state which check failed.`,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: safeMediaType, data: base64Data },
            },
            { type: "text", text: "Verify this payment confirmation screenshot." },
          ],
        },
      ],
      output_config: {
        format: zodOutputFormat(VerificationSchema),
      },
    });

    const result = response.parsed_output;
    if (!result) {
      res.status(200).json({
        ok: false,
        reason:
          language === "fr"
            ? "Impossible d'analyser cette image. Réessayez."
            : "Couldn't read that image. Please try again.",
      });
      return;
    }

    if (result.valid) {
      res.status(200).json({ ok: true, reason: result.reason, appUrl: APP_URL });
    } else {
      res.status(200).json({ ok: false, reason: result.reason });
    }
  } catch (err) {
    console.error("verify-payment error:", err);
    res.status(500).json({
      ok: false,
      reason:
        language === "fr"
          ? "Erreur du serveur. Réessayez dans un instant."
          : "Server error. Please try again in a moment.",
    });
  }
}
