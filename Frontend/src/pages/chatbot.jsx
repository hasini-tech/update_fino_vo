// src/pages/chatbot.jsx
import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes, ThemeProvider } from 'styled-components';

const theme = {
  colors: {
    primary: '#0ea5e9',
    secondary: '#06b6d4',
    background: '#0f172a',
    surface: '#1e293b',
    surfaceLight: '#334155',
    text: '#f1f5f9',
    textMuted: '#94a3b8',
    userMessage: '#0ea5e9',
    assistantMessage: '#1e293b',
    accent: '#22d3ee',
    gradient: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 50%, #22d3ee 100%)',
    glow: 'rgba(14, 165, 233, 0.4)',
    recording: '#ef4444',
    recordingGlow: 'rgba(239, 68, 68, 0.4)'
  },
  fonts: { main: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif" },
  spacing: { small: '12px', medium: '16px', large: '24px' },
  borderRadius: '12px'
};

const fadeIn = keyframes`
  from { opacity: 0; transform: scale(0.95) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
`;

const pulse = keyframes`
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.8; }
`;

const waveAnimation = keyframes`
  0%, 100% { transform: scaleY(0.5); }
  50% { transform: scaleY(1); }
`;

const ChatbotContainer = styled.div`
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 400px;
  height: 620px;
  border-radius: 20px;
  background: ${({ theme }) => theme.colors.background};
  display: flex;
  flex-direction: column;
  z-index: 1000;
  font-family: ${({ theme }) => theme.fonts.main};
  animation: ${fadeIn} 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.surfaceLight};
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px ${({ theme }) => theme.colors.glow};
`;

const Header = styled.div`
  padding: 20px;
  background: ${({ theme }) => theme.colors.surface};
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid ${({ theme }) => theme.colors.surfaceLight};
`;

const HeaderContent = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
`;

const BotAvatar = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: ${({ theme }) => theme.colors.gradient};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  box-shadow: 0 4px 15px ${({ theme }) => theme.colors.glow};
  animation: ${float} 3s ease-in-out infinite;
`;

const HeaderText = styled.div`
  h4 {
    margin: 0;
    font-size: 17px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text};
    letter-spacing: -0.3px;
  }
  p {
    margin: 4px 0 0 0;
    font-size: 12px;
    color: ${({ theme }) => theme.colors.accent};
    display: flex;
    align-items: center;
    gap: 6px;
    &::before {
      content: '';
      width: 6px;
      height: 6px;
      background: #22c55e;
      border-radius: 50%;
      box-shadow: 0 0 8px #22c55e;
    }
  }
`;

const CloseButton = styled.button`
  cursor: pointer;
  background: ${({ theme }) => theme.colors.surfaceLight};
  border: none;
  border-radius: 10px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 20px;
  transition: all 0.2s ease;
  &:hover {
    background: ${({ theme }) => theme.colors.primary};
    color: white;
    transform: rotate(90deg);
  }
`;

const MessagesContainer = styled.div`
  flex-grow: 1;
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: linear-gradient(180deg, ${({ theme }) => theme.colors.background} 0%, rgba(14, 165, 233, 0.02) 100%);
  &::-webkit-scrollbar { width: 5px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.surfaceLight};
    border-radius: 10px;
  }
`;

const MessageWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: ${({ $isUser }) => $isUser ? 'flex-end' : 'flex-start'};
  animation: ${fadeIn} 0.3s ease-out;
`;

const Message = styled.div`
  padding: 14px 18px;
  border-radius: 18px;
  max-width: 80%;
  line-height: 1.55;
  word-break: break-word;
  font-size: 14px;
`;

const UserMessage = styled(Message)`
  background: ${({ theme }) => theme.colors.gradient};
  color: white;
  border-bottom-right-radius: 6px;
  box-shadow: 0 4px 15px ${({ theme }) => theme.colors.glow};
`;

const AssistantMessage = styled(Message)`
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  border-bottom-left-radius: 6px;
  border: 1px solid ${({ theme }) => theme.colors.surfaceLight};
`;

const VoiceMessage = styled(Message)`
  background: ${({ theme }) => theme.colors.gradient};
  color: white;
  border-bottom-right-radius: 6px;
  box-shadow: 0 4px 15px ${({ theme }) => theme.colors.glow};
  display: flex;
  align-items: center;
  gap: 10px;
`;

const VoiceIcon = styled.div`
  font-size: 18px;
`;

const bounce = keyframes`
  0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
  40% { transform: scale(1.2); opacity: 1; }
`;

const LoadingDots = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
  span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.accent};
    animation: ${bounce} 1.4s infinite ease-in-out;
  }
  span:nth-child(1) { animation-delay: -0.32s; }
  span:nth-child(2) { animation-delay: -0.16s; }
  span:nth-child(3) { animation-delay: 0s; }
`;

const InputContainer = styled.form`
  display: flex;
  padding: 16px 20px 20px;
  gap: 12px;
  background: ${({ theme }) => theme.colors.surface};
  border-top: 1px solid ${({ theme }) => theme.colors.surfaceLight};
  align-items: center;
`;

const Input = styled.input`
  flex-grow: 1;
  border: 2px solid ${({ theme }) => theme.colors.surfaceLight};
  border-radius: 14px;
  padding: 14px 18px;
  font-size: 14px;
  font-family: ${({ theme }) => theme.fonts.main};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  transition: all 0.25s ease;
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 4px ${({ theme }) => theme.colors.glow};
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  &::placeholder { color: ${({ theme }) => theme.colors.textMuted}; }
`;

const VoiceButton = styled.button`
  border: none;
  background: ${({ $isRecording, theme }) => 
    $isRecording ? theme.colors.recording : theme.colors.surfaceLight};
  color: ${({ $isRecording }) => $isRecording ? 'white' : '#94a3b8'};
  border-radius: 14px;
  width: 48px;
  height: 48px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  transition: all 0.25s ease;
  box-shadow: ${({ $isRecording, theme }) => 
    $isRecording ? `0 4px 15px ${theme.colors.recordingGlow}` : 'none'};
  flex-shrink: 0;
  animation: ${({ $isRecording }) => $isRecording ? pulse : 'none'} 1.5s infinite;
  
  &:hover:not(:disabled) {
    transform: scale(1.05);
    background: ${({ $isRecording, theme }) => 
      $isRecording ? theme.colors.recording : theme.colors.primary};
    color: white;
  }
  &:active:not(:disabled) { transform: scale(0.95); }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SendButton = styled.button`
  border: none;
  background: ${({ theme }) => theme.colors.gradient};
  color: white;
  border-radius: 14px;
  width: 48px;
  height: 48px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  transition: all 0.25s ease;
  box-shadow: 0 4px 15px ${({ theme }) => theme.colors.glow};
  flex-shrink: 0;
  &:hover:not(:disabled) {
    transform: scale(1.05);
    box-shadow: 0 6px 20px ${({ theme }) => theme.colors.glow};
  }
  &:active:not(:disabled) { transform: scale(0.95); }
  &:disabled {
    background: ${({ theme }) => theme.colors.surfaceLight};
    box-shadow: none;
    cursor: not-allowed;
  }
`;

const RecordingIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 12px;
  color: #ef4444;
  font-size: 13px;
  position: absolute;
  top: -50px;
  left: 20px;
  right: 20px;
`;

const WaveformContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  height: 20px;
`;

const WaveBar = styled.div`
  width: 3px;
  height: ${({ $height }) => $height}%;
  background: #ef4444;
  border-radius: 2px;
  animation: ${waveAnimation} 0.5s ease-in-out infinite;
  animation-delay: ${({ $delay }) => $delay}s;
`;

const ErrorMessage = styled.div`
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 13px;
  border: 1px solid rgba(239, 68, 68, 0.3);
  display: flex;
  align-items: center;
  gap: 10px;
  &::before { content: '⚠'; font-size: 16px; }
`;

const Timestamp = styled.div`
  font-size: 10px;
  color: ${({ theme }) => theme.colors.textMuted};
  margin-top: 6px;
  padding: 0 4px;
`;

const QuickActions = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 8px;
`;

const QuickAction = styled.button`
  background: ${({ theme }) => theme.colors.surfaceLight};
  border: 1px solid transparent;
  color: ${({ theme }) => theme.colors.text};
  padding: 8px 14px;
  border-radius: 20px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: ${({ theme }) => theme.fonts.main};
  &:hover {
    background: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 2px 10px ${({ theme }) => theme.colors.glow};
  }
`;

const Chatbot = ({ closeChatbot }) => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hey! 👋 I'm your AI financial assistant. I can help you track spending, analyze patterns, and give personalized advice. You can type or use voice! What would you like to know?",
      timestamp: new Date()
    }
  ]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  const quickActionsList = ['Check balance', 'Recent expenses', 'Spending tips'];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const getApiBaseUrl = () => {
    const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    return isDev ? 'http://localhost:5000' : '';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleVoiceMessage(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  const handleVoiceMessage = async (audioBlob) => {
    setIsLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const tenantId = localStorage.getItem('tenantId') || sessionStorage.getItem('tenantId');
      
      if (!token) throw new Error('Authentication required. Please log in.');

      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice-message.webm');

      const headers = { 'Authorization': `Bearer ${token}` };
      if (tenantId) headers['Tenant-ID'] = tenantId;

      // Transcribe audio
      const transcribeResponse = await fetch(`${getApiBaseUrl()}/api/chatbot/transcribe`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!transcribeResponse.ok) {
        throw new Error(`Transcription failed: ${transcribeResponse.status}`);
      }

      const transcribeData = await transcribeResponse.json();
      
      if (!transcribeData.success || !transcribeData.text) {
        throw new Error('Could not transcribe audio');
      }

      const transcribedText = transcribeData.text;

      // Add voice message to chat
      const voiceMessage = { 
        role: 'user', 
        content: transcribedText, 
        timestamp: new Date(),
        isVoice: true 
      };
      
      setMessages(prev => [...prev, voiceMessage]);
      setShowQuickActions(false);

      // Get AI response
      const newMessages = [...messages, voiceMessage];
      
      const chatHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
      if (tenantId) chatHeaders['Tenant-ID'] = tenantId;

      const chatResponse = await fetch(`${getApiBaseUrl()}/api/chatbot/chat`, {
        method: 'POST',
        headers: chatHeaders,
        body: JSON.stringify({ 
          messages: newMessages.map(m => ({ role: m.role, content: m.content })) 
        }),
      });

      if (!chatResponse.ok) {
        throw new Error(`Server error: ${chatResponse.status}`);
      }

      const chatData = await chatResponse.json();
      
      if (chatData.success) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: chatData.message, 
          timestamp: new Date() 
        }]);
      } else {
        throw new Error(chatData.message || 'Failed to get response');
      }

    } catch (err) {
      console.error('Voice message error:', err);
      setError(err.message || 'Failed to process voice message');
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "Sorry, I couldn't process your voice message. Please try again.", 
        timestamp: new Date() 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e, quickMsg) => {
    e?.preventDefault();
    const msg = quickMsg || userInput.trim();
    if (!msg || isLoading) return;

    setShowQuickActions(false);
    const newUserMessage = { role: 'user', content: msg, timestamp: new Date() };
    const newMessages = [...messages, newUserMessage];
    setMessages(newMessages);
    setUserInput('');
    setIsLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const tenantId = localStorage.getItem('tenantId') || sessionStorage.getItem('tenantId');
      if (!token) throw new Error('Authentication required. Please log in.');

      const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
      if (tenantId) headers['Tenant-ID'] = tenantId;

      const response = await fetch(`${getApiBaseUrl()}/api/chatbot/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ messages: newMessages.map(m => ({ role: m.role, content: m.content })) }),
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) throw new Error('Session expired. Please login again.');
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.message, timestamp: new Date() }]);
      } else {
        throw new Error(data.message || 'Failed to get response');
      }
    } catch (err) {
      console.error('Chatbot error:', err);
      let displayMsg = "Connection issue. Please try again.";
      if (err.message.includes('login') || err.message.includes('Session')) {
        setError('Please log in again.');
        displayMsg = "Authentication required.";
      } else {
        setError(err.message);
      }
      setMessages(prev => [...prev, { role: 'assistant', content: displayMsg, timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const formatMessage = (content) => content.split('\n').map((line, i) => <div key={i}>{line || <br />}</div>);
  const formatTime = (date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <ThemeProvider theme={theme}>
      <ChatbotContainer>
        <Header>
          <HeaderContent>
            <BotAvatar>🤖</BotAvatar>
            <HeaderText>
              <h4>Finance AI</h4>
              <p>Online now</p>
            </HeaderText>
          </HeaderContent>
          <CloseButton onClick={closeChatbot}>×</CloseButton>
        </Header>

        <MessagesContainer>
          {error && <ErrorMessage>{error}</ErrorMessage>}
          {messages.map((msg, i) => (
            <MessageWrapper key={i} $isUser={msg.role === 'user'}>
              {msg.role === 'user' ? (
                msg.isVoice ? (
                  <VoiceMessage>
                    <VoiceIcon>🎤</VoiceIcon>
                    {formatMessage(msg.content)}
                  </VoiceMessage>
                ) : (
                  <UserMessage>{formatMessage(msg.content)}</UserMessage>
                )
              ) : (
                <AssistantMessage>
                  {isLoading && i === messages.length - 1 ? 
                    <LoadingDots><span/><span/><span/></LoadingDots> : 
                    formatMessage(msg.content)}
                </AssistantMessage>
              )}
              <Timestamp>{formatTime(msg.timestamp)}</Timestamp>
              {i === 0 && showQuickActions && msg.role === 'assistant' && (
                <QuickActions>
                  {quickActionsList.map((action, idx) => (
                    <QuickAction key={idx} onClick={(e) => handleSendMessage(e, action)}>{action}</QuickAction>
                  ))}
                </QuickActions>
              )}
            </MessageWrapper>
          ))}
          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <MessageWrapper $isUser={false}>
              <AssistantMessage><LoadingDots><span/><span/><span/></LoadingDots></AssistantMessage>
            </MessageWrapper>
          )}
          <div ref={messagesEndRef} />
        </MessagesContainer>

        <InputContainer onSubmit={handleSendMessage}>
          {isRecording && (
            <RecordingIndicator>
              <WaveformContainer>
                <WaveBar $height={60} $delay={0} />
                <WaveBar $height={80} $delay={0.1} />
                <WaveBar $height={100} $delay={0.2} />
                <WaveBar $height={70} $delay={0.3} />
              </WaveformContainer>
              Recording... {formatRecordingTime(recordingTime)}
            </RecordingIndicator>
          )}
          <VoiceButton 
            type="button"
            onClick={toggleRecording} 
            disabled={isLoading}
            $isRecording={isRecording}
          >
            {isRecording ? '⏹' : '🎤'}
          </VoiceButton>
          <Input
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder={isRecording ? "Recording..." : "Type or use voice..."}
            disabled={isLoading || isRecording}
            autoFocus
          />
          <SendButton type="submit" disabled={isLoading || !userInput.trim() || isRecording}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </SendButton>
        </InputContainer>
      </ChatbotContainer>
    </ThemeProvider>
  );
};

export default Chatbot;