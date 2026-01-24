// ActionOverlay - Visual indicators for movement range, attack range, and path preview

import React, { useMemo } from 'react';
import { HexGridSystem, HexPosition, HexBattleGrid } from '@/systems/hexGridSystem';

interface ActionOverlayProps {
  grid: HexBattleGrid;
  hexSize: number;
  reachableHexes: HexPosition[];
  attackablePositions: HexPosition[];
  hoveredHex: HexPosition | null;
  activeCharacterPos: HexPosition | null;
}

export const ActionOverlay: React.FC<ActionOverlayProps> = ({
  grid,
  hexSize,
  reachableHexes,
  attackablePositions,
  hoveredHex,
  activeCharacterPos
}) => {
  // Canvas dimensions
  const canvasSize = { width: 1200, height: 900 };
  const centerOffsetX = canvasSize.width / 2;
  const centerOffsetY = canvasSize.height / 2;

  // Calculate hex vertices for flat-top hexagon
  const getHexVertices = (centerX: number, centerY: number, size: number): string => {
    const vertices: [number, number][] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 180) * (60 * i);
      const x = centerX + size * Math.cos(angle);
      const y = centerY + size * Math.sin(angle);
      vertices.push([x, y]);
    }
    return vertices.map(v => `${v[0]},${v[1]}`).join(' ');
  };

  // Render path preview from active character to hovered hex
  const pathPreview = useMemo(() => {
    if (!activeCharacterPos || !hoveredHex) return null;

    const path: HexPosition[] = [];
    const distance = HexGridSystem.distance(activeCharacterPos, hoveredHex);

    for (let i = 0; i <= distance; i++) {
      const t = distance === 0 ? 0 : i / distance;
      const lerpHex = HexGridSystem.lerp(activeCharacterPos, hoveredHex, t);
      const roundedHex = HexGridSystem.round(lerpHex);

      if (path.length === 0 || !HexGridSystem.equals(roundedHex, path[path.length - 1])) {
        path.push(roundedHex);
      }
    }

    return path.map((hex, index) => {
      const pixel = HexGridSystem.toPixel(hex, hexSize);
      const x = pixel.x + centerOffsetX;
      const y = pixel.y + centerOffsetY;

      return (
        <circle
          key={`path-${index}`}
          cx={x}
          cy={y}
          r={4}
          fill="#fbbf24"
          opacity={0.6}
        />
      );
    });
  }, [activeCharacterPos, hoveredHex, hexSize]);

  return (
    <svg
      width={canvasSize.width}
      height={canvasSize.height}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 5
      }}
    >
      {/* Render reachable hexes (green highlight) */}
      {reachableHexes.map((hex, index) => {
        const pixel = HexGridSystem.toPixel(hex, hexSize);
        const x = pixel.x + centerOffsetX;
        const y = pixel.y + centerOffsetY;
        const points = getHexVertices(x, y, hexSize);

        return (
          <polygon
            key={`reachable-${index}`}
            points={points}
            fill="#10b981"
            opacity={0.3}
            stroke="#10b981"
            strokeWidth={2}
          />
        );
      })}

      {/* Render attackable positions (red highlight) */}
      {attackablePositions.map((hex, index) => {
        const pixel = HexGridSystem.toPixel(hex, hexSize);
        const x = pixel.x + centerOffsetX;
        const y = pixel.y + centerOffsetY;
        const points = getHexVertices(x, y, hexSize);

        return (
          <polygon
            key={`attackable-${index}`}
            points={points}
            fill="#ef4444"
            opacity={0.3}
            stroke="#ef4444"
            strokeWidth={2}
          />
        );
      })}

      {/* Render path preview */}
      {pathPreview}

      {/* Render range circles if active character exists */}
      {activeCharacterPos && (
        <>
          {/* Movement range circle */}
          <circle
            cx={centerOffsetX + HexGridSystem.toPixel(activeCharacterPos, hexSize).x}
            cy={centerOffsetY + HexGridSystem.toPixel(activeCharacterPos, hexSize).y}
            r={hexSize * 3} // 3 hex radius
            fill="none"
            stroke="#10b981"
            strokeWidth={2}
            strokeDasharray="5,5"
            opacity={0.5}
          />

          {/* Attack range circle */}
          <circle
            cx={centerOffsetX + HexGridSystem.toPixel(activeCharacterPos, hexSize).x}
            cy={centerOffsetY + HexGridSystem.toPixel(activeCharacterPos, hexSize).y}
            r={hexSize * 5} // 5 hex radius
            fill="none"
            stroke="#ef4444"
            strokeWidth={2}
            strokeDasharray="5,5"
            opacity={0.4}
          />
        </>
      )}
    </svg>
  );
};
