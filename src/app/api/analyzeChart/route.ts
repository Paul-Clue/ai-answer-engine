import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  const { image, chartData } = await req.json();
  console.log(chartData);


  try {
    // const { image, chartData } = await req.json();

    const chatCompletion = await openai.chat.completions.create({
      model: "gpt-4o",  // Make sure to use correct model name
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "You are an expert data analyst. Please analyze the chart and its data and provide a detailed report." },
            {
              type: "image_url",
              image_url: {
                url: image,
                detail: "high"
              }
            }
          ],
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
