'use client';

import { useAuth } from '../contexts/AuthContext';
import { LogOut } from 'lucide-react';

export default function LogoutButton() {
  const { logout, is_authenticated } = useAuth();

  if (!is_authenticated) {
    return null;
  }

  const handleLogout = () => {
    console.log('🚪 Logout button clicked - calling logout');
    logout();
  };

  return (
    <button
      onClick={handleLogout}
      className="flex items-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 hover:text-red-700 transition-colors duration-200"
      title="Sign out of your account"
    >
      <LogOut className="w-4 h-4 mr-2" />
      Sign Out
    </button>
  );
}