'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SafeMotion } from './SafeMotion';
import { useMobileSafeMotion } from '@/hooks/useMobileSafeMotion';
import { 
  Users, Heart, Swords, Shield, Crown, 
  TrendingUp, TrendingDown, AlertTriangle,
  Eye, EyeOff, Zap, Ban, Handshake, Star
} from 'lucide-react';

import { BattleCharacter, RelationshipModifier } from '@/data/battleFlow';
import { Contestant as Character } from '@blankwars/types';

interface RelationshipDisplayProps {
  characters: BattleCharacter[];
  team_chemistry: number;
  show_detailed?: boolean;
  onCharacterSelect?: (character: BattleCharacter) => void;
}

interface RelationshipNode {
  character: BattleCharacter;
  relationships: {
    target: BattleCharacter;
    relationship: RelationshipModifier;
    battle_impact: 'positive' | 'negative' | 'neutral';
  }[];
}

function getRelationshipIcon(relationship: string) {
  switch (relationship) {
    case 'ally': return <Handshake className="w-4 h-4 text-green-400" />;
    case 'rival': return <Swords className="w-4 h-4 text-yellow-400" />;
    case 'enemy': return <Ban className="w-4 h-4 text-red-400" />;
    case 'mentor': return <Crown className="w-4 h-4 text-purple-400" />;
    case 'student': return <Star className="w-4 h-4 text-blue-400" />;
    default: return <Users className="w-4 h-4 text-gray-400" />;
  }
}

function getRelationshipColor(relationship: string, strength: number) {
  const intensity = Math.abs(strength) / 100;
  
  switch (relationship) {
    case 'ally':
      return strength > 0 
        ? `rgba(34, 197, 94, ${0.2 + intensity * 0.3})` 
        : `rgba(239, 68, 68, ${0.2 + intensity * 0.3})`;
    case 'rival':
      return `rgba(234, 179, 8, ${0.2 + intensity * 0.3})`;
    case 'enemy':
      return `rgba(239, 68, 68, ${0.3 + intensity * 0.4})`;
    case 'mentor':
      return `rgba(147, 51, 234, ${0.2 + intensity * 0.3})`;
    case 'student':
      return `rgba(59, 130, 246, ${0.2 + intensity * 0.3})`;
    default:
      return 'rgba(107, 114, 128, 0.2)';
  }
}

function RelationshipStrengthIndicator({ strength }: { strength: number }) {
  const absStrength = Math.abs(strength);
  const isPositive = strength > 0;
  
  return (
    <div className="flex items-center gap-1">
      {isPositive ? (
        <TrendingUp className={`w-3 h-3 ${
          absStrength >= 80 ? 'text-green-500' :
          absStrength >= 50 ? 'text-green-400' :
          'text-green-300'
        }`} />
      ) : (
        <TrendingDown className={`w-3 h-3 ${
          absStrength >= 80 ? 'text-red-500' :
          absStrength >= 50 ? 'text-red-400' :
          'text-red-300'
        }`} />
      )}
      <span className={`text-xs font-bold ${
        isPositive ? 'text-green-400' : 'text-red-400'
      }`}>
        {strength > 0 ? '+' : ''}{strength}
      </span>
    </div>
  );
}

function RelationshipCard({ 
  source, 
  target, 
  relationship, 
  onSelect 
}: { 
  source: BattleCharacter;
  target: BattleCharacter;
  relationship: RelationshipModifier;
  onSelect?: () => void;
}) {
  const { isMobile } = useMobileSafeMotion();
  const [showDetails, setShowDetails] = useState(false);
  
  return (
    <SafeMotion
      class_name="bg-gray-800/30 rounded-lg p-3 border border-gray-600 hover:border-gray-500 transition-all cursor-pointer"
      while_hover={isMobile ? {} : { scale: 1.02 }}
      on_click={() => {
        setShowDetails(!showDetails);
        onSelect?.();
      }}
      style={{
        background: getRelationshipColor(relationship.relationship, relationship.strength)
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="text-lg">{source.character.avatar}</div>
          <div className="flex items-center gap-1">
            {getRelationshipIcon(relationship.relationship)}
            <span className="text-xs text-gray-300 capitalize">
              {relationship.relationship}
            </span>
          </div>
          <div className="text-lg">{target.character.avatar}</div>
        </div>
        
        <RelationshipStrengthIndicator strength={relationship.strength} />
      </div>

      <div className="text-xs text-gray-400 mb-1">
        {source.character.name} → {target.character.name}
      </div>

      {showDetails && (
        <SafeMotion
          class_name="mt-3 pt-2 border-t border-gray-600"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: isMobile ? 0.1 : 0.3 }}
        >
          <div className="space-y-1 text-xs">
            <div className="text-gray-400">Battle Modifiers:</div>
            {Object.entries(relationship.battle_modifiers).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-gray-500 capitalize">{key.replace('_', ' ')}:</span>
                <span className={`font-bold ${
                  value > 0 ? 'text-green-400' : value < 0 ? 'text-red-400' : 'text-gray-400'
                }`}>
                  {value > 0 ? '+' : ''}{value}%
                </span>
              </div>
            ))}
          </div>
        </SafeMotion>
      )}
    </SafeMotion>
  );
}

function TeamChemistryAnalysis({ 
  characters, 
  team_chemistry 
}: { 
  characters: BattleCharacter[];
  team_chemistry: number;
}) {
  const { isMobile } = useMobileSafeMotion();
  // Analyze team dynamics
  const safeCharacters = (characters && Array.isArray(characters)) ? characters : [];
  const relationships = safeCharacters.flatMap(char => 
    (char.relationship_modifiers && Array.isArray(char.relationship_modifiers)) ? char.relationship_modifiers.map(rel => ({
      source: char,
      target: safeCharacters.find(c => 
        c.character.name.toLowerCase().replace(/\s+/g, '_') === rel.with_character ||
        c.character.id === rel.with_character
      ),
      relationship: rel
    })).filter(r => r.target) : []
  );

  const strongAlliances = relationships.filter(r => 
    r.relationship.relationship === 'ally' && r.relationship.strength > 60
  );

  const active_conflicts = relationships.filter(r => 
    (r.relationship.relationship === 'enemy' || r.relationship.relationship === 'rival') && 
    Math.abs(r.relationship.strength) > 40
  );

  const mentoringRelationships = relationships.filter(r => 
    r.relationship.relationship === 'mentor' || r.relationship.relationship === 'student'
  );

  const getChemistryColor = (chemistry: number) => {
    if (chemistry >= 80) return 'text-green-400';
    if (chemistry >= 60) return 'text-yellow-400';
    if (chemistry >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getChemistryDescription = (chemistry: number) => {
    if (chemistry >= 90) return 'Exceptional team unity and synergy';
    if (chemistry >= 80) return 'Strong team cohesion with good communication';
    if (chemistry >= 70) return 'Good teamwork with minor friction';
    if (chemistry >= 60) return 'Adequate cooperation but some tensions';
    if (chemistry >= 50) return 'Fragile unity with notable conflicts';
    if (chemistry >= 40) return 'Poor teamwork with active hostilities';
    if (chemistry >= 30) return 'Team on the verge of dysfunction';
    return 'Toxic team environment - critical intervention needed';
  };

  return (
    <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-600">
      <div className="flex items-center gap-3 mb-4">
        <Users className="w-6 h-6 text-blue-400" />
        <div>
          <h3 className="text-lg font-bold text-white">Team Chemistry Analysis</h3>
          <p className="text-sm text-gray-400">How well the team works together</p>
        </div>
      </div>

      {/* Overall Chemistry Score */}
      <div className="mb-4 p-3 bg-black/40 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400">Overall Team Chemistry</span>
          <span className={`text-2xl font-bold ${getChemistryColor(team_chemistry)}`}>
            {team_chemistry}%
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-3 mb-2">
          <div 
            className={`h-full rounded-full transition-all ${
              team_chemistry >= 80 ? 'bg-green-500' :
              team_chemistry >= 60 ? 'bg-yellow-500' :
              team_chemistry >= 40 ? 'bg-orange-500' : 'bg-red-500'
            }`}
            style={{ width: `${team_chemistry}%` }}
          />
        </div>
        <p className="text-sm text-gray-300 italic">
          &quot;{getChemistryDescription(team_chemistry)}&quot;
        </p>
      </div>

      {/* Team Dynamics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Strong Alliances */}
        <div className="bg-green-600/10 border border-green-500/30 rounded p-3">
          <div className="flex items-center gap-2 mb-2">
            <Heart className="w-4 h-4 text-green-400" />
            <span className="text-sm font-semibold text-green-400">Strong Bonds</span>
          </div>
          <div className="text-xl font-bold text-green-400 mb-1">{strongAlliances.length}</div>
          <div className="text-xs text-gray-400">
            {strongAlliances.length === 0 ? 'No strong alliances' :
             strongAlliances.length === 1 ? '1 strong alliance' :
             `${strongAlliances.length} strong alliances`}
          </div>
        </div>

        {/* Active Conflicts */}
        <div className="bg-red-600/10 border border-red-500/30 rounded p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-sm font-semibold text-red-400">Conflicts</span>
          </div>
          <div className="text-xl font-bold text-red-400 mb-1">{active_conflicts.length}</div>
          <div className="text-xs text-gray-400">
            {active_conflicts.length === 0 ? 'No major conflicts' :
             active_conflicts.length === 1 ? '1 active conflict' :
             `${active_conflicts.length} active conflicts`}
          </div>
        </div>

        {/* Mentoring */}
        <div className="bg-purple-600/10 border border-purple-500/30 rounded p-3">
          <div className="flex items-center gap-2 mb-2">
            <Crown className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-semibold text-purple-400">Mentoring</span>
          </div>
          <div className="text-xl font-bold text-purple-400 mb-1">{mentoringRelationships.length}</div>
          <div className="text-xs text-gray-400">
            {mentoringRelationships.length === 0 ? 'No mentoring bonds' :
             mentoringRelationships.length === 1 ? '1 mentoring relationship' :
             `${mentoringRelationships.length} mentoring relationships`}
          </div>
        </div>
      </div>

      {/* Chemistry Warnings */}
      {team_chemistry < 60 && (
        <SafeMotion 
          class_name="mt-4 p-3 bg-yellow-600/20 border border-yellow-500/50 rounded-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: isMobile ? 0.1 : 0.3 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-semibold text-yellow-400">Chemistry Warning</span>
          </div>
          <div className="text-xs text-gray-300">
            {team_chemistry < 40 ? 
              'Critical: Team chemistry is dangerously low. Expect frequent gameplan deviations and rogue actions.' :
              'Warning: Poor team chemistry may lead to coordination issues and reduced effectiveness.'
            }
          </div>
        </SafeMotion>
      )}
    </div>
  );
}

export default function RelationshipDisplay({ 
  characters, 
  team_chemistry, 
  show_detailed = false,
  onCharacterSelect 
}: RelationshipDisplayProps) {
  const { isMobile, get_safe_motion_props } = useMobileSafeMotion();
  const [selectedView, setSelectedView] = useState<'overview' | 'network' | 'matrix'>('overview');
  const [showAllDetails, setShowAllDetails] = useState(false);

  // Build relationship network
  const safeCharactersForNetwork = (characters && Array.isArray(characters)) ? characters : [];
  const relationshipNodes: RelationshipNode[] = safeCharactersForNetwork.map(char => ({
    character: char,
    relationships: char.relationship_modifiers.map(rel => {
        const target = safeCharactersForNetwork.find(c => 
          c.character.name.toLowerCase().replace(/\s+/g, '_') === rel.with_character ||
          c.character.id === rel.with_character
        );
        
        return {
          target: target!,
          relationship: rel,
          battle_impact: rel.strength > 20 ? 'positive' as const : rel.strength < -20 ? 'negative' as const : 'neutral' as const
        };
      }).filter(r => r.target)
    }));

  // Get all unique relationships (avoid duplicates)
  const allRelationships = relationshipNodes.flatMap(node => 
    node.relationships.map(rel => ({
      source: node.character,
      target: rel.target,
      relationship: rel.relationship,
      id: `${node.character.id}-${rel.target.id}`
    }))
  ).filter((rel, index, array) => 
    array.findIndex(r => 
      (r.source.character.id === rel.source.character.id && r.target.character.id === rel.target.character.id) ||
      (r.source.character.id === rel.target.character.id && r.target.character.id === rel.source.character.id)
    ) === index
  );

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6" />
            Team Relationships & Chemistry
          </h2>
          <p className="text-gray-400 text-sm">
            Understanding team dynamics for strategic advantage
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex bg-gray-700 rounded-lg p-1">
            {['overview', 'network', 'matrix'].map((view) => (
              <button
                key={view}
                onClick={() => setSelectedView(view as any)}
                className={`px-3 py-1 rounded text-xs font-medium transition-all capitalize ${
                  selectedView === view
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                {view}
              </button>
            ))}
          </div>

          {/* Detail Toggle */}
          <button
            onClick={() => setShowAllDetails(!showAllDetails)}
            className={`p-2 rounded-lg transition-all ${
              showAllDetails 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
            }`}
            title={showAllDetails ? 'Hide Details' : 'Show Details'}
          >
            {showAllDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Team Chemistry Analysis */}
      <TeamChemistryAnalysis characters={characters} team_chemistry={team_chemistry} />

      {/* Relationship Views */}
      <AnimatePresence mode="wait">
        {selectedView === 'overview' && (
          <SafeMotion
            key="overview"
            initial={{ opacity: 0, y: isMobile ? 0 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: isMobile ? 0 : -20 }}
            transition={{ duration: isMobile ? 0.1 : 0.3 }}
            class_name="space-y-4"
          >
            <h3 className="text-lg font-semibold text-white">Relationship Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {allRelationships.map((rel) => (
                <RelationshipCard
                  key={rel.id}
                  source={rel.source}
                  target={rel.target}
                  relationship={rel.relationship}
                  onSelect={() => onCharacterSelect?.(rel.source)}
                />
              ))}
            </div>
            
            {allRelationships.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No significant relationships detected between team members</p>
                <p className="text-sm">Characters will rely on individual performance</p>
              </div>
            )}
          </SafeMotion>
        )}

        {selectedView === 'network' && (
          <SafeMotion
            key="network"
            initial={{ opacity: 0, y: isMobile ? 0 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: isMobile ? 0 : -20 }}
            transition={{ duration: isMobile ? 0.1 : 0.3 }}
            class_name="bg-gray-800/30 rounded-lg p-6 border border-gray-600"
          >
            <h3 className="text-lg font-semibold text-white mb-4">Relationship Network</h3>
            
            {/* Simple Network Visualization */}
            <div className="relative h-64 bg-black/40 rounded-lg p-4">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="grid grid-cols-3 gap-8">
                  {safeCharactersForNetwork.map((char, index) => (
                    <SafeMotion
                      key={char.character.id}
                      class_name="relative"
                      initial={{ scale: isMobile ? 1 : 0 }}
                      animate={{ scale: 1 }}
                      transition={{ 
                        delay: isMobile ? index * 0.02 : index * 0.1,
                        duration: isMobile ? 0.1 : 0.3,
                        type: isMobile ? 'tween' : 'spring'
                      }}
                    >
                      {/* Character Node */}
                      <div
                        className="w-16 h-16 rounded-full bg-gray-700 border-2 border-gray-500 flex items-center justify-center cursor-pointer hover:border-blue-400 transition-all"
                        onClick={() => onCharacterSelect?.(char)}
                      >
                        <div className="text-2xl">{char.character.avatar}</div>
                      </div>
                      
                      {/* Character Name */}
                      <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-white text-center whitespace-nowrap">
                        {char.character.name}
                      </div>

                      {/* Relationship Lines */}
                      {char.relationship_modifiers.map((rel, relIndex) => {
                        const target = safeCharactersForNetwork.find(c => 
                          c.character.name.toLowerCase().replace(/\s+/g, '_') === rel.with_character
                        );
                        if (!target) return null;

                        return (
                          <SafeMotion
                            key={`${char.character.id}-${rel.with_character}`}
                            class_name="absolute inset-0 pointer-events-none"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.6 }}
                            transition={{ 
                              delay: isMobile ? ((index + relIndex) * 0.02 + 0.1) : ((index + relIndex) * 0.1 + 0.5),
                              duration: isMobile ? 0.1 : 0.3,
                              type: 'tween'
                            }}
                          >
                            {/* This would be a proper SVG line in a real implementation */}
                            <div 
                              className={`absolute w-1 h-8 ${
                                rel.relationship === 'ally' ? 'bg-green-400' :
                                rel.relationship === 'enemy' ? 'bg-red-400' :
                                rel.relationship === 'rival' ? 'bg-yellow-400' :
                                'bg-gray-400'
                              } opacity-50`}
                              style={{
                                transform: `rotate(${relIndex * 45}deg)`,
                                transformOrigin: 'bottom center'
                              }}
                            />
                          </SafeMotion>
                        );
                      })}
                    </SafeMotion>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-400 text-center">
              Click on character nodes to view detailed information
            </div>
          </SafeMotion>
        )}

        {selectedView === 'matrix' && (
          <SafeMotion
            key="matrix"
            initial={{ opacity: 0, y: isMobile ? 0 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: isMobile ? 0 : -20 }}
            transition={{ duration: isMobile ? 0.1 : 0.3 }}
            class_name="bg-gray-800/30 rounded-lg p-6 border border-gray-600"
          >
            <h3 className="text-lg font-semibold text-white mb-4">Relationship Matrix</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="p-2 text-left text-gray-400 text-sm">Character</th>
                    {safeCharactersForNetwork.map((char) => (
                      <th key={char.character.id} className="p-2 text-center text-gray-400 text-sm">
                        <div className="text-lg">{char.character.avatar}</div>
                        <div className="text-xs">{char.character.name.slice(0, 8)}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {safeCharactersForNetwork.map((sourceChar) => (
                    <tr key={sourceChar.character.id}>
                      <td className="p-2 text-white font-medium">
                        <div className="flex items-center gap-2">
                          <div className="text-lg">{sourceChar.character.avatar}</div>
                          <div className="text-sm">{sourceChar.character.name}</div>
                        </div>
                      </td>
                      {safeCharactersForNetwork.map((targetChar) => {
                        if (sourceChar.character.id === targetChar.character.id) {
                          return (
                            <td key={targetChar.character.id} className="p-2 text-center">
                              <div className="w-8 h-8 bg-gray-600 rounded flex items-center justify-center">
                                <span className="text-xs text-gray-400">—</span>
                              </div>
                            </td>
                          );
                        }

                        const relationship = sourceChar.relationship_modifiers.find(rel => 
                          rel.with_character === targetChar.character.name.toLowerCase().replace(/\s+/g, '_')
                        );

                        return (
                          <td key={targetChar.character.id} className="p-2 text-center">
                            <div 
                              className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold border border-gray-600"
                              style={{
                                background: relationship 
                                  ? getRelationshipColor(relationship.relationship, relationship.strength)
                                  : 'rgba(107, 114, 128, 0.2)'
                              }}
                              title={relationship 
                                ? `${relationship.relationship}: ${relationship.strength}`
                                : 'No relationship'
                              }
                            >
                              {relationship ? (
                                <span className={
                                  relationship.strength > 0 ? 'text-green-300' : 'text-red-300'
                                }>
                                  {relationship.strength > 0 ? '+' : ''}{relationship.strength}
                                </span>
                              ) : (
                                <span className="text-gray-500">0</span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center gap-4 text-xs text-gray-400">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-500/30 rounded"></div>
                <span>Positive</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-500/30 rounded"></div>
                <span>Negative</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-gray-500/30 rounded"></div>
                <span>Neutral</span>
              </div>
            </div>
          </SafeMotion>
        )}
      </AnimatePresence>
    </div>
  );
}
