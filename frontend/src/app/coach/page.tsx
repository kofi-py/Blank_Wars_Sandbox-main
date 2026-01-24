'use client';

import React, { useEffect, useState } from 'react';
import { useAuth, UserProfile, getCoachDisplayName } from '@/contexts/AuthContext';
// Removed unused framer-motion import - SafeMotion used instead
import SafeMotion from '@/components/SafeMotion';
import { useMobileSafeMotion } from '@/hooks/useMobileSafeMotion';
import { BarChart, LineChart, PieChart } from '@mui/x-charts'; // Placeholder for actual chart library
import Link from 'next/link';
import CoachProgressionDashboard from '@/components/CoachProgressionDashboard';
import { Contestant } from '@blankwars/types';

const CoachProgressionPage: React.FC = () => {
  const { user, is_loading } = useAuth();
  const { isMobile } = useMobileSafeMotion();

  // Admin panel state (DELETE BEFORE BETA)
  const [adminPassword, setAdminPassword] = useState('');
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [adminMessage, setAdminMessage] = useState('');
  const [userCharacters, setUserCharacters] = useState<Contestant[]>([]);
  const [selected_characterId, setSelectedCharacterId] = useState('');

  // Admin email whitelist (DELETE BEFORE BETA)
  const ADMIN_EMAILS = [
    'greensteing2@southernct.edu',
    'bb85001@gmail.com',
    'steven.greenstein003@gmail.com',
    'greensteins1@southernct.edu',
    'green003@icloud.com',
    'mikejohanning@gmail.com',
    'joedon.tyler@gmail.com',
    'trbertolino0@gmail.com',
    'gabegreenstein@gmail.com'
  ];
  const isUserAdmin = user?.email ? ADMIN_EMAILS.includes(user.email.toLowerCase()) : false;

  // Fetch user's characters when admin panel unlocks (DELETE BEFORE BETA)
  useEffect(() => {
    if (isAdminUnlocked && userCharacters.length === 0) {
      fetch('/api/characters', {
        credentials: 'include'
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.characters) {
            setUserCharacters(data.characters);
            if (data.characters.length > 0) {
              setSelectedCharacterId(data.characters[0].id);
            }
          }
        })
        .catch(err => console.error('Failed to fetch characters:', err));
    }
  }, [isAdminUnlocked]);

  // Admin panel handlers (DELETE BEFORE BETA)
  const handleAdminUnlock = () => {
    const correctPassword = 'blankwars_admin_2025';
    if (adminPassword === correctPassword) {
      setIsAdminUnlocked(true);
      setAdminMessage('Admin panel unlocked!');
      setTimeout(() => setAdminMessage(''), 3000);
    } else {
      setAdminMessage('Invalid password');
      setTimeout(() => setAdminMessage(''), 3000);
    }
    setAdminPassword('');
  };

  const handleAdminLevelUpCoach = async () => {
    try {
      const response = await fetch('/api/level-up/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ admin_secret: 'blankwars_admin_2025' })
      });
      const data = await response.json();
      if (data.success) {
        setAdminMessage(`✅ ${data.message}`);
        setTimeout(() => {
          setAdminMessage('');
          window.location.reload(); // Refresh to show new level
        }, 2000);
      } else {
        setAdminMessage(`❌ Error: ${data.error}`);
        setTimeout(() => setAdminMessage(''), 5000);
      }
    } catch (error) {
      setAdminMessage(`❌ Failed to level up coach`);
      setTimeout(() => setAdminMessage(''), 5000);
    }
    setIsAdminUnlocked(false);
  };

  const handleAdminLevelUpCharacter = async () => {
    if (!selected_characterId) {
      setAdminMessage('❌ Please select a character');
      setTimeout(() => setAdminMessage(''), 3000);
      return;
    }

    try {
      const response = await fetch('/api/level-up/character', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          admin_secret: 'blankwars_admin_2025',
          character_id: selected_characterId
        })
      });
      const data = await response.json();
      if (data.success) {
        setAdminMessage(`✅ ${data.message}`);
        setTimeout(() => setAdminMessage(''), 5000);
      } else {
        setAdminMessage(`❌ Error: ${data.error}`);
        setTimeout(() => setAdminMessage(''), 5000);
      }
    } catch (error) {
      setAdminMessage(`❌ Failed to level up character`);
      setTimeout(() => setAdminMessage(''), 5000);
    }
    setIsAdminUnlocked(false);
  };

  if (is_loading) {
    return <div className="text-white text-center py-8">Loading coach data...</div>;
  }

  if (!user) {
    return <div className="text-red-400 text-center py-8">Please log in to view your coach profile.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      {/* Navigation Header */}
      <div className="flex justify-between items-center mb-8">
        <Link
          href="/"
          className="flex items-center text-blue-400 hover:text-blue-300 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to Game
        </Link>
      </div>

      <h1 className="text-4xl font-extrabold text-center mb-10 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
        Front Office
      </h1>

      {/* Coach Progression Dashboard */}
      <SafeMotion
        as="div"
        initial={{ opacity: 0, y: isMobile ? 0 : 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: isMobile ? 0.15 : 0.3, type: isMobile ? 'tween' : 'spring' }}
      >
        <CoachProgressionDashboard />
      </SafeMotion>

      {/* Admin Panel - DELETE BEFORE BETA - Only visible to admin emails */}
      {isUserAdmin && (
        <SafeMotion
          as="div"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.5 }}
          class_name="mt-12 bg-gray-800/50 rounded-lg p-6 shadow-md border border-gray-700"
        >
          <h3 className="text-lg font-semibold text-gray-400 mb-4">🔧 Developer Tools (Admin Only)</h3>

          {!isAdminUnlocked ? (
            <div className="space-y-3">
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAdminUnlock()}
                placeholder="Enter admin password"
                className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={handleAdminUnlock}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Unlock Admin Panel
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-green-400 mb-4">✅ Admin panel unlocked - buttons will lock after use</p>
              <button
                onClick={handleAdminLevelUpCoach}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-3 rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg"
              >
                ⚡ Level Up Coach
              </button>

              <div className="space-y-2">
                <label className="text-sm text-gray-300">Select Character:</label>
                <select
                  value={selected_characterId}
                  onChange={(e) => setSelectedCharacterId(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  {userCharacters.length === 0 ? (
                    <option>Loading characters...</option>
                  ) : (
                    userCharacters.map(char => (
                      <option key={char.id} value={char.id}>
                        {char.name} (Lv.{char.level || 1})
                      </option>
                    ))
                  )}
                </select>
                <button
                  onClick={handleAdminLevelUpCharacter}
                  disabled={userCharacters.length === 0}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-4 py-3 rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  🎯 Level Up Selected Character
                </button>
              </div>
            </div>
          )}

          {adminMessage && (
            <div className={`mt-4 p-3 rounded-lg font-medium ${
              adminMessage.includes('✅') ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'
            }`}>
              {adminMessage}
            </div>
          )}
        </SafeMotion>
      )}
      {/* END ADMIN PANEL */}
    </div>
  );
};

export default CoachProgressionPage;
