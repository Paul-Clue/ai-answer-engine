import { NextRequest, NextResponse } from "next/server";
import { Groq } from "groq-sdk";
// import axios from "axios";
// import cheerio from "cheerio";
import * as cheerio from "cheerio";
import puppeteer from "puppeteer";
import { redis } from "@/lib/redisCache";
// import OpenAI from "openai";
// type ScrapedData = string | {
//   title: string;
//   headings: string[];
//   paragraphs: string[];
//   links: string[];
//   divs: string[];
// } | null;
type ScrapedData =
  | string
  | {
      paragraphs: string[];
      // links: string[];
      // divs: string[];
    }
  | null;

export async function POST(req: NextRequest) {
  const userQuery = await req.json();

  // Extract URLs from the user query
  const urlPattern = /(https?:\/\/[^\s]+)/g;
  const urls = userQuery.message.match(urlPattern);
  const url = urls ? urls[0] : null;
  const cleanMessage: string = userQuery.message.replace(urlPattern, "").trim();
  let errorMessage: string | null = null;
  let scrapedData: ScrapedData = null;

  const client = new Groq({
    apiKey: process.env["GROQ_API_KEY"],
  });
  // const openai = new OpenAI({
  //   apiKey: process.env.OPENAI_API_KEY
  // });

  async function aiResponse(message: string, scrapedData: ScrapedData) {
    const systemPrompt = `
      You are a knowledgeable assistant focused on providing accurate, well-sourced information.

      Your response must be in the following JSON format:
      {
        "response": "Your detailed response here with citations and analysis",
        "followUpQuestions": [
          "First specific follow-up question about the topic",
          "Second follow-up question exploring a different aspect",
          "Third follow-up question diving deeper into implications"
        ]
      }

      If website data is provided:
      - Analyze the provided website content carefully
      - Use specific quotes and references from the scraped data
      - Cite the specific sections you're referencing
      - Generate follow-up questions specific to the website content

      If no website data is provided:
      - Respond based on your general knowledge
      - Clearly state that you're not referencing any specific source
      - Generate follow-up questions about broader topic implications

      Always:
      - Be transparent about your sources and confidence level
      - Ensure follow-up questions are specific and meaningful
      - Structure response in valid JSON format
      `;
    // Title: ${scrapedData.title}
    //       Headings: ${scrapedData.headings}
    //       Paragraphs: ${scrapedData.paragraphs}
    //       Links: ${scrapedData.links}
    //       Divs: ${scrapedData.divs}
    const chatCompletion = await client.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: cleanMessage },
        {
          role: "assistant",
          content: `Available website data:\n${JSON.stringify(scrapedData, null, 2)}`,
        },
      ],
      // model: "llama3-8b-8192",
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    // const chatCompletion = await openai.chat.completions.create({
    //   model: "gpt-4o",  // or "gpt-3.5-turbo" for a cheaper option
    //   messages: [
    //     {
    //       role: "system",
    //       content: systemPrompt
    //     },
    //     {
    //       role: "user",
    //       content: message
    //     },
    //     {
    //       role: "assistant",
    //       content: `Available website data:\n${JSON.stringify(scrapedData, null, 2)}`
    //     }
    //   ],
    //   temperature: 0.7,
    //   // max_tokens: 1000,
    // });

    // const aiResponse = chatCompletion.choices[0].message.content;
    // return aiResponse;
    try {
      const content: string | null = chatCompletion.choices[0].message.content;
      if (!content) {
        throw new Error("No response from AI");
      }
      // const aiResponse: {
      //   response: string;
      //   followUpQuestions: string[];
      // } = JSON.parse(content);
      // const aiResponse = JSON.parse(content);
      // console.log("CONTENT", aiResponse);

      // return NextResponse.json({
      //   message: aiResponse.response,
      //   followUpQuestions: aiResponse.followUpQuestions
      // });
      // return NextResponse.json({content});
      return JSON.parse(content);
    } catch (error) {
      console.error("Failed to parse AI response as JSON:", error);
      return NextResponse.json(
        {
          message: "Error processing response",
          error: "Invalid response format",
        },
        { status: 500 }
      );
    }
  }

  async function fetchData() {
    try {
      // const { data } = await axios.get(url);
      const browser = await puppeteer.launch();
      const page = await browser.newPage();

      try {
        await page.goto(url, { waitUntil: "networkidle0", timeout: 15000 });
      } catch (navigationError: unknown) {
        errorMessage =
          navigationError instanceof Error
            ? navigationError.message
            : "Unknown error";
        if (errorMessage === "Navigation timeout of 15000 ms exceeded") {
          errorMessage = "";
        }
        console.error("Navigation error:", errorMessage);
        await browser.close();
      }

      const content = await page.content();

      const $ = cheerio.load(content);

      const title = $("title").text();
      const headings: string[] = [];
      const paragraphs: string[] = [];
      const links: string[] = [];
      const divs: string[] = [];
      $("h1, h2, h3").each((index, element) => {
        headings.push($(element).text());
      });
      $("p").each((index, element) => {
        paragraphs.push($(element).text());
      });
      $("a").each((index, element) => {
        const href = $(element).attr("href");
        if (href) {
          links.push(href);
        }
      });
      $("div").each((index, element) => {
        divs.push($(element).text());
      });
      if (
        title.includes("404") ||
        title.includes("Not Found") ||
        title.includes("Page Not Found") ||
        title.includes("Error") ||
        title.includes("Error 404") ||
        title.includes("404 Not Found") ||
        title.includes("404 Page Not Found") ||
        title.includes("404 Error") ||
        title.includes("404 Page Not Found Error") ||
        title.includes("404 Page Not Found Error") ||
        headings.includes("404") ||
        headings.includes("Not Found") ||
        headings.includes("Page Not Found") ||
        headings.includes("Error") ||
        headings.includes("Error 404") ||
        headings.includes("404 Not Found") ||
        headings.includes("404 Page Not Found") ||
        headings.includes("404 Error") ||
        headings.includes("404 Page Not Found Error") ||
        headings.includes("404 Page Not Found Error") ||
        paragraphs.includes("404") ||
        paragraphs.includes("Not Found") ||
        paragraphs.includes("Page Not Found") ||
        paragraphs.includes("Error") ||
        paragraphs.includes("Error 404") ||
        paragraphs.includes("404 Not Found") ||
        paragraphs.includes("404 Page Not Found") ||
        paragraphs.includes("404 Error") ||
        paragraphs.includes("404 Page Not Found Error") ||
        paragraphs.includes("404 Page Not Found Error") ||
        divs.includes("404") ||
        divs.includes("Not Found") ||
        divs.includes("Page Not Found") ||
        divs.includes("Error") ||
        divs.includes("Error 404") ||
        divs.includes("404 Not Found") ||
        divs.includes("404 Page Not Found") ||
        divs.includes("404 Error") ||
        divs.includes("404 Page Not Found Error") ||
        divs.includes("404 Page Not Found Error")
      ) {
        await browser.close();
        return "404";
      } else {
        await browser.close();
        // return { title, headings, paragraphs, links, divs };
        return { paragraphs };
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }
  console.log("URL", url);
  if (url) {
    console.log(1)
    const cacheGet = await redis.get(url);
    if (cacheGet) {
      const response = await aiResponse(
        cleanMessage,
        cacheGet as {
          title: string;
          headings: string[];
          paragraphs: string[];
          links: string[];
          divs: string[];
        }
      );
      console.log("RESPONSE FROM CACHE", response);
      return NextResponse.json(
        { message: response, url: url },
        { status: 200 }
      );
    } else {
      console.log(2)
      const result = await fetchData();
      scrapedData = result || null;
      if (scrapedData === "404" || errorMessage) {
        return NextResponse.json({ message: "404", url: url });
      } else {
        console.log(3)
        await redis.set(url, JSON.stringify(scrapedData));
        const response = await aiResponse(
          cleanMessage,
          scrapedData as {
            title: string;
            headings: string[];
            paragraphs: string[];
            links: string[];
            divs: string[];
          }
        );
        return NextResponse.json(
          { message: response, url: url },
          { status: 200 }
        );
      }
    }
  } else {
    const response = await aiResponse(cleanMessage, null);
    return NextResponse.json({ message: response, url: url }, { status: 200 });
  }
}
