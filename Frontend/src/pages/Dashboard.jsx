import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import styled, { keyframes } from 'styled-components';

import FinancialInsights from '../pages/FinancialInsights';
import Schemes from '../pages/Schemes'; 
import Chatbot from './chatbot.jsx';
import AISuggestions from '../pages/AISuggestions';
import MarketNews from './MarketNews.jsx';

ChartJS.register(ArcElement, Tooltip, Legend);

// ANIMATIONS
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
`;

const sparkle = keyframes`
  0%, 100% { transform: scale(1) rotate(0deg); }
  50% { transform: scale(1.2) rotate(180deg); }
`;

const scaleIn = keyframes`
  from { opacity: 0; transform: scale(0.8) translateY(20px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
`;

// STYLED COMPONENTS - IMPROVED LAYOUT
const PageWrapper = styled.div`
  background: linear-gradient(135deg, #f5f7fa 0%, #ffffff 100%);
  min-height: 100vh;
  font-family: 'Inter', 'Segoe UI', 'Roboto', sans-serif;
  position: relative;
  overflow-x: hidden;
`;

const Container = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 40px 24px;
  
  @media (max-width: 768px) {
    padding: 24px 16px;
  }
`;

const HeaderSection = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 48px;
  animation: ${fadeIn} 0.6s ease-out;
  flex-wrap: wrap;
  gap: 24px;
  text-align: center;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: center;
  }
`;

const HeaderLeft = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
`;

const PageTitle = styled.h1`
  font-size: 2.75rem;
  font-weight: 800;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  letter-spacing: -1.5px;
  
  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const Subtitle = styled.p`
  color: #64748b;
  font-size: 1rem;
  margin: 0;
  font-weight: 500;
`;

const MainContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 32px;
`;

const AIInsightsSection = styled.div`
  background: white;
  border-radius: 20px;
  padding: 36px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
  animation: ${fadeIn} 0.8s ease-out;
  border: 1px solid #e2e8f0;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #667eea, #764ba2, #f093fb);
  }
  
  @media (max-width: 768px) {
    padding: 24px;
  }
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 28px;
`;

const SectionIcon = styled.div`
  font-size: 2rem;
  filter: drop-shadow(0 2px 4px rgba(102, 126, 234, 0.3));
`;

const SectionTitle = styled.h2`
  font-size: 1.75rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
  letter-spacing: -0.5px;
`;

// FLOATING BUTTONS - CIRCULAR FAB MENU
const FloatingButtonGroup = styled.div`
  position: fixed;
  bottom: 32px;
  right: 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  z-index: 1000;
  
  @media (max-width: 768px) {
    bottom: 20px;
    right: 20px;
    gap: 12px;
  }
`;

const FloatingMainButton = styled.button`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 50%;
  width: 70px;
  height: 70px;
  font-size: 32px;
  font-weight: 300;
  cursor: pointer;
  box-shadow: 0 8px 30px rgba(102, 126, 234, 0.4);
  display: flex;
  justify-content: center;
  align-items: center;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  animation: ${float} 3s ease-in-out infinite;
  position: relative;
  z-index: 1002;
  
  &:hover {
    transform: scale(1.1) rotate(90deg);
    box-shadow: 0 12px 40px rgba(102, 126, 234, 0.6);
  }
  
  &:active {
    transform: scale(1.05) rotate(90deg);
  }
  
  @media (max-width: 768px) {
    width: 64px;
    height: 64px;
    font-size: 28px;
  }
`;

const FloatingSubButtons = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 20px;
  align-items: center;
`;

const FloatingSubButton = styled.button`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 50%;
  width: 56px;
  height: 56px;
  font-size: 20px;
  cursor: pointer;
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
  display: flex;
  justify-content: center;
  align-items: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  animation: ${scaleIn} 0.3s ease-out;
  position: relative;
  
  &:hover {
    transform: scale(1.15);
    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.6);
  }
  
  &:active {
    transform: scale(1.05);
  }
  
  &::after {
    content: "${props => props.tooltip}";
    position: absolute;
    right: 70px;
    background: rgba(30, 41, 59, 0.9);
    color: white;
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
    opacity: 0;
    transform: translateX(10px);
    transition: all 0.3s ease;
    pointer-events: none;
  }
  
  &:hover::after {
    opacity: 1;
    transform: translateX(0);
  }
`;

// POPUP COMPONENTS
const PopupOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.7);
  backdrop-filter: blur(12px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  animation: ${fadeIn} 0.3s ease-out;
  padding: 20px;
`;

const PopupContainer = styled.div`
  width: 100%;
  max-width: 750px;
  max-height: 88vh;
  background: white;
  border-radius: 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: ${fadeIn} 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const PopupHeaderBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 28px;
  border-bottom: 2px solid #f1f5f9;
  background: linear-gradient(135deg, #fafbfc 0%, #ffffff 100%);
  flex-shrink: 0;
`;

const PopupHeading = styled.h2`
  margin: 0;
  font-size: 1.85rem;
  font-weight: 700;
  color: rgb(112, 94, 189);
  display: flex;
  align-items: center;
  gap: 12px;
  
  &::before {
    content: '✓';
    font-size: 1.6rem;
  }
`;

const CloseBtn = styled.button`
  background: #f1f5f9;
  color: #475569;
  border: none;
  border-radius: 50%;
  width: 42px;
  height: 42px;
  font-size: 26px;
  line-height: 1;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background: #e2e8f0;
    transform: rotate(90deg);
  }
  
  &:active {
    transform: rotate(90deg) scale(0.95);
  }
`;

const PopupContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 28px;
  
  &::-webkit-scrollbar {
    width: 10px;
  }
  
  &::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 5px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgb(112, 94, 189);
    border-radius: 5px;
  }
`;

// AI CHAT INTERFACE
const ChatInterface = styled.div`
  display: flex;
  flex-direction: column;
  height: 550px;
  
  @media (max-width: 768px) {
    height: 450px;
  }
`;

const MessagesArea = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  background: linear-gradient(to bottom, #f8fafc, #ffffff);
  border-radius: 16px;
  margin-bottom: 20px;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 18px;
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgb(112, 94, 189);
    border-radius: 4px;
  }
`;

const ChatMessage = styled.div`
  display: flex;
  flex-direction: column;
  align-items: ${props => props.isUser ? 'flex-end' : 'flex-start'};
  animation: ${fadeIn} 0.3s ease-out;
  width: 100%;
`;

const MessageAuthor = styled.span`
  font-size: 0.75rem;
  color: #64748b;
  margin-bottom: 6px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 4px;
  
  &::before {
    content: ${props => props.isUser ? '"👤"' : '"🤖"'};
    font-size: 0.9rem;
  }
`;

const MessageContent = styled.div`
  max-width: 85%;
  padding: 16px 20px;
  border-radius: ${props => props.isUser 
    ? '18px 18px 4px 18px' 
    : '18px 18px 18px 4px'};
  background: ${props => props.isUser 
    ? 'linear-gradient(135deg, rgb(112, 94, 189) 0%, rgb(132, 114, 209) 100%)' 
    : 'white'};
  color: ${props => props.isUser ? 'white' : '#1e293b'};
  box-shadow: ${props => props.isUser 
    ? '0 4px 14px rgba(112, 94, 189, 0.3)' 
    : '0 2px 10px rgba(0, 0, 0, 0.08)'};
  word-wrap: break-word;
  line-height: 1.65;
  white-space: pre-wrap;
  font-size: 0.95rem;
  border: ${props => props.isUser ? 'none' : '1px solid #e2e8f0'};
`;

const InputArea = styled.div`
  display: flex;
  gap: 12px;
  padding: 20px;
  background: #f8fafc;
  border-radius: 16px;
  border: 2px solid #e2e8f0;
  flex-shrink: 0;
`;

const MessageInput = styled.input`
  flex: 1;
  padding: 14px 18px;
  border: 2px solid #e2e8f0;
  border-radius: 14px;
  font-size: 1rem;
  outline: none;
  transition: all 0.3s ease;
  background: white;
  
  &:focus {
    border-color: rgb(112, 94, 189);
    box-shadow: 0 0 0 4px rgba(112, 94, 189, 0.1);
  }
  
  &::placeholder {
    color: #94a3b8;
  }
`;

const SendBtn = styled.button`
  background: linear-gradient(135deg, rgb(112, 94, 189) 0%, rgb(132, 114, 209) 100%);
  color: white;
  border: none;
  border-radius: 14px;
  padding: 14px 28px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(112, 94, 189, 0.4);
  }
  
  &:active:not(:disabled) {
    transform: translateY(0);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  &::after {
    content: '→';
    font-size: 1.2rem;
  }
`;

const LoadingIndicator = styled.div`
  display: flex;
  gap: 6px;
  
  span {
    width: 8px;
    height: 8px;
    background: rgb(112, 94, 189);
    border-radius: 50%;
    animation: ${pulse} 1.4s ease-in-out infinite;
    
    &:nth-child(1) { animation-delay: 0s; }
    &:nth-child(2) { animation-delay: 0.2s; }
    &:nth-child(3) { animation-delay: 0.4s; }
  }
`;

// MAIN COMPONENT
const Dashboardpage = () => {
  const [transactions, setTransactions] = useState([]);
  const [income, setIncome] = useState(0);
  const [expense, setExpense] = useState(0);
  const [balance, setBalance] = useState(0);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [isMarketNewsOpen, setMarketNewsOpen] = useState(false);
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);
  const [isSchemesOpen, setIsSchemesOpen] = useState(false);
  const [isAskAIOpen, setIsAskAIOpen] = useState(false);
  const [showFloatingButtons, setShowFloatingButtons] = useState(false);
  
  const [aiMessages, setAiMessages] = useState([
    { text: "Hello! I'm your AI assistant. Ask me anything - I can help with general knowledge, advice, problem-solving, creative tasks, and much more!", isUser: false }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [aiMessages]);
  
  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { 
        headers: { 'Authorization': `Bearer ${token}` },
        withCredentials: true 
      };
      
      const response = await axios.get('http://localhost:5000/api/transactions', config);
      const fetchedTransactions = response.data.transactions || [];
      setTransactions(fetchedTransactions);

      const incomeTotal = fetchedTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
      const expenseTotal = fetchedTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);

      setIncome(incomeTotal);
      setExpense(expenseTotal);
      setBalance(incomeTotal - expenseTotal);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleChatbot = () => setIsChatbotOpen(!isChatbotOpen);
  const toggleMarketNews = () => setMarketNewsOpen(!isMarketNewsOpen);
  const toggleInsights = () => setIsInsightsOpen(!isInsightsOpen);
  const toggleSchemes = () => setIsSchemesOpen(!isSchemesOpen);
  const toggleAskAI = () => setIsAskAIOpen(!isAskAIOpen);
  const toggleFloatingButtons = () => setShowFloatingButtons(!showFloatingButtons);
  
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;
    
    const userMessage = inputMessage.trim();
    setInputMessage('');
    
    setAiMessages(prev => [...prev, { text: userMessage, isUser: true }]);
    setIsLoading(true);
    
    try {
      const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer sk-645ae8a4fdde4705afb9e0688ddbfb5a"
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            {
              role: "system",
              content: "You are a helpful, knowledgeable, and friendly AI assistant. You can answer questions on any topic including general knowledge, science, technology, history, arts, entertainment, education, problem-solving, creative writing, coding help, and provide practical advice on various subjects. Be clear, informative, and engaging in your responses. Format your responses in a conversational and easy-to-read manner."
            },
            {
              role: "user",
              content: userMessage
            }
          ],
          temperature: 0.7,
          max_tokens: 1500
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      
      let aiResponse = "";
      if (data.choices && data.choices.length > 0 && data.choices[0].message) {
        aiResponse = data.choices[0].message.content;
      }
      
      if (!aiResponse) {
        aiResponse = "I apologize, but I couldn't generate a response. Please try asking your question in a different way.";
      }
      
      const sentences = aiResponse.match(/[^.!?]+[.!?]+/g) || [aiResponse];
      const shortResponse = sentences.slice(0, 3).join(' ').trim();
      const finalResponse = sentences.length > 3 ? shortResponse + "..." : shortResponse;

      setAiMessages(prev => [...prev, { text: finalResponse, isUser: false }]);

    } catch (error) {
      console.error("Ask AI error:", error);
      const fallbackResponse = "I apologize, but I'm having trouble connecting to the AI service right now. Please check your internet connection and try again in a moment.";
      setAiMessages(prev => [...prev, { text: fallbackResponse, isUser: false }]);
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

  const handleFloatingButtonClick = (type) => {
    setShowFloatingButtons(false);
    switch(type) {
      case 'news':
        toggleMarketNews();
        break;
      case 'insights':
        toggleInsights();
        break;
      case 'schemes':
        toggleSchemes();
        break;
      case 'ai':
        toggleAskAI();
        break;
      case 'chat':
        toggleChatbot();
        break;
      default:
        break;
    }
  };

  return (
    <PageWrapper>
      {/* POPUPS */}
      {isMarketNewsOpen && <MarketNews onClose={toggleMarketNews} />}
      
      {isInsightsOpen && (
        <PopupOverlay onClick={toggleInsights}>
          <PopupContainer onClick={(e) => e.stopPropagation()}>
            <PopupHeaderBar>
              <PopupHeading>Financial Insights</PopupHeading>
              <CloseBtn onClick={toggleInsights}>×</CloseBtn>
            </PopupHeaderBar>
            <PopupContent>
              <FinancialInsights />
            </PopupContent>
          </PopupContainer>
        </PopupOverlay>
      )}

      {isSchemesOpen && (
        <PopupOverlay onClick={toggleSchemes}>
          <PopupContainer onClick={(e) => e.stopPropagation()}>
            <PopupHeaderBar>
              <PopupHeading>Schemes</PopupHeading>
              <CloseBtn onClick={toggleSchemes}>×</CloseBtn>
            </PopupHeaderBar>
            <PopupContent>
              <Schemes />
            </PopupContent>
          </PopupContainer>
        </PopupOverlay>
      )}

      {isAskAIOpen && (
        <PopupOverlay onClick={toggleAskAI}>
          <PopupContainer onClick={(e) => e.stopPropagation()}>
            <PopupHeaderBar>
              <PopupHeading>Ask AI</PopupHeading>
              <CloseBtn onClick={toggleAskAI}>×</CloseBtn>
            </PopupHeaderBar>
            <PopupContent>
              <ChatInterface>
                <MessagesArea>
                  {aiMessages.map((msg, index) => (
                    <ChatMessage key={index} isUser={msg.isUser}>
                      <MessageAuthor isUser={msg.isUser}>
                        {msg.isUser ? 'You' : 'AI Assistant'}
                      </MessageAuthor>
                      <MessageContent isUser={msg.isUser}>
                        {msg.text}
                      </MessageContent>
                    </ChatMessage>
                  ))}
                  {isLoading && (
                    <ChatMessage isUser={false}>
                      <MessageAuthor isUser={false}>AI Assistant</MessageAuthor>
                      <MessageContent isUser={false}>
                        <LoadingIndicator>
                          <span></span>
                          <span></span>
                          <span></span>
                        </LoadingIndicator>
                      </MessageContent>
                    </ChatMessage>
                  )}
                  <div ref={messagesEndRef} />
                </MessagesArea>
                <InputArea>
                  <MessageInput
                    type="text"
                    placeholder="Ask me anything..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isLoading}
                  />
                  <SendBtn onClick={handleSendMessage} disabled={isLoading}>
                    Send
                  </SendBtn>
                </InputArea>
              </ChatInterface>
            </PopupContent>
          </PopupContainer>
        </PopupOverlay>
      )}

      {/* MAIN CONTENT */}
      <Container>
        <HeaderSection>
          <HeaderLeft>
            <PageTitle>Dashboard</PageTitle>
            <Subtitle>Welcome back! Here's your financial overview</Subtitle>
          </HeaderLeft>
        </HeaderSection>

        <MainContent>
          <AIInsightsSection>
            <SectionHeader>
              <SectionIcon>💡</SectionIcon>
              <SectionTitle>AI-Powered Financial Insights</SectionTitle>
            </SectionHeader>
            <AISuggestions />
          </AIInsightsSection>
        </MainContent>
      </Container>

      {/* FLOATING BUTTONS - CIRCULAR FAB MENU */}
      <FloatingButtonGroup>
        {showFloatingButtons && (
          <FloatingSubButtons>
            <FloatingSubButton 
              onClick={() => handleFloatingButtonClick('news')}
              tooltip="Market News"
            >
              📈
            </FloatingSubButton>
            <FloatingSubButton 
              onClick={() => handleFloatingButtonClick('insights')}
              tooltip="Financial Insights"
            >
              💡
            </FloatingSubButton>
            <FloatingSubButton 
              onClick={() => handleFloatingButtonClick('schemes')}
              tooltip="Schemes"
            >
              📜
            </FloatingSubButton>
            <FloatingSubButton 
              onClick={() => handleFloatingButtonClick('ai')}
              tooltip="Ask AI"
            >
              🤖
            </FloatingSubButton>
            <FloatingSubButton 
              onClick={() => handleFloatingButtonClick('chat')}
              tooltip="Chat"
            >
              💬
            </FloatingSubButton>
          </FloatingSubButtons>
        )}
        
        <FloatingMainButton onClick={toggleFloatingButtons}>
          {showFloatingButtons ? '−' : '+'}
        </FloatingMainButton>
      </FloatingButtonGroup>
      
      {isChatbotOpen && <Chatbot closeChatbot={toggleChatbot} />}
    </PageWrapper>
  );
};

export default Dashboardpage;