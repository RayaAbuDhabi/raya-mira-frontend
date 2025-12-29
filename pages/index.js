import { useState, useRef, useEffect } from 'react';
import Head from 'next/head';

export default function Home() {
  const [mode, setMode] = useState('dual');

  // Keep your original default if you want (raya), OR change to 'mira'
  // The Smart Mode fix below prevents wrong voice anyway.
  const [character, setCharacter] = useState('raya');

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const [apiUrl] = useState(process.env.NEXT_PUBLIC_API_URL || 'https://raya-mira-backend.onrender.com');

  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const isInitialized = useRef(false);

  // Simple Arabic detector for Smart Mode routing
  const isArabicText = (text) => /[\u0600-\u06FF]/.test(text || '');

  useEffect(() => {
    if (typeof window !== 'undefined' && !isInitialized.current) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        setSpeechSupported(true);
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;

        // Initial language based on current character (dual mode default)
        recognition.lang = character === 'raya' ? 'ar-AE' : 'en-US';

        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          setInput(transcript);
          setIsListening(false);
          setTimeout(() => {
            handleSendMessage(transcript);
          }, 500);
        };

        recognition.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
        isInitialized.current = true;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update recognition language when mode/character changes
  useEffect(() => {
    if (recognitionRef.current) {
      // Dual mode follows selected character
      // Smart mode defaults mic to English (you can make it smarter later)
      const newLang = (mode === 'dual' && character === 'raya') ? 'ar-AE' : 'en-US';
      recognitionRef.current.lang = newLang;
      console.log('Updated recognition language to:', newLang);
    }
  }, [mode, character]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      const correctLang = (mode === 'dual' && character === 'raya') ? 'ar-AE' : 'en-US';
      recognitionRef.current.lang = correctLang;

      setIsListening(true);
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Failed to start recognition:', error);
        setIsListening(false);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const playAudio = (audioBase64) => {
    // Better compatibility than audio/mp3
    const audio = new Audio(`data:audio/mpeg;base64,${audioBase64}`);
    audio.play().catch(err => console.error('Audio playback failed:', err));
  };

  const handleSendMessage = async (messageText) => {
    const textToSend = messageText || input.trim();
    if (!textToSend || loading) return;

    setInput('');
    setLoading(true);

    const newMessages = [...messages, { role: 'user', content: textToSend }];
    setMessages(newMessages);

    // ✅ FIX: In Smart Mode, decide character from text language
    const arabic = isArabicText(textToSend);
    const characterToSend = (mode === 'smart')
      ? (arabic ? 'raya' : 'mira')
      : character;

    try {
      const response = await fetch(`${apiUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          character: characterToSend,
          mode: mode,
          history: newMessages.map(m => ({ role: m.role, content: m.content }))
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.text_response,
        character: data.character_name,
        emoji: data.emoji,
        audioBase64: data.audio_base64
      }]);

      if (data.audio_base64) {
        setTimeout(() => playAudio(data.audio_base64), 300);
      }

    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${error.message}`,
        character: 'System',
        emoji: '⚠️'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = () => {
    handleSendMessage();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      <Head>
        <title>Raya & Mira - Abu Dhabi Airport Assistants</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="description" content="AI-powered bilingual airport assistants for Abu Dhabi International Airport" />
      </Head>

      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.flagStripe}></div>
          <h1 style={styles.title}>🇦🇪 Raya & Mira</h1>
          <p style={styles.subtitle}>Abu Dhabi International Airport</p>
        </div>

        {/* Mode Selection */}
        <div style={styles.modeContainer}>
          <button
            onClick={() => setMode('smart')}
            style={{...styles.modeButton, ...(mode === 'smart' ? styles.modeButtonActive : {})}}
          >
            🤖 Smart Mode
            <span style={styles.modeDesc}>Auto-detects language</span>
          </button>
          <button
            onClick={() => setMode('dual')}
            style={{...styles.modeButton, ...(mode === 'dual' ? styles.modeButtonActive : {})}}
          >
            👥 Dual Mode
            <span style={styles.modeDesc}>Choose assistant</span>
          </button>
        </div>

        {/* Character Selection */}
        {mode === 'dual' && (
          <div style={styles.characterContainer}>
            <button
              onClick={() => setCharacter('raya')}
              style={{...styles.characterButton, ...(character === 'raya' ? styles.characterActiveRaya : {})}}
            >
              <span style={styles.charEmoji}>🇦🇪</span>
              <div>
                <div style={styles.charName}>Raya</div>
                <div style={styles.charDesc}>Emirati • العربية</div>
              </div>
            </button>
            <button
              onClick={() => setCharacter('mira')}
              style={{...styles.characterButton, ...(character === 'mira' ? styles.characterActiveMira : {})}}
            >
              <span style={styles.charEmoji}>🌍</span>
              <div>
                <div style={styles.charName}>Mira</div>
                <div style={styles.charDesc}>International • English</div>
              </div>
            </button>
          </div>
        )}

        {/* Chat Messages */}
        <div style={styles.messagesContainer}>
          {messages.length === 0 && (
            <div style={styles.emptyState}>
              <div style={styles.logoCircle}>
                <span style={styles.logoEmoji}>
                  {mode === 'dual' ? (character === 'raya' ? '🇦🇪' : '🌍') : '🎭'}
                </span>
              </div>
              <p style={styles.emptyText}>
                {mode === 'smart'
                  ? '💬 Speak or type in Arabic or English!'
                  : `مرحباً! Welcome to ${character === 'raya' ? 'Raya 🇦🇪' : 'Mira 🌍'}`}
              </p>
              {speechSupported && (
                <p style={styles.emptySubtext}>
                  🎤 Tap microphone to speak
                </p>
              )}
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                ...styles.message,
                ...(msg.role === 'user' ? styles.userMessage : styles.assistantMessage)
              }}
            >
              {msg.role === 'assistant' && (
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

        {/* Input Area */}
        <div style={styles.inputContainer}>
          {speechSupported && (
            <button
              onClick={isListening ? stopListening : startListening}
              style={{
                ...styles.micButton,
                ...(isListening ? styles.micButtonActive : {})
              }}
              disabled={loading}
              title={character === 'raya' ? 'اضغط للتحدث' : 'Tap to speak'}
            >
              {isListening ? '🔴' : '🎤'}
            </button>
          )}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isListening ? "جاري الاستماع... Listening..." : (character === 'raya' ? "اكتب رسالتك هنا..." : "Type your message...")}
            style={styles.input}
            rows={2}
            disabled={loading || isListening}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim() || isListening}
            style={{
              ...styles.sendButton,
              ...(loading || !input.trim() || isListening ? styles.sendButtonDisabled : {})
            }}
          >
            {loading ? '⏳' : '📤'}
          </button>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <div style={styles.footerFlag}>
            <div style={{...styles.footerFlagBar, backgroundColor: '#00843D'}}></div>
            <div style={{...styles.footerFlagBar, backgroundColor: '#FFFFFF'}}></div>
            <div style={{...styles.footerFlagBar, backgroundColor: '#000000'}}></div>
          </div>
          {speechSupported ? '🎤 Voice enabled • ' : ''}Powered by Groq & Edge TTS • Built in Abu Dhabi 🇦🇪
        </div>
      </div>

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </>
  );
}

// ✅ Your styles object is unchanged — reuse your same styles from current file
const styles = {
  // (keep your existing styles object exactly as-is)
  // To keep this message shorter, paste your existing styles here unchanged.
};
