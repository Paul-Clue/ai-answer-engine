"use client";

import { useState, useRef, useEffect } from "react";
import * as Plot from "@observablehq/plot";
import * as d3 from "d3";
import ReactMarkdown from "react-markdown";
import Papa from "papaparse";
import * as pdfjsLib from "pdfjs-dist";
import { TextItem } from "pdfjs-dist/types/src/display/api";
// import { pdfjs } from "react-pdf";
import { CloudArrowUpIcon } from "@heroicons/react/24/outline";
import { ArrowPathIcon } from "@heroicons/react/24/outline";

type Message = {
  role: "user" | "ai";
  content: string;
};

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

// type ChartData = {
//   x: number;
//   y: number;
// }[];

export default function Home() {
  const chartRef = useRef<HTMLDivElement>(null);
  const [chartType, setChartType] = useState<string>("boxplot");
  const [chartData, setChartData] = useState<
    { Category: string; Value: number }[]
  >([]);
  const [analysis1, setAnalysis1] = useState<string>("");
  const [analysis2, setAnalysis2] = useState<string>("");
  const analysisRef = useRef<HTMLDivElement>(null);
  const analysisRef2 = useRef<HTMLDivElement>(null);
  const [uploadType, setUploadType] = useState<string>("chart");

  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", content: "Hello! How can I help you today?" },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingRequest, setLoadingRequest] = useState(false);

  // section: sample data

  useEffect(() => {
    if (analysis1 && analysisRef.current) {
      analysisRef.current.scrollIntoView({ behavior: "smooth" });
      analysisRef.current.focus();
    }
  }, [analysis1]);

  useEffect(() => {
    if (analysis2 && analysisRef2.current) {
      analysisRef2.current.scrollIntoView({ behavior: "smooth" });
      analysisRef2.current.focus();
    }
  }, [analysis2]);

  useEffect(() => {
    if (chartData.length > 0) {
      switch (chartType) {
        case "histogram":
          createHistogram(chartData);
          break;
        case "scatter":
          createScatterPlot(chartData);
          break;
        default:
          createBoxPlot(chartData);
      }
    }
  }, [chartType, chartData]);

  // Create boxplot
  const svgToImage = async (svg: SVGElement): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], {
        type: "image/svg+xml;charset=utf-8",
      });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/png"));
      };

      img.onerror = reject;
      img.src = url;
    });
  };

  const zoomIn = (chartRef: HTMLDivElement) => {
    const svg = d3.select(chartRef.querySelector("svg"));
    if (!svg.empty()) {
      // Set initial properties
      svg.style("cursor", "grab");

      // Select the content group
      const content = svg.selectAll("g");

      // Initialize zoom behavior
      const zoom = d3
        .zoom()
        .scaleExtent([0.1, 4])
        .on("zoom", event => {
          content.attr("transform", event.transform);
        });

      // Apply zoom
      svg
        // @ts-expect-error: Type mismatch
        .call(zoom)
        // @ts-expect-error: Type mismatch
        .call(zoom.transform, d3.zoomIdentity.translate(0, 0).scale(0.8));
    }
  };
  // section:
  // @ts-expect-error: No overload matches this call.
  const createBoxPlot = async (data: any) => {
    const chart = Plot.plot({
      style: {
        background: "#ffffff",
        color: "black",
        fontSize: "20px",
      },
      width: 800,
      height: 800,
      margin: 100,
      marks: [
        Plot.boxY(data, {
          x: "Category",
          y: "Value",
          fill: "steelblue",
          stroke: "black",
          strokeWidth: 1,
          strokeOpacity: 0.5,
        }),
        Plot.axisX({
          fontSize: 20,
          label: null,
          tickRotate: 45,
        }),
        Plot.axisY({
          fontSize: 20,
        }),
      ],
    });

    if (chartRef.current) {
      chartRef.current.innerHTML = "";
      chartRef.current.appendChild(chart);

      zoomIn(chartRef.current);

      const svgPic = chartRef.current.querySelector("svg");
      if (!svgPic) return;
      const pngDataUrl = await svgToImage(svgPic);
      setLoadingRequest(true);
      try {
        const response = await fetch("/api/analyzeChart", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            image: pngDataUrl,
            chartData: chartData,
          }),
        });

        const result = await response.json();
        setAnalysis1(result.message);
        setLoadingRequest(false);
      } catch (error) {
        console.error("Error sending chart:", error);
      }
    }
  };

  // section: histogram
  const createHistogram = async (data: any) => {
    const chart = Plot.plot({
      style: {
        background: "#ffffff",
        color: "black",
      },
      y: {
        grid: true,
      },
      marks: [
        Plot.rectY(
          data,
          Plot.binX(
            { y: "count" },
            {
              x: "Value",
              thresholds: 30,
            }
          )
          // {
          //   fill: "steelblue",
          //   stroke: "black",
          //   strokeOpacity: 0.5
          // }
        ),
        Plot.ruleY([0]),
        Plot.axisX({ label: "Value →" }),
        Plot.axisY({ label: "↑ Frequency" }),
      ],
      height: 400,
      marginLeft: 60,
      marginBottom: 40,
    });

    if (chartRef.current) {
      chartRef.current.innerHTML = "";
      chartRef.current.appendChild(chart);

      zoomIn(chartRef.current);

      const svgPic = chartRef.current.querySelector("svg");
      if (!svgPic) return;
      const pngDataUrl = await svgToImage(svgPic);
      setLoadingRequest(true);
      try {
        const response = await fetch("/api/analyzeChart", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            image: pngDataUrl,
            chartData: chartData,
          }),
        });

        const result = await response.json();
        setAnalysis1(result.message);
        setLoadingRequest(false);
      } catch (error) {
        console.error("Error sending chart:", error);
      }
    }
  };

  // section: scatter plot
  const createScatterPlot = async (data: any) => {
    const chart = Plot.plot({
      style: {
        background: "#ffffff",
      },
      grid: true,
      marks: [
        Plot.dot(data, {
          x: "Category",
          y: "Value",
          fill: "steelblue",
          stroke: "black",
          strokeWidth: 1,
          opacity: 0.5,
        }),
        Plot.axisX({ label: "Category →" }),
        Plot.axisY({ label: "↑ Value" }),
      ],
      height: 400,
      width: 800,
      marginLeft: 60,
      marginBottom: 40,
    });

    if (chartRef.current) {
      chartRef.current.innerHTML = "";
      chartRef.current.appendChild(chart);

      zoomIn(chartRef.current);

      const svgPic = chartRef.current.querySelector("svg");
      if (!svgPic) return;
      const pngDataUrl = await svgToImage(svgPic);
      setLoadingRequest(true);
      try {
        const response = await fetch("/api/analyzeChart", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            image: pngDataUrl,
            chartData: chartData,
          }),
        });

        const result = await response.json();
        setAnalysis1(result.message);
        setLoadingRequest(false);
      } catch (error) {
        console.error("Error sending chart:", error);
      }
    }
  };

  // section: file upload
  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        complete: results => {
          // @ts-expect-error: No overload matches this call.
          const headers = Object.keys(results.data[0]);
          console.log("Found columns:", headers);

          const reshapedData = headers
            .flatMap(column =>
              results.data.map(row => ({
                Category: column,
                Value: parseFloat((row as Record<string, string>)[column]),
              }))
            )
            .filter(d => !isNaN(d.Value));

          // setChartData(reshapedData);
          // createBoxPlot(reshapedData);
          // createHistogram(reshapedData);
          // createScatterPlot(reshapedData);
          setChartData(reshapedData);
          switch (chartType) {
            case "histogram":
              createHistogram(reshapedData);
              break;
            case "scatter":
              createScatterPlot(reshapedData);
              break;
            default:
              createBoxPlot(reshapedData);
          }
        },
      });
    }
  };

  // section: pdf upload
  const handlePDFUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
      let text = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();

        text += content.items
          .filter((item): item is TextItem => "str" in item)
          .map(item => item.str)
          .join(" ");
      }
      // console.log("TEXT", text);
      setLoadingRequest(true);
      const response = await fetch("/api/analyzePDF", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const data = await response.json();
      setAnalysis2(data.message);
      setLoadingRequest(false);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleSend = async () => {
    if (!message.trim()) return;

    // Add user message to the conversation
    const userMessage = { role: "user" as const, content: message };

    setMessages(prev => [...prev, userMessage]);
    setMessage("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      });

      const data = await response.json();
      console.log("DATA", data.message.followUpQuestions);

      if (response.ok) {
        if (data.message === "404") {
          alert(
            `Please check the URL and try again.\n\nThe URL you entered was:\n ${data.url}`
          );
          setMessages(prev => [
            ...prev,
            {
              role: "ai" as const,
              content:
                "I'm sorry, but I couldn't find the page you're looking for.",
            },
          ]);
        } else {
          const aiResponse =
            typeof data.message === "object"
              ? JSON.stringify(data.message.response)
              : data.message.response.toString();
          // setMessages(prev => [...prev, aiResponse]);
          // console.log("AI RESPONSE", aiResponse);
          setMessages(prev => [
            ...prev,
            {
              role: "ai",
              content: aiResponse,
            },
          ]);
          setFollowUpQuestions(data.message.followUpQuestions);
        }
      } else {
        alert("Error: " + data.message);
        // console.error("Error:", data);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveMessage = async () => {
    try {
      const response = await fetch("/api/savedMessage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages }),
      });

      const data = await response.json();
      const shareUrl = `${window.location.origin}/savedMessage/${data.id}`;

      await navigator.clipboard.writeText(shareUrl);
      alert("Link copied to clipboard!"); // Or use a toast notification
    } catch (error) {
      console.error("Error saving message:", error);
      alert("Failed to save message");
    }
  };

  const handleFollowUpQuestion = (question: string) => {
    setMessage(question);
    setFollowUpQuestions([]);
  };

  return (
    <div className="flex flex-col h-screen bg-black overflow-y-auto">
      {/* Header */}
      <div
        className="flex flex-row justify-between w-full bg-gray-800 p-4 
        border-t-2 border-t-gray-700
        bg-gradient-to-r from-transparent via-green-600 to-transparent
        bg-[length:200%_1px] bg-no-repeat bg-bottom
        animate-border-flow"
      >
        <div className="max-w-3xl ">
          <h1 className="text-xl font-semibold text-white">Source Of Truth</h1>
        </div>
        <button
          onClick={handleSaveMessage}
          className="bg-cyan-600 text-white px-5 py-3 rounded-xl hover:bg-cyan-700 border border-gray-700 hover:border-green-600 transition-all disabled:bg-cyan-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Share Message
        </button>
      </div>

      {/* Messages Container */}

      <div className="flex-1 flex flex-row overflow-y-auto px-4 pb-32 pt-4 gap-4">
        {/* <div className="flex flex-col gap-2">
          <label htmlFor="chart-type" className="text-white text-sm">
            Choose Upload Type
          </label>
          <select
            id="chart-type"
            value={uploadType}
            onChange={e => setUploadType(e.target.value)}
            className="bg-gray-800 text-sm text-white px-2 py-1 rounded-lg border border-gray-700 hover:border-green-600"
          >
            <option value="chart">Plot Chart</option>
            <option value="pdf">Upload PDF</option>
          </select>
        </div> */}
        <div className="flex flex-col w-1/3 gap-2 py-2 px-2 border border-gray-700 overflow-y-auto">
          <div className="flex flex-row gap-4 pl-2 items-center mb-2">
            <label htmlFor="chart-type" className="text-white text-sm">
              Choose Upload Type
            </label>
            <select
              id="chart-type"
              value={uploadType}
              onChange={e => setUploadType(e.target.value)}
              className="bg-gray-800 text-sm text-white px-2 py-1 rounded-lg border border-gray-700 hover:border-green-600"
            >
              <option value="chart">Plot Chart</option>
              <option value="pdf">Upload PDF</option>
            </select>
            {uploadType === "chart" && (
              <div className="flex flex-col">
                <select
                  value={chartType}
                  onChange={e => setChartType(e.target.value)}
                  className="bg-gray-800 text-sm text-white px-2 py-1 rounded-lg border border-gray-700 hover:border-green-600"
                >
                  <option value="boxplot">Box Plot</option>
                  <option value="histogram">Histogram</option>
                  <option value="scatter">Scatter Plot</option>
                </select>
              </div>
            )}
          </div>
          {/* section: chart */}
          <div className="flex flex-row justify-end">
            {loadingRequest && (
              <div className="animate-spin h-5 w-5 text-white">
                <ArrowPathIcon />
              </div>
            )}

            {uploadType === "chart" && (
              <label className="flex items-center cursor-pointer">
                <CloudArrowUpIcon className="h-6 w-6 text-gray-500 mr-2" />
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCSVUpload}
                  className="hidden"
                />
                <span className="text-sm text-gray-500">Upload CSV</span>
              </label>
            )}

            {uploadType === "pdf" && (
              <label className="flex items-center cursor-pointer">
                <CloudArrowUpIcon className="h-6 w-6 text-gray-500 mr-2" />
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handlePDFUpload}
                  className="hidden"
                />
                <span className="text-sm text-gray-500">Upload PDF</span>
              </label>
            )}
          </div>
          <hr className="border-gray-700" />
          <div className="flex flex-col justify-between">
            {uploadType === "chart" && (
              <div
                className="chart-container flex flex-col w-full h-full overflow-x-auto"
                style={{
                  minWidth: "0",
                  minHeight: "400px",
                  marginBottom: "-1rem",
                }}
                ref={chartRef}
              ></div>
            )}
            {/* section: analysis */}
            {analysis1 && (
              <div
                ref={analysisRef}
                tabIndex={-1}
                className="text-sm text-white mt-[1rem] focus:outline-none prose prose-invert"
              >
                <ReactMarkdown>{analysis1}</ReactMarkdown>
              </div>
            )}
            {analysis2 && (
              <div
                ref={analysisRef2}
                tabIndex={-1}
                className="text-sm text-white mt-[1rem] focus:outline-none prose prose-invert"
              >
                <ReactMarkdown>{analysis2}</ReactMarkdown>
              </div>
            )}
            {/* <div
            className="chart-container2 flex flex-col w-full h-full overflow-x-auto"
            style={{ minWidth: "0", minHeight: "400px", marginBottom: "-1rem" }}
            ref={chartRef2}
          ></div>
          {analysis2 && (
            <div className="text-sm text-white mt-4">{analysis2}</div>
          )} */}
          </div>
        </div>

        <div className="max-w-3xl text-xs mx-auto h-[60vh] overflow-y-auto px-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex gap-4 mb-4 ${
                msg.role === "ai"
                  ? "justify-start"
                  : "justify-end flex-row-reverse"
              }`}
            >
              <div
                className={`px-4 py-2 rounded-2xl max-w-[80%] ${
                  msg.role === "ai"
                    ? "bg-gray-800 border border-gray-700 text-gray-100"
                    : "bg-cyan-600 text-white ml-auto"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-4 mb-4">
              <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-gray-400"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-4-8c.79 0 1.5-.71 1.5-1.5S8.79 9 8 9s-1.5.71-1.5 1.5S7.21 11 8 11zm8 0c.79 0 1.5-.71 1.5-1.5S16.79 9 16 9s-1.5.71-1.5 1.5.71 1.5 1.5 1.5zm-4 4c2.21 0 4-1.79 4-4h-8c0 2.21 1.79 4 4 4z" />
                </svg>
              </div>
              <div className="px-4 py-2 rounded-2xl bg-gray-800 border border-gray-700 text-gray-100">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="fixed bottom-0 w-full bg-gray-800 border-t border-gray-900 p-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-col gap-3 items-center">
            {/* section: follow up questions */}
            <div className="flex flex-row mt-[-1rem] w-full">
              {followUpQuestions.map((question, index) => (
                <div
                  className="text-[0.625rem] border border-gray-700 text-white bg-black px-2 py-1 rounded-xl hover:bg-gray-900 hover:border-green-600 hover:cursor-pointer hover:scale-110 
        transition-all duration-200"
                  key={index}
                >
                  <button onClick={() => handleFollowUpQuestion(question)}>
                    {question}
                  </button>
                </div>
              ))}
            </div>
            <div className="flex flex-row w-full gap-3">
              <input
                type="text"
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSend()}
                placeholder="Type your message..."
                className="flex-1 w-full rounded-xl text-sm border border-gray-700 bg-gray-900 px-4 text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent placeholder-gray-400"
              />
              <button
                onClick={handleSend}
                disabled={isLoading}
                className="bg-cyan-600 text-white px-5 py-3 rounded-xl border border-gray-700 hover:border-green-600 hover:bg-cyan-700 transition-all disabled:bg-cyan-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
