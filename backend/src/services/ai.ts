import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function generateBlueprintFromAI(prompt: string) {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
  });

  const systemPrompt = `
You are an AI software architect.

Return ONLY valid JSON in this format:

{
  "name": "App Name",
  "pages": ["Page1", "Page2"],
  "components": ["Component1", "Component2"],
  "features": ["Feature1", "Feature2"],
  "databaseModels": [
    {
      "name": "ModelName",
      "fields": ["field1", "field2"]
    }
  ]
}

Do not explain. Do not add markdown. Return raw JSON only.
`;

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          { text: systemPrompt + "\n\nUser Request:\n" + prompt }
        ],
      },
    ],
  });

  const text = result.response.text();

  if (!text) {
    throw new Error("AI returned empty response");
  }

  try {
    return JSON.parse(text);
  } catch {
    console.log("Raw AI response:", text);
    throw new Error("AI did not return valid JSON");
  }
}
