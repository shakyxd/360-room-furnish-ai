require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const PROMPTS = {
  furnish:
    "This is a 360-degree equirectangular image of an empty room. Add realistic modern furniture appropriate for the space. Maintain the equirectangular 360-degree projection format and match the existing lighting and style.",
  unfurnish:
    "This is a 360-degree equirectangular image of a furnished room. Remove all furniture and leave only the bare walls, floors, and windows. Maintain the equirectangular 360-degree projection format.",
};

app.post("/api/edit", upload.single("image"), async (req, res) => {
  try {
    const { action } = req.body;
    const file = req.file;

    if (!file) return res.status(400).json({ error: "No image provided" });
    if (!action || !PROMPTS[action]) return res.status(400).json({ error: "Invalid action. Use 'furnish' or 'unfurnish'" });
    if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: "GEMINI_API_KEY not configured" });

    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-image-preview",
      generationConfig: {
        responseModalities: ["Text", "Image"],
      },
    });

    const imageBase64 = file.buffer.toString("base64");
    const mimeType = file.mimetype;

    const result = await model.generateContent([
      {
        inlineData: {
          data: imageBase64,
          mimeType,
        },
      },
      { text: PROMPTS[action] },
    ]);

    const response = result.response;
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
