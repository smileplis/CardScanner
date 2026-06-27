import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Need to allow larger payloads for multiple images
app.use(express.json({ limit: "50mb" }));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

app.post("/api/scan", async (req, res) => {
  try {
    const { images } = req.body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: "No images provided" });
    }

    const imageParts = images.map((img: any) => ({
      inlineData: {
        data: img.data,
        mimeType: img.mimeType,
      },
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: {
        parts: [
          ...imageParts,
          {
            text: "Extract business card details from these images. Ensure that the returned data is a valid array of business card objects, with one object per business card identified in the images. Return empty strings for any fields that cannot be found.",
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "Full name" },
              jobTitle: {
                type: Type.STRING,
                description: "Job title or position",
              },
              company: { type: Type.STRING, description: "Company name" },
              email: { type: Type.STRING, description: "Email address" },
              phone: { type: Type.STRING, description: "Phone number" },
              website: { type: Type.STRING, description: "Website URL" },
              address: { type: Type.STRING, description: "Physical address" },
            },
          },
        },
      },
    });

    const text = response.text;
    if (text) {
      const data = JSON.parse(text);
      res.json({ cards: data });
    } else {
      res.status(500).json({ error: "No response from model" });
    }
  } catch (error: any) {
    console.error("Scan Error:", error);
    res.status(500).json({ error: error.message || "Failed to scan cards" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
