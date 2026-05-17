const generateContent = require("../services/vertexService");

function parseJsonResponse(response) {
  const cleaned = response
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    throw error;
  }
}

async function extractIntent(message) {
  const prompt = `
Extract the following fields from the user request:

1. service
2. location
3. time

Return ONLY valid JSON.

If any field is missing, return null.

Example Output:
{
  "service": "AC technician",
  "location": "G-13",
  "time": "tomorrow morning"
}

User Request:
"${message}"
`;

  const response = await generateContent(prompt);

  return parseJsonResponse(response);
}

module.exports = extractIntent;
