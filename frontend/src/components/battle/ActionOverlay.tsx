// ActionOverlay - Visual indicators for movement range, attack range, and path preview

import React, { useMemo } from 'react';
import { HexGridSystem, HexPosition, HexBattleGrid } from '@/systems/hexGridSystem';

interface ActionOverlayProps {
  grid: HexBattleGrid;
  hex_size: number;
  reachable_hexes: HexPosition[];
  attackable_positions: HexPosition[];
  hovered_hex: HexPosition | null;
  active_character_pos: HexPosition | null;
}

export const ActionOverlay: React.FC<ActionOverlayProps> = ({
  grid,
  hex_size,
  reachable_hexes,
  attackable_positions,
  hovered_hex,
  active_character_pos
}) => {
  // Canvas dimensions scale with hex_size (matches HexGrid)
  const canvasSize = useMemo(() => ({
    width: hex_size * 40,  // 1200 when hex_size=30
    height: hex_size * 30  // 900 when hex_size=30
  }), [hex_size]);
  const centerOffsetX = canvasSize.width / 2;
  const centerOffsetY = canvasSize.height / 2;

  // Calculate hex vertices for flat-top hexagon
  const getHexVertices = (centerX: number, center_y: number, size: number): string => {
    const vertices: [number, number][] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 180) * (60 * i);
      const x = centerX + size * Math.cos(angle);
      const y = center_y + size * Math.sin(angle);
      vertices.push([x, y]);
    }
    return vertices.map(v => `${v[0]},${v[1]}`).join(' ');
  };

  // Render path preview from active character to hovered hex
  const pathPreview = useMemo(() => {
    if (!active_character_pos || !hovered_hex) return null;

    const path: HexPosition[] = [];
    const distance = HexGridSystem.distance(active_character_pos, hovered_hex);

    for (let i = 0; i <= distance; i++) {
      const t = distance === 0 ? 0 : i / distance;
      const lerpHex = HexGridSystem.lerp(active_character_pos, hovered_hex, t);
      const roundedHex = HexGridSystem.round(lerpHex);

      if (path.length === 0 || !HexGridSystem.equals(roundedHex, path[path.length - 1])) {
        path.push(roundedHex);
      }
    }

    return path.map((hex, index) => {
      const pixel = HexGridSystem.toPixel(hex, hex_size);
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
  }, [active_character_pos, hovered_hex, hex_size]);

  return (
    <svg
      viewBox={`0 0 ${canvasSize.width} ${canvasSize.height}`}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 5
      }}
    >
      {/* Render reachable hexes (green highlight) */}
      {reachable_hexes.map((hex, index) => {
        const pixel = HexGridSystem.toPixel(hex, hex_size);
        const x = pixel.x + centerOffsetX;
        const y = pixel.y + centerOffsetY;
        const points = getHexVertices(x, y, hex_size);

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
      {attackable_positions.map((hex, index) => {
        const pixel = HexGridSystem.toPixel(hex, hex_size);
        const x = pixel.x + centerOffsetX;
        const y = pixel.y + centerOffsetY;
        const points = getHexVertices(x, y, hex_size);

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
      {active_character_pos && (
        <>
          {/* Movement range circle */}
          <circle
            cx={centerOffsetX + HexGridSystem.toPixel(active_character_pos, hex_size).x}
            cy={centerOffsetY + HexGridSystem.toPixel(active_character_pos, hex_size).y}
            r={hex_size * 3} // 3 hex radius
            fill="none"
            stroke="#10b981"
            strokeWidth={2}
            strokeDasharray="5,5"
            opacity={0.5}
          />

          {/* Attack range circle */}
          <circle
            cx={centerOffsetX + HexGridSystem.toPixel(active_character_pos, hex_size).x}
            cy={centerOffsetY + HexGridSystem.toPixel(active_character_pos, hex_size).y}
            r={hex_size * 5} // 5 hex radius
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
