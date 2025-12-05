// src/services/api/goldAPI.js
export const fetchGoldPrice = async () => {
  try {
    // Mock data - replace with actual Gold API
    return {
      currentPrice: 5850,
      history: generateMockHistory()
    };
  } catch (error) {
    console.error('Error fetching gold price:', error);
    return { currentPrice: 0, history: [] };
  }
};

const generateMockHistory = () => {
  const history = [];
  let price = 5800;
  
  for (let i = 30; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    price += (Math.random() - 0.5) * 100;
    history.push({
      date: date.toISOString().split('T')[0],
      price: Math.round(price)
    });
  }
  
  return history;
};