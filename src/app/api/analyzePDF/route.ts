import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
// import pdf from 'pdf-parse';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  const { text } = await req.json();
  // console.log(pdf);


  try {
    const chatCompletion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: `Please analyze this text from a PDF document and provide a detailed summary: ${text}`,
        }
      ],
      max_tokens: 500
    });

    return NextResponse.json({ 
      success: true, 
      message: chatCompletion.choices[0].message.content 
    });
    
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to analyze chart' 
    }, { status: 500 });
  }
}
