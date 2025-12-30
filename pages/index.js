import { useState, useRef, useEffect } from "react";
import Head from "next/head";

export default function Home() {
  const [mode, setMode] = useState("dual"); // "dual" | "smart"
  const [character, setCharacter] = useState("raya"); // "raya" | "mira"
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [apiUrl] = useState(
    process.env.NEXT_PUBLIC_API_URL || "https://raya-mira-backend.onrender.com"
  );

  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsMobile(window.innerWidth < 768);
      const handleResize = () => setIsMobile(window.innerWidth < 768);
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    setSpeechSupported(true);

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      setInput(transcript);
      setIsListening(false);

      // Heuristic: if we see Arabic letters, treat as Arabic; otherwise English
      if (mode === "smart") {
        const hasArabic = /[\u0600-\u06FF]/.test(transcript);
      }

      setTimeout(() => handleSendMessage(transcript), 200);
    };

    recognition.onerror = (event) => {
      console.error("Speech error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
  }, [mode]); // re-bind if mode changes

  const getRecognitionLang = () => {
    // Raya ALWAYS listens in Arabic
    // Mira ALWAYS listens in English
    return character === "raya" ? "ar-AE" : "en-GB";
  };

  useEffect(() => {
    if (!recognitionRef.current) return;
    const lang = getRecognitionLang();
    recognitionRef.current.lang = lang;
    console.log("Updated recognition language to:", lang);
  }, [character]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => scrollToBottom(), [messages]);

  const startListening = () => {
    if (!recognitionRef.current || isListening) return;

    const lang = getRecognitionLang();
    recognitionRef.current.lang = lang;
    console.log("Starting recognition with lang:", lang);

    setIsListening(true);
    try {
      recognitionRef.current.start();
    } catch (error) {
      console.error("Failed to start recognition:", error);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (!recognitionRef.current || !isListening) return;
    recognitionRef.current.stop();
    setIsListening(false);
  };

  const playAudio = (audioBase64) => {
    try {
      const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
      audio.play().catch((err) => console.error("Audio error:", err));
    } catch (e) {
      console.error("Audio creation failed:", e);
    }
  };

  const safeHistory = (msgs) =>
    msgs
      .filter((m) => m?.role && typeof m?.content === "string")
      .map((m) => ({ role: m.role, content: m.content })); // IMPORTANT: no audioBase64, no extra props

  const handleSendMessage = async (messageText) => {
    const textToSend = (messageText ?? input).trim();
    if (!textToSend || loading) return;

    setInput("");
    setLoading(true);

    const newMessages = [...messages, { role: "user", content: textToSend }];
    setMessages(newMessages);

    // optional hint to backend (harmless if backend ignores; useful if you add it later)
    // Voice & language are locked to character, not mode, not detection
    const client_lang = character === "raya" ? "ar-AE" : "en-GB";
    console.log("SEND:", { character, mode, client_lang, textToSend });
    try {
      const response = await fetch(`${apiUrl}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          character,
          mode,
          client_lang,
          history: safeHistory(newMessages),
        }),
        console.log("SEND:", { character, mode, client_lang, textToSend });
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.text_response ?? "",
          character: data.character_name ?? "Assistant",
          emoji: data.emoji ?? "💬",
          audioBase64: data.audio_base64 ?? null,
        },
      ]);

      if (data.audio_base64) {
        setTimeout(() => playAudio(data.audio_base64), 150);
      }
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Error: ${error.message}`,
          character: "System",
          emoji: "⚠️",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = () => handleSendMessage();
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const containerStyle = {
    ...styles.container,
    ...(isMobile ? {} : styles.containerDesktop),
  };

  return (
    <>
      <Head>
        <title>Raya & Mira - Abu Dhabi Airport</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      <div style={containerStyle}>
        {!isMobile && <div style={styles.desktopOverlay}></div>}

        <div style={styles.contentWrapper}>
          <div style={styles.header}>
            <div style={styles.flagStripe}></div>
            <h1 style={styles.title}>🇦🇪 Raya & Mira</h1>
            <p style={styles.subtitle}>Abu Dhabi International Airport</p>
          </div>

          <div style={styles.modeContainer}>
            <button
              onClick={() => setMode("smart")}
              style={{
                ...styles.modeButton,
                ...(mode === "smart" ? styles.modeButtonActive : {}),
              }}
            >
              🤖 Smart Mode
              <span style={styles.modeDesc}>Auto-detects language</span>
            </button>
            <button
              onClick={() => setMode("dual")}
              style={{
                ...styles.modeButton,
                ...(mode === "dual" ? styles.modeButtonActive : {}),
              }}
            >
              👥 Dual Mode
              <span style={styles.modeDesc}>Choose assistant</span>
            </button>
          </div>

          {mode === "dual" && (
            <div style={styles.characterContainer}>
              <button
                onClick={() => setCharacter("raya")}
                style={{
                  ...styles.characterButton,
                  ...(character === "raya" ? styles.characterActiveRaya : {}),
                }}
              >
                <span style={styles.charEmoji}>🇦🇪</span>
                <div>
                  <div style={styles.charName}>Raya</div>
                  <div style={styles.charDesc}>Emirati • العربية</div>
                </div>
              </button>

              <button
                onClick={() => setCharacter("mira")}
                style={{
                  ...styles.characterButton,
                  ...(character === "mira" ? styles.characterActiveMira : {}),
                }}
              >
                <span style={styles.charEmoji}>🌍</span>
                <div>
                  <div style={styles.charName}>Mira</div>
                  <div style={styles.charDesc}>International • English</div>
                </div>
              </button>
            </div>
          )}

          <div style={styles.messagesContainer}>
            {messages.length === 0 && (
              <div style={styles.emptyState}>
                <div style={styles.logoCircle}>
                  <span style={styles.logoEmoji}>
                    {mode === "dual"
                      ? character === "raya"
                        ? "🇦🇪"
                        : "🌍"
                      : "🎭"}
                  </span>
                </div>
                <p style={styles.emptyText}>
                  {mode === "smart"
                    ? "💬 Speak or type in Arabic or English!"
                    : `مرحباً! Welcome to ${character === "raya" ? "Raya 🇦🇪" : "Mira 🌍"}`}
                </p>
                {speechSupported && (
                  <p style={styles.emptySubtext}>🎤 Tap microphone to speak</p>
                )}
              </div>
            )}

            {messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  ...styles.message,
                  ...(msg.role === "user"
                    ? styles.userMessage
                    : styles.assistantMessage),
                }}
              >
                {msg.role === "assistant" && (
                  <div style={styles.messageMeta}>
                    <span style={styles.messageEmoji}>{msg.emoji}</span>
                    <span style={styles.messageName}>{msg.character}</span>
                  </div>
                )}
                <div style={styles.messageContent}>{msg.content}</div>

                {msg.audioBase64 && (
                  <button
                    onClick={() => playAudio(msg.audioBase64)}
                    style={styles.playButton}
                  >
                    🔊 استمع • Listen
                  </button>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div style={styles.inputContainer}>
            {speechSupported && (
              <button
                onClick={isListening ? stopListening : startListening}
                style={{
                  ...styles.micButton,
                  ...(isListening ? styles.micButtonActive : {}),
                }}
                disabled={loading}
                title={character === "raya" ? "اضغط للتحدث" : "Tap to speak"}
              >
                {isListening ? "🔴" : "🎤"}
              </button>
            )}

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                isListening
                  ? "جاري الاستماع... Listening..."
                  : character === "raya"
                  ? "اكتب أو تحدث..."
                  : "Type or speak..."
              }
              style={styles.input}
              rows={2}
              disabled={loading || isListening}
            />

            <button
              onClick={sendMessage}
              disabled={loading || !input.trim() || isListening}
              style={{
                ...styles.sendButton,
                ...(loading || !input.trim() || isListening
                  ? styles.sendButtonDisabled
                  : {}),
              }}
            >
              {loading ? "⏳" : "📤"}
            </button>
          </div>

          <div style={styles.footer}>
            <div style={styles.footerFlag}>
              <div style={{ ...styles.footerFlagBar, backgroundColor: "#00843D" }}></div>
              <div style={{ ...styles.footerFlagBar, backgroundColor: "#FFFFFF" }}></div>
              <div style={{ ...styles.footerFlagBar, backgroundColor: "#000000" }}></div>
            </div>
            {speechSupported ? "🎤 Voice enabled • " : ""}
            Built in Abu Dhabi 🇦🇪
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    backgroundColor: "#f8f8f8",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Arabic", sans-serif',
    position: "relative",
  },
  containerDesktop: {
    backgroundImage:
      'url("https://raw.githubusercontent.com/RayaAbuDhabi/raya-mira-frontend/main/airport-bg.jpg")',
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundAttachment: "fixed",
  },
  desktopOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background:
      "linear-gradient(135deg, rgba(238,42,53,0.12) 0%, rgba(0,132,61,0.12) 100%)",
    backdropFilter: "blur(1px)",
    zIndex: 1,
  },
  contentWrapper: {
    position: "relative",
    zIndex: 2,
    maxWidth: "800px",
    margin: "0 auto",
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "rgba(248,248,248,0.98)",
    boxShadow: "0 0 40px rgba(0,0,0,0.15)",
  },
  header: {
    background:
      "linear-gradient(135deg, #EE2A35 0%, #C5203A 50%, #8B1528 100%)",
    color: "white",
    padding: "20px",
    textAlign: "center",
    boxShadow: "0 4px 12px rgba(238,42,53,0.3)",
    position: "relative",
    overflow: "hidden",
  },
  flagStripe: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "8px",
    height: "100%",
    background:
      "linear-gradient(to bottom, #00843D 33.33%, #FFFFFF 33.33%, #FFFFFF 66.66%, #000000 66.66%)",
  },
  title: {
    margin: "0 0 5px 0",
    fontSize: "26px",
    fontWeight: "bold",
    textShadow: "0 2px 4px rgba(0,0,0,0.2)",
  },
  subtitle: {
    margin: 0,
    fontSize: "14px",
    opacity: 0.95,
    fontWeight: "500",
  },
  modeContainer: {
    display: "flex",
    gap: "10px",
    padding: "15px",
    backgroundColor: "rgba(255,255,255,0.95)",
    borderBottom: "2px solid #e0e0e0",
  },
  modeButton: {
    flex: 1,
    padding: "14px",
    border: "2px solid #e0e0e0",
    borderRadius: "12px",
    backgroundColor: "white",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    transition: "all 0.3s",
  },
  modeButtonActive: {
    borderColor: "#EE2A35",
    backgroundColor: "#FFF5F6",
    boxShadow: "0 2px 8px rgba(238,42,53,0.2)",
  },
  modeDesc: {
    fontSize: "11px",
    fontWeight: "normal",
    color: "#666",
  },
  characterContainer: {
    display: "flex",
    gap: "10px",
    padding: "15px",
    backgroundColor: "rgba(255,255,255,0.95)",
    borderBottom: "2px solid #e0e0e0",
  },
  characterButton: {
    flex: 1,
    padding: "16px",
    border: "2px solid #e0e0e0",
    borderRadius: "12px",
    backgroundColor: "white",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    transition: "all 0.3s",
  },
  characterActiveRaya: {
    borderColor: "#00843D",
    backgroundColor: "#F0FAF4",
    boxShadow: "0 2px 8px rgba(0,132,61,0.2)",
  },
  characterActiveMira: {
    borderColor: "#EE2A35",
    backgroundColor: "#FFF5F6",
    boxShadow: "0 2px 8px rgba(238,42,53,0.2)",
  },
  charEmoji: { fontSize: "28px" },
  charName: { fontSize: "16px", fontWeight: "700" },
  charDesc: { fontSize: "13px", color: "#666", fontWeight: "500" },

  messagesContainer: {
    flex: 1,
    overflowY: "auto",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "15px",
    backgroundColor: "transparent",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    color: "#999",
  },
  logoCircle: {
    width: "100px",
    height: "100px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #EE2A35 0%, #00843D 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "20px",
    boxShadow: "0 4px 20px rgba(238,42,53,0.3)",
  },
  logoEmoji: { fontSize: "48px" },
  emptyText: {
    fontSize: "16px",
    marginBottom: "8px",
    fontWeight: "500",
    color: "#555",
  },
  emptySubtext: { fontSize: "14px", color: "#999" },

  message: {
    maxWidth: "80%",
    padding: "14px 18px",
    borderRadius: "20px",
    wordWrap: "break-word",
    boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
  },
  userMessage: {
    alignSelf: "flex-end",
    background: "linear-gradient(135deg, #EE2A35 0%, #C5203A 100%)",
    color: "white",
  },
  assistantMessage: {
    alignSelf: "flex-start",
    backgroundColor: "white",
    border: "1px solid #e8e8e8",
  },
  messageMeta: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "8px",
    fontSize: "13px",
    fontWeight: "700",
    color: "#00843D",
  },
  messageEmoji: { fontSize: "18px" },
  messageName: { color: "#00843D" },
  messageContent: { lineHeight: "1.6", fontSize: "15px" },

  playButton: {
    marginTop: "10px",
    padding: "8px 14px",
    border: "none",
    borderRadius: "14px",
    background: "linear-gradient(135deg, #00843D 0%, #006B31 100%)",
    color: "white",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    boxShadow: "0 2px 6px rgba(0,132,61,0.3)",
  },

  inputContainer: {
    display: "flex",
    gap: "10px",
    padding: "16px",
    backgroundColor: "rgba(255,255,255,0.98)",
    borderTop: "2px solid #e0e0e0",
    boxShadow: "0 -2px 10px rgba(0,0,0,0.05)",
  },
  micButton: {
    padding: "14px 18px",
    border: "2px solid #00843D",
    borderRadius: "14px",
    backgroundColor: "white",
    fontSize: "22px",
    cursor: "pointer",
    transition: "all 0.3s",
    boxShadow: "0 2px 6px rgba(0,132,61,0.2)",
  },
  micButtonActive: {
    backgroundColor: "#EE2A35",
    borderColor: "#EE2A35",
    animation: "pulse 1.5s infinite",
    boxShadow: "0 0 20px rgba(238,42,53,0.5)",
  },
  input: {
    flex: 1,
    padding: "14px",
    border: "2px solid #e0e0e0",
    borderRadius: "14px",
    fontSize: "15px",
    resize: "none",
    fontFamily: "inherit",
    transition: "border-color 0.3s",
    backgroundColor: "white",
  },
  sendButton: {
    padding: "14px 22px",
    border: "none",
    borderRadius: "14px",
    background: "linear-gradient(135deg, #EE2A35 0%, #C5203A 100%)",
    color: "white",
    fontSize: "22px",
    cursor: "pointer",
    transition: "all 0.3s",
    boxShadow: "0 2px 8px rgba(238,42,53,0.3)",
  },
  sendButtonDisabled: {
    background: "#ccc",
    cursor: "not-allowed",
    boxShadow: "none",
  },
  footer: {
    padding: "12px",
    textAlign: "center",
    fontSize: "11px",
    color: "#666",
    backgroundColor: "rgba(255,255,255,0.95)",
    borderTop: "2px solid #e0e0e0",
  },
  footerFlag: {
    display: "flex",
    justifyContent: "center",
    gap: "2px",
    marginBottom: "8px",
  },
  footerFlagBar: {
    width: "30px",
    height: "4px",
    borderRadius: "2px",
  },
};
//'@ | Set-Content -Encoding UTF8 .\pages\index.js
