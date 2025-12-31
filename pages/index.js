import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://raya-mira-backend.onrender.com';

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [activeCharacter, setActiveCharacter] = useState('raya');
  const [dualMode, setDualMode] = useState(false);
  const [autoSwitch, setAutoSwitch] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  const messagesEndRef = useRef(null);

  // Load voices
  useEffect(() => {
    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          setVoicesLoaded(true);
          console.log('✅ Voices loaded:', voices.length);
        }
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speakText = (text, character) => {
    if (!('speechSynthesis' in window)) {
      console.error('Speech synthesis not supported');
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();

    if (character === 'raya') {
      // Raya: British English voice - professional, clear
      const britishVoice = voices.find(v => 
        v.lang.includes('en-GB') || 
        v.name.includes('Daniel') ||
        v.name.includes('Kate') ||
        v.name.includes('Serena') ||
        (v.name.includes('English') && v.name.includes('United Kingdom'))
      );
      
      utterance.voice = britishVoice || voices.find(v => v.lang.includes('en-')) || voices[0];
      utterance.lang = 'en-GB';
      utterance.pitch = 1.0;
      utterance.rate = 0.95;  // Slightly slower for clarity
      
      console.log('🇬🇧 Raya voice:', utterance.voice?.name);
      
    } else {
      // Mera: Arabic-accented English - warm, welcoming
      // Try to find Arabic voice first, fallback to warm female voice
      const arabicVoice = voices.find(v => 
        v.lang.includes('ar') ||
        v.name.includes('Laila') ||
        v.name.includes('Maged') ||
        v.name.includes('Arabic')
      );
      
      if (arabicVoice) {
        utterance.voice = arabicVoice;
        utterance.lang = arabicVoice.lang;
      } else {
        // Fallback to warm female English voice with adjusted pitch
        const warmVoice = voices.find(v => 
          v.name.includes('Nicky') ||
          v.name.includes('Samantha') ||
          v.name.includes('Karen') ||
          (v.name.includes('Female') && v.lang.includes('en'))
        );
        utterance.voice = warmVoice || voices[1];
        utterance.lang = 'en-US';
      }
      
      utterance.pitch = 1.15;  // Higher pitch for warmth
      utterance.rate = 0.90;   // Slower, more welcoming pace
      
      console.log('🌟 Mera voice:', utterance.voice?.name);
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (e) => {
      console.error('Speech error:', e);
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = {
      role: 'user',
      content: input,
      character: activeCharacter
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    stopSpeaking();

    // In dual mode, get responses from both characters
    if (dualMode) {
      setIsLoading(true);
      
      try {
        // Get Raya's response
        const rayaResponse = await fetch(`${API_URL}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: currentInput,
            character: 'raya',
            conversation_history: messages.filter(m => m.character === 'raya')
          }),
        });
        const rayaData = await rayaResponse.json();

        const rayaMessage = {
          role: 'assistant',
          content: rayaData.message,
          character: 'raya',
          data_source: rayaData.data_source,
          has_airport_data: rayaData.has_airport_data
        };

        setMessages(prev => [...prev, rayaMessage]);
        
        // Speak Raya's response
        if (voicesLoaded) {
          speakText(rayaMessage.content, 'raya');
          
          // Wait for Raya to finish before Mera speaks
          await new Promise(resolve => {
            const checkSpeaking = setInterval(() => {
              if (!window.speechSynthesis.speaking) {
                clearInterval(checkSpeaking);
                resolve();
              }
            }, 100);
          });
        }

        // Get Mera's response
        const meraResponse = await fetch(`${API_URL}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: currentInput,
            character: 'mera',
            conversation_history: messages.filter(m => m.character === 'mera')
          }),
        });
        const meraData = await meraResponse.json();

        const meraMessage = {
          role: 'assistant',
          content: meraData.message,
          character: 'mera',
          data_source: meraData.data_source,
          has_airport_data: meraData.has_airport_data
        };

        setMessages(prev => [...prev, meraMessage]);
        
        // Speak Mera's response
        if (voicesLoaded) {
          speakText(meraMessage.content, 'mera');
        }

      } catch (error) {
        console.error('Error:', error);
        const errorMessage = {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          character: activeCharacter
        };
        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
      
    } else {
      // Single character mode
      setIsLoading(true);
      
      try {
        const response = await fetch(`${API_URL}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: currentInput,
            character: activeCharacter,
            conversation_history: messages.filter(m => m.character === activeCharacter)
          }),
        });

        const data = await response.json();

        const assistantMessage = {
          role: 'assistant',
          content: data.message,
          character: data.character || activeCharacter,
          data_source: data.data_source,
          has_airport_data: data.has_airport_data
        };

        setMessages(prev => [...prev, assistantMessage]);

        // Auto-play voice
        if (voicesLoaded) {
          speakText(assistantMessage.content, assistantMessage.character);
        }

        // Auto-switch character if enabled
        if (autoSwitch) {
          setActiveCharacter(prev => prev === 'raya' ? 'mera' : 'raya');
        }

      } catch (error) {
        console.error('Error:', error);
        const errorMessage = {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          character: activeCharacter
        };
        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    }
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
        <title>Raya & Mera - AI Airport Assistants</title>
        <meta name="description" content="Voice-enabled AI assistants at Zayed International Airport" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>
            <span style={styles.emoji}>✈️</span>
            Raya & Mera
          </h1>
          <p style={styles.subtitle}>Your Voice-Enabled AI Assistants at Zayed International Airport</p>
        </div>

        {/* Character Selector & Modes */}
        <div style={styles.controlPanel}>
          <div style={styles.characterSelector}>
            <button
              onClick={() => {
                if (!dualMode) setActiveCharacter('raya');
                stopSpeaking();
              }}
              style={{
                ...styles.characterButton,
                ...(activeCharacter === 'raya' && !dualMode ? styles.activeCharacter : {}),
                backgroundColor: dualMode || activeCharacter === 'raya' ? '#4A90E2' : '#f0f0f0'
              }}
              disabled={dualMode}
            >
              <span style={styles.characterEmoji}>👩🇬🇧</span>
              <span style={styles.characterName}>Raya</span>
              <span style={styles.characterDesc}>British • Professional</span>
            </button>

            <button
              onClick={() => {
                if (!dualMode) setActiveCharacter('mera');
                stopSpeaking();
              }}
              style={{
                ...styles.characterButton,
                ...(activeCharacter === 'mera' && !dualMode ? styles.activeCharacter : {}),
                backgroundColor: dualMode || activeCharacter === 'mera' ? '#E67E22' : '#f0f0f0'
              }}
              disabled={dualMode}
            >
              <span style={styles.characterEmoji}>👩🌟</span>
              <span style={styles.characterName}>Mera</span>
              <span style={styles.characterDesc}>Arabic • Warm</span>
            </button>
          </div>

          <div style={styles.modeControls}>
            <label style={styles.modeLabel}>
              <input
                type="checkbox"
                checked={dualMode}
                onChange={(e) => {
                  setDualMode(e.target.checked);
                  stopSpeaking();
                }}
                style={styles.checkbox}
              />
              <span>Dual Mode (both respond)</span>
            </label>

            {!dualMode && (
              <label style={styles.modeLabel}>
                <input
                  type="checkbox"
                  checked={autoSwitch}
                  onChange={(e) => setAutoSwitch(e.target.checked)}
                  style={styles.checkbox}
                />
                <span>Auto-switch characters</span>
              </label>
            )}
          </div>
        </div>

        {/* Voice Status */}
        {!voicesLoaded && (
          <div style={styles.voiceWarning}>
            ⚠️ Loading voices... Speech may not be available yet
          </div>
        )}

        {/* Chat Messages */}
        <div style={styles.chatContainer}>
          {messages.length === 0 ? (
            <div style={styles.welcomeMessage}>
              <h2 style={styles.welcomeTitle}>
                {dualMode ? '👋 Hi! We\'re Raya & Mera!' : 
                 activeCharacter === 'raya' ? '👋 Hello! I\'m Raya!' : '👋 Marhaba! I\'m Mera!'}
              </h2>
              <p style={styles.welcomeText}>
                {dualMode 
                  ? 'We\'ll both help you! Raya brings British professionalism, Mera brings Arabic warmth. Ask us anything about the airport! 🎤'
                  : activeCharacter === 'raya'
                  ? 'I\'m your British AI assistant here to help with professional, clear guidance. Ask me anything about the airport and I\'ll speak my answer! 🎤🇬🇧'
                  : 'I\'m your warm Arabic assistant here to welcome you with genuine hospitality. Ask me anything about the airport and I\'ll speak with warmth! 🎤🌟'}
              </p>
              <div style={styles.exampleQuestions}>
                <p style={styles.exampleTitle}>Try asking:</p>
                <ul style={styles.exampleList}>
                  <li>"Where can I find coffee shops?"</li>
                  <li>"How do I get to Gate A5?"</li>
                  <li>"Where are the prayer rooms?"</li>
                  <li>"Tell me about parking options"</li>
                </ul>
              </div>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                style={{
                  ...styles.message,
                  ...(msg.role === 'user' ? styles.userMessage : styles.assistantMessage),
                  borderLeft: msg.role === 'assistant' 
                    ? `4px solid ${msg.character === 'raya' ? '#4A90E2' : '#E67E22'}`
                    : 'none'
                }}
              >
                <div style={styles.messageHeader}>
                  <span style={styles.messageRole}>
                    {msg.role === 'user' ? '👤 You' : 
                     msg.character === 'raya' ? '👩🇬🇧 Raya' : '👩🌟 Mera'}
                    {msg.has_airport_data && (
                      <span style={styles.dataBadge} title="Data from airport database">
                        📚
                      </span>
                    )}
                  </span>
                  {msg.role === 'assistant' && (
                    <button
                      onClick={() => speakText(msg.content, msg.character)}
                      style={styles.speakButton}
                      title="Speak this message"
                    >
                      🔊
                    </button>
                  )}
                </div>
                <div style={styles.messageContent}>{msg.content}</div>
              </div>
            ))
          )}
          {isLoading && (
            <div style={{...styles.message, ...styles.assistantMessage}}>
              <div style={styles.loadingDots}>
                <span className="loading-dot">●</span>
                <span className="loading-dot">●</span>
                <span className="loading-dot">●</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Voice Indicator */}
        {isSpeaking && (
          <div style={styles.voiceIndicator}>
            <span style={styles.voiceIcon}>🔊</span>
            <span style={styles.voiceText}>
              {messages[messages.length - 1]?.character === 'raya' ? 'Raya (🇬🇧)' : 'Mera (🌟)'} is speaking...
            </span>
            <button onClick={stopSpeaking} style={styles.stopButton}>
              Stop
            </button>
          </div>
        )}

        {/* Input Area */}
        <div style={styles.inputContainer}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={dualMode 
              ? "Ask Raya & Mera anything about the airport..."
              : `Ask ${activeCharacter === 'raya' ? 'Raya' : 'Mera'} anything about the airport...`}
            style={styles.input}
            rows={2}
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            style={{
              ...styles.sendButton,
              backgroundColor: dualMode ? '#9B59B6' : activeCharacter === 'raya' ? '#4A90E2' : '#E67E22',
              opacity: (isLoading || !input.trim()) ? 0.5 : 1
            }}
          >
            {isLoading ? '⏳' : '✈️ Send'}
          </button>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <p style={styles.footerText}>
            🎤 Voice-enabled • 📚 Airport Database • 🤖 AI Powered • 🇬🇧 British & 🌟 Arabic Voices
          </p>
        </div>
      </div>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }
        
        body {
          margin: 0;
          padding: 0;
        }

        @keyframes loadingDots {
          0%, 20% { opacity: 0.2; }
          50% { opacity: 1; }
          100% { opacity: 0.2; }
        }

        .loading-dot {
          display: inline-block;
          animation: loadingDots 1.4s infinite;
          font-size: 24px;
        }

        .loading-dot:nth-child(2) {
          animation-delay: 0.2s;
        }

        .loading-dot:nth-child(3) {
          animation-delay: 0.4s;
        }
      `}</style>
    </>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#f5f7fa',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    backgroundColor: 'white',
    padding: '20px',
    textAlign: 'center',
    borderBottom: '2px solid #e0e0e0',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  title: {
    margin: 0,
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#333',
  },
  emoji: {
    marginRight: '10px',
  },
  subtitle: {
    margin: '5px 0 0 0',
    fontSize: '16px',
    color: '#666',
  },
  controlPanel: {
    backgroundColor: 'white',
    borderBottom: '1px solid #e0e0e0',
    padding: '15px 20px',
  },
  characterSelector: {
    display: 'flex',
    gap: '15px',
    justifyContent: 'center',
    marginBottom: '15px',
  },
  characterButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '15px 30px',
    border: '2px solid transparent',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    minWidth: '150px',
  },
  activeCharacter: {
    border: '2px solid #333',
    transform: 'scale(1.05)',
    boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
  },
  characterEmoji: {
    fontSize: '32px',
    marginBottom: '8px',
  },
  characterName: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: 'white',
    marginBottom: '4px',
  },
  characterDesc: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.9)',
  },
  modeControls: {
    display: 'flex',
    gap: '20px',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  modeLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  },
  voiceWarning: {
    backgroundColor: '#fff3cd',
    color: '#856404',
    padding: '10px',
    textAlign: 'center',
    fontSize: '14px',
  },
  chatContainer: {
    flex: 1,
    overflow: 'auto',
    padding: '20px',
    maxWidth: '900px',
    width: '100%',
    margin: '0 auto',
  },
  welcomeMessage: {
    textAlign: 'center',
    padding: '40px 20px',
  },
  welcomeTitle: {
    fontSize: '28px',
    marginBottom: '15px',
    color: '#333',
  },
  welcomeText: {
    fontSize: '18px',
    color: '#666',
    marginBottom: '30px',
    lineHeight: '1.6',
  },
  exampleQuestions: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    textAlign: 'left',
    maxWidth: '500px',
    margin: '0 auto',
  },
  exampleTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '10px',
    color: '#333',
  },
  exampleList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  message: {
    marginBottom: '15px',
    padding: '15px',
    borderRadius: '12px',
    maxWidth: '85%',
  },
  userMessage: {
    backgroundColor: '#e3f2fd',
    marginLeft: 'auto',
    textAlign: 'right',
  },
  assistantMessage: {
    backgroundColor: 'white',
    marginRight: 'auto',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  messageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  messageRole: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#666',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  },
  dataBadge: {
    fontSize: '16px',
    cursor: 'help',
  },
  speakButton: {
    background: 'none',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '4px',
  },
  messageContent: {
    fontSize: '16px',
    lineHeight: '1.5',
    color: '#333',
  },
  loadingDots: {
    display: 'flex',
    gap: '8px',
    padding: '10px',
    justifyContent: 'center',
  },
  voiceIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 20px',
    backgroundColor: '#fff3e0',
    borderTop: '1px solid #ffe0b2',
    justifyContent: 'center',
  },
  voiceIcon: {
    fontSize: '20px',
  },
  voiceText: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#e65100',
  },
  stopButton: {
    padding: '6px 12px',
    backgroundColor: '#ff5722',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  inputContainer: {
    display: 'flex',
    gap: '10px',
    padding: '20px',
    backgroundColor: 'white',
    borderTop: '2px solid #e0e0e0',
    maxWidth: '900px',
    width: '100%',
    margin: '0 auto',
  },
  input: {
    flex: 1,
    padding: '12px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '16px',
    resize: 'none',
    fontFamily: 'inherit',
  },
  sendButton: {
    padding: '12px 24px',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
    transition: 'opacity 0.2s',
  },
  footer: {
    padding: '15px',
    textAlign: 'center',
    backgroundColor: '#f0f0f0',
    borderTop: '1px solid #e0e0e0',
  },
  footerText: {
    margin: 0,
    fontSize: '14px',
    color: '#666',
  },
};
