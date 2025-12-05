/*
 * Filename: /src/components/MarketNews.jsx
 * FINAL VERSION with a fallback URL for robust local development.
 */

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import styled, { keyframes } from 'styled-components';

// --- (Styled components remain the same) ---
const fadeIn = keyframes`from { opacity: 0; } to { opacity: 1; }`;
const zoomIn = keyframes`from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; }`;
const spin = keyframes`from { transform: rotate(0deg); } to { transform: rotate(360deg); }`;
const Overlay = styled.div`
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex; justify-content: center; align-items: flex-start;
  padding-top: 5vh; z-index: 1000; animation: ${fadeIn} 0.3s ease-out;
  overflow-y: auto;
`;
const MarketPanel = styled.div`
  background: linear-gradient(145deg, rgba(38, 43, 52, 0.98), rgba(30, 35, 42, 0.98));
  border-radius: 16px; padding: 24px; border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3); width: 90%; max-width: 1200px;
  color: #e0e0e0; position: relative; animation: ${zoomIn} 0.4s ease-out;
  margin-bottom: 5vh;
`;
const MarketGrid = styled.div`
  display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 20px;
  margin-bottom: 30px;
`;
const MarketCard = styled.div`
  background: rgba(0, 0, 0, 0.2); border-radius: 12px; padding: 16px; text-align: center;
  border-left: 4px solid ${props => {
    const change = parseFloat(props.change);
    if (isNaN(change) || change === 0) return '#7f8c8d';
    return change > 0 ? '#27ae60' : '#e74c3c';
  }};
`;
const MarketTitle = styled.h4`
  margin: 0 0 8px 0; font-size: 0.9rem; color: #a0a0e0;
  text-transform: uppercase; letter-spacing: 0.5px;
`;
const MarketValue = styled.p`margin: 0 0 4px 0; font-size: 1.5rem; font-weight: 600; color: #fff;`;
const MarketChange = styled.p`
  margin: 0; font-size: 1rem; font-weight: 500;
  color: ${props => {
    const change = parseFloat(props.change);
    if (isNaN(change) || change === 0) return '#bdc3c7';
    return change > 0 ? '#27ae60' : '#e74c3c';
  }};
`;
const CloseButton = styled.button`
  position: absolute; top: 15px; right: 15px; background: transparent; border: none;
  color: #aaa; font-size: 1.8rem; cursor: pointer; transition: color 0.2s;
  &:hover { color: #fff; }
`;
const LoadingContainer = styled.div`text-align: center; padding: 40px 20px;`;
const LoadingSpinner = styled.div`
  width: 40px; height: 40px; margin: 0 auto;
  border: 4px solid rgba(255, 255, 255, 0.1); border-top: 4px solid #5b247a;
  border-radius: 50%; animation: ${spin} 1s linear infinite;
`;
const ErrorText = styled.div`
  color: #ffdddd; background-color: rgba(255, 70, 70, 0.15); border-radius: 8px;
  border: 1px solid rgba(255, 70, 70, 0.2); padding: 20px; margin: 20px 0; text-align: center;
`;
const SectionTitle = styled.h3`text-align: center; margin: 0 0 20px 0; font-size: 1.5rem; color: #fff;`;
const SuggestionPanel = styled.div`
  background-color: rgba(0, 0, 0, 0.2); border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px; padding: 20px; margin-top: 30px; animation: ${fadeIn} 0.5s ease-in;
`;
const SuggestionTitle = styled.h4`margin: 0 0 10px 0; color: #c0c0ff; font-size: 1.1rem; text-align: center;`;
const SuggestionText = styled.p`font-size: 1rem; line-height: 1.6; color: #d0d0d0; text-align: center;`;

const symbolDisplayNames = { 'GOLD.MCX': 'Gold (INR)', 'SILVER.MCX': 'Silver (INR)' };
const getCurrencySymbol = (symbol) => (symbol.toUpperCase().includes('.MCX')) ? '₹' : '$';

const MarketNews = ({ onClose }) => {
  const [marketData, setMarketData] = useState([]);
  const [loadingMarket, setLoadingMarket] = useState(true);
  const [marketError, setMarketError] = useState(null);
  const [suggestion, setSuggestion] = useState('');
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    fetchMarketData();
    return () => { isMountedRef.current = false; };
  }, []);

  const fetchMarketData = async () => {
    if (!isMountedRef.current) return;
    setLoadingMarket(true);
    setMarketError(null);

    // ✅ Use central API configuration
    const API_URL = process.env.VITE_API_BASE_URL || (process.env.NODE_ENV === 'development' ? 'https://finovo.techvaseeegrah.com' : window.location.origin);
    
    try {
      const token = localStorage.getItem('token');
      const tenantId = localStorage.getItem('tenantId');
      if (!token || !tenantId) {
        throw new Error("Authentication failed. Your session may have expired. Please log out and log in again.");
      }
      
      const config = {
        headers: { 'Authorization': `Bearer ${token}`, 'Tenant-ID': tenantId },
        timeout: 15000,
      };

      const response = await axios.get(`${API_URL}/api/market-data`, config);

      if (isMountedRef.current && response.data) {
        const validData = response.data.filter(d => d.price !== 'N/A' && parseFloat(d.price) > 0);
        setMarketData(validData);
        if (validData.length > 0) fetchSuggestion(validData);
      }
    } catch (error) {
      if (isMountedRef.current) {
        const errorDetails = error.response?.data?.message || error.message;
        setMarketError(errorDetails);
      }
    } finally {
      if (isMountedRef.current) setLoadingMarket(false);
    }
  };

  const fetchSuggestion = async (data) => {
    if (!isMountedRef.current) return;
    setLoadingSuggestion(true);
    
    // ✅ Use central API configuration
    const API_URL = process.env.VITE_API_BASE_URL || (process.env.NODE_ENV === 'development' ? 'https://finovo.techvaseeegrah.com' : window.location.origin);
    
    try {
      const token = localStorage.getItem('token');
      const tenantId = localStorage.getItem('tenantId');
      const config = { headers: { 'Authorization': `Bearer ${token}`, 'Tenant-ID': tenantId } };
      
      const response = await axios.post(`${API_URL}/api/market-data/suggestions`, { marketData: data }, config);
      
      if (isMountedRef.current) setSuggestion(response.data.suggestion);
    } catch (error) {
      console.error("Failed to fetch AI suggestion:", error);
    } finally {
      if (isMountedRef.current) setLoadingSuggestion(false);
    }
  };

  const renderContent = () => {
    if (loadingMarket) return <LoadingContainer><LoadingSpinner /></LoadingContainer>;
    if (marketError) return <ErrorText>{marketError}</ErrorText>;
    if (marketData.length > 0) {
      return (
        <>
          <MarketGrid>
            {marketData.map(data => (
              <MarketCard key={data.symbol} change={data.changePercent}>
                <MarketTitle>{symbolDisplayNames[data.symbol] || data.symbol}</MarketTitle>
                <MarketValue>{`${getCurrencySymbol(data.symbol)}${data.price}`}</MarketValue>
                <MarketChange change={data.changePercent}>{data.changePercent}%</MarketChange>
              </MarketCard>
            ))}
          </MarketGrid>
          {loadingSuggestion && <LoadingContainer><LoadingSpinner /></LoadingContainer>}
          {suggestion && !loadingSuggestion && (
            <SuggestionPanel>
              <SuggestionTitle>🤖 AI Market Summary</SuggestionTitle>
              <SuggestionText>{suggestion}</SuggestionText>
            </SuggestionPanel>
          )}
        </>
      );
    }
    return <ErrorText>No market data is currently available.</ErrorText>;
  };

  return (
    <Overlay onClick={onClose}>
      <MarketPanel onClick={(e) => e.stopPropagation()}>
        <CloseButton onClick={onClose}>&times;</CloseButton>
        <SectionTitle>📈 Market Updates</SectionTitle>
        {renderContent()}
      </MarketPanel>
    </Overlay>
  );
};

export default MarketNews;