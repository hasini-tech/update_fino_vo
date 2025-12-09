// src/pages/AISuggestions.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styled, { keyframes } from 'styled-components';

const pulse = keyframes`
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.7;
  }
`;

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

// --- STYLED COMPONENTS ---

const Container = styled.div`
  background: #ffffff; /* Changed to white background */
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.1); /* Adjusted shadow for light theme */
  color: #333333; /* Changed default text color */
  border: 1px solid #e0e0e0; /* Added a light border */
  min-height: 250px;
  display: flex;
  flex-direction: column;
`;

const Title = styled.h2`
  margin: 0 0 24px 0;
  font-size: 24px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid #e0e0e0; /* Adjusted border color */
  padding-bottom: 16px;
  flex-shrink: 0;
`;

const SuggestionGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 20px;
    animation: ${fadeIn} 0.5s ease-out;
`;

const PromptCard = styled.div`
  background: #f7f7f9; /* Light grey background for cards */
  border-radius: 12px;
  padding: 20px 24px;
  border: 1px solid #e0e0e0; /* Light border */
  transition: transform 0.3s ease, background-color 0.3s ease;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  min-height: 100px;
  font-size: 16px;
  font-weight: 500;
  color: #333333; /* Dark text color */

  &:hover { 
    transform: translateY(-5px);
    background: #e9e9ed; /* Slightly darker on hover */
  }
`;

const DetailView = styled.div`
  animation: ${fadeIn} 0.5s ease-out;
`;

const CardHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
`;

const Icon = styled.span`
    font-size: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    flex-shrink: 0;
    /* Adjusted colors for light theme */
    background-color: ${props => {
        switch (props.type) {
            case 'warning': return '#fff8e1';
            case 'success': return '#e8f5e9';
            default: return '#e3f2fd';
        }
    }};
    color: ${props => {
        switch (props.type) {
            case 'warning': return '#f57f17';
            case 'success': return '#2e7d32';
            default: return '#1976d2';
        }
    }};
`;

const SuggestionTitle = styled.h4`
  margin: 0;
  color: #222222; /* Darker title color */
  font-size: 18px;
  font-weight: 500;
`;

const SuggestionDescription = styled.p`
  margin: 16px 0;
  color: #555555; /* Adjusted description text color */
  font-size: 15px;
  line-height: 1.6;
`;

const Category = styled.span`
  display: inline-block;
  background: #eeeeee; /* Light grey background */
  color: #333333; /* Dark text color */
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 24px;
`;

const BackButton = styled.button`
  background: #f0f0f0; /* Light grey background */
  border: 1px solid #dcdcdc; /* Light border */
  color: #333333; /* Dark text color */
  padding: 10px 20px;
  border-radius: 20px;
  cursor: pointer;
  transition: background-color 0.3s ease;
  font-weight: 500;
  margin-top: 16px;
  
  &:hover {
    background: #e0e0e0; /* Darker hover */
  }
`;

const StatusContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    flex-grow: 1;
    text-align: center;
    flex-direction: column;
    gap: 12px;
`;

const LoadingText = styled.p`
  font-size: 18px;
  font-weight: 500;
  color: #555555; /* Adjusted for light theme */
  animation: ${pulse} 2s ease-in-out infinite;
`;

const ErrorText = styled.p`
  color: #c62828; /* Dark red text */
  background: #ffebee; /* Light red background */
  padding: 16px 24px;
  border-radius: 12px;
  border: 1px solid #ef9a9a; /* Light red border */
  font-weight: 500;
`;

const InfoBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #f0f0f0; /* Light grey */
  border: 1px solid #dcdcdc; /* Light border */
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 13px;
  color: #333333; /* Dark text */
  margin-bottom: 16px;
`;

const RetryButton = styled.button`
  background: rgba(139, 92, 246, 0.8);
  border: 1px solid rgba(139, 92, 246, 1);
  color: white;
  padding: 10px 24px;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
  font-size: 14px;
  
  &:hover {
    background: rgba(139, 92, 246, 1);
    transform: translateY(-2px);
  }
`;

const AISuggestions = () => {
    const [suggestions, setSuggestions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedSuggestion, setSelectedSuggestion] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const fetchSuggestions = async () => {
        setIsLoading(true);
        setError(null);
        
        try {
            // Get auth details from local storage (OPTIONAL)
            const token = localStorage.getItem('token');
            const tenantId = localStorage.getItem('tenantId');

            // Build headers - works with or without authentication
            const headers = {
                'Content-Type': 'application/json'
            };

            // Add auth headers if available
            if (token && tenantId) {
                headers['Authorization'] = `Bearer ${token}`;
                headers['x-tenant-id'] = tenantId;
                setIsAuthenticated(true);
                console.log('✅ Fetching personalized suggestions (authenticated)');
            } else {
                setIsAuthenticated(false);
                console.log('👤 Fetching general suggestions (guest mode)');
            }

            // Call the public endpoint
            const response = await axios.get('http://localhost:5000/api/chatbot/suggestions', {
                headers,
                // ✅ MODIFICATION: Increased timeout from 30000ms to 65000ms
                timeout: 65000
            });

            if (response.data?.suggestions) {
                setSuggestions(response.data.suggestions);
                console.log(`✅ Loaded ${response.data.suggestions.length} suggestions`);
            } else {
                throw new Error('Received an unexpected data format from the server.');
            }
        } catch (err) {
            console.error("❌ Error fetching AI suggestions:", err);
            
            // Set fallback suggestions instead of just showing error
            setSuggestions([
                {
                    type: 'info',
                    title: 'Start Tracking Your Finances',
                    description: 'Add your income and expenses to get personalized AI-powered insights.',
                    category: 'Getting Started'
                },
                {
                    type: 'success',
                    title: 'Set Financial Goals',
                    description: 'Define clear short-term and long-term financial objectives to stay motivated.',
                    category: 'Planning'
                },
                {
                    type: 'info',
                    title: 'Build an Emergency Fund',
                    description: 'Save 3-6 months of expenses for financial security and peace of mind.',
                    category: 'Savings'
                },
                {
                    type: 'warning',
                    title: 'Review Your Spending',
                    description: 'Regularly monitor your expenses to identify areas where you can save money.',
                    category: 'Budgeting'
                }
            ]);
            
            const errorMessage = err.response?.data?.message || 'Using default suggestions. Log in for personalized advice.';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        // Small delay for better UX
        const timer = setTimeout(fetchSuggestions, 500);
        return () => clearTimeout(timer);
    }, []);

    const getIconForType = (type) => {
        switch (type) {
            case 'warning': return '⚠️';
            case 'success': return '✅';
            default: return 'ℹ️';
        }
    };

    const handleSelectSuggestion = (suggestion) => setSelectedSuggestion(suggestion);
    const handleGoBack = () => setSelectedSuggestion(null);

    const renderContent = () => {
        if (isLoading) {
            return (
                <StatusContainer>
                    <LoadingText>🧠 Analyzing your financial data...</LoadingText>
                </StatusContainer>
            );
        }

        if (error && suggestions.length === 0) {
            return (
                <StatusContainer>
                    <ErrorText>{error}</ErrorText>
                    <RetryButton onClick={fetchSuggestions}>
                        🔄 Retry
                    </RetryButton>
                </StatusContainer>
            );
        }

        if (selectedSuggestion) {
            return (
                <DetailView>
                    <CardHeader>
                        <Icon type={selectedSuggestion.type}>{getIconForType(selectedSuggestion.type)}</Icon>
                        <SuggestionTitle>{selectedSuggestion.title}</SuggestionTitle>
                    </CardHeader>
                    <SuggestionDescription>{selectedSuggestion.description}</SuggestionDescription>
                    {selectedSuggestion.category && (
                        <Category>{selectedSuggestion.category}</Category>
                    )}
                    <div>
                        <BackButton onClick={handleGoBack}>← Back to Suggestions</BackButton>
                    </div>
                </DetailView>
            );
        }

        if (suggestions.length === 0) {
            return (
                <StatusContainer>
                    <p>Keep adding transactions to unlock personalized AI insights.</p>
                    <RetryButton onClick={fetchSuggestions}>
                        🔄 Refresh
                    </RetryButton>
                </StatusContainer>
            );
        }

        return (
            <>
                <SuggestionGrid>
                    {suggestions.map((suggestion, index) => (
                        <PromptCard 
                            key={index} 
                            onClick={() => handleSelectSuggestion(suggestion)}
                            style={{ animationDelay: `${index * 100}ms` }}
                        >
                            {suggestion.title}
                        </PromptCard>
                    ))}
                </SuggestionGrid>
            </>
        );
    };

    return (
        <Container>
            {renderContent()}
        </Container>
    );
};

export default AISuggestions;