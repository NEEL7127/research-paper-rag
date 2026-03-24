import { useState } from "react"
import axios from "axios"

export default function Upload({ onUploadSuccess }) {
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState("")
  const [stats, setStats] = useState(null)

  const handleFile = async (file) => {
    if (!file?.name.endsWith(".pdf")) return setStatus("Only PDF files accepted.")
    setLoading(true)
    setStatus("Extracting and indexing paper...")
    setStats(null)
    const formData = new FormData()
    formData.append("file", file)
    try {
      const res = await axios.post("http://localhost:8000/upload", formData)
      setStats(res.data)
      setStatus("ready")
      setTimeout(() => onUploadSuccess(res.data.collection_id), 1400)
    } catch (err) {
      setStatus("Error: " + (err.response?.data?.detail || err.message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="paper-bg min-h-screen flex flex-col items-center justify-center p-8 relative">
      <div className="grain" />

      {/* Logo mark */}
      <div className="fade-up mb-10 flex flex-col items-center">
        <div className="flex items-center gap-3 mb-6">
          <div style={{
            width: 40, height: 40, border: "1px solid rgba(212,168,83,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18
          }}>
            ∂
          </div>
          <span style={{ color: "rgba(212,168,83,0.6)", fontSize: 11, letterSpacing: "0.25em" }}>
            RESEARCH INTELLIGENCE
          </span>
        </div>

        <h1 style={{
          fontFamily: "Playfair Display, serif",
          fontSize: 56, fontWeight: 900, lineHeight: 1.1,
          textAlign: "center", color: "#f0ead6"
        }}>
          Ask Your<br />
          <span className="gold-shimmer">Research Paper</span>
        </h1>

        <p style={{
          marginTop: 16, fontSize: 12, letterSpacing: "0.15em",
          color: "rgba(240,234,214,0.35)", textAlign: "center"
        }}>
          UPLOAD A PDF · POWERED BY RE-RANKING RAG · GROQ
        </p>
      </div>

      {/* Drop zone */}
      <div
        className="fade-up-1"
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }}
        style={{
          width: "100%", maxWidth: 520,
          padding: 1,
          background: dragging
            ? "linear-gradient(135deg, #d4a853, #8b5e2a)"
            : "linear-gradient(135deg, rgba(212,168,83,0.25), rgba(139,94,42,0.15))",
          borderRadius: 4,
        }}
      >
        <div style={{
          background: "#161310",
          borderRadius: 3,
          padding: "48px 40px",
          textAlign: "center"
        }}>
          {!stats ? (
            <>
              <div style={{
                width: 56, height: 56, margin: "0 auto 20px",
                border: "1px solid rgba(212,168,83,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 24, color: "rgba(212,168,83,0.6)"
              }}>
                {loading
                  ? <div style={{
                      width: 22, height: 22,
                      border: "2px solid rgba(212,168,83,0.4)",
                      borderTopColor: "#d4a853",
                      borderRadius: "50%",
                      animation: "spin 0.8s linear infinite"
                    }} />
                  : "⬡"}
              </div>

              <p style={{ fontFamily: "Playfair Display, serif", fontSize: 18, color: "#f0ead6", marginBottom: 8 }}>
                Drop your PDF here
              </p>
              <p style={{ fontSize: 11, color: "rgba(240,234,214,0.3)", marginBottom: 24, letterSpacing: "0.1em" }}>
                RESEARCH PAPERS · TEXTBOOKS · REPORTS
              </p>

              <label style={{
                display: "inline-block", cursor: "pointer",
                padding: "10px 28px", fontSize: 11,
                letterSpacing: "0.15em",
                border: "1px solid rgba(212,168,83,0.35)",
                color: "#d4a853",
                background: "rgba(212,168,83,0.06)",
                transition: "all 0.2s"
              }}>
                BROWSE FILE
                <input type="file" accept=".pdf" className="hidden"
                  onChange={(e) => handleFile(e.target.files[0])} />
              </label>
            </>
          ) : (
            <div className="fade-up">
              <p style={{ fontFamily: "Playfair Display", fontSize: 20, color: "#d4a853", marginBottom: 20 }}>
                Paper Indexed
              </p>
              <div style={{ display: "flex", justifyContent: "center", gap: 40 }}>
                <div>
                  <p style={{ fontFamily: "Playfair Display", fontSize: 32, color: "#f0ead6" }}>{stats.pages_processed}</p>
                  <p style={{ fontSize: 11, color: "rgba(240,234,214,0.4)", letterSpacing: "0.1em" }}>PAGES</p>
                </div>
                <div style={{ borderLeft: "1px solid rgba(212,168,83,0.15)", paddingLeft: 40 }}>
                  <p style={{ fontFamily: "Playfair Display", fontSize: 32, color: "#f0ead6" }}>{stats.chunks_stored}</p>
                  <p style={{ fontSize: 11, color: "rgba(240,234,214,0.4)", letterSpacing: "0.1em" }}>CHUNKS</p>
                </div>
              </div>
              <p style={{ marginTop: 16, fontSize: 11, color: "rgba(212,168,83,0.6)", letterSpacing: "0.1em" }}>
                OPENING CHAT...
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Status */}
      {status && status !== "ready" && !stats && (
        <p className="fade-up-2" style={{
          marginTop: 20, fontSize: 11,
          color: status.startsWith("Error") ? "#e07070" : "#d4a853",
          letterSpacing: "0.1em"
        }}>
          {status.toUpperCase()}
        </p>
      )}

      {/* Footer */}
      <p className="fade-up-3" style={{
        marginTop: 48, fontSize: 10,
        color: "rgba(240,234,214,0.15)", letterSpacing: "0.15em"
      }}>
        BI-ENCODER · CROSS-ENCODER RE-RANKING · CHROMADB · GROQ
      </p>
    </div>
  )
}