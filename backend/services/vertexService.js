const { GoogleGenAI } = require("@google/genai");

const MODEL_ID = process.env.MODEL_ID || "gemini-2.5-flash";
let ai = null;

function getAiClient() {
  const project = process.env.PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
  const location = process.env.LOCATION || "asia-south1";

  if (!ai) {
    ai = new GoogleGenAI({
      vertexai: true,
      project,
      location,
    });
  }

  return ai;
}

async function generateContent(prompt) {
  try {
    const response = await getAiClient().models.generateContent({
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
