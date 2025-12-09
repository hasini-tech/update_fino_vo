// src/hooks/useSalesData.js
import { useState, useEffect, useCallback } from 'react';
import { salesService } from '../services/salesService';

export const useSalesData = (fromDate, toDate, website = 'shopify') => {
  // Normalize website parameter to lowercase
  const normalizedWebsite = website.toLowerCase().trim();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!fromDate || !toDate) {
      setError('From date and to date are required');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log(`🔄 Fetching sales data: ${fromDate} to ${toDate}`);
      const result = await salesService.getSalesData(fromDate, toDate, normalizedWebsite);
      
      console.log('✅ Sales data received:', result);
      setData(result.data);
    } catch (err) {
      console.error('❌ Error fetching sales data:', err);
      setError(err.message || 'Failed to fetch sales data');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, normalizedWebsite]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return { 
    data, 
    loading, 
    error, 
    refetch,
    // Derived data for convenience
    chartData: data?.chartData || [],
    topProducts: data?.topProducts || [],
    totalRevenue: data?.totalRevenue || 0
  };
};