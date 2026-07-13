import React, { useEffect, useRef, useState } from "react";
import {
  Bot,
  MessageCircle,
  Send,
  User,
  X,
  Loader2,
  Pizza,
  RotateCcw,
} from "lucide-react";

type ChatRole = "user" | "assistant";

interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
}

interface ChatApiResponse {
  success: boolean;
  reply?: string;
  error?: string;
}

const QUICK_QUESTIONS = [
  "Show me the pizza menu",
  "How does the discount work?",
  "What payment methods are available?",
  "Recommend a pizza under ₹300",
  "Help me place an order",
];

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-message",
      role: "assistant",
      text:
        "Hi! I am the PizzaFlow assistant. I can help with the menu, prices, discounts, GST, payment options, and pizza recommendations.",
    },
  ]);

  const [sessionId] = useState(() => {
    if (typeof window !== "undefined" && window.crypto?.randomUUID) {
      return window.crypto.randomUUID();
    }

    return `session-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}`;
  });

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
      });

      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, messages, isSending]);

  const generateMessageId = () => {
    if (typeof window !== "undefined" && window.crypto?.randomUUID) {
      return window.crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  };

  const sendMessage = async (text?: string) => {
    const cleanedMessage = (text ?? message).trim();

    if (!cleanedMessage || isSending) {
      return;
    }

    if (cleanedMessage.length > 500) {
      setErrorMessage("Message must be 500 characters or fewer.");
      return;
    }

    const userMessage: ChatMessage = {
      id: generateMessageId(),
      role: "user",
      text: cleanedMessage,
    };

    setMessages((currentMessages) => [
      ...currentMessages,
      userMessage,
    ]);

    setMessage("");
    setErrorMessage(null);
    setIsSending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: cleanedMessage,
          sessionId,
        }),
      });

      const responseText = await response.text();

      let result: ChatApiResponse;

      try {
        result = JSON.parse(responseText);
      } catch {
        throw new Error(
          responseText || "Chat API returned an invalid response."
        );
      }

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "The chatbot could not process your message."
        );
      }

      const assistantMessage: ChatMessage = {
        id: generateMessageId(),
        role: "assistant",
        text:
          result.reply ||
          "Sorry, I could not generate a response. Please try again.",
      };

      setMessages((currentMessages) => [
        ...currentMessages,
        assistantMessage,
      ]);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "The chat service is temporarily unavailable.";

      setErrorMessage(message);

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: generateMessageId(),
          role: "assistant",
          text:
            "Sorry, I am unable to respond right now. Please try again shortly.",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: "welcome-message",
        role: "assistant",
        text:
          "Hi! I am the PizzaFlow assistant. How can I help you today?",
      },
    ]);

    setMessage("");
    setErrorMessage(null);
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating chatbot button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open PizzaFlow chatbot"
          className="
            fixed bottom-6 right-6 z-50
            flex items-center gap-2
            rounded-full
            border-4 border-[#2D2D2D]
            bg-[#FF6B6B]
            px-5 py-4
            font-black text-white
            shadow-[5px_5px_0_0_#2D2D2D]
            transition-all
            hover:translate-y-[-2px]
            active:translate-y-[2px]
            active:shadow-[2px_2px_0_0_#2D2D2D]
          "
        >
          <MessageCircle size={22} />
          <span className="hidden sm:inline">Pizza Support</span>
        </button>
      )}

      {/* Chat window */}
      {isOpen && (
        <section
          className="
            fixed bottom-4 right-4 z-50
            flex h-[620px] max-h-[88vh]
            w-[calc(100vw-2rem)] max-w-[390px]
            flex-col overflow-hidden
            rounded-3xl
            border-4 border-[#2D2D2D]
            bg-white
            shadow-[8px_8px_0_0_#2D2D2D]
          "
        >
          {/* Header */}
          <header className="flex items-center justify-between bg-[#FF6B6B] px-4 py-4 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-white bg-[#2D2D2D]">
                <Pizza size={22} />
              </div>

              <div>
                <h2 className="font-black leading-tight">
                  PizzaFlow Assistant
                </h2>

                <div className="flex items-center gap-1.5 text-[11px] font-bold">
                  <span className="h-2 w-2 rounded-full bg-[#4ECDC4]" />
                  Online support
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={clearChat}
                title="Clear chat"
                aria-label="Clear chat"
                className="rounded-lg border-2 border-white p-2 transition hover:bg-white/20"
              >
                <RotateCcw size={16} />
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close chat"
                aria-label="Close chatbot"
                className="rounded-lg border-2 border-white p-2 transition hover:bg-white/20"
              >
                <X size={17} />
              </button>
            </div>
          </header>

          {/* Messages */}
          <div className="flex-1 space-y-4 overflow-y-auto bg-[#FFFBF5] p-4">
            {messages.map((chatMessage) => {
              const isUser = chatMessage.role === "user";

              return (
                <div
                  key={chatMessage.id}
                  className={`flex items-start gap-2 ${
                    isUser ? "justify-end" : "justify-start"
                  }`}
                >
                  {!isUser && (
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[#2D2D2D] bg-[#4ECDC4] text-white">
                      <Bot size={16} />
                    </div>
                  )}

                  <div
                    className={`
                      max-w-[78%]
                      rounded-2xl
                      border-2 border-[#2D2D2D]
                      px-3.5 py-3
                      text-sm font-medium leading-relaxed
                      shadow-[2px_2px_0_0_#2D2D2D]
                      ${
                        isUser
                          ? "rounded-tr-sm bg-[#FFE66D] text-[#2D2D2D]"
                          : "rounded-tl-sm bg-white text-[#2D2D2D]"
                      }
                    `}
                  >
                    <p className="whitespace-pre-wrap break-words">
                      {chatMessage.text}
                    </p>
                  </div>

                  {isUser && (
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[#2D2D2D] bg-[#FF6B6B] text-white">
                      <User size={16} />
                    </div>
                  )}
                </div>
              );
            })}

            {isSending && (
              <div className="flex items-start gap-2">
                <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[#2D2D2D] bg-[#4ECDC4] text-white">
                  <Bot size={16} />
                </div>

                <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border-2 border-[#2D2D2D] bg-white px-4 py-3 shadow-[2px_2px_0_0_#2D2D2D]">
                  <Loader2
                    size={16}
                    className="animate-spin text-[#FF6B6B]"
                  />
                  <span className="text-xs font-bold text-gray-500">
                    Thinking...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick questions */}
          <div className="border-t-2 border-[#2D2D2D] bg-white px-3 py-3">
            <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-gray-500">
              Quick questions
            </p>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {QUICK_QUESTIONS.map((question) => (
                <button
                  key={question}
                  type="button"
                  disabled={isSending}
                  onClick={() => sendMessage(question)}
                  className="
                    shrink-0 rounded-full
                    border-2 border-[#2D2D2D]
                    bg-[#FFF9E6]
                    px-3 py-1.5
                    text-[11px] font-bold
                    text-[#2D2D2D]
                    transition
                    hover:bg-[#FFE66D]
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                  "
                >
                  {question}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {errorMessage && (
            <div className="border-t-2 border-[#2D2D2D] bg-[#FFECEC] px-4 py-2 text-xs font-bold text-[#C0392B]">
              {errorMessage}
            </div>
          )}

          {/* Input */}
          <div className="border-t-2 border-[#2D2D2D] bg-white p-3">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={message}
                maxLength={500}
                disabled={isSending}
                placeholder="Ask about menu, discount, payment..."
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={handleKeyDown}
                className="
                  min-w-0 flex-1
                  rounded-xl
                  border-2 border-[#2D2D2D]
                  bg-[#F7F7F7]
                  px-3 py-3
                  text-sm font-medium
                  text-[#2D2D2D]
                  outline-none
                  transition
                  focus:border-[#FF6B6B]
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                "
              />

              <button
                type="button"
                disabled={!message.trim() || isSending}
                onClick={() => sendMessage()}
                aria-label="Send message"
                className="
                  flex h-12 w-12 shrink-0
                  items-center justify-center
                  rounded-xl
                  border-2 border-[#2D2D2D]
                  bg-[#FF6B6B]
                  text-white
                  shadow-[2px_2px_0_0_#2D2D2D]
                  transition
                  hover:translate-y-[-1px]
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                {isSending ? (
                  <Loader2 size={19} className="animate-spin" />
                ) : (
                  <Send size={19} />
                )}
              </button>
            </div>

            <div className="mt-1 flex justify-between px-1 text-[9px] font-medium text-gray-400">
              <span>Press Enter to send</span>
              <span>{message.length}/500</span>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
