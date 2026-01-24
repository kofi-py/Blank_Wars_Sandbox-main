'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import SafeMotion from './SafeMotion';
import {
  Package, Users, Sword, Shield, Home,
  TrendingUp, Trophy, Star, ChevronRight,
  Sparkles, Target, Brain, HeartHandshake,
  Dumbbell, MessageCircle, Building, Crown, Mail, ShoppingBag, Flame
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import GameplanAdherenceWidget from '@/components/GameplanAdherenceWidget';
import { characterAPI } from '@/services/apiClient';

interface NavigationPanel {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  bg_color: string;
  route: string;
}

export default function Homepage() {
  // Debug logging
  console.log('🏠 Homepage component rendering...');
  
  const { user } = useAuth();
  const router = useRouter();
  const [userStats, setUserStats] = useState({
    unopened_packs: 0,
    total_characters: 0,
    victories: 0,
    current_rank: 'Rookie Coach'
  });

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        try {
          const characters = await characterAPI.get_user_characters();
          // Ensure characters is always an array
          const charactersArray = Array.isArray(characters) ? characters : [];
          setUserStats({
            unopened_packs: 0, // TODO: Implement pack API
            total_characters: charactersArray.length,
            victories: charactersArray.reduce((total: number, char) => total + char.total_wins, 0),
            current_rank: charactersArray.length >= 10 ? 'Rising Star' : 'Rookie Coach'
          });
        } catch (error) {
          console.error('Failed to fetch user data:', error);
          // Fallback to default values
          setUserStats({
            unopened_packs: 0,
            total_characters: 0,
            victories: 0,
            current_rank: 'Rookie Coach'
          });
        }
      }
    };

    fetchUserData();
  }, [user]);

  const navigationPanels: NavigationPanel[] = [
    {
      id: 'characters',
      title: 'Character Collection',
      description: 'View and manage your roster of legendary characters',
      icon: Users,
      color: 'text-blue-400',
      bg_color: 'bg-blue-900/20',
      route: '/characters'
    },
    {
      id: 'packs',
      title: 'Open Card Packs',
      description: 'Reveal new characters and expand your collection',
      icon: Package,
      color: 'text-yellow-400',
      bg_color: 'bg-yellow-900/20',
      route: '/packs'
    },
    {
      id: 'mailbox',
      title: 'Mailbox',
      description: 'Check messages, notifications, and rewards',
      icon: Mail,
      color: 'text-cyan-400',
      bg_color: 'bg-cyan-900/20',
      route: '/mailbox'
    },
    {
      id: 'shop',
      title: 'Shop',
      description: 'Buy equipment, packs, and premium items',
      icon: ShoppingBag,
      color: 'text-amber-400',
      bg_color: 'bg-amber-900/20',
      route: '/shop'
    },
    {
      id: 'training',
      title: 'Training Grounds',
      description: 'Hone your team\'s skills and prepare for battle',
      icon: Dumbbell,
      color: 'text-green-400',
      bg_color: 'bg-green-900/20',
      route: '/training'
    },
    {
      id: 'battle',
      title: 'Battle Arena',
      description: 'Enter the arena and prove your coaching prowess',
      icon: Sword,
      color: 'text-red-400',
      bg_color: 'bg-red-900/20',
      route: '/battle'
    },
    {
      id: 'headquarters',
      title: 'Team Headquarters',
      description: 'Manage your living quarters and team dynamics',
      icon: Home,
      color: 'text-purple-400',
      bg_color: 'bg-purple-900/20',
      route: '/headquarters'
    },
    {
      id: 'coaching',
      title: 'Coaching Sessions',
      description: 'One-on-one sessions to guide your characters',
      icon: MessageCircle,
      color: 'text-pink-400',
      bg_color: 'bg-pink-900/20',
      route: '/coaching'
    },
    {
      id: 'facilities',
      title: 'Facilities Manager',
      description: 'Upgrade your training facilities and equipment',
      icon: Building,
      color: 'text-indigo-400',
      bg_color: 'bg-indigo-900/20',
      route: '/facilities'
    },
    {
      id: 'leaderboard',
      title: 'Rankings & Stats',
      description: 'Track your progress and compete with other coaches',
      icon: Trophy,
      color: 'text-orange-400',
      bg_color: 'bg-orange-900/20',
      route: '/leaderboard'
    },
    {
      id: 'team',
      title: 'Team Management',
      description: 'Select and manage your active 3-person battle roster',
      icon: Users,
      color: 'text-teal-400',
      bg_color: 'bg-teal-900/20',
      route: '/team'
    },
    {
      id: 'challenges',
      title: 'Reality Show Challenges',
      description: 'Compete in Survivor-style challenges for rewards and glory',
      icon: Flame,
      color: 'text-rose-400',
      bg_color: 'bg-rose-900/20',
      route: '/challenges'
    },
    {
      id: 'social',
      title: 'Social Hub',
      description: 'Visit the Clubhouse and connect with the community',
      icon: MessageCircle,
      color: 'text-sky-400',
      bg_color: 'bg-sky-900/20',
      route: '/social'
    }
  ];

  const handlePanelClick = (route: string) => {
    // Map routes to MainTabSystem tabs and subtabs based on actual tab structure
    const routeToTabAndSubtab: Record<string, { tab: string; subtab?: string }> = {
      '/characters': { tab: 'characters', subtab: 'progression' }, // Character progression
      '/packs': { tab: 'battle', subtab: 'packs' }, // Packs are under battle tab
      '/mailbox': { tab: 'coach', subtab: 'mailbox' }, // Mailbox in coach tab
      '/shop': { tab: 'store', subtab: 'coach_store' }, // Shop in store tab
      '/training': { tab: 'training', subtab: 'activities' }, // Training activities
      '/battle': { tab: 'battle', subtab: 'team-arena' }, // Team battle arena
      '/headquarters': { tab: 'headquarters', subtab: 'overview' }, // Team base
      '/coaching': { tab: 'coach', subtab: 'individual-sessions' }, // Individual coaching sessions
      '/facilities': { tab: 'headquarters', subtab: 'overview' }, // Team Base (includes facilities)
      '/leaderboard': { tab: 'social', subtab: 'clubhouse' }, // Community/clubhouse
      '/team': { tab: 'team', subtab: 'roster' }, // Team roster management
      '/challenges': { tab: 'challenges', subtab: 'reality-shows' }, // Reality show challenges
      '/social': { tab: 'social', subtab: 'clubhouse' } // Social hub/clubhouse
    };
    
    const config = routeToTabAndSubtab[route] || { tab: 'characters', subtab: 'progression' };
    console.log(`Navigating to tab: ${config.tab}, subtab: ${config.subtab} from route: ${route}`);
    
    const url = config.subtab 
      ? `/game?tab=${config.tab}&subtab=${config.subtab}`
      : `/game?tab=${config.tab}`;
    
    router.push(url);
  };

  console.log('🏠 Homepage about to render JSX...');
  
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      
      {/* Hero image section */}
      <div className="relative h-[40vh] md:h-[85vh] mobile-hero-fix w-full overflow-hidden">
        <SafeMotion
          initial={{ scale: 1.05 }}
          animate={{ scale: 1 }}
          transition={{ duration: 2, ease: "easeOut" }}
          class_name="absolute inset-0 flex items-center justify-center"
        >
          <Image 
            src="/images/Homepage/spartan_group_welcome.png"
            alt="Blank Wars Homepage"
            fill
            className="object-contain bg-gray-900"
            priority
            sizes="100vw"
          />
        </SafeMotion>

      </div>

      {/* Spacer */}
      <div className="h-8"></div>

      {/* Coming Soon / Alpha Banner */}
      <div className="max-w-7xl mx-auto px-4 mb-6 space-y-4">
        {/* Coming Soon Banner */}
        <div className="bg-gradient-to-r from-green-900/40 to-blue-900/40 border-l-4 border-green-500 p-4 rounded shadow-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <Sparkles className="h-6 w-6 text-green-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-bold text-green-400">Coming Soon!</h3>
              <div className="mt-2 text-sm text-green-100">
                <p>Blank Wars is currently in development.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Alpha Build Notice */}
        <div className="bg-yellow-900/30 border-l-4 border-yellow-500 p-4 rounded">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-400">Alpha Build Notice</h3>
              <div className="mt-2 text-sm text-yellow-200">
                <p>This is an Alpha build. Expect bugs and incomplete features. All accounts are temporary and will be reset.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User Stats Section */}
      <SafeMotion
        as="section"
        initial={{ opacity: 0, y: 50 }}
        while_in_view={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.8 }}
        class_name="max-w-7xl mx-auto px-4 py-16"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-16">
          <SafeMotion
            while_hover={{ scale: 1.05 }}
            class_name="bg-gradient-to-br from-yellow-900/30 to-yellow-900/10 rounded-xl p-6 border border-yellow-700/30"
          >
            <Package className="w-12 h-12 text-yellow-400 mb-4" />
            <h3 className="text-3xl font-bold text-yellow-400">{userStats.unopened_packs}</h3>
            <p className="text-gray-400">Unopened Packs</p>
            {userStats.unopened_packs > 0 && (
              <p className="text-sm text-yellow-300 mt-2 animate-pulse">
                Ready to open!
              </p>
            )}
          </SafeMotion>

          <SafeMotion
            while_hover={{ scale: 1.05 }}
            class_name="bg-gradient-to-br from-blue-900/30 to-blue-900/10 rounded-xl p-6 border border-blue-700/30"
          >
            <Users className="w-12 h-12 text-blue-400 mb-4" />
            <h3 className="text-3xl font-bold text-blue-400">{userStats.total_characters}</h3>
            <p className="text-gray-400">Total Characters</p>
          </SafeMotion>

          <SafeMotion
            while_hover={{ scale: 1.05 }}
            class_name="bg-gradient-to-br from-green-900/30 to-green-900/10 rounded-xl p-6 border border-green-700/30"
          >
            <Trophy className="w-12 h-12 text-green-400 mb-4" />
            <h3 className="text-3xl font-bold text-green-400">{userStats.victories}</h3>
            <p className="text-gray-400">Victories</p>
          </SafeMotion>

          <SafeMotion
            while_hover={{ scale: 1.05 }}
            class_name="bg-gradient-to-br from-purple-900/30 to-purple-900/10 rounded-xl p-6 border border-purple-700/30"
          >
            <Crown className="w-12 h-12 text-purple-400 mb-4" />
            <h3 className="text-xl font-bold text-purple-400">{userStats.current_rank}</h3>
            <p className="text-gray-400">Current Rank</p>
          </SafeMotion>

          <SafeMotion
            while_hover={{ scale: 1.05 }}
            initial={{ opacity: 0, y: 50 }}
            while_in_view={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <GameplanAdherenceWidget />
          </SafeMotion>
        </div>

        {/* Navigation Panels */}
        <h2 className="text-4xl font-bold mb-8 text-center" style={{ color: 'white', opacity: 1, visibility: 'visible' }}>Where would you like to go?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {navigationPanels.map((panel, index) => (
            <SafeMotion
              key={panel.id}
              initial={{ opacity: 0, y: 50 }}
              while_in_view={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              while_hover={{ scale: 1.05, y: -5 }}
              onClick={() => handlePanelClick(panel.route)}
              class_name={`cursor-pointer rounded-xl p-6 border ${panel.bg_color} ${panel.color} 
                           border-gray-700 hover:border-current transition-all duration-300 
                           shadow-lg hover:shadow-2xl hover:shadow-current/20`}
              style={{
                opacity: 1,
                visibility: 'visible',
                display: 'block',
                backgroundColor: panel.bg_color.includes('blue') ? 'rgba(30, 58, 138, 0.5)' :
                                panel.bg_color.includes('yellow') ? 'rgba(133, 77, 14, 0.5)' :
                                panel.bg_color.includes('cyan') ? 'rgba(22, 78, 99, 0.5)' :
                                panel.bg_color.includes('amber') ? 'rgba(146, 64, 14, 0.5)' :
                                panel.bg_color.includes('green') ? 'rgba(20, 83, 45, 0.5)' :
                                panel.bg_color.includes('red') ? 'rgba(127, 29, 29, 0.5)' :
                                panel.bg_color.includes('purple') ? 'rgba(88, 28, 135, 0.5)' :
                                panel.bg_color.includes('pink') ? 'rgba(131, 24, 67, 0.5)' :
                                panel.bg_color.includes('indigo') ? 'rgba(55, 48, 163, 0.5)' :
                                panel.bg_color.includes('teal') ? 'rgba(19, 78, 74, 0.5)' :
                                panel.bg_color.includes('rose') ? 'rgba(136, 19, 55, 0.5)' :
                                panel.bg_color.includes('sky') ? 'rgba(12, 74, 110, 0.5)' :
                                'rgba(154, 52, 18, 0.5)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.3)'
              }}
            >
              <panel.icon className="w-16 h-16 mb-4 text-white" />
              <h3 className="text-2xl font-bold mb-2 text-white">{panel.title}</h3>
              <p className="text-sm text-white/80">{panel.description}</p>
              <SafeMotion
                initial={{ x: 0 }}
                while_hover={{ x: 5 }}
                class_name="mt-4 flex items-center text-current"
              >
                <span className="text-sm font-semibold">Enter</span>
                <ChevronRight className="w-4 h-4 ml-1" />
              </SafeMotion>
            </SafeMotion>
          ))}
        </div>
      </SafeMotion>
    </div>
  );
}
