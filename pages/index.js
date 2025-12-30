import React, { useState, useEffect, useRef } from 'react';

export default function RayaMiraChat() {
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const characters = {
    raya: {
      name: 'Raya',
      emoji: '🇦🇪',
      language: 'Arabic',
      color: '#00732F',
      lightColor: '#E8F5E9',
      greeting: 'مرحباً! أنا رايا، مساعدتك في مطار أبوظبي الدولي. كيف يمكنني مساعدتك اليوم؟'
    },
    mira: {
      name: 'Mira',
      emoji: '🌍',
      language: 'English',
      color: '#C8102E',
      lightColor: '#FFEBEE',
      greeting: 'Hello! I\'m Mira, your Abu Dhabi Airport assistant. How can I help you today?'
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (selectedCharacter && inputRef.current) {
      inputRef.current.focus();
    }
  }, [selectedCharacter]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCharacterSelect = (character) => {
    setSelectedCharacter(character);
    setMessages([{
      role: 'assistant',
      content: characters[character].greeting,
      character: characters[character].name,
      emoji: characters[character].emoji,
      timestamp: new Date().toISOString()
    }]);
    setError(null);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('https://raya-mira-backend.onrender.com/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
          character: selectedCharacter,
          mode: 'dual',
          history: messages.map(m => ({
            role: m.role,
            content: m.content
          }))
        }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();

      const assistantMessage = {
        role: 'assistant',
        content: data.text_response || data.response || data.message || 'No response received',
        character: data.character_name || characters[selectedCharacter].name,
        emoji: data.emoji || characters[selectedCharacter].emoji,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Error:', err);
      setError('Connection failed. Please check if backend is running.');
      
      const errorMessage = {
        role: 'assistant',
        content: selectedCharacter === 'raya' 
          ? 'عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.'
          : 'Sorry, I encountered an error. Please try again.',
        character: characters[selectedCharacter].name,
        emoji: '⚠️',
        timestamp: new Date().toISOString(),
        isError: true
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const resetChat = () => {
    setSelectedCharacter(null);
    setMessages([]);
    setInputMessage('');
    setError(null);
  };

  if (!selectedCharacter) {
    return (
      <div style={styles.container}>
        <div style={styles.selectionScreen}>
          <div style={styles.header}>
            <div style={styles.flagBanner}>
              <div style={{...styles.flagStripe, backgroundColor: '#00732F'}}></div>
              <div style={{...styles.flagStripe, backgroundColor: '#FFFFFF'}}></div>
              <div style={{...styles.flagStripe, backgroundColor: '#000000'}}></div>
              <div style={{...styles.flagStripe, backgroundColor: '#C8102E', width: '8px'}}></div>
            </div>
            <h1 style={styles.title}>🇦🇪 Raya & Mira</h1>
            <p style={styles.subtitle}>Abu Dhabi International Airport</p>
            <p style={styles.tagline}>Choose Your AI Assistant</p>
          </div>

          <div style={styles.characterGrid}>
            <div
              onClick={() => handleCharacterSelect('raya')}
              style={{
                ...styles.characterCard,
                borderColor: characters.raya.color,
                backgroundColor: characters.raya.lightColor
              }}
            >
              <div style={{
                ...styles.characterIcon,
                backgroundColor: characters.raya.color
              }}>
                <span style={styles.iconEmoji}>🇦🇪</span>
              </div>
              <h2 style={{ ...styles.characterName, color: characters.raya.color }}>
                Raya
              </h2>
              <p style={styles.characterLang}>Arabic Assistant</p>
              <p style={styles.characterDesc}>مساعدتك الذكية في المطار</p>
            </div>

            <div
              onClick={() => handleCharacterSelect('mira')}
              style={{
                ...styles.characterCard,
                borderColor: characters.mira.color,
                backgroundColor: characters.mira.lightColor
              }}
            >
              <div style={{
                ...styles.characterIcon,
                backgroundColor: characters.mira.color
              }}>
                <span style={styles.iconEmoji}>🌍</span>
              </div>
              <h2 style={{ ...styles.characterName, color: characters.mira.color }}>
                Mira
              </h2>
              <p style={styles.characterLang}>English Assistant</p>
              <p style={styles.characterDesc}>Your intelligent airport helper</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentCharacter = characters[selectedCharacter];

  return (
    <div style={styles.container}>
      <div style={styles.chatContainer}>
        <div style={{
          ...styles.chatHeader,
          backgroundColor: currentCharacter.color
        }}>
          <div style={styles.headerContent}>
            <span style={styles.headerEmoji}>{currentCharacter.emoji}</span>
            <div style={styles.headerText}>
              <h2 style={styles.headerTitle}>{currentCharacter.name}</h2>
              <p style={styles.headerSubtitle}>Abu Dhabi Airport • {currentCharacter.language}</p>
            </div>
          </div>
          <button onClick={resetChat} style={styles.resetButton}>
            Change
          </button>
        </div>

        <div style={styles.messagesContainer}>
          {messages.map((message, index) => (
            <div
              key={index}
              style={{
                ...styles.messageWrapper,
                justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start'
              }}
            >
              <div
                style={{
                  ...styles.message,
                  backgroundColor: message.role === 'user' 
                    ? currentCharacter.color 
                    : message.isError 
                    ? '#FFEBEE' 
                    : '#F5F5F5',
                  color: message.role === 'user' ? 'white' : '#000000',
                  maxWidth: '75%'
                }}
              >
                {message.role === 'assistant' && (
                  <div style={styles.assistantHeader}>
                    <span style={styles.assistantEmoji}>{message.emoji}</span>
                    <span style={styles.assistantName}>{message.character}</span>
                  </div>
                )}
                <div style={styles.messageText}>{message.content}</div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div style={styles.messageWrapper}>
              <div style={{ ...styles.message, backgroundColor: '#F5F5F5', maxWidth: '100px' }}>
                <div style={styles.loadingDots}>
                  <span style={styles.dot}>●</span>
                  <span style={styles.dot}>●</span>
                  <span style={styles.dot}>●</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {error && (
          <div style={styles.errorBanner}>
            ⚠️ {error}
          </div>
        )}

        <div style={styles.inputContainer}>
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={selectedCharacter === 'raya' ? 'اكتب رسالتك هنا...' : 'Type your message here...'}
            style={{
              ...styles.input,
              direction: selectedCharacter === 'raya' ? 'rtl' : 'ltr'
            }}
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            style={{
              ...styles.sendButton,
              backgroundColor: currentCharacter.color,
              opacity: (!inputMessage.trim() || isLoading) ? 0.5 : 1,
              cursor: (!inputMessage.trim() || isLoading) ? 'not-allowed' : 'pointer'
            }}
          >
            <span style={styles.sendIcon}>📤</span>
          </button>
        </div>

        <div style={styles.footer}>
          <div style={styles.footerFlag}>
            <div style={{...styles.footerBar, backgroundColor: '#00732F'}}></div>
            <div style={{...styles.footerBar, backgroundColor: '#FFFFFF', border: '1px solid #ddd'}}></div>
            <div style={{...styles.footerBar, backgroundColor: '#000000'}}></div>
          </div>
          <p style={styles.footerText}>Built for Abu Dhabi 🇦🇪</p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    width: '100vw',
    height: '100vh',
    backgroundColor: '#FAFAFA',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Arabic", "Helvetica Neue", Arial, sans-serif'
  },
  selectionScreen: {
    maxWidth: '900px',
    width: '100%',
    padding: '20px'
  },
  header: {
    textAlign: 'center',
    marginBottom: '50px'
  },
  flagBanner: {
    display: 'flex',
    justifyContent: 'center',
    gap: '0',
    marginBottom: '20px',
    height: '6px'
  },
  flagStripe: {
    width: '80px',
    height: '6px'
  },
  title: {
    fontSize: '48px',
    fontWeight: 'bold',
    background: 'linear-gradient(135deg, #C8102E 0%, #00732F 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '8px'
  },
  subtitle: {
    fontSize: '18px',
    color: '#666666',
    marginBottom: '5px'
  },
  tagline: {
    fontSize: '22px',
    color: '#333333',
    fontWeight: '500'
  },
  characterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '30px',
    padding: '20px'
  },
  characterCard: {
    backgroundColor: 'white',
    borderRadius: '20px',
    padding: '40px 30px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    border: '3px solid',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
  },
  characterIcon: {
    width: '110px',
    height: '110px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 24px',
    boxShadow: '0 4px 8px rgba(0,0,0,0.15)'
  },
  iconEmoji: {
    fontSize: '56px'
  },
  characterName: {
    fontSize: '36px',
    fontWeight: 'bold',
    marginBottom: '10px'
  },
  characterLang: {
    fontSize: '16px',
    color: '#666666',
    marginBottom: '10px',
    fontWeight: '500'
  },
  characterDesc: {
    fontSize: '15px',
    color: '#888888'
  },
  chatContainer: {
    width: '100%',
    maxWidth: '1000px',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'white',
    boxShadow: '0 0 20px rgba(0,0,0,0.1)'
  },
  chatHeader: {
    padding: '18px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: 'white',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
  },
  headerContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px'
  },
  headerEmoji: {
    fontSize: '32px'
  },
  headerText: {
    display: 'flex',
    flexDirection: 'column'
  },
  headerTitle: {
    fontSize: '22px',
    fontWeight: 'bold',
    margin: 0
  },
  headerSubtitle: {
    fontSize: '13px',
    margin: 0,
    opacity: 0.9
  },
  resetButton: {
    padding: '10px 20px',
    backgroundColor: 'rgba(255,255,255,0.25)',
    border: '1px solid rgba(255,255,255,0.6)',
    borderRadius: '10px',
    color: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s'
  },
  messagesContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    backgroundColor: '#FAFAFA'
  },
  messageWrapper: {
    display: 'flex',
    width: '100%'
  },
  message: {
    padding: '14px 18px',
    borderRadius: '16px',
    fontSize: '15px',
    lineHeight: '1.6',
    wordWrap: 'break-word',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
  },
  assistantHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
    paddingBottom: '8px',
    borderBottom: '1px solid #E0E0E0'
  },
  assistantEmoji: {
    fontSize: '18px'
  },
  assistantName: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#666666'
  },
  messageText: {
    whiteSpace: 'pre-wrap'
  },
  loadingDots: {
    display: 'flex',
    gap: '6px',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '8px'
  },
  dot: {
    fontSize: '16px',
    animation: 'bounce 1.4s infinite ease-in-out',
    color: '#999999'
  },
  errorBanner: {
    padding: '14px 24px',
    backgroundColor: '#FFEBEE',
    color: '#C8102E',
    textAlign: 'center',
    fontSize: '14px',
    fontWeight: '500',
    borderTop: '1px solid #FFCDD2'
  },
  inputContainer: {
    padding: '20px 24px',
    backgroundColor: 'white',
    borderTop: '2px solid #E0E0E0',
    display: 'flex',
    gap: '14px'
  },
  input: {
    flex: 1,
    padding: '14px 18px',
    fontSize: '15px',
    border: '2px solid #E0E0E0',
    borderRadius: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
    fontFamily: 'inherit'
  },
  sendButton: {
    width: '52px',
    height: '52px',
    borderRadius: '14px',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
  },
  sendIcon: {
    fontSize: '24px'
  },
  footer: {
    padding: '16px 24px',
    backgroundColor: '#F5F5F5',
    borderTop: '1px solid #E0E0E0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px'
  },
  footerFlag: {
    display: 'flex',
    gap: '3px'
  },
  footerBar: {
    width: '40px',
    height: '5px',
    borderRadius: '2px'
  },
  footerText: {
    fontSize: '12px',
    color: '#888888',
    margin: 0
  }
};
