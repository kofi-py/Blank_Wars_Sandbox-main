'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Palette,
  Brush,
  Eraser,
  Save,
  X,
  Plus,
  Eye,
  Heart,
  Download,
  Share2,
  Filter,
  Search,
  Grid,
  List,
  Star,
  Award,
  Zap,
  Crown,
  Clock,
  Users,
  RefreshCw
} from 'lucide-react';
import {
  GraffitiArt,
  GraffitiType,
  GraffitiCanvas,
  GraffitiLayer,
  GraffitiStroke,
  formatTimeAgo
} from '@/data/clubhouse';
import apiClient from '@/services/apiClient';

// Component to render graffiti canvas preview
function GraffitiPreview({ canvasData, width = 200, height = 150 }: {
  canvasData: any;
  width?: number;
  height?: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvasData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and set background
    ctx.fillStyle = canvasData.background || '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Get strokes from different possible formats
    let strokes: GraffitiStroke[] = [];
    if (canvasData.strokes) {
      strokes = canvasData.strokes;
    } else if (canvasData.layers && canvasData.layers[0]?.strokes) {
      strokes = canvasData.layers[0].strokes;
    }

    if (strokes.length === 0) return;

    // Calculate scale factor
    const sourceWidth = canvasData.width || 400;
    const sourceHeight = canvasData.height || 300;
    const scaleX = canvas.width / sourceWidth;
    const scaleY = canvas.height / sourceHeight;

    // Draw all strokes scaled
    strokes.forEach((stroke: GraffitiStroke) => {
      if (!stroke.points || stroke.points.length === 0) return;

      ctx.beginPath();
      ctx.strokeStyle = stroke.color || '#ffffff';
      ctx.lineWidth = (stroke.size || 3) * Math.min(scaleX, scaleY);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = stroke.opacity ?? 1;

      if (stroke.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
      } else {
        ctx.globalCompositeOperation = 'source-over';
      }

      stroke.points.forEach((point: { x: number; y: number }, index: number) => {
        const scaledX = point.x * scaleX;
        const scaledY = point.y * scaleY;
        if (index === 0) {
          ctx.moveTo(scaledX, scaledY);
        } else {
          ctx.lineTo(scaledX, scaledY);
        }
      });

      ctx.stroke();
    });

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }, [canvasData, width, height]);

  if (!canvasData) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-800">
        <Palette className="w-12 h-12 text-gray-600" />
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="w-full h-full object-cover"
    />
  );
}

interface GraffitiWallProps {
  current_user_id: string;
  current_user_name: string;
  current_user_level: number;
}

export default function GraffitiWall({
  current_user_id,
  current_user_name,
  current_user_level
}: GraffitiWallProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showDrawingTool, setShowDrawingTool] = useState(false);
  const [viewMode, setViewMode] = useState<'gallery' | 'wall'>('gallery');
  const [filterType, setFilterType] = useState<GraffitiType | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArt, setSelectedArt] = useState<string | null>(null);

  const [graffiti, setGraffiti] = useState<GraffitiArt[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [currentTool, setCurrentTool] = useState<'brush' | 'spray' | 'eraser'>('brush');
  const [brushSize, setBrushSize] = useState(5);
  const [currentColor, setCurrentColor] = useState('#ff0000');
  const [isDrawing, setIsDrawing] = useState(false);
  const [artTitle, setArtTitle] = useState('');
  const [artTags, setArtTags] = useState('');
  const [artType, setArtType] = useState<GraffitiType>('tag');
  const [strokes, setStrokes] = useState<GraffitiStroke[]>([]);
  const [startTime] = useState<number>(Date.now());

  const loadGraffiti = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = { limit: '50' };
    if (filterType !== 'all') {
      params.art_type = filterType;
    }
    const response = await apiClient.get('/social/graffiti', { params });
    const data = response.data.graffiti;

    setGraffiti(data.map((art: any) => ({
      id: art.id,
      artist_id: art.artist_user_id,
      artist_name: art.artist_name,
      artist_level: art.artist_level,
      type: art.art_type as GraffitiType,
      title: art.title,
      art_data: typeof art.canvas_data === 'string' ? JSON.parse(art.canvas_data) : art.canvas_data,
      position: { x: art.position_x, y: art.position_y, width: art.display_width, height: art.display_height },
      timestamp: new Date(art.created_at),
      likes: art.likes_count,
      views: art.views_count,
      tags: art.tags,
      is_approved: art.moderation_status === 'approved',
      is_feature: art.is_featured,
      color_palette: art.colors_used,
      tools: art.tools_used,
      time_spent: Math.floor(art.time_spent_seconds / 60)
    })));
    setLoading(false);
  }, [filterType]);

  useEffect(() => {
    loadGraffiti();
  }, [loadGraffiti]);

  // Filter and search graffiti
  const filteredGraffiti = graffiti.filter(art => {
    const typeMatch = filterType === 'all' || art.type === filterType;
    const searchMatch = searchTerm === '' || 
      art.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      art.artist_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      art.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    return typeMatch && searchMatch;
  });

  // Sort by featured first, then likes, then recent
  const sortedGraffiti = filteredGraffiti.sort((a, b) => {
    if (a.is_feature && !b.is_feature) return -1;
    if (!a.is_feature && b.is_feature) return 1;
    if (a.likes !== b.likes) return b.likes - a.likes;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  // Canvas drawing functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newStroke: GraffitiStroke = {
      id: `stroke_${Date.now()}`,
      tool: currentTool,
      color: currentColor,
      size: brushSize,
      opacity: 1,
      points: [{ x, y }]
    };

    setStrokes([...strokes, newStroke]);
  };

  const continueDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setStrokes(prev => {
      const newStrokes = [...prev];
      const currentStroke = newStrokes[newStrokes.length - 1];
      currentStroke.points.push({ x, y });
      return newStrokes;
    });
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  // Redraw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all strokes
    strokes.forEach(stroke => {
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (stroke.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
      } else {
        ctx.globalCompositeOperation = 'source-over';
      }

      stroke.points.forEach((point: { x: number; y: number; pressure?: number }, index: number) => {
        if (index === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });

      ctx.stroke();
    });
  }, [strokes]);

  const clearCanvas = () => {
    setStrokes([]);
  };

  const saveArtwork = async () => {
    if (!artTitle.trim() || strokes.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    setSaving(true);

    const tags = artTags
      .split(',')
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag.length > 0);

    const usedColors = [...new Set(strokes.map(s => s.color))];
    const usedTools = [...new Set(strokes.map(s => s.tool))];
    const timeSpentSeconds = Math.floor((Date.now() - startTime) / 1000);

    await apiClient.post('/social/graffiti', {
      title: artTitle,
      art_type: artType,
      canvas_data: {
        width: canvas.width,
        height: canvas.height,
        strokes,
        background: '#1a1a2e'
      },
      position: {
        x: Math.floor(Math.random() * 500) + 50,
        y: Math.floor(Math.random() * 300) + 50,
        width: 200,
        height: 150
      },
      tags,
      colors_used: usedColors,
      tools_used: usedTools,
      time_spent_seconds: timeSpentSeconds
    });

    setArtTitle('');
    setArtTags('');
    setStrokes([]);
    setShowDrawingTool(false);
    setSaving(false);
    loadGraffiti();
  };

  const handleLike = async (artId: string) => {
    await apiClient.post(`/social/graffiti/${artId}/like`);
    loadGraffiti();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-8 h-8 text-orange-400 animate-spin" />
        <span className="ml-3 text-gray-400">Loading graffiti wall...</span>
      </div>
    );
  }

  const getTypeIcon = (type: GraffitiType) => {
    const icons = {
      tag: '🏷️',
      character_art: '🎨',
      symbol: '🔣',
      text: '📝',
      battle_scene: '⚔️',
      meme: '😂'
    };
    return icons[type] || '🎨';
  };

  const getTypeColor = (type: GraffitiType) => {
    const colors = {
      tag: 'from-red-500 to-pink-500',
      character_art: 'from-blue-500 to-purple-500',
      symbol: 'from-green-500 to-teal-500',
      text: 'from-yellow-500 to-orange-500',
      battle_scene: 'from-red-500 to-orange-500',
      meme: 'from-purple-500 to-pink-500'
    };
    return colors[type] || colors.character_art;
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Palette className="w-6 h-6 text-orange-400" />
            Graffiti Wall
          </h2>
          
          <div className="flex gap-3">
            <div className="bg-gray-800/50 rounded-lg p-1 flex">
              <button
                onClick={() => setViewMode('gallery')}
                className={`px-3 py-2 rounded-lg transition-all flex items-center gap-2 ${
                  viewMode === 'gallery'
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Grid className="w-4 h-4" />
                Gallery
              </button>
              <button
                onClick={() => setViewMode('wall')}
                className={`px-3 py-2 rounded-lg transition-all flex items-center gap-2 ${
                  viewMode === 'wall'
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <List className="w-4 h-4" />
                Wall View
              </button>
            </div>
            
            <button
              onClick={() => setShowDrawingTool(true)}
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Art
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search artwork..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as GraffitiType | 'all')}
            className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
          >
            <option value="all">All Art Types</option>
            <option value="tag">🏷️ Tags</option>
            <option value="character_art">🎨 Character Art</option>
            <option value="symbol">🔣 Symbols</option>
            <option value="text">📝 Text</option>
            <option value="battle_scene">⚔️ Battle Scenes</option>
            <option value="meme">😂 Memes</option>
          </select>

          <div className="flex items-center text-gray-400">
            <span>{sortedGraffiti.length} artworks found</span>
          </div>
        </div>
      </div>

      {/* Drawing Tool Modal */}
      <AnimatePresence>
        {showDrawingTool && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={() => setShowDrawingTool(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Create Graffiti Art</h3>
                <button
                  onClick={() => setShowDrawingTool(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Drawing Tools */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-300 mb-2">Tools</h4>
                    <div className="space-y-2">
                      <button
                        onClick={() => setCurrentTool('brush')}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                          currentTool === 'brush' ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        <Brush className="w-4 h-4" />
                        Brush
                      </button>
                      <button
                        onClick={() => setCurrentTool('spray')}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                          currentTool === 'spray' ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        <Zap className="w-4 h-4" />
                        Spray
                      </button>
                      <button
                        onClick={() => setCurrentTool('eraser')}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                          currentTool === 'eraser' ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        <Eraser className="w-4 h-4" />
                        Eraser
                      </button>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-gray-300 mb-2">Brush Size</h4>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      value={brushSize}
                      onChange={(e) => setBrushSize(Number(e.target.value))}
                      className="w-full"
                    />
                    <span className="text-xs text-gray-400">{brushSize}px</span>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-gray-300 mb-2">Colors</h4>
                    <div className="grid grid-cols-4 gap-2">
                      {['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffffff', '#000000'].map(color => (
                        <button
                          key={color}
                          onClick={() => setCurrentColor(color)}
                          className={`w-8 h-8 rounded border-2 transition-all ${
                            currentColor === color ? 'border-white scale-110' : 'border-gray-600'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <input
                      type="color"
                      value={currentColor}
                      onChange={(e) => setCurrentColor(e.target.value)}
                      className="w-full mt-2 h-8 rounded border border-gray-600"
                    />
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={clearCanvas}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Clear
                    </button>
                  </div>
                </div>

                {/* Canvas */}
                <div className="lg:col-span-2">
                  <canvas
                    ref={canvasRef}
                    width={400}
                    height={300}
                    className="border border-gray-600 rounded-lg bg-gray-800 cursor-crosshair w-full"
                    onMouseDown={startDrawing}
                    onMouseMove={continueDrawing}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                  />
                </div>

                {/* Artwork Details */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Artwork Title</label>
                    <input
                      type="text"
                      value={artTitle}
                      onChange={(e) => setArtTitle(e.target.value)}
                      placeholder="My Epic Art"
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Art Type</label>
                    <select
                      value={artType}
                      onChange={(e) => setArtType(e.target.value as GraffitiType)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                    >
                      <option value="tag">🏷️ Tag</option>
                      <option value="character_art">🎨 Character Art</option>
                      <option value="symbol">🔣 Symbol</option>
                      <option value="text">📝 Text</option>
                      <option value="battle_scene">⚔️ Battle Scene</option>
                      <option value="meme">😂 Meme</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Tags</label>
                    <input
                      type="text"
                      value={artTags}
                      onChange={(e) => setArtTags(e.target.value)}
                      placeholder="epic, red, dragon"
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <button
                    onClick={saveArtwork}
                    disabled={!artTitle.trim() || strokes.length === 0 || saving}
                    className="w-full py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saving ? 'Saving...' : 'Save Artwork'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gallery View */}
      {viewMode === 'gallery' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedGraffiti.map((art) => (
            <motion.div
              key={art.id}
              layout
              className="bg-gray-900/50 rounded-xl border border-gray-700 overflow-hidden hover:border-orange-500 transition-all cursor-pointer"
              whileHover={{ scale: 1.02 }}
              onClick={() => setSelectedArt(selectedArt === art.id ? null : art.id)}
            >
              {/* Art Preview */}
              <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 relative overflow-hidden">
                <GraffitiPreview canvasData={art.art_data} width={300} height={200} />
                {art.is_feature && (
                  <div className="absolute top-2 left-2">
                    <Star className="w-5 h-5 text-yellow-400 fill-current" />
                  </div>
                )}
                <div className={`absolute bottom-2 right-2 px-2 py-1 rounded text-xs font-semibold bg-gradient-to-r ${getTypeColor(art.type)} text-white`}>
                  {getTypeIcon(art.type)} {art.type}
                </div>
              </div>

              {/* Art Info */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-white">{art.title}</h3>
                    <p className="text-sm text-gray-400">by {art.artist_name}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-400">Level {art.artist_level}</div>
                    {art.guild_tag && (
                      <div className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded mt-1">
                        [{art.guild_tag}]
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-400 mb-3">
                  <span>{formatTimeAgo(art.timestamp)}</span>
                  <span>{art.time_spent}m to create</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex gap-3 text-sm">
                    <span className="flex items-center gap-1 text-red-400">
                      <Heart className="w-3 h-3" />
                      {art.likes}
                    </span>
                    <span className="flex items-center gap-1 text-blue-400">
                      <Eye className="w-3 h-3" />
                      {art.views}
                    </span>
                  </div>
                  
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleLike(art.id); }}
                      className="text-gray-400 hover:text-red-400 transition-colors"
                    >
                      <Heart className="w-4 h-4" />
                    </button>
                    <button className="text-gray-400 hover:text-blue-400 transition-colors">
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Tags */}
                {art.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {art.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                        #{tag}
                      </span>
                    ))}
                    {art.tags.length > 3 && (
                      <span className="text-xs text-gray-400">+{art.tags.length - 3}</span>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        /* Wall View */
        <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-6 min-h-96 relative overflow-hidden">
          <div className="text-center text-gray-400 py-20">
            <Palette className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-semibold mb-2">Interactive Graffiti Wall</h3>
            <p>Click and drag graffiti pieces around the wall!</p>
          </div>
          
          {/* Graffiti positioned on wall */}
          {sortedGraffiti.slice(0, 10).map((art, index) => (
            <motion.div
              key={art.id}
              className="absolute bg-gray-800/70 rounded-lg p-2 border border-gray-600 cursor-move"
              style={{
                left: `${(index % 5) * 150 + 50}px`,
                top: `${Math.floor(index / 5) * 120 + 50}px`,
                width: '120px',
                height: '80px'
              }}
              drag
              dragMomentum={false}
              whileHover={{ scale: 1.05 }}
              whileDrag={{ scale: 1.1, zIndex: 10 }}
            >
              <div className="text-center">
                <div className="text-2xl mb-1">{getTypeIcon(art.type)}</div>
                <div className="text-xs text-white font-semibold truncate">{art.title}</div>
                <div className="text-xs text-gray-400 truncate">by {art.artist_name}</div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {sortedGraffiti.length === 0 && (
        <div className="text-center py-12">
          <Palette className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-400 mb-2">No Artwork Found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm || filterType !== 'all' 
              ? 'Try adjusting your search or filters'
              : 'Be the first to create some amazing graffiti art!'
            }
          </p>
          {!searchTerm && filterType === 'all' && (
            <button
              onClick={() => setShowDrawingTool(true)}
              className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Create First Artwork
            </button>
          )}
        </div>
      )}
    </div>
  );
}