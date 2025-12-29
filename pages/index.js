import { useState, useRef, useEffect } from "react";
import Head from "next/head";

export default function Home() {
  /* =========================
     STATE
  ========================= */
  const [mode, setMode] = useState("dual");

  // Default to English after refresh (important)
  const [character, setCharacter] = useState("mira");
  const characterRef = useRef("mira");

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    "https://raya-mira-backend.onrender.com";

  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  // Smart-mode mic language memory
  const [smartLang, setSmartLang] = useState("en"); // 'en' | 'ar'

  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);

  /* =========================
     HELPERS
  ========================= */
  const isArabicText = (text) => /[\u0600-\u06FF]/.test(text || "");

  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  /* =========================
     CHARACTER REF (NO RACE)
  ========================= */
  useEffect(() => {
    characterRef.current = character;
  }, [character]);

  /* =========================
     INIT SPEECH RECOGNITION
  ========================= */
  useEffect(() => {
    if (typeof window === "undefined") return;

    const SR =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    setSpeechSupported(true);
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);

      // Learn language in Auto mode
      if (mode === "smart") {
        setSmartLang(isArabicText(transcript) ? "ar" : "en");
      }

      setTimeout(() => sendMessage(transcript), 300);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
  }, [mode]);

  /* =========================
     UPDATE MIC LANGUAGE
  ========================= */
  useEffect(() => {
    if (!recognitionRef.current) return;

    let lang = "en-US";

    if (mode === "dual") {
      lang = characterRef.current === "raya" ? "ar-AE" : "en-GB";
    } else {
      lang = smartLang === "ar" ? "ar-AE" : "en-GB";
    }

    recognitionRef.current.lang = lang;
    console.log("Mic language:", lang);
  }, [mode, smartLang, character]);

  /* =========================
     MIC CONTROLS
  ========================= */
  const startListening = () => {
    if (!recognitionRef.current || isListening) return;
    setIsListening(true);
    recognitionRef.current.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  /* =========================
     AUDIO
  ========================= */
  const playAudio = (base64) => {
    const audio = new Audio(`data:audio/mpeg;base64,${base64}`);
    audio.play().catch(() => {});
  };

  /* =========================
     SEND MESSAGE
  ========================= */
  const sendMessage = async (textOverride) => {
    const text = (textOverride ?? input).tri
