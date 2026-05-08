import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Brain, Send, Mic, MicOff, Volume2, VolumeX, ThumbsUp, ThumbsDown,
  ChevronDown, Zap, RotateCcw, Copy, Check, Cpu, Wifi, WifiOff
} from 'lucide-react';

// ─── Utility ────────────────────────────────────────────────────────────────
function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ─── Ollama API helper (streaming) ──────────────────────────────────────────
const OLLAMA_URL = 'http://localhost:11434';

async function streamOllama(model, messages, systemPrompt, onChunk, onDone, onError) {
  try {
    if (!model) throw new Error('No model selected — check Ollama is running and has a model pulled');
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: true,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map(m => ({ role: m.role, content: m.content }))
        ]
      })
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`Ollama returned ${res.status}${errBody ? ': ' + errBody.slice(0, 120) : ''}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let full = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = decoder.decode(value).split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const json = JSON.parse(line);
          const chunk = json.message?.content || '';
          full += chunk;
          onChunk(full);
          if (json.done) { onDone(full); return; }
        } catch { /* ignore invalid JSON */ }
      }
    }
    onDone(full);
  } catch (err) {
    onError(err.message);
  }
}

// ─── Quick Suggest Chips ────────────────────────────────────────────────────
const QUICK_QUESTIONS = [
  '💓 What does my current heart rate mean?',
  '😴 How can I improve my sleep quality?',
  '🏃 What workout suits my readiness today?',
  '🧘 Stress management techniques for me?',
  '💊 Should I take a rest day today?',
  '📊 Explain my HRV trend this week',
];

// ─── Typing dots ────────────────────────────────────────────────────────────
const TypingDots = () => (
  <div className="flex items-center gap-1 px-1 py-1">
    {[0, 1, 2].map(i => (
      <span
        key={i}
        className="w-2 h-2 rounded-full bg-[var(--color-pulse-cyan)] animate-bounce"
        style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.8s' }}
      />
    ))}
  </div>
);

// ─── Single Message Bubble ───────────────────────────────────────────────────
const MessageBubble = ({ msg, onExplain, onFeedback }) => {
  const [copied, setCopied] = useState(false);
  const [fb, setFb] = useState(null); // 'up' | 'down'

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleFeedback = (v) => {
    setFb(v);
    onFeedback?.(msg.id, v);
  };

  const isUser = msg.role === 'user';

  return (
    <div className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}>
      {/* Avatar */}
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-[var(--color-pulse-cyan)]/15 flex-shrink-0 flex items-center justify-center mr-2 mt-1 border border-[var(--color-pulse-cyan)]/30 self-start">
          <Brain size={14} className="text-[var(--color-pulse-cyan)]" />
        </div>
      )}

      <div className={cn('flex flex-col max-w-[80%]', isUser && 'items-end')}>
        {/* Bubble */}
        <div
          className={cn(
            'px-4 py-3 rounded-2xl text-sm leading-relaxed relative',
            isUser
              ? 'bg-[var(--color-pulse-cyan)]/20 text-white rounded-tr-sm border border-[var(--color-pulse-cyan)]/30 shadow-[0_2px_12px_rgba(0,229,255,0.12)]'
              : 'bg-white/5 text-gray-200 rounded-tl-sm border border-white/8 shadow-[0_2px_12px_rgba(0,0,0,0.25)]'
          )}
        >
          {msg.streaming && msg.content === '' ? (
            <TypingDots />
          ) : isUser ? (
            <span>{msg.content}</span>
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                // Paragraphs
                p: ({ children }) => (
                  <p className="mb-2 last:mb-0 text-gray-200 leading-relaxed">{children}</p>
                ),
                // Headings
                h1: ({ children }) => (
                  <h1 className="text-base font-bold text-white mb-2 mt-3 first:mt-0 border-b border-white/10 pb-1">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-sm font-bold text-[var(--color-pulse-cyan)] mb-1.5 mt-3 first:mt-0 uppercase tracking-wide">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-sm font-semibold text-gray-100 mb-1 mt-2 first:mt-0">{children}</h3>
                ),
                // Bullet list
                ul: ({ children }) => (
                  <ul className="my-2 space-y-1.5 pl-1">{children}</ul>
                ),
                // Numbered list
                ol: ({ children }) => (
                  <ol className="my-2 space-y-1.5 pl-1 list-none counter-reset-item">{children}</ol>
                ),
                // List item — works for both ul and ol
                li: ({ children, ordered, index }) => (
                  <li className="flex items-start gap-2">
                    {ordered ? (
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--color-pulse-cyan)]/15 border border-[var(--color-pulse-cyan)]/25 text-[var(--color-pulse-cyan)] text-[10px] font-bold flex items-center justify-center mt-0.5">
                        {typeof index === 'number' ? index + 1 : '•'}
                      </span>
                    ) : (
                      <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--color-pulse-cyan)] mt-2" />
                    )}
                    <span className="text-gray-200 text-sm leading-relaxed">{children}</span>
                  </li>
                ),
                // Bold
                strong: ({ children }) => (
                  <strong className="font-bold text-white">{children}</strong>
                ),
                // Italic
                em: ({ children }) => (
                  <em className="italic text-gray-300">{children}</em>
                ),
                // Inline code
                code: ({ inline, children }) =>
                  inline ? (
                    <code className="bg-black/40 border border-white/10 text-[var(--color-pulse-cyan)] font-mono text-[11px] px-1.5 py-0.5 rounded">
                      {children}
                    </code>
                  ) : (
                    <pre className="bg-black/50 border border-white/10 rounded-xl p-3 my-2 overflow-x-auto">
                      <code className="text-[var(--color-pulse-green)] font-mono text-[11px] leading-relaxed">
                        {children}
                      </code>
                    </pre>
                  ),
                // Block quote
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-[var(--color-pulse-cyan)]/50 pl-3 my-2 text-gray-400 italic">
                    {children}
                  </blockquote>
                ),
                // Horizontal rule
                hr: () => (
                  <hr className="border-white/10 my-3" />
                ),
                // Table (GFM)
                table: ({ children }) => (
                  <div className="overflow-x-auto my-3 rounded-xl border border-white/10">
                    <table className="w-full text-xs border-collapse">{children}</table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="bg-white/5">{children}</thead>
                ),
                tbody: ({ children }) => (
                  <tbody className="divide-y divide-white/5">{children}</tbody>
                ),
                tr: ({ children }) => (
                  <tr className="hover:bg-white/[0.03] transition-colors">{children}</tr>
                ),
                th: ({ children }) => (
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-[var(--color-pulse-cyan)] uppercase tracking-wider">{children}</th>
                ),
                td: ({ children }) => (
                  <td className="px-3 py-2 text-gray-300 font-mono text-[11px]">{children}</td>
                ),
                // Links
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noreferrer"
                    className="text-[var(--color-pulse-cyan)] underline underline-offset-2 hover:opacity-80 transition-opacity">
                    {children}
                  </a>
                ),
              }}
            >
              {msg.content}
            </ReactMarkdown>
          )}
          {msg.streaming && msg.content !== '' && (
            <span className="inline-block w-0.5 h-4 bg-[var(--color-pulse-cyan)] ml-1 animate-pulse align-text-bottom" />
          )}
        </div>

        {/* Metadata row */}
        <div className={cn('flex items-center gap-2 mt-1.5 px-1', isUser ? 'flex-row-reverse' : 'flex-row')}>
          <span className="text-[10px] text-gray-600 font-mono">{formatTime(msg.timestamp)}</span>

          {!isUser && !msg.streaming && (
            <>
              <button
                onClick={handleCopy}
                className="text-gray-600 hover:text-gray-300 transition-colors"
                title="Copy"
              >
                {copied ? <Check size={12} className="text-[var(--color-pulse-green)]" /> : <Copy size={12} />}
              </button>
              <button
                onClick={() => onExplain?.(msg.content)}
                className="text-[10px] font-bold text-gray-600 hover:text-[var(--color-pulse-cyan)] transition-colors border border-white/10 hover:border-[var(--color-pulse-cyan)]/30 rounded px-1.5 py-0.5"
              >
                Explain
              </button>
              <button
                onClick={() => handleFeedback('up')}
                className={cn('transition-colors', fb === 'up' ? 'text-[var(--color-pulse-green)]' : 'text-gray-600 hover:text-gray-300')}
              >
                <ThumbsUp size={12} />
              </button>
              <button
                onClick={() => handleFeedback('down')}
                className={cn('transition-colors', fb === 'down' ? 'text-red-400' : 'text-gray-600 hover:text-gray-300')}
              >
                <ThumbsDown size={12} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main AI Coach Component ─────────────────────────────────────────────────
export default function AICoach({ hr = 72, twin, backendState }) {
  const [messages, setMessages] = useState([
    {
      id: 'init',
      role: 'assistant',
      content: "Hello! I'm PULSE — your on-device AI health coach, powered by a local Ollama model. I've already analyzed your Digital Twin and vitals. What would you like to know?",
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ollamaOnline, setOllamaOnline] = useState(null); // null = checking
  const [showQuick, setShowQuick] = useState(true);
  const [availableModels, setAvailableModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState(''); // set from Ollama /api/tags

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);

  // ── Check Ollama health + fetch model list ───────────────────────────────
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(2000) });
        if (res.ok) {
          const data = await res.json();
          const models = (data.models || []).map(m => m.name);
          setAvailableModels(models);
          if (models.length > 0) setSelectedModel(models[0]);
          setOllamaOnline(true);
        } else {
          setOllamaOnline(false);
        }
      } catch {
        setOllamaOnline(false);
      }
    };
    check();
    const id = setInterval(check, 15000);
    return () => clearInterval(id);
  }, []);

  // ── Auto scroll ──────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Build system prompt from live vitals ─────────────────────────────────
  const buildSystemPrompt = useCallback(() => {
    const readiness = twin?.readiness_score?.toFixed(1) ?? 'N/A';
    const fatigue = twin?.fatigue_index?.toFixed(1) ?? 'N/A';
    const score = backendState?.unified_score ?? 'N/A';
    const risk = backendState?.risk_level ?? 'unknown';
    return `You are PULSE, a friendly and expert AI health coach embedded in the ADEO wearable health platform.

Current live biometric data:
- Heart Rate: ${hr} bpm
- Readiness Score: ${readiness}%
- Fatigue Index: ${fatigue}%
- Unified Health Score: ${score}
- Risk Level: ${risk}

RESPONSE FORMAT RULES (always follow):
- Use **bold** for important numbers, key terms, and metrics.
- Use bullet points (- item) for lists of tips, factors, or options.
- Use numbered lists (1. 2. 3.) for step-by-step instructions or ranked recommendations.
- Use markdown tables for comparisons, schedules, or structured data.
- Use ## headings to separate sections when the response has multiple topics.
- Use > blockquotes for warnings, cautions, or important notices.
- Keep paragraphs short (2-3 sentences max).
- Always end with a concise actionable takeaway or follow-up question.
- If unsure, say so clearly and recommend consulting a professional.`;
  }, [hr, twin, backendState]);

  // ── Voice output (Web Speech Synthesis) ─────────────────────────────────
  const speakText = (text) => {
    const synth = synthRef.current;
    if (!synth) return;
    synth.cancel();
    const stripped = text.replace(/[*_`#]/g, '');
    const utt = new SpeechSynthesisUtterance(stripped.slice(0, 400));
    utt.rate = 1.05;
    utt.pitch = 1;
    synth.speak(utt);
  };

  // ── Send message ─────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;

    setShowQuick(false);
    const userMsg = { id: Date.now().toString(), role: 'user', content: trimmed, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    const placeholderId = `ai-${Date.now()}`;
    const placeholder = { id: placeholderId, role: 'assistant', content: '', timestamp: new Date(), streaming: true };
    setMessages(prev => [...prev, placeholder]);
    setIsStreaming(true);

    // Build history (without the streaming placeholder)
    const history = messages.concat(userMsg).map(m => ({ role: m.role, content: m.content }));

    if (!ollamaOnline) {
      // Graceful fallback
      setTimeout(() => {
        setMessages(prev => prev.map(m => m.id === placeholderId
          ? { ...m, content: "⚠️ Ollama is offline. Please start it with `ollama serve` and ensure a model is pulled (e.g. `ollama pull llama3.2`).", streaming: false }
          : m
        ));
        setIsStreaming(false);
      }, 800);
      return;
    }

    streamOllama(
      selectedModel,
      history,
      buildSystemPrompt(),
      (partialText) => {
        setMessages(prev => prev.map(m => m.id === placeholderId ? { ...m, content: partialText } : m));
      },
      (finalText) => {
        setMessages(prev => prev.map(m => m.id === placeholderId ? { ...m, content: finalText, streaming: false } : m));
        setIsStreaming(false);
        if (isSpeaking) speakText(finalText);
      },
      (errMsg) => {
        setMessages(prev => prev.map(m => m.id === placeholderId
          ? { ...m, content: `❌ Error: ${errMsg}. Is Ollama running with a pulled model?`, streaming: false }
          : m
        ));
        setIsStreaming(false);
      }
    );
  }, [messages, isStreaming, ollamaOnline, buildSystemPrompt, isSpeaking, selectedModel]);

  // ── "Explain this" re-prompt ─────────────────────────────────────────────
  const handleExplain = useCallback((content) => {
    sendMessage(`Please explain this in simpler terms: "${content.slice(0, 300)}..."`);
  }, [sendMessage]);

  // ── Voice input (Web Speech API) ─────────────────────────────────────────
  const toggleListening = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Speech recognition not supported in this browser.');
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SpeechRecognition();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
    };
    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);
    recognitionRef.current = rec;
    rec.start();
    setIsListening(true);
  };

  const toggleSpeaking = () => {
    if (isSpeaking) synthRef.current?.cancel();
    setIsSpeaking(p => !p);
  };

  // ── Clear conversation ───────────────────────────────────────────────────
  const clearChat = () => {
    setMessages([{
      id: 'init-' + Date.now(),
      role: 'assistant',
      content: "Conversation cleared. How can I help you with your health today?",
      timestamp: new Date()
    }]);
    setShowQuick(true);
  };

  // ── Feedback handler (stub – extend to POST to backend) ──────────────────
  const handleFeedback = (msgId, vote) => {
    console.log('Feedback', msgId, vote);
    // TODO: POST to /feedback
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 w-full max-w-4xl mx-auto">
      {/* ── Header ── */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-[var(--color-pulse-cyan)]/15 flex items-center justify-center border border-[var(--color-pulse-cyan)]/30">
              <Brain size={20} className="text-[var(--color-pulse-cyan)]" />
            </div>
            <span className={cn(
              'absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--color-pulse-bg)]',
              ollamaOnline === null ? 'bg-amber-400 animate-pulse' :
                ollamaOnline ? 'bg-[var(--color-pulse-green)]' : 'bg-red-500'
            )} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">PULSE <span className="font-mono text-[var(--color-pulse-cyan)]">AI Coach</span></h1>
            <div className="flex items-center gap-2 mt-0.5">
              {ollamaOnline === null && <span className="text-[10px] text-amber-400 font-mono">Checking Ollama…</span>}
              {ollamaOnline === true && (
                <span className="text-[10px] text-[var(--color-pulse-green)] font-mono flex items-center gap-1">
                  <Wifi size={10} /> Ollama online • {selectedModel}
                </span>
              )}
              {ollamaOnline === false && (
                <span className="text-[10px] text-red-400 font-mono flex items-center gap-1">
                  <WifiOff size={10} /> Ollama offline
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Model selector — always shown when models are loaded */}
          {availableModels.length > 0 && (
            <select
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
              className="bg-white/5 border border-white/10 text-gray-300 text-[11px] rounded-lg px-2 py-1.5 outline-none focus:border-[var(--color-pulse-cyan)]/40 cursor-pointer max-w-[160px] truncate"
            >
              {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          )}

          <button
            onClick={toggleSpeaking}
            title={isSpeaking ? 'Mute voice output' : 'Enable voice output'}
            className={cn(
              'w-8 h-8 rounded-xl flex items-center justify-center transition-all',
              isSpeaking ? 'bg-[var(--color-pulse-cyan)]/20 text-[var(--color-pulse-cyan)] border border-[var(--color-pulse-cyan)]/30' : 'bg-white/5 text-gray-500 hover:text-gray-300 border border-white/10'
            )}
          >
            {isSpeaking ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>

          <button
            onClick={clearChat}
            title="Clear conversation"
            className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/5 text-gray-500 hover:text-gray-300 border border-white/10 transition-all"
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>

      {/* ── Live context strip ── */}
      <div className="flex-shrink-0 flex items-center gap-4 px-6 py-2.5 bg-white/[0.02] border-b border-white/5 overflow-x-auto hide-scrollbar">
        {[
          { label: 'HR', value: `${hr} bpm`, color: 'var(--color-pulse-cyan)' },
          { label: 'Readiness', value: `${twin?.readiness_score?.toFixed(0) ?? '--'}%`, color: 'var(--color-pulse-green)' },
          { label: 'Fatigue', value: `${twin?.fatigue_index?.toFixed(0) ?? '--'}%`, color: 'var(--color-pulse-amber)' },
          { label: 'Risk', value: backendState?.risk_level ?? '--', color: backendState?.risk_level === 'high' ? '#f87171' : '#a3e635' },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">{label}</span>
            <span className="text-[11px] font-mono font-bold" style={{ color }}>{value}</span>
          </div>
        ))}
        <div className="flex items-center gap-1 ml-auto flex-shrink-0">
          <Cpu size={10} className="text-gray-600" />
          <span className="text-[10px] text-gray-600 font-mono">Context-aware</span>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 hide-scrollbar">
        {messages.map(msg => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            onExplain={handleExplain}
            onFeedback={handleFeedback}
          />
        ))}

        {/* Quick suggestions (shown initially or when chat is fresh) */}
        {showQuick && (
          <div className="pt-2">
            <p className="text-[10px] text-gray-600 uppercase font-bold tracking-widest mb-3 flex items-center gap-1.5">
              <Zap size={10} className="text-[var(--color-pulse-cyan)]" />
              Suggested questions
            </p>
            <div className="flex flex-wrap gap-2">
              {QUICK_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q)}
                  className="text-xs px-3 py-2 rounded-xl bg-white/5 border border-white/8 text-gray-300 hover:bg-[var(--color-pulse-cyan)]/10 hover:border-[var(--color-pulse-cyan)]/30 hover:text-white transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input Area ── */}
      <div className="flex-shrink-0 px-5 py-4 border-t border-white/5 space-y-3 pb-28 md:pb-4">
        {/* Re-show suggestions button */}
        {!showQuick && (
          <button
            onClick={() => setShowQuick(true)}
            className="flex items-center gap-1.5 text-[10px] text-gray-600 hover:text-gray-400 transition-colors"
          >
            <ChevronDown size={12} /> Show suggestions
          </button>
        )}

        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
              placeholder={isListening ? '🎙 Listening…' : 'Ask PULSE anything… (Enter to send)'}
              rows={1}
              className={cn(
                'w-full bg-black/40 border rounded-2xl py-3 pl-4 pr-4 text-sm text-white resize-none focus:outline-none transition-all',
                isListening
                  ? 'border-[var(--color-pulse-cyan)]/60 shadow-[0_0_12px_rgba(0,229,255,0.2)]'
                  : 'border-white/10 focus:border-[var(--color-pulse-cyan)]/40'
              )}
              style={{ maxHeight: '120px', overflowY: 'auto' }}
            />
          </div>

          {/* Mic */}
          <button
            onClick={toggleListening}
            className={cn(
              'w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all border',
              isListening
                ? 'bg-[var(--color-pulse-cyan)] text-[var(--color-pulse-bg)] border-transparent shadow-[0_0_16px_rgba(0,229,255,0.5)] animate-pulse'
                : 'bg-white/5 text-gray-400 hover:text-white border-white/10'
            )}
          >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          {/* Send */}
          <button
            onClick={() => sendMessage(input)}
            disabled={isStreaming || !input.trim() || !selectedModel}
            className={cn(
              'w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all',
              isStreaming || !input.trim()
                ? 'bg-white/5 text-gray-600 cursor-not-allowed'
                : 'bg-[var(--color-pulse-cyan)] text-[var(--color-pulse-bg)] hover:opacity-90 shadow-[0_2px_12px_rgba(0,229,255,0.3)]'
            )}
          >
            <Send size={18} />
          </button>
        </div>

        <p className="text-[10px] text-gray-700 font-mono text-center">
          PULSE runs locally via Ollama • no data leaves your device
        </p>
      </div>
    </div>
  );
}
