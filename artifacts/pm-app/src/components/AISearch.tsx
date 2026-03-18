import { useState, useRef, useEffect, useCallback } from "react";
import { Search, Mic, MicOff, X, Send, Bot, Loader2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "").replace("/pm-app", "") + "/api";

type Message = {
  role: "user" | "assistant";
  content: string;
};

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

export function AISearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input is not supported in your browser. Please try Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => setListening(true);

    recognition.onresult = (event) => {
      const current = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join("");
      setTranscript(current);
      setQuery(current);
    };

    recognition.onend = () => {
      setListening(false);
      setTranscript("");
    };

    recognition.onerror = () => {
      setListening(false);
      setTranscript("");
    };

    recognition.start();
  }, []);

  const toggleVoice = useCallback(() => {
    if (listening) {
      stopListening();
    } else {
      startListening();
    }
  }, [listening, startListening, stopListening]);

  const sendQuery = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    if (listening) stopListening();

    const userMsg: Message = { role: "user", content: text.trim() };
    const history = [...messages, userMsg];
    setMessages(history);
    setQuery("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/ai-search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: text.trim(),
          history: messages,
        }),
      });

      const data = await res.json();
      setMessages([...history, { role: "assistant", content: data.answer ?? data.error ?? "No response" }]);
    } catch {
      setMessages([...history, { role: "assistant", content: "Sorry, I couldn't reach the AI service. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }, [loading, listening, messages, stopListening]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendQuery(query);
    }
    if (e.key === "Escape") setOpen(false);
  };

  const clearChat = () => {
    setMessages([]);
    setQuery("");
    inputRef.current?.focus();
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center gap-2 px-3 h-7 rounded-full border transition-all text-xs font-medium",
          "bg-gray-50 border-gray-200 text-gray-500 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600"
        )}
        title="AI Search"
      >
        <Bot className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Ask AI</span>
        <Search className="w-3 h-3 opacity-60" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-start pt-14 px-4">
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden z-10"
            style={{ maxHeight: "calc(100vh - 80px)" }}
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
              <Bot className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="text-sm font-semibold text-gray-800">AI Assistant</span>
              <span className="text-xs text-gray-400 ml-1">— ask anything about your projects</span>
              <div className="ml-auto flex items-center gap-1">
                {messages.length > 0 && (
                  <button
                    onClick={clearChat}
                    className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-white/60 transition-colors"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 rounded hover:bg-white/60 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {messages.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center py-10 text-center px-6">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center mb-3">
                  <Bot className="w-6 h-6 text-blue-600" />
                </div>
                <p className="text-sm font-medium text-gray-700 mb-1">How can I help you?</p>
                <p className="text-xs text-gray-400">Ask about your projects, tasks, deadlines, or anything work-related.</p>
                <div className="flex flex-wrap gap-2 mt-4 justify-center">
                  {["What projects are in progress?", "Summarize my deadlines", "How do I create a PID?"].map((s) => (
                    <button
                      key={s}
                      onClick={() => sendQuery(s)}
                      className="text-xs px-3 py-1.5 rounded-full bg-gray-100 hover:bg-blue-100 hover:text-blue-700 text-gray-600 transition-colors border border-gray-200"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(messages.length > 0 || loading) && (
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0" style={{ maxHeight: "50vh" }}>
                {messages.map((msg, i) => (
                  <div key={i} className={cn("flex gap-2.5", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold mt-0.5",
                      msg.role === "user" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
                    )}>
                      {msg.role === "user" ? "U" : <Bot className="w-3.5 h-3.5" />}
                    </div>
                    <div className={cn(
                      "max-w-[80%] text-sm px-3.5 py-2.5 rounded-2xl leading-relaxed",
                      msg.role === "user"
                        ? "bg-blue-600 text-white rounded-tr-sm"
                        : "bg-gray-100 text-gray-800 rounded-tl-sm"
                    )}>
                      {msg.content.split("\n").map((line, j) => (
                        <span key={j}>{line}{j < msg.content.split("\n").length - 1 && <br />}</span>
                      ))}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex gap-2.5 flex-row">
                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5 text-gray-500" />
                    </div>
                    <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-3.5 py-2.5 flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                      <span className="text-xs text-gray-500">Thinking…</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            )}

            <div className="px-3 py-3 border-t border-gray-100 bg-gray-50">
              {listening && (
                <div className="flex items-center gap-2 mb-2 px-1">
                  <span className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="w-1 h-3 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </span>
                  <span className="text-xs text-red-500 font-medium">Listening… {transcript && `"${transcript}"`}</span>
                </div>
              )}
              <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 shadow-sm px-3 py-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your question or use the mic…"
                  className="flex-1 text-sm outline-none bg-transparent text-gray-800 placeholder:text-gray-400"
                  disabled={loading}
                />
                <button
                  onClick={toggleVoice}
                  className={cn(
                    "p-1.5 rounded-lg transition-all",
                    listening
                      ? "bg-red-100 text-red-500 hover:bg-red-200"
                      : "text-gray-400 hover:bg-gray-100 hover:text-blue-600"
                  )}
                  title={listening ? "Stop listening" : "Start voice input"}
                >
                  {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => sendQuery(query)}
                  disabled={!query.trim() || loading}
                  className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  title="Send"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] text-gray-400 text-center mt-1.5">Press Enter to send · Esc to close</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
