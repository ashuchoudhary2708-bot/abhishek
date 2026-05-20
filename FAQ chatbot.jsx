import { useState, useRef, useEffect } from "react";

const FAQ_DATA = [
  { q: "What is your return policy?", a: "We offer a 30-day hassle-free return policy. Items must be unused, in original packaging, and accompanied by a receipt. Refunds are processed within 5–7 business days to your original payment method." },
  { q: "How do I track my order?", a: "Once your order ships, you'll receive a confirmation email with a tracking number. You can use that number on our website's Order Tracking page or directly on the carrier's site (FedEx, UPS, or USPS)." },
  { q: "Do you offer free shipping?", a: "Yes! We offer free standard shipping on all orders over $50. Orders under $50 ship for a flat $4.99 fee. Expedited and overnight options are available at checkout for an additional cost." },
  { q: "How can I cancel or modify my order?", a: "Orders can be cancelled or modified within 1 hour of placement. After that, they enter our fulfillment pipeline. Please contact support@ourstore.com immediately, and we'll do our best to help before the order ships." },
  { q: "What payment methods do you accept?", a: "We accept Visa, Mastercard, American Express, PayPal, Apple Pay, Google Pay, and store gift cards. All transactions are encrypted and secured with SSL." },
  { q: "Is my personal data safe?", a: "Absolutely. We never sell your personal data to third parties. All information is encrypted at rest and in transit. You can request data deletion at any time by emailing privacy@ourstore.com." },
  { q: "How do I contact customer support?", a: "You can reach our support team 24/7 via live chat on our website, by email at support@ourstore.com, or by phone at 1-800-555-0199 (Mon–Fri, 9am–6pm EST)." },
  { q: "Do you ship internationally?", a: "Yes, we ship to over 80 countries. International shipping rates and delivery times vary by destination and are calculated at checkout. Note that customs duties are the buyer's responsibility." },
  { q: "What if my item arrives damaged?", a: "We're so sorry to hear that! Please take photos of the damage and email them to support@ourstore.com within 48 hours of delivery. We'll arrange a replacement or full refund at no extra cost." },
  { q: "How do I reset my password?", a: "Click 'Forgot Password' on the login page, enter your email, and we'll send a reset link within 2 minutes. If you don't see it, check your spam folder or contact support." },
  { q: "Can I use multiple discount codes?", a: "Only one promotional code can be applied per order. However, discount codes can be combined with our loyalty points. Gift card balances are applied separately from promo codes." },
  { q: "How long does shipping take?", a: "Standard shipping takes 5–7 business days. Expedited shipping (2–3 days) and overnight options are also available. Processing time is 1–2 business days before shipment." },
  { q: "Do you have a loyalty rewards program?", a: "Yes! Our Rewards Club lets you earn 1 point per $1 spent. Every 100 points = $1 off your next order. Sign up for free on our website to start earning immediately." },
  { q: "Are your products eco-friendly?", a: "Sustainability is a core value. Over 70% of our product line uses recycled or sustainably sourced materials. All packaging is 100% recyclable. Check individual product pages for certifications." },
  { q: "Can I exchange an item for a different size?", a: "Yes, exchanges for a different size or color are free within 30 days. Use the Exchange Portal on our website or contact support. The new item ships once we receive the original." },
];

const STOPWORDS = new Set([
  "a","an","the","is","it","in","on","at","to","for","of","and","or","but",
  "with","my","i","you","we","do","does","can","will","how","what","where",
  "when","who","which","be","been","are","was","were","have","has","had","not",
  "your","our","this","that","these","those","if","so","about","from","by",
  "as","get","also","any","all","its","up","out","would","should","could"
]);

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(t => t.length > 1 && !STOPWORDS.has(t));
}

function buildTfIdf(corpus) {
  const tokenized = corpus.map(d => tokenize(d.q));
  const N = corpus.length;
  const df = {};
  tokenized.forEach(tokens => {
    [...new Set(tokens)].forEach(t => { df[t] = (df[t] || 0) + 1; });
  });
  const idf = {};
  Object.keys(df).forEach(t => { idf[t] = Math.log((N + 1) / (df[t] + 1)) + 1; });
  const vectors = tokenized.map(tokens => {
    const tf = {};
    tokens.forEach(t => { tf[t] = (tf[t] || 0) + 1; });
    const vec = {};
    Object.keys(tf).forEach(t => { vec[t] = (tf[t] / tokens.length) * (idf[t] || 1); });
    return vec;
  });
  return { vectors, idf };
}

function queryVector(tokens, idf) {
  const tf = {};
  tokens.forEach(t => { tf[t] = (tf[t] || 0) + 1; });
  const vec = {};
  Object.keys(tf).forEach(t => { vec[t] = (tf[t] / tokens.length) * (idf[t] || 0.5); });
  return vec;
}

function cosineSim(a, b) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let dot = 0, magA = 0, magB = 0;
  keys.forEach(k => {
    const va = a[k] || 0, vb = b[k] || 0;
    dot += va * vb;
    magA += va * va;
    magB += vb * vb;
  });
  return magA && magB ? dot / (Math.sqrt(magA) * Math.sqrt(magB)) : 0;
}

const { vectors, idf } = buildTfIdf(FAQ_DATA);

function findBestMatch(query) {
  const tokens = tokenize(query);
  if (!tokens.length) return null;
  const qvec = queryVector(tokens, idf);
  let bestScore = 0, bestIdx = -1;
  vectors.forEach((vec, i) => {
    const score = cosineSim(qvec, vec);
    if (score > bestScore) { bestScore = score; bestIdx = i; }
  });
  return bestIdx >= 0 && bestScore > 0.08 ? { ...FAQ_DATA[bestIdx], score: bestScore } : null;
}

const CONFIDENCE_COLORS = {
  high: { bg: "#EAF3DE", text: "#3B6D11", label: "High match" },
  medium: { bg: "#FAEEDA", text: "#854F0B", label: "Partial match" },
  low: { bg: "#FAECE7", text: "#993C1D", label: "Low match" },
};
function confidenceLevel(score) {
  if (score >= 0.4) return "high";
  if (score >= 0.2) return "medium";
  return "low";
}

const SUGGESTIONS = [
  "What is your return policy?",
  "How do I track my order?",
  "Do you offer free shipping?",
  "How can I cancel my order?",
];

export default function FAQChatbot() {
  const [messages, setMessages] = useState([
    {
      role: "bot",
      text: "Hi there! 👋 I'm your product support assistant. Ask me anything about orders, shipping, returns, payments, and more.",
      type: "greeting",
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [debugMode, setDebugMode] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(text) {
    const query = (text || input).trim();
    if (!query) return;
    setInput("");
    setShowSuggestions(false);
    setMessages(prev => [...prev, { role: "user", text: query }]);
    setLoading(true);

    const localMatch = findBestMatch(query);
    const tokens = tokenize(query);

    try {
      const systemPrompt = `You are a helpful product support chatbot. 
You have access to the following FAQ database:
${FAQ_DATA.map((f, i) => `${i + 1}. Q: ${f.q}\n   A: ${f.a}`).join("\n\n")}

The user asked: "${query}"
Preprocessed tokens: [${tokens.join(", ")}]
${localMatch ? `Best NLP match (cosine similarity ${localMatch.score.toFixed(3)}): Q: "${localMatch.q}" → A: "${localMatch.a}"` : "No strong NLP match found."}

Instructions:
- If the NLP match is relevant, base your answer on that FAQ entry but phrase it naturally and conversationally.
- If no good match exists, politely say you don't have that information and suggest related topics.
- Keep answers concise (2-4 sentences max).
- Be warm, helpful, and professional.
- Do NOT make up information not in the FAQ.
- End with a brief offer to help with anything else.`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: query }],
          system: systemPrompt,
        }),
      });

      const data = await response.json();
      const reply = data.content?.map(b => b.text || "").join("") || "Sorry, I couldn't get a response. Please try again.";

      setMessages(prev => [...prev, {
        role: "bot",
        text: reply,
        match: localMatch,
        tokens,
        type: "answer",
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: "bot",
        text: localMatch
          ? `Based on our FAQ: ${localMatch.a}`
          : "I'm having trouble connecting right now. Please try again shortly or contact support@ourstore.com.",
        match: localMatch,
        tokens,
        type: "answer",
      }]);
    }
    setLoading(false);
    inputRef.current?.focus();
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  return (
    <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", maxWidth: 680, margin: "0 auto", padding: "1.5rem 0" }}>
      <h2 className="sr-only">FAQ Chatbot with NLP Matching</h2>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%",
            background: "#CECBF6", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18
          }}>🤖</div>
          <div>
            <div style={{ fontWeight: 500, fontSize: 16, color: "var(--color-text-primary)" }}>Support Assistant</div>
            <div style={{ fontSize: 12, color: "#1D9E75", fontFamily: "var(--font-sans)" }}>● Online · NLP-powered</div>
          </div>
        </div>
        <button
          onClick={() => setDebugMode(d => !d)}
          style={{
            fontSize: 12, fontFamily: "var(--font-sans)", padding: "4px 10px",
            borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)",
            background: debugMode ? "#EEEDFE" : "var(--color-background-secondary)",
            color: debugMode ? "#3C3489" : "var(--color-text-secondary)", cursor: "pointer"
          }}
        >
          {debugMode ? "Hide NLP debug" : "Show NLP debug"}
        </button>
      </div>

      {/* Chat window */}
      <div style={{
        background: "var(--color-background-secondary)",
        borderRadius: "var(--border-radius-lg)",
        border: "0.5px solid var(--color-border-tertiary)",
        minHeight: 380, maxHeight: 480, overflowY: "auto",
        padding: "1rem", display: "flex", flexDirection: "column", gap: 12,
        scrollbarWidth: "thin"
      }}>
        {messages.map((msg, i) => (
          <div key={i}>
            <div style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", alignItems: "flex-end", gap: 8 }}>
              {msg.role === "bot" && (
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#EEEDFE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>🤖</div>
              )}
              <div style={{
                maxWidth: "75%",
                background: msg.role === "user" ? "#534AB7" : "var(--color-background-primary)",
                color: msg.role === "user" ? "#fff" : "var(--color-text-primary)",
                borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                padding: "10px 14px",
                fontSize: 14,
                lineHeight: 1.6,
                border: msg.role === "bot" ? "0.5px solid var(--color-border-tertiary)" : "none",
                fontFamily: "var(--font-sans)",
              }}>
                {msg.text}
              </div>
              {msg.role === "user" && (
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#534AB7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#fff", fontFamily: "var(--font-sans)", fontWeight: 500, flexShrink: 0 }}>U</div>
              )}
            </div>

            {/* NLP Debug panel */}
            {debugMode && msg.role === "bot" && msg.type === "answer" && (
              <div style={{
                marginLeft: 36, marginTop: 6,
                background: "var(--color-background-primary)",
                border: "0.5px solid var(--color-border-tertiary)",
                borderRadius: "var(--border-radius-md)",
                padding: "8px 12px", fontSize: 12, fontFamily: "var(--font-mono)",
                color: "var(--color-text-secondary)"
              }}>
                <div style={{ marginBottom: 4, color: "var(--color-text-primary)", fontWeight: 500 }}>🔬 NLP pipeline</div>
                <div>Tokens: <span style={{ color: "#534AB7" }}>[{(msg.tokens || []).join(", ")}]</span></div>
                {msg.match ? (
                  <>
                    <div style={{ marginTop: 4 }}>
                      Cosine similarity: <span style={{ color: "#1D9E75", fontWeight: 500 }}>{msg.match.score.toFixed(4)}</span>
                      {" · "}
                      <span style={{
                        background: CONFIDENCE_COLORS[confidenceLevel(msg.match.score)].bg,
                        color: CONFIDENCE_COLORS[confidenceLevel(msg.match.score)].text,
                        padding: "1px 6px", borderRadius: 4, fontSize: 11
                      }}>{CONFIDENCE_COLORS[confidenceLevel(msg.match.score)].label}</span>
                    </div>
                    <div style={{ marginTop: 4 }}>Matched FAQ: <span style={{ color: "var(--color-text-primary)" }}>"{msg.match.q}"</span></div>
                  </>
                ) : (
                  <div style={{ marginTop: 4, color: "#D85A30" }}>No FAQ match above threshold (0.08)</div>
                )}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#EEEDFE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🤖</div>
            <div style={{
              background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)",
              borderRadius: "18px 18px 18px 4px", padding: "10px 16px",
              display: "flex", gap: 5, alignItems: "center"
            }}>
              {[0,1,2].map(j => (
                <div key={j} style={{
                  width: 7, height: 7, borderRadius: "50%", background: "#AFA9EC",
                  animation: "bounce 1.2s infinite",
                  animationDelay: `${j * 0.2}s`
                }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {showSuggestions && (
        <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
          {SUGGESTIONS.map((s, i) => (
            <button key={i} onClick={() => sendMessage(s)} style={{
              fontSize: 12, fontFamily: "var(--font-sans)",
              padding: "5px 12px", borderRadius: 20,
              border: "0.5px solid #AFA9EC",
              background: "#EEEDFE", color: "#3C3489",
              cursor: "pointer", lineHeight: 1.4
            }}>{s}</button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "flex-end" }}>
        <textarea
          ref={inputRef}
          rows={1}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask a question about our products…"
          style={{
            flex: 1, resize: "none", fontFamily: "var(--font-sans)", fontSize: 14,
            padding: "10px 14px", borderRadius: "var(--border-radius-lg)",
            border: "0.5px solid var(--color-border-secondary)",
            background: "var(--color-background-primary)",
            color: "var(--color-text-primary)", outline: "none",
            lineHeight: 1.5, minHeight: 42, maxHeight: 120, overflowY: "auto"
          }}
        />
        <button
          onClick={() => sendMessage()}
          disabled={!input.trim() || loading}
          style={{
            width: 42, height: 42, borderRadius: "50%",
            background: input.trim() && !loading ? "#534AB7" : "var(--color-background-secondary)",
            color: input.trim() && !loading ? "#fff" : "var(--color-text-secondary)",
            border: "none", cursor: input.trim() && !loading ? "pointer" : "default",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, flexShrink: 0, transition: "background 0.2s"
          }}
          aria-label="Send message"
        >
          <i className="ti ti-send" aria-hidden="true" />
        </button>
      </div>

      {/* FAQ browser */}
      <details style={{ marginTop: "1.5rem" }}>
        <summary style={{
          cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 13,
          color: "var(--color-text-secondary)", padding: "6px 0",
          borderTop: "0.5px solid var(--color-border-tertiary)", listStyle: "none",
          display: "flex", alignItems: "center", gap: 6
        }}>
          <i className="ti ti-list" style={{ fontSize: 15 }} aria-hidden="true" />
          Browse all {FAQ_DATA.length} FAQs
          <i className="ti ti-chevron-down" style={{ fontSize: 14, marginLeft: "auto" }} aria-hidden="true" />
        </summary>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
          {FAQ_DATA.map((f, i) => (
            <button key={i} onClick={() => sendMessage(f.q)} style={{
              textAlign: "left", fontFamily: "var(--font-sans)", fontSize: 13,
              padding: "8px 12px", borderRadius: "var(--border-radius-md)",
              border: "0.5px solid var(--color-border-tertiary)",
              background: "var(--color-background-secondary)",
              color: "var(--color-text-primary)", cursor: "pointer", lineHeight: 1.5
            }}>
              <span style={{ color: "var(--color-text-secondary)", marginRight: 8, fontSize: 11 }}>Q{i + 1}</span>
              {f.q}
            </button>
          ))}
        </div>
      </details>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-5px); opacity: 1; }
        }
        details summary::-webkit-details-marker { display: none; }
      `}</style>
    </div>
  );
}
