'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Volume2,
  Settings,
  Play,
  Pause,
  RotateCcw,
  Check,
  Mic,
  Music,
  Zap,
  User
} from 'lucide-react';
import { audioService, AudioSettings, VoiceProfile } from '@/services/audioService';

interface AudioSettingsProps {
  is_open: boolean;
  onClose: () => void;
}

export default function AudioSettingsComponent({
  is_open,
  onClose
}: AudioSettingsProps) {
  const [settings, setSettings] = useState<AudioSettings>(audioService.getSettings());
  const [availableVoices, setAvailableVoices] = useState<VoiceProfile[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null);
  const [testText] = useState("Welcome to the arena! This is a test of the battle announcer voice.");
  const [isTestPlaying, setIsTestPlaying] = useState(false);

  const initializeAudio = useCallback(async () => {
    await audioService.waitForInitialization();
    const voices = audioService.getAvailableVoices();
    setAvailableVoices(voices);
    setSelectedVoice(settings.preferred_voice);
  }, [settings.preferred_voice]);

  useEffect(() => {
    if (is_open) {
      initializeAudio();
    }
  }, [is_open, initializeAudio]);

  const updateSetting = <K extends keyof AudioSettings>(
    key: K,
    value: AudioSettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    audioService.updateSettings({ [key]: value });
  };

  const resetToDefaults = () => {
    const defaultSettings: AudioSettings = {
      master_volume: 0.8,
      voice_volume: 0.7,
      sfx_volume: 0.6,
      music_volume: 0.4,
      enable_tts: true,
      preferred_voice: null,
      speech_rate: 1.0,
      speech_pitch: 1.0
    };
    setSettings(defaultSettings);
    audioService.updateSettings(defaultSettings);
    setSelectedVoice(null);
  };

  const testVoice = async (voice?: VoiceProfile) => {
    if (isTestPlaying) {
      audioService.stopSpeaking();
      setIsTestPlaying(false);
      return;
    }

    setIsTestPlaying(true);
    
    await audioService.speak(testText, {
      voice: voice || undefined,
      rate: settings.speech_rate,
      pitch: settings.speech_pitch,
      volume: settings.voice_volume,
      interrupt: true,
      onEnd: () => setIsTestPlaying(false),
      onError: () => setIsTestPlaying(false)
    });
  };

  const selectVoice = (voice: VoiceProfile | null) => {
    const voice_uri = voice?.voice_uri || null;
    setSelectedVoice(voice_uri);
    updateSetting('preferred_voice', voice_uri);
  };

  if (!is_open) return null;

  return (
    <motion.div
      className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-gray-900 rounded-xl border border-gray-700 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-400" />
            Audio Settings
          </h1>
          <div className="flex gap-2">
            <button
              onClick={resetToDefaults}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-all text-sm flex items-center gap-1"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all"
            >
              Done
            </button>
          </div>
        </div>

        {/* Volume Controls */}
        <div className="space-y-6">
          <div className="bg-gray-800/50 rounded-xl p-4">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-purple-400" />
              Volume Controls
            </h2>
            
            <div className="space-y-4">
              {/* Master Volume */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-white flex items-center gap-2">
                    <Volume2 className="w-4 h-4" />
                    Master Volume
                  </label>
                  <span className="text-gray-400">{Math.round(settings.master_volume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.master_volume}
                  onChange={(e) => updateSetting('master_volume', parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Voice Volume */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-white flex items-center gap-2">
                    <Mic className="w-4 h-4" />
                    Voice & Announcer
                  </label>
                  <span className="text-gray-400">{Math.round(settings.voice_volume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.voice_volume}
                  onChange={(e) => updateSetting('voice_volume', parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Sound Effects Volume */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-white flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Sound Effects
                  </label>
                  <span className="text-gray-400">{Math.round(settings.sfx_volume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.sfx_volume}
                  onChange={(e) => updateSetting('sfx_volume', parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Music Volume */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-white flex items-center gap-2">
                    <Music className="w-4 h-4" />
                    Background Music
                  </label>
                  <span className="text-gray-400">{Math.round(settings.music_volume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.music_volume}
                  onChange={(e) => updateSetting('music_volume', parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Text-to-Speech Settings */}
          <div className="bg-gray-800/50 rounded-xl p-4">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-green-400" />
              Voice Settings
            </h2>

            {/* Enable TTS */}
            <div className="flex items-center justify-between mb-4">
              <label className="text-white">Enable Voice Announcements</label>
              <button
                onClick={() => updateSetting('enable_tts', !settings.enable_tts)}
                className={`relative w-12 h-6 rounded-full transition-all ${
                  settings.enable_tts ? 'bg-blue-600' : 'bg-gray-600'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                    settings.enable_tts ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {settings.enable_tts && (
              <>
                {/* Speech Rate */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-white">Speech Rate</label>
                    <span className="text-gray-400">{settings.speech_rate.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={settings.speech_rate}
                    onChange={(e) => updateSetting('speech_rate', parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Speech Pitch */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-white">Speech Pitch</label>
                    <span className="text-gray-400">{settings.speech_pitch.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={settings.speech_pitch}
                    onChange={(e) => updateSetting('speech_pitch', parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Voice Test */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-white">Test Voice</label>
                    <button
                      onClick={() => testVoice()}
                      disabled={!settings.enable_tts}
                      className={`px-3 py-1 rounded-lg transition-all text-sm flex items-center gap-1 ${
                        isTestPlaying
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-600 disabled:opacity-50'
                      }`}
                    >
                      {isTestPlaying ? (
                        <>
                          <Pause className="w-4 h-4" />
                          Stop
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          Test
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-gray-400 text-sm">{testText}</p>
                </div>
              </>
            )}
          </div>

          {/* Voice Selection */}
          {settings.enable_tts && availableVoices.length > 0 && (
            <div className="bg-gray-800/50 rounded-xl p-4">
              <h2 className="text-lg font-semibold text-white mb-4">
                Voice Selection ({availableVoices.length} available)
              </h2>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {/* Default/Auto option */}
                <div
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedVoice === null
                      ? 'border-blue-500 bg-blue-500/20'
                      : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
                  }`}
                  onClick={() => selectVoice(null)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-semibold">Auto-Select</div>
                      <div className="text-gray-400 text-sm">Automatically choose the best voice</div>
                    </div>
                    {selectedVoice === null && (
                      <Check className="w-5 h-5 text-blue-400" />
                    )}
                  </div>
                </div>

                {availableVoices.map((voice) => (
                  <div
                    key={voice.voice_uri}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedVoice === voice.voice_uri
                        ? 'border-blue-500 bg-blue-500/20'
                        : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
                    }`}
                    onClick={() => selectVoice(voice)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-white font-semibold">{voice.name}</div>
                        <div className="text-gray-400 text-sm">
                          {voice.lang} • {voice.gender} • {voice.personality}
                          {voice.local_service && ' • Local'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            testVoice(voice);
                          }}
                          className="p-1 bg-gray-600 hover:bg-gray-500 text-white rounded transition-all"
                        >
                          <Play className="w-3 h-3" />
                        </button>
                        {selectedVoice === voice.voice_uri && (
                          <Check className="w-5 h-5 text-blue-400" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tips */}
          <div className="bg-blue-500/10 border border-blue-500/50 rounded-xl p-4">
            <h3 className="text-blue-400 font-semibold mb-2">Audio Tips</h3>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• Voice announcements enhance the battle experience with real-time commentary</li>
              <li>• Adjust speech rate and pitch to find your preferred announcer style</li>
              <li>• Different voices may work better for different characters</li>
              <li>• Master volume affects all audio, while individual sliders control specific types</li>
            </ul>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}