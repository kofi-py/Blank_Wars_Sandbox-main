'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/services/apiClient';

export interface TicketBalance {
  current_tickets: number;
  daily_allowance: number;
  total_earned: number;
  total_purchased: number;
  total_spent: number;
  last_refresh: string;
  last_reset: string;
}

export interface TicketTransaction {
  id: string;
  user_id: string;
  transaction_type: 'earned' | 'purchased' | 'spent' | 'daily_reset' | 'hourly_refresh';
  amount: number;
  source: string;
  description?: string;
  metadata?: any;
  created_at: string;
}

export function useTickets() {
  const [balance, setBalance] = useState<TicketBalance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch current ticket balance
  const fetchBalance = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get('/tickets/balance');
      
      if (response.data.success) {
        setBalance(response.data.data);
      } else {
        setError(response.data.error || 'Failed to fetch balance');
      }
    } catch (err: any) {
      console.error('Error fetching ticket balance:', err);
      setError(err.response?.data?.error || 'Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch transaction history
  const fetchHistory = useCallback(async (limit: number = 50) => {
    try {
      const response = await apiClient.get(`/tickets/history?limit=${limit}`);
      
      if (response.data.success) {
        return response.data.data.transactions;
      } else {
        throw new Error(response.data.error || 'Failed to fetch history');
      }
    } catch (err: any) {
      console.error('Error fetching ticket history:', err);
      throw err;
    }
  }, []);

  // Purchase tickets (development mode)
  const purchaseTickets = useCallback(async (packageId: string, amount: number) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.post('/tickets/purchase', {
        package_id: packageId,
        amount
      });
      
      if (response.data.success) {
        // Refresh balance after purchase
        await fetchBalance();
        return true;
      } else {
        setError(response.data.error || 'Purchase failed');
        return false;
      }
    } catch (err: any) {
      console.error('Error purchasing tickets:', err);
      setError(err.response?.data?.error || 'Purchase failed');
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchBalance]);

  // Check if user can use a ticket
  const canUseTicket = useCallback(() => {
    return balance ? balance.current_tickets > 0 : false;
  }, [balance]);

  // Get ticket status information
  const getTicketStatus = useCallback(() => {
    if (!balance) return { status: 'unknown', color: 'text-gray-400' };
    
    const count = balance.current_tickets;
    if (count >= 20) return { status: 'Plenty of tickets', color: 'text-green-400' };
    if (count >= 10) return { status: 'Good amount', color: 'text-yellow-400' };
    if (count >= 5) return { status: 'Running low', color: 'text-orange-400' };
    if (count > 0) return { status: 'Very low', color: 'text-red-400' };
    return { status: 'No tickets', color: 'text-red-500' };
  }, [balance]);

  // Auto-refresh balance periodically
  useEffect(() => {
    fetchBalance();
    
    // Refresh every 5 minutes to catch hourly refreshes
    const interval = setInterval(fetchBalance, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [fetchBalance]);

  // Refresh balance when window becomes visible (user returns to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchBalance();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchBalance]);

  return {
    balance,
    loading,
    error,
    fetchBalance,
    fetchHistory,
    purchaseTickets,
    canUseTicket,
    getTicketStatus,
    // Computed values for convenience
    current_tickets: balance?.current_tickets || 0,
    daily_allowance: balance?.daily_allowance || 18,
    has_tickets: balance ? balance.current_tickets > 0 : false,
    is_low_on_tickets: balance ? balance.current_tickets <= 5 : false
  };
}