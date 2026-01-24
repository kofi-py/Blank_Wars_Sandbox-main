'use client';

import React from 'react';
import EquipmentSystemTester from '@/components/EquipmentSystemTester';

export default function EquipmentTestPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
      <div className="container mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            🛡️ Equipment Database Integration Test
          </h1>
          <p className="text-xl text-blue-200">
            Testing Railway PostgreSQL ↔ Frontend Integration
          </p>
        </div>
        
        <EquipmentSystemTester />
      </div>
    </div>
  );
}