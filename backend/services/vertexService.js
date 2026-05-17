const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  vertexai: true,
  project: process.env.PROJECT_ID,
  location: process.env.LOCATION,
});

const MODEL_ID = process.env.MODEL_ID || "gemini-2.5-flash";

async function generateContent(prompt) {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Google GenAI Error:", error);

    const message =
      error?.message || error?.error?.message || "Failed to generate AI response";

    throw new Error(`Failed to generate AI response with ${MODEL_ID}: ${message}`);
  }
}

module.exports = generateContent;
