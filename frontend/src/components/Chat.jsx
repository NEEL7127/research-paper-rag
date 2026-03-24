import { useState, useRef, useEffect } from "react"
import axios from "axios"

export default function Chat({ collectionId }) {
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Paper loaded. What would you like to understand?" }
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const send = async () => {
    if (!input.trim() || loading) return
    const q = input.trim()
    setInput("")
    setMessages(prev => [...prev, { role: "user", text: q }])
    setLoading(true)
    try {
      const res = await axios.post("http://localhost:8000/ask", {
        collection_id: collectionId,
        question: q
      })
      setMessages(prev => [...prev, {
        role: "assistant",
        text: res.data.answer,
        sources: res.data.sources
      }])
    } catch {
      setMessages(prev => [...prev, { role: "assistant", text: "Something went wrong. Try again." }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="paper-bg" style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <div className="grain" />

      {/* Header */}
      <div style={{
        padding: "16px 28px",
        borderBottom: "1px solid rgba(212,168,83,0.1)",
        background: "rgba(14,12,10,0.9)",
        backdropFilter: "blur(12px)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 32, height: 32,
            border: "1px solid rgba(212,168,83,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "rgba(212,168,83,0.7)", fontSize: 14
          }}>∂</div>
          <div>
            <p style={{ fontFamily: "Playfair Display", fontSize: 15, color: "#f0ead6" }}>
              Research Intelligence
            </p>
            <p style={{ fontSize: 10, color: "rgba(240,234,214,0.3)", letterSpacing: "0.1em" }}>
              SESSION · {collectionId?.toUpperCase() || "ACTIVE"}
            </p>
          </div>
        </div>

        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          fontSize: 10, letterSpacing: "0.1em",
          color: "rgba(212,168,83,0.6)",
          padding: "4px 12px",
          border: "1px solid rgba(212,168,83,0.15)",
          background: "rgba(212,168,83,0.04)"
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: "50%",
            background: "#d4a853",
            animation: "pulse-dot 2s infinite"
          }} />
          RE-RANKING ACTIVE
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "32px 28px", display: "flex", flexDirection: "column", gap: 24 }}>
        {messages.map((msg, i) => (
          <div key={i} className="fade-up" style={{
            display: "flex",
            justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
            gap: 12
          }}>
            {msg.role === "assistant" && (
              <div style={{
                width: 28, height: 28, flexShrink: 0,
                border: "1px solid rgba(212,168,83,0.25)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, color: "rgba(212,168,83,0.6)", marginTop: 4
              }}>∂</div>
            )}

            <div style={{ maxWidth: "70%" }}>
              <div style={{
                padding: "14px 18px",
                fontSize: 13, lineHeight: 1.75,
                whiteSpace: "pre-wrap",
                ...(msg.role === "user"
                  ? {
                      background: "rgba(212,168,83,0.08)",
                      border: "1px solid rgba(212,168,83,0.2)",
                      color: "#f0ead6",
                      borderRadius: "2px 0 2px 2px"
                    }
                  : {
                      background: "rgba(240,234,214,0.03)",
                      border: "1px solid rgba(240,234,214,0.07)",
                      color: "rgba(240,234,214,0.85)",
                      borderRadius: "0 2px 2px 2px"
                    })
              }}>
                {msg.text}
              </div>
 {/* Sources with re-ranking scores */}
              {msg.sources && (
                <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {msg.sources.map((s, j) => (
                    <div key={j} style={{
                      padding: "3px 10px", fontSize: 10,
                      letterSpacing: "0.08em",
                      border: "1px solid rgba(212,168,83,0.15)",
                      color: "rgba(212,168,83,0.55)",
                      background: "rgba(212,168,83,0.04)"
                    }}>
                        PG {s.page} · ✦ {s.cross_score.toFixed(2)} · 🔑 {s.keyword_score.toFixed(2)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{
              width: 28, height: 28, flexShrink: 0,
              border: "1px solid rgba(212,168,83,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, color: "rgba(212,168,83,0.6)"
            }}>∂</div>
            <div style={{
              padding: "14px 18px",
              border: "1px solid rgba(240,234,214,0.07)",
              background: "rgba(240,234,214,0.03)",
              display: "flex", gap: 5, alignItems: "center"
            }}>
              {[0, 150, 300].map((d, i) => (
                <span key={i} style={{
                  width: 5, height: 5, borderRadius: "50%",
                  background: "#d4a853", opacity: 0.6,
                  animation: `pulse-dot 1s ${d}ms infinite`
                }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: "16px 28px",
        borderTop: "1px solid rgba(212,168,83,0.1)",
        background: "rgba(14,12,10,0.95)",
        backdropFilter: "blur(12px)",
        flexShrink: 0
      }}>
        <div style={{ display: "flex", gap: 12, maxWidth: 900, margin: "0 auto" }}>
          <div style={{
            flex: 1, display: "flex", alignItems: "center", gap: 10,
            padding: "12px 16px",
            border: "1px solid rgba(212,168,83,0.15)",
            background: "rgba(212,168,83,0.03)"
          }}>
            <span style={{ color: "rgba(212,168,83,0.4)", fontSize: 12 }}>›</span>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send()}
              placeholder="ask anything about the paper..."
              style={{
                flex: 1, background: "transparent", border: "none",
                outline: "none", fontSize: 12, color: "#f0ead6",
                fontFamily: "DM Mono, monospace"
              }}
            />
          </div>
          <button
            onClick={send}
            disabled={loading}
            style={{
              padding: "12px 24px", fontSize: 11,
              letterSpacing: "0.15em", cursor: "pointer",
              border: "1px solid rgba(212,168,83,0.3)",
              background: "rgba(212,168,83,0.08)",
              color: "#d4a853",
              fontFamily: "DM Mono, monospace",
              opacity: loading ? 0.4 : 1,
              transition: "all 0.2s"
            }}>
            SEND
          </button>
        </div>
        <p style={{
          textAlign: "center", marginTop: 8, fontSize: 10,
          color: "rgba(240,234,214,0.15)", letterSpacing: "0.1em"
        }}>
          SCORES SHOW RE-RANKING RELEVANCE · HIGHER = MORE RELEVANT
        </p>
      </div>
    </div>
  )
}