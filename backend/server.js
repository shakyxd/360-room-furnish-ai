require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { GoogleGenAI } = require("@google/genai");

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

app.use(cors());
app.use(express.json());

const STYLE_DESCRIPTORS = {
  modern:       "modern contemporary",
  minimalist:   "minimalist with clean lines and neutral tones",
  scandinavian: "Scandinavian with light woods and cozy textures",
  industrial:   "industrial with exposed brick, metal, and raw materials",
  bohemian:     "bohemian with eclectic patterns, plants, and warm colours",
  luxury:       "high-end luxury with rich materials and elegant decor",
};

const buildFurnishPrompt = (style) => {
  const descriptor = STYLE_DESCRIPTORS[style] || "modern contemporary";
  return `This is a 360-degree equirectangular image of an empty room. Add realistic ${descriptor} furniture appropriate for the space. Do not alter the architecture in any way — keep all walls, floors, ceilings, windows, and doors exactly as they are. Only add furniture and decor. Maintain the equirectangular 360-degree projection format and match the existing lighting.`;
};

const UNFURNISH_PROMPT =
  "This is a 360-degree equirectangular image of a furnished room. Remove all furniture and decor, leaving only the bare walls, floors, ceilings, windows, and doors exactly as they are. Do not alter the architecture in any way. Maintain the equirectangular 360-degree projection format.";

app.post("/api/edit", upload.single("image"), async (req, res) => {
  try {
    const { action } = req.body;
    const file = req.file;

    const { style, resolution } = req.body;

    if (!file) return res.status(400).json({ error: "No image provided" });
    if (!action || !["furnish", "unfurnish"].includes(action)) return res.status(400).json({ error: "Invalid action" });
    if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: "GEMINI_API_KEY not configured" });

    const prompt = action === "furnish" ? buildFurnishPrompt(style) : UNFURNISH_PROMPT;

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { timeout: 180000 },
    });

    const imageBase64 = file.buffer.toString("base64");
    const mimeType = file.mimetype;

    const request = {
      model: "gemini-3.1-flash-image-preview",
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { data: imageBase64, mimeType } },
            { text: prompt },
          ],
        },
      ],
      config: {
        responseModalities: ["TEXT", "IMAGE"],
        outputSize: ["2k", "4k"].includes(resolution) ? resolution : "1k",
      },
    };

    let response;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        response = await ai.models.generateContent(request);
        break;
      } catch (err) {
        const retryable = err.message?.includes("503") || err.message?.includes("fetch failed");
        if (retryable && attempt < 3) {
          await new Promise((r) => setTimeout(r, attempt * 3000));
        } else {
          throw err;
        }
      }
    }

    const parts = response.candidates?.[0]?.content?.parts ?? [];

    let generatedBase64 = null;
    let generatedMimeType = "image/png";

    for (const part of parts) {
      if (part.inlineData?.data) {
        generatedBase64 = part.inlineData.data;
        generatedMimeType = part.inlineData.mimeType || "image/png";
        break;
      }
    }

    if (!generatedBase64) {
      const textParts = parts.filter((p) => p.text).map((p) => p.text).join(" ");
      return res.status(500).json({ error: "Gemini did not return an image", detail: textParts });
    }

    res.json({ image: generatedBase64, mimeType: generatedMimeType });
  } catch (err) {
    console.error("Gemini API error:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
});

app.get("/health", (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
