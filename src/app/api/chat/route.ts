// TODO: Implement the chat API with Groq and web scraping with Cheerio and Puppeteer
// Refer to the Next.js Docs on how to read the Request body: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
// Refer to the Groq SDK here on how to use an LLM: https://www.npmjs.com/package/groq-sdk
// Refer to the Cheerio docs here on how to parse HTML: https://cheerio.js.org/docs/basics/loading
// Refer to Puppeteer docs here: https://pptr.dev/guides/what-is-puppeteer
import { NextRequest, NextResponse } from "next/server";
import { Groq } from "groq-sdk";
import axios from "axios";
// import cheerio from "cheerio";
import * as cheerio from "cheerio";
import puppeteer from "puppeteer";
import { redis } from "@/lib/redisCache";

export async function POST(req: NextRequest) {
  const userQuery = await req.json();

  // Extract URLs from the user query
  const urlPattern = /(https?:\/\/[^\s]+)/g;
  const urls = userQuery.message.match(urlPattern);
  const url = urls ? urls[0] : null;
  const cleanMessage: string = userQuery.message.replace(urlPattern, "").trim();
  // console.log("CLEAN MESSAGE", cleanMessage);
  let errorMessage: string | null = null;
  let scrapedData:
    | string
    | {
        title: string;
        headings: string[];
        paragraphs: string[];
        links: string[];
        divs: string[];
      }
    | null = null;

  async function aiResponse(
    message: string,
    scrapedData: {
      title: string;
      headings: string[];
      paragraphs: string[];
      links: string[];
      divs: string[];
    }
  ) {
    const client = new Groq({
      apiKey: process.env["GROQ_API_KEY"],
    });
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
      // messages: [
      //   { role: "user", content: message + " " + scrapedData },
      //   { role: "system", content: systemPrompt },
      // ],
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: cleanMessage },
        { 
          role: "assistant", 
          content: `Available website data:\n${JSON.stringify(scrapedData, null, 2)}` 
        }
      ],
      model: "llama3-8b-8192",
    });

    // const aiResponse = chatCompletion.choices[0].message.content;
    // return aiResponse;
    try {
      const content: string | null = chatCompletion.choices[0].message.content;
      if (!content) {
        throw new Error("No response from AI");
      }
      
      const aiResponse: {
        response: string;
        followUpQuestions: string[];
      } = JSON.parse(content);

      return NextResponse.json({
        message: aiResponse.response,
        followUpQuestions: aiResponse.followUpQuestions,
        url: url
      });
    } catch (error) {
      console.error("Failed to parse AI response as JSON:", error);
      return NextResponse.json({ 
        message: "Error processing response", 
        error: "Invalid response format" 
      }, { status: 500 });
    }
  }

  async function fetchData() {
    try {
      // const { data } = await axios.get(url);
      const browser = await puppeteer.launch();
      const page = await browser.newPage();

      try {
        await page.goto(url, { waitUntil: "networkidle0", timeout: 300 });
      } catch (navigationError: unknown) {
        errorMessage =
          navigationError instanceof Error
            ? navigationError.message
            : "Unknown error";
        if (errorMessage === "Navigation timeout of 300 ms exceeded") {
          errorMessage = "";
        }
        console.error("Navigation error:", errorMessage);
        await browser.close();
        return errorMessage;
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
        // console.log("Title:", title);
        // console.log("Headings:", headings);
        // console.log("Paragraphs:", paragraphs);
        // console.log("Links:", links);
        // console.log("Divs:", divs);
        await browser.close();
        return { title, headings, paragraphs, links, divs };
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }

  if (url) {
    const result = await fetchData();
    scrapedData = result || null;
  }

  try {
    if (scrapedData === "404" || errorMessage) {
      // return NextResponse.json({ message: "404", url: url }, { status: 400 });
      return NextResponse.json({ message: "404", url: url });
    } else {
      // CACHING / DATABASE STUFF
      // const cache = await redis.get(url);
      // if (cache) {
      //   return NextResponse.json({ message: cache, url: url }, { status: 200 });
      // } else {
      //   await redis.set(url, JSON.stringify(scrapedData));
      // }

      // USING GROQ TO GENERATE RESPONSE
      // const response = await aiResponse(cleanMessage, scrapedData);
      
      
      return NextResponse.json({ message: url, url: url }, { status: 200 });
    }
  } catch (error) {
    console.log(error);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}
