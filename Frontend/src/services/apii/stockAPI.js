// src/services/api/stockAPI.js
const BASE_URL = 'https://api.example.com'; // Replace with actual API

export const fetchStockData = async () => {
  try {
    // Mock data - replace with actual API calls
    return {
      topGainers: [
        { symbol: 'TCS', name: 'Tata Consultancy', price: 3450, change: 2.5, sector: 'IT' },
        { symbol: 'INFY', name: 'Infosys', price: 1850, change: 1.8, sector: 'IT' },
        { symbol: 'RELIANCE', name: 'Reliance Industries', price: 2450, change: 1.2, sector: 'Energy' }
      ],
      nifty: { value: 19500, change: 0.8 }
    };
  } catch (error) {
    console.error('Error fetching stock data:', error);
    return { topGainers: [], nifty: {} };
  }
};