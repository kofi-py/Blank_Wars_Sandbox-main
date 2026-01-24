'use client';

import { useState } from 'react';
import { Package, Sparkles, type LucideIcon } from 'lucide-react';
import PackOpening from './PackOpening';
import EchoManagement from './EchoManagement';
import type { ComponentType } from 'react';

interface SubTab {
  id: string;
  label: string;
  icon: LucideIcon;
  component: ComponentType;
  description: string;
}

const sub_tabs: SubTab[] = [
  { 
    id: 'pack_opening', 
    label: 'Card Packs', 
    icon: Package, 
    component: PackOpening, 
    description: 'Open card packs to collect new characters and items.' 
  },
  { 
    id: 'echo_management', 
    label: 'Echo Management', 
    icon: Sparkles, 
    component: EchoManagement, 
    description: 'Upgrade your characters using echoes from duplicate pulls.' 
  }
];

export default function CardPacksWrapper() {
  const [activeSubTab, setActiveSubTab] = useState('pack_opening');

  const currentSubTab = sub_tabs.find(tab => tab.id === activeSubTab);
  const ActiveComponent = currentSubTab?.component;

  return (
    <div className="max-w-7xl mx-auto p-4">
      {/* Sub-tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-black/20 rounded-lg p-1">
        {sub_tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`flex-1 flex items-center justify-center px-4 py-3 rounded-md font-medium text-sm transition-all ${
              activeSubTab === tab.id
                ? 'bg-orange-600 text-white shadow-md'
                : 'text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <tab.icon className="w-4 h-4 mr-2" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Description */}
      {currentSubTab && (
        <div className="mb-6 text-center">
          <p className="text-gray-300">{currentSubTab.description}</p>
        </div>
      )}

      {/* Active Component */}
      <div className="min-h-[600px]">
        {ActiveComponent && <ActiveComponent />}
      </div>
    </div>
  );
}