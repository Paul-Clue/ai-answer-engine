"use client";

import { useState } from "react";

type Message = {
  role: "user" | "ai";
  content: string;
};

export default function Home() {
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", content: "Hello! How can I help you today?" },
  ]);
  const [isLoading, setIsLoading] = useState(false);

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
        console.error("Error:", data);
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
    <div className="flex flex-col h-screen bg-gray-900">
      {/* Header */}
      <div
        className="flex flex-row justify-between w-full bg-gray-800 p-4 
        border-t-2 border-t-gray-700
        bg-gradient-to-r from-transparent via-green-600 to-transparent
        bg-[length:200%_1px] bg-no-repeat bg-bottom
        animate-border-flow"
      >
        <div className="max-w-3xl ">
          <h1 className="text-xl font-semibold text-white">
            Source Of Truth
          </h1>
        </div>
        <button
          onClick={handleSaveMessage}
          className="bg-cyan-600 text-white px-5 py-3 rounded-xl hover:bg-cyan-700 border border-gray-700 hover:border-green-600 transition-all disabled:bg-cyan-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Share Message
        </button>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto pb-32 pt-4">
        <div className="max-w-3xl mx-auto px-4">
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
      <div className="fixed bottom-0 w-full bg-gray-800 border-t border-gray-700 p-4">
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
                className="flex-1 w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent placeholder-gray-400"
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
