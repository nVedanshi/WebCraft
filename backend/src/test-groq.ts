import dotenv from "dotenv";
dotenv.config();

import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

async function testGroq() {
  try {
    console.log('Testing Groq API...');
    console.log('API Key:', process.env.GROQ_API_KEY?.substring(0, 10) + '...');
    
    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Say hello" }
      ],
      temperature: 0.3,
      max_tokens: 50,
    });

    console.log('✅ Groq API working!');
    console.log('Response:', response.choices[0]?.message?.content);
  } catch (error) {
    console.error('❌ Groq API Error:', error);
  }
}

testGroq();
