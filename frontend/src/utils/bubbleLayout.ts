/**
 * Word Bubble Layout System
 *
 * Sophisticated layout algorithms for positioning speech bubbles around 3D character models
 * Features: obstacle detection, collision avoidance, proportional spacing based on face height
 */

export type LayoutType =
  | 'stack-right'
  | 'stack-left'
  | 'horizontal-right'
  | 'horizontal-left'
  | 'arc-over'
  | 'arc-left'
  | 'arc-right'
  | 'diagonal-up-right'
  | 'diagonal-up-left'
  | 'L-right-up'
  | 'L-up-right'
  | 'L-left-up'
  | 'L-up-left'
  | 'zigzag'
  | 'staircase'
  | 'staircase-left';

export interface FaceMetrics {
  jawX: number;      // Jaw X position (percentage of screen)
  jawY: number;      // Jaw Y position (percentage of screen)
  headTopY: number;  // HeadTop Y position (percentage of screen)
  faceHeight: number; // Distance from headTop to jaw in pixels
}

export interface ObstaclePosition {
  x: number; // percentage of screen width
  y: number; // percentage of screen height
}

export interface BubblePosition {
  x: number; // offset in pixels from jaw position
  y: number; // offset in pixels from jaw position
}

const BUBBLE_WIDTH = 130;
const BUBBLE_HEIGHT = 55;
const BUBBLE_RADIUS = 70; // Half width for collision detection
const OBSTACLE_RADIUS = 90; // Collision boundary
const COLLISION_THRESHOLD = OBSTACLE_RADIUS + BUBBLE_RADIUS; // 160px

/**
 * Select best layout based on available space and obstacle positions
 */
export function selectBestLayout(
  faceMetrics: FaceMetrics,
  obstacles: ObstaclePosition[],
  screenWidth: number,
  screenHeight: number
): LayoutType {
  const faceH = faceMetrics.faceHeight;
  const jawPixelX = (faceMetrics.jawX / 100) * screenWidth;
  const jawPixelY = (faceMetrics.jawY / 100) * screenHeight;

  // Proportional thresholds
  const minSideSpace = faceH * 0.3;
  const minUpSpace = faceH * 0.4;

  const spaceRight = screenWidth - jawPixelX - minSideSpace;
  const spaceLeft = jawPixelX - minSideSpace;
  const spaceUp = jawPixelY - minUpSpace;

  // Obstacle detection
  let obstacleOnRight = false;
  let obstacleOnLeft = false;
  const OBSTACLE_PROXIMITY = faceH * 1.5;

  obstacles.forEach(obs => {
    const obsPixelX = (obs.x / 100) * screenWidth;
    const distance = obsPixelX - jawPixelX;

    if (Math.abs(distance) < OBSTACLE_PROXIMITY) {
      if (distance > 0) obstacleOnRight = true;
      if (distance < 0) obstacleOnLeft = true;
    }
  });

  const validLayouts: LayoutType[] = [];

  // Proportional thresholds
  const stackThreshold = faceH * 0.5;
  const sideThreshold = faceH * 0.8;
  const arcThreshold = faceH * 0.4;

  // Vertical layouts - screen bounds only
  if (spaceUp > stackThreshold) {
    validLayouts.push('stack-right', 'stack-left', 'zigzag');
  }

  // Right-side layouts - screen bounds only
  if (spaceRight > sideThreshold) {
    validLayouts.push('horizontal-right', 'staircase');
    if (spaceUp > stackThreshold) {
      validLayouts.push('diagonal-up-right', 'L-right-up', 'L-up-right');
    }
  }

  // Left-side layouts - screen bounds only
  if (spaceLeft > sideThreshold) {
    validLayouts.push('horizontal-left', 'staircase-left');
    if (spaceUp > stackThreshold) {
      validLayouts.push('diagonal-up-left', 'L-left-up', 'L-up-left');
    }
  }

  // Arc layouts - screen bounds only
  if (spaceUp > arcThreshold) {
    validLayouts.push('arc-over', 'arc-left', 'arc-right');
  }

  // Fallback to zigzag
  if (validLayouts.length === 0) {
    validLayouts.push('zigzag');
  }

  // Randomly select from valid layouts
  const chosen = validLayouts[Math.floor(Math.random() * validLayouts.length)];

  console.log(`🎲 Layout Selection:`, {
    chosen,
    validLayouts,
    spaceRight: spaceRight.toFixed(0),
    spaceLeft: spaceLeft.toFixed(0),
    spaceUp: spaceUp.toFixed(0),
    faceHeight: faceH.toFixed(0),
    jawPosition: `${faceMetrics.jawX.toFixed(1)}%, ${faceMetrics.jawY.toFixed(1)}%`,
    screenSize: `${screenWidth}x${screenHeight}`,
    obstacleOnRight,
    obstacleOnLeft,
    thresholds: {
      stack: stackThreshold.toFixed(0),
      side: sideThreshold.toFixed(0),
      arc: arcThreshold.toFixed(0)
    }
  });

  return chosen;
}

/**
 * Calculate bubble positions based on layout type with collision detection
 */
export function calculateBubblePositions(
  bubbleCount: number,
  layout: LayoutType,
  faceMetrics: FaceMetrics,
  obstacles: ObstaclePosition[],
  screenWidth: number,
  screenHeight: number
): BubblePosition[] {
  const faceH = faceMetrics.faceHeight;
  const jawPixelX = (faceMetrics.jawX / 100) * screenWidth;
  const jawPixelY = (faceMetrics.jawY / 100) * screenHeight;

  // Proportional spacing units with caps
  const FACE_CLEARANCE = Math.min(faceH * 1.15, 250);
  const UNIT = faceH * 0.35;
  const BUBBLE_GAP = Math.min(faceH * 0.20, 50);
  const SIDE_OFFSET = faceH * 0.60;
  const VERTICAL_STEP = Math.min(faceH * 0.45, 100);
  const HORIZONTAL_STEP = faceH * 0.85;

  const MARGIN = 20;
  const BUBBLE_HALF_WIDTH = 70;

  // Adaptive solver state
  let accumulatedOffset = { x: 0, y: 0 };

  const positions: BubblePosition[] = [];

  for (let index = 0; index < bubbleCount; index++) {
    let basePos: BubblePosition;

    // Calculate base position using layout algorithm
    switch (layout) {
      case 'stack-right':
        basePos = { x: SIDE_OFFSET, y: -FACE_CLEARANCE - index * VERTICAL_STEP };
        break;

      case 'stack-left':
        basePos = { x: -SIDE_OFFSET, y: -FACE_CLEARANCE - index * VERTICAL_STEP };
        break;

      case 'horizontal-right':
        basePos = { x: SIDE_OFFSET + index * HORIZONTAL_STEP, y: -FACE_CLEARANCE };
        break;

      case 'horizontal-left':
        basePos = { x: -SIDE_OFFSET - index * HORIZONTAL_STEP, y: -FACE_CLEARANCE };
        break;

      case 'arc-over':
        const arcAngle = Math.PI / 2 + (index * Math.PI / 6);
        const arcRadius = faceH * 0.8;
        basePos = {
          x: Math.cos(arcAngle) * arcRadius,
          y: -FACE_CLEARANCE + Math.sin(arcAngle) * arcRadius
        };
        break;

      case 'arc-left':
        const arcLeftAngle = Math.PI + (index * Math.PI / 8);
        const arcLeftRadius = faceH * 0.7;
        basePos = {
          x: Math.cos(arcLeftAngle) * arcLeftRadius - SIDE_OFFSET,
          y: -FACE_CLEARANCE + Math.sin(arcLeftAngle) * arcLeftRadius
        };
        break;

      case 'arc-right':
        const arcRightAngle = (index * Math.PI / 8);
        const arcRightRadius = faceH * 0.7;
        basePos = {
          x: Math.cos(arcRightAngle) * arcRightRadius + SIDE_OFFSET,
          y: -FACE_CLEARANCE + Math.sin(arcRightAngle) * arcRightRadius
        };
        break;

      case 'diagonal-up-right':
        basePos = {
          x: SIDE_OFFSET + index * UNIT,
          y: -FACE_CLEARANCE - index * VERTICAL_STEP
        };
        break;

      case 'diagonal-up-left':
        basePos = {
          x: -SIDE_OFFSET - index * UNIT,
          y: -FACE_CLEARANCE - index * VERTICAL_STEP
        };
        break;

      case 'L-right-up':
        basePos = index === 0
          ? { x: SIDE_OFFSET, y: -FACE_CLEARANCE }
          : { x: SIDE_OFFSET, y: -FACE_CLEARANCE - index * VERTICAL_STEP };
        break;

      case 'L-up-right':
        basePos = index === 0
          ? { x: SIDE_OFFSET, y: -FACE_CLEARANCE }
          : { x: SIDE_OFFSET + index * HORIZONTAL_STEP, y: -FACE_CLEARANCE };
        break;

      case 'L-left-up':
        basePos = index === 0
          ? { x: -SIDE_OFFSET, y: -FACE_CLEARANCE }
          : { x: -SIDE_OFFSET, y: -FACE_CLEARANCE - index * VERTICAL_STEP };
        break;

      case 'L-up-left':
        basePos = index === 0
          ? { x: -SIDE_OFFSET, y: -FACE_CLEARANCE }
          : { x: -SIDE_OFFSET - index * HORIZONTAL_STEP, y: -FACE_CLEARANCE };
        break;

      case 'zigzag':
        const dir = index % 2 === 0 ? 1 : -1;
        basePos = {
          x: dir * UNIT * 0.5,
          y: -FACE_CLEARANCE - index * VERTICAL_STEP * 0.8
        };
        break;

      case 'staircase':
        basePos = {
          x: SIDE_OFFSET + index * UNIT * 0.6,
          y: -FACE_CLEARANCE - index * VERTICAL_STEP * 0.5
        };
        break;

      case 'staircase-left':
        basePos = {
          x: -SIDE_OFFSET - index * UNIT * 0.6,
          y: -FACE_CLEARANCE - index * VERTICAL_STEP * 0.5
        };
        break;

      default:
        basePos = { x: 0, y: -FACE_CLEARANCE - index * VERTICAL_STEP };
    }

    // Apply collision detection
    const finalPos = detectAndResolveCollisions(
      basePos,
      jawPixelX,
      jawPixelY,
      obstacles,
      screenWidth,
      screenHeight,
      accumulatedOffset
    );

    positions.push(finalPos);

    console.log(`  Bubble[${index}]: base(${basePos.x.toFixed(0)}, ${basePos.y.toFixed(0)}) → final(${finalPos.x.toFixed(0)}, ${finalPos.y.toFixed(0)})`);

    // Update accumulated offset for next bubble
    accumulatedOffset = {
      x: finalPos.x - basePos.x,
      y: finalPos.y - basePos.y
    };
  }

  return positions;
}

/**
 * Detect collisions with obstacles and resolve them
 */
function detectAndResolveCollisions(
  basePos: BubblePosition,
  jawPixelX: number,
  jawPixelY: number,
  obstacles: ObstaclePosition[],
  screenWidth: number,
  screenHeight: number,
  accumulatedOffset: { x: number; y: number }
): BubblePosition {
  const candidateX = jawPixelX + basePos.x + accumulatedOffset.x;
  const candidateY = jawPixelY + basePos.y + accumulatedOffset.y;

  // Check collisions with obstacles
  for (const obs of obstacles) {
    const obsPixelX = (obs.x / 100) * screenWidth;
    const obsPixelY = (obs.y / 100) * screenHeight;
    const distance = Math.sqrt(
      Math.pow(candidateX - obsPixelX, 2) + Math.pow(candidateY - obsPixelY, 2)
    );

    if (distance < COLLISION_THRESHOLD) {
      // Collision detected! Push bubble away
      const angle = Math.atan2(candidateY - obsPixelY, candidateX - obsPixelX);
      const pushDistance = COLLISION_THRESHOLD - distance + 10; // 10px buffer

      const pushX = Math.cos(angle) * pushDistance;
      const pushY = Math.sin(angle) * pushDistance;

      console.log(`    ⚠️ COLLISION! Distance: ${distance.toFixed(0)}px < ${COLLISION_THRESHOLD}px, pushing by ${pushDistance.toFixed(0)}px`);

      return {
        x: basePos.x + accumulatedOffset.x + pushX,
        y: basePos.y + accumulatedOffset.y + pushY
      };
    }
  }

  // No collision, return position with accumulated offset
  return {
    x: basePos.x + accumulatedOffset.x,
    y: basePos.y + accumulatedOffset.y
  };
}
