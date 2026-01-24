// HexGrid - Canvas-based hex grid renderer with terrain visualization

import React, { useRef, useEffect, useCallback } from 'react';
import { HexGridSystem, HexPosition, HexBattleGrid, TerrainType } from '@/systems/hexGridSystem';

interface HexGridProps {
  grid: HexBattleGrid;
  hexSize: number;
  onHexClick: (pos: HexPosition) => void;
  onHexHover: (pos: HexPosition | null) => void;
  selectedHex: HexPosition | null;
  hoveredHex: HexPosition | null;
}

export const HexGrid: React.FC<HexGridProps> = ({
  grid,
  hexSize,
  onHexClick,
  onHexHover,
  selectedHex,
  hoveredHex
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize] = React.useState({ width: 1200, height: 900 });

  // Calculate hex vertices for flat-top hexagon
  const getHexVertices = useCallback((centerX: number, centerY: number, size: number): [number, number][] => {
    const vertices: [number, number][] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 180) * (60 * i);
      const x = centerX + size * Math.cos(angle);
      const y = centerY + size * Math.sin(angle);
      vertices.push([x, y]);
    }
    return vertices;
  }, []);

  // Draw a single hexagon
  const drawHex = useCallback((
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    size: number,
    fillColor: string,
    strokeColor: string = '#333',
    lineWidth: number = 1
  ) => {
    const vertices = getHexVertices(centerX, centerY, size);

    ctx.beginPath();
    ctx.moveTo(vertices[0][0], vertices[0][1]);
    for (let i = 1; i < vertices.length; i++) {
      ctx.lineTo(vertices[i][0], vertices[i][1]);
    }
    ctx.closePath();

    ctx.fillStyle = fillColor;
    ctx.fill();

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }, [getHexVertices]);

  // Get terrain color
  const getTerrainColor = useCallback((terrain?: TerrainType): string => {
    switch (terrain) {
      case 'broadcast_tower':
        return '#4a3f8a'; // Dark purple
      case 'perimeter_water':
        return '#1e40af'; // Deep blue
      default:
        return '#e5e7eb'; // Light gray
    }
  }, []);

  // Convert pixel coordinates to hex position
  const pixelToHex = useCallback((x: number, y: number): HexPosition | null => {
    const centerOffsetX = canvasSize.width / 2;
    const centerOffsetY = canvasSize.height / 2;

    const hexPos = HexGridSystem.fromPixel(
      x - centerOffsetX,
      y - centerOffsetY,
      hexSize
    );

    // Check if in bounds
    if (HexGridSystem.isInBounds(hexPos)) {
      return hexPos;
    }

    return null;
  }, [hexSize, canvasSize]);

  // Render the grid
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

    // Center offset
    const centerOffsetX = canvasSize.width / 2;
    const centerOffsetY = canvasSize.height / 2;

    // Draw all hexes in grid
    for (let q = -6; q <= 6; q++) {
      for (let r = -6; r <= 6; r++) {
        const hex = HexGridSystem.createHex(q, r);

        // Skip if not valid hex in cube space
        if (!HexGridSystem.isValidHex(hex)) continue;

        // Skip if out of bounds
        if (!HexGridSystem.isInBounds(hex)) continue;

        // Get pixel position
        const pixel = HexGridSystem.toPixel(hex, hexSize);
        const x = pixel.x + centerOffsetX;
        const y = pixel.y + centerOffsetY;

        // Get terrain
        const terrain = grid.terrain.get(HexGridSystem.toKey(hex));
        const baseColor = getTerrainColor(terrain);

        // Check if selected or hovered
        const isSelected = selectedHex && HexGridSystem.equals(hex, selectedHex);
        const isHovered = hoveredHex && HexGridSystem.equals(hex, hoveredHex);

        let fillColor = baseColor;
        let strokeColor = '#333';
        let lineWidth = 1;

        if (isSelected) {
          strokeColor = '#fbbf24'; // Yellow
          lineWidth = 3;
        } else if (isHovered) {
          strokeColor = '#60a5fa'; // Light blue
          lineWidth = 2;
        }

        // Draw hex
        drawHex(ctx, x, y, hexSize, fillColor, strokeColor, lineWidth);

        // Draw broadcast tower icon
        if (terrain === 'broadcast_tower') {
          ctx.fillStyle = '#fff';
          ctx.font = '20px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('📡', x, y);
        }

        // Draw shark icons on perimeter
        if (terrain === 'perimeter_water') {
          ctx.fillStyle = '#fff';
          ctx.font = '16px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🦈', x, y);
        }

        // Draw coordinates on hover (debug)
        if (isHovered) {
          ctx.fillStyle = '#000';
          ctx.font = '10px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${hex.q},${hex.r}`, x, y + hexSize + 10);
        }
      }
    }
  }, [grid, hexSize, canvasSize, selectedHex, hoveredHex, drawHex, getTerrainColor]);

  // Handle mouse click
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const hexPos = pixelToHex(x, y);
    if (hexPos) {
      onHexClick(hexPos);
    }
  }, [pixelToHex, onHexClick]);

  // Handle mouse move
  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const hexPos = pixelToHex(x, y);
    onHexHover(hexPos);
  }, [pixelToHex, onHexHover]);

  // Handle mouse leave
  const handleCanvasMouseLeave = useCallback(() => {
    onHexHover(null);
  }, [onHexHover]);

  return (
    <canvas
      ref={canvasRef}
      width={canvasSize.width}
      height={canvasSize.height}
      onClick={handleCanvasClick}
      onMouseMove={handleCanvasMouseMove}
      onMouseLeave={handleCanvasMouseLeave}
      className="border border-gray-700 rounded-lg cursor-pointer"
      style={{ width: '100%', height: 'auto' }}
    />
  );
};
