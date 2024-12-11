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

export async function POST(req: NextRequest) {
  const userQuery = await req.json();

  // console.log("userQuery", userQuery);
  // Extract URLs from the user query
  const urlPattern = /(https?:\/\/[^\s]+)/g;
  const urls = userQuery.message.match(urlPattern);
  const url = urls ? urls[0] : null;
  let errorMessage: string | null = null;
  let scrapedData: any = null;

  // console.log("url", url);

  async function fetchData() {
    try {
      // const { data } = await axios.get(url);
      const browser = await puppeteer.launch();
      const page = await browser.newPage();
      // await page.goto(url);
      try {
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 300 });
      } catch (navigationError: unknown) {
        errorMessage = navigationError instanceof Error ? navigationError.message : 'Unknown error';
        if (errorMessage === "Navigation timeout of 300 ms exceeded") {
          errorMessage = "";
        }
        console.error('Navigation error:', errorMessage);
        await browser.close();
        return errorMessage;
      }
      // console.log("PAGE", err);
      const content = await page.content();
      // console.log("CONTENT", content);
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
    scrapedData = await fetchData();
  }
  // console.log("SCRAPED DATA", scrapedData);

  // Using Groq to generate response
  try {
    const client = new Groq({
      apiKey: process.env["GROQ_API_KEY"],
    });

    // const chatCompletion = await client.chat.completions.create({
    //   messages: [
    //     { role: "user", content: "Explain the importance of low latency LLMs" },
    //     // { role: 'system', content: 'You are a helpful assistant.' },
    //   ],
    //   model: "llama3-8b-8192",
    // });

    // const aiResponse = chatCompletion.choices[0].message.content);

    // console.log(chatCompletion.choices[0].message.content);
    if (scrapedData === "404" || errorMessage) {
      // return NextResponse.json({ message: "404", url: url }, { status: 400 });
      return NextResponse.json({ message: "404", url: url });
    } else {
      // return NextResponse.json({ message: scrapedData }, { status: 200 });
      return NextResponse.json({ message: url, url: url }, { status: 200 });
    }
    // return NextResponse.json({ message: aiResponse }, { status: 200 });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}
