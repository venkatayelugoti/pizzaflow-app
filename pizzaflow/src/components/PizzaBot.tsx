import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Send, 
  X, 
  Bot, 
  Sparkles, 
  Pizza, 
  Trash2, 
  RefreshCw 
} from 'lucide-react';

interface PizzaBotProps {
  currentContext: {
    customer: string;
    phone: string;
    base: string;
    pizza: string;
    topping: string;
    quantity: string;
    paymentMode: string;
  };
  recentOrders: any[];
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const QUICK_QUESTIONS = [
  "How much for 5 Cheese Burst Farmhouse pizzas?",
  "What is our most popular pizza base?",
  "Check for failed sync orders",
  "Are there any bulk discounts?",
];

export default function PizzaBot({ currentContext, recentOrders }: PizzaBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showNotificationBadge, setShowNotificationBadge] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize with a warm greeting if empty
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: "Hi! I am **PizzaFlow AI** 🍕, your real-time virtual assistant. \n\nI can help you compute pricing, explore our pizza menu, or analyze recent audit records and database logs from Supabase. Try asking me:\n\n- *\"How many successful orders do we have?\"*\n- *\"Did any orders fail to sync with Databricks?\"*\n- *\"Calculate total for 3 thin crust paneer pizzas\"*",
          timestamp: new Date()
        }
      ]);
    }
  }, [messages]);

  // Scroll to bottom on updates
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Build full payload of chat history
      const historyPayload = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: historyPayload,
          currentContext,
          recentOrders
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.text,
          timestamp: new Date()
        }]);
      } else {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `⚠️ **Error:** ${data.error || 'Failed to communicate with AI model. Please try again later.'}`,
          timestamp: new Date()
        }]);
      }
    } catch (error: any) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ **Connection Error:** Could not connect to the chat API. (${error.message || 'Unknown network error'})`,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(input);
  };

  const handleClearChat = () => {
    if (window.confirm("Do you want to reset your conversation with PizzaFlow AI?")) {
      setMessages([]);
    }
  };

  // Helper to parse formatting (bold, backticks, list items, simple tables)
  const renderMessageContent = (text: string) => {
    return text.split('\n').map((line, i) => {
      const trimmed = line.trim();

      // Check if it's a table row
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        const cells = trimmed.split('|').map(c => c.trim()).filter(c => c !== '');
        // Skip header lines like |---|---|
        if (cells.every(c => c.match(/^-+$/))) return null;
        return (
          <div key={i} className="grid grid-cols-3 gap-2 border-b border-gray-100 py-1 text-xs font-mono text-[#2D2D2D]">
            {cells.map((cell, j) => (
              <span key={j} className={i === 0 ? "font-black uppercase text-gray-700" : "font-semibold"}>{cell}</span>
            ))}
          </div>
        );
      }

      // Format bold **text** and backticks `code`
      const parts = line.split(/(\*\*.*?\*\*|`.*?`)/g);
      const renderedLine = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={pIdx} className="font-extrabold text-[#2D2D2D]">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return <code key={pIdx} className="bg-amber-100 text-amber-950 font-mono text-xs px-1.5 py-0.5 rounded border border-amber-200">{part.slice(1, -1)}</code>;
        }
        return part;
      });

      // Render bullet points
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        return (
          <li key={i} className="ml-4 list-disc text-xs font-medium leading-relaxed my-1 text-[#4A4A4A]">
            {renderedLine.slice(1)}
          </li>
        );
      }

      if (trimmed === '') {
        return <div key={i} className="h-2" />;
      }

      return (
        <p key={i} className="text-xs font-medium leading-relaxed my-1 text-[#2D2D2D]">
          {renderedLine}
        </p>
      );
    }).filter(Boolean);
  };

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => {
            setIsOpen(!isOpen);
            setShowNotificationBadge(false);
          }}
          className={`w-14 h-14 bg-[#4ECDC4] hover:bg-[#3dbdb3] text-[#2D2D2D] rounded-full flex items-center justify-center border-4 border-[#2D2D2D] shadow-[4px_4px_0_0_#2D2D2D] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#2D2D2D] active:translate-y-[2px] active:shadow-[2px_2px_0_0_#2D2D2D] transition-all cursor-pointer relative ${
            isOpen ? 'rotate-90 bg-[#FF6B6B] hover:bg-[#ff5252] text-white' : ''
          }`}
          title="PizzaFlow AI Chatbot"
          id="chat-toggle-btn"
        >
          {isOpen ? (
            <X size={24} />
          ) : (
            <>
              <MessageSquare size={24} className="animate-bounce" />
              {showNotificationBadge && (
                <span className="absolute -top-1.5 -right-1.5 bg-[#FF6B6B] border-2 border-[#2D2D2D] text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-[1px_1px_0_0_#2D2D2D]">
                  AI
                </span>
              )}
            </>
          )}
        </button>
      </div>

      {/* Chat Window Panel */}
      {isOpen && (
        <div 
          className="fixed bottom-24 right-6 w-[390px] h-[520px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-8rem)] bg-white border-4 border-[#2D2D2D] rounded-3xl shadow-[8px_8px_0_0_#2D2D2D] flex flex-col overflow-hidden z-50 animate-fade-in"
          id="chatbot-panel"
        >
          {/* Header */}
          <div className="bg-[#2D2D2D] text-white p-4 flex items-center justify-between border-b-4 border-[#2D2D2D]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-[#4ECDC4] rounded-lg flex items-center justify-center text-[#2D2D2D] border-2 border-white rotate-3">
                <Pizza size={16} />
              </div>
              <div>
                <h3 className="font-black text-sm tracking-tight flex items-center gap-1.5">
                  PIZZAFLOW <span className="text-[#4ECDC4]">AI</span>
                </h3>
                <p className="text-[10px] text-[#4ECDC4] font-bold tracking-wider uppercase flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
                  Online • DB Connected
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5">
              {messages.length > 1 && (
                <button
                  onClick={handleClearChat}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                  title="Clear Chat"
                  id="chat-clear-btn"
                >
                  <Trash2 size={14} />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                title="Minimize Chat"
                id="chat-close-panel-btn"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#FFFBF5]">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`border-2 border-[#2D2D2D] px-3.5 py-2.5 rounded-2xl max-w-[85%] shadow-[2px_2px_0_0_#2D2D2D] ${
                    m.role === 'user'
                      ? 'bg-[#4ECDC4] text-[#2D2D2D] rounded-tr-none'
                      : 'bg-white text-[#2D2D2D] rounded-tl-none'
                  }`}
                >
                  {m.role === 'assistant' && (
                    <div className="flex items-center gap-1 mb-1 text-[10px] font-black uppercase text-gray-500">
                      <Bot size={12} className="text-[#FF6B6B]" />
                      <span>PizzaFlow AI</span>
                    </div>
                  )}
                  <div className="space-y-1">
                    {renderMessageContent(m.content)}
                  </div>
                </div>
                <span className="text-[8px] font-bold text-gray-400 mt-1 uppercase">
                  {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}

            {isLoading && (
              <div className="flex flex-col items-start">
                <div className="bg-white border-2 border-[#2D2D2D] px-4 py-3 rounded-2xl rounded-tl-none shadow-[2px_2px_0_0_#2D2D2D] flex items-center gap-2">
                  <RefreshCw className="animate-spin text-[#FF6B6B]" size={14} />
                  <span className="text-xs font-bold text-[#2D2D2D]">Baking response...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestion Chips */}
          <div className="bg-[#FFFBF5] px-4 pb-2 pt-1 border-t border-gray-100 flex gap-1.5 overflow-x-auto no-scrollbar scroll-smooth shrink-0">
            {QUICK_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(q)}
                disabled={isLoading}
                className="whitespace-nowrap bg-[#FFE66D] hover:bg-[#ffd83b] text-[#2D2D2D] border-2 border-[#2D2D2D] text-[10px] font-black px-3 py-1.5 rounded-full transition-all cursor-pointer shadow-[2px_2px_0_0_#2D2D2D] active:translate-y-[1px] active:shadow-[1px_1px_0_0_#2D2D2D] disabled:opacity-50 disabled:pointer-events-none"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Footer Form Input */}
          <form 
            onSubmit={handleSubmit}
            className="p-3 bg-white border-t-4 border-[#2D2D2D] flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isLoading ? "Baking, please wait..." : "Ask me about menus, bills, or audit logs..."}
              disabled={isLoading}
              className="flex-1 bg-[#F7F7F7] border-2 border-transparent focus:border-[#4ECDC4] outline-none rounded-xl px-3 py-2 text-xs font-semibold text-[#2D2D2D] placeholder-gray-400 transition-all disabled:opacity-50"
              id="chat-input-field"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="bg-[#FF6B6B] hover:bg-[#ff5252] text-white p-2.5 rounded-xl border-2 border-[#2D2D2D] shadow-[2px_2px_0_0_#2D2D2D] active:translate-y-[1px] active:shadow-[1px_1px_0_0_#2D2D2D] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
              id="chat-send-btn"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
