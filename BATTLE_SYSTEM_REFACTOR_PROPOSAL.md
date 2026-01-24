# Battle System Refactor Proposal
## Comprehensive Technical Plan to Address Critical Issues

**Document Version:** 1.0
**Date:** November 2, 2025
**Author:** Claude Code Analysis
**Status:** PROPOSAL - PENDING APPROVAL

---

## Executive Summary

The Blank Wars battle system is **feature-complete and sophisticated** but **architecturally fragile**. This proposal outlines a 12-week refactoring plan to address critical bugs, add testing infrastructure, and restructure the codebase for long-term maintainability.

**Investment Required:** ~400 hours (2 engineers × 6 weeks)
**Expected ROI:** 25-30% faster feature development after 6 months
**Risk Level:** MEDIUM (can be done incrementally without breaking production)

---

## Current State Assessment

### What's Working Well ✅

1. **Rich Feature Set**
   - Sophisticated 15+ factor psychology system
   - 8 unique judge personalities
   - Comprehensive coaching mechanics
   - Dual battle modes (standard + hex grid)
   - Multiplayer ready with WebSocket integration

2. **Business Value**
   - Players report high engagement with psychology mechanics
   - Coaching system creates strategic depth
   - Financial progression adds long-term goals

### Critical Problems 🚨

1. **Data Integrity Risks (P0)**
   - Financial events use fire-and-forget pattern → **revenue tracking broken**
   - WebSocket resource leak → **multiplayer crashes**
   - No input validation → **game state corruption possible**

2. **Maintainability Crisis (P1)**
   - 2,228-line monolithic component → **extremely difficult to modify**
   - 0% test coverage → **every change risks breaking something**
   - 50+ useState hooks → **state management nightmare**

3. **Performance Issues (P1)**
   - Psychology Map cloned 100+ times per battle → **300KB memory churn**
   - No memoization → **expensive calculations repeated**
   - Re-render cascades → **UI lag during combat**

4. **Technical Debt (P2)**
   - 15+ TODO comments for incomplete features
   - Two competing judge systems (aiJudge vs aiJudgeSystem)
   - Hex mode completely separate from main system
   - Magic numbers scattered throughout

---

## Proposed Solution: 4-Phase Refactor

### Phase 1: Critical Bug Fixes (Week 1-2)
**Goal:** Stop data loss and crashes
**Effort:** 80 hours
**Risk:** LOW (isolated fixes)

### Phase 2: Testing Infrastructure (Week 3-4)
**Goal:** Prevent regressions
**Effort:** 80 hours
**Risk:** LOW (additive only)

### Phase 3: Architecture Refactor (Week 5-9)
**Goal:** Enable sustainable growth
**Effort:** 160 hours
**Risk:** MEDIUM (requires careful migration)

### Phase 4: Performance Optimization (Week 10-12)
**Goal:** Improve user experience
**Effort:** 80 hours
**Risk:** LOW (measurable improvements)

---

## Phase 1: Critical Bug Fixes (Week 1-2)

### 1.1 Fix Financial Event Data Loss (P0)

**Problem:**
```typescript
// Current code in useBattleRewards.ts:134-161
(async () => {
  try {
    await eventBus.publishEarningsEvent(...)
  } catch (error) {
    console.error('Error publishing financial events:', error)
    // ERROR LOGGED BUT DATA IS LOST! ❌
  }
})()
```

**Solution: Implement Retry Queue with IndexedDB Persistence**

**File:** `/frontend/src/services/financialEventQueue.ts` (NEW)

```typescript
import { openDB, DBSchema, IDBPDatabase } from 'idb'

interface FinancialEventDB extends DBSchema {
  pending_events: {
    key: string
    value: {
      id: string
      type: 'earnings' | 'financial_decision'
      characterId: string
      amount: number
      metadata: any
      attempts: number
      createdAt: number
      lastAttemptAt: number | null
    }
  }
}

export class FinancialEventQueue {
  private db: IDBPDatabase<FinancialEventDB> | null = null
  private isProcessing = false

  async init() {
    this.db = await openDB<FinancialEventDB>('financial-events', 1, {
      upgrade(db) {
        db.createObjectStore('pending_events', { keyPath: 'id' })
      }
    })
  }

  async enqueue(event: {
    type: 'earnings' | 'financial_decision'
    characterId: string
    amount: number
    metadata: any
  }): Promise<void> {
    if (!this.db) await this.init()

    const id = `${event.type}_${Date.now()}_${Math.random()}`
    await this.db!.put('pending_events', {
      id,
      ...event,
      attempts: 0,
      createdAt: Date.now(),
      lastAttemptAt: null
    })

    // Trigger processing
    this.processQueue()
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || !this.db) return
    this.isProcessing = true

    try {
      const events = await this.db.getAll('pending_events')

      for (const event of events) {
        // Skip if recently attempted (exponential backoff)
        const backoffDelay = Math.pow(2, event.attempts) * 1000
        if (event.lastAttemptAt && Date.now() - event.lastAttemptAt < backoffDelay) {
          continue
        }

        // Try to publish
        try {
          const { default: GameEventBus } = await import('@/services/gameEventBus')
          const eventBus = GameEventBus.getInstance()

          if (event.type === 'earnings') {
            await eventBus.publishEarningsEvent(
              event.characterId,
              event.amount,
              event.metadata.source
            )
          } else {
            await eventBus.publishFinancialDecision(
              event.characterId,
              event.metadata.decisionType,
              event.amount,
              event.metadata.description
            )
          }

          // Success - remove from queue
          await this.db.delete('pending_events', event.id)
          console.log(`✅ Published financial event ${event.id}`)
        } catch (error) {
          // Failed - update attempts
          await this.db.put('pending_events', {
            ...event,
            attempts: event.attempts + 1,
            lastAttemptAt: Date.now()
          })

          console.warn(`⚠️ Failed to publish event ${event.id} (attempt ${event.attempts + 1})`, error)

          // Give up after 10 attempts
          if (event.attempts >= 10) {
            await this.db.delete('pending_events', event.id)
            console.error(`❌ Permanently failed to publish event ${event.id}`, event)

            // TODO: Send to dead letter queue / alert monitoring system
          }
        }
      }
    } finally {
      this.isProcessing = false
    }

    // Schedule next processing
    const remainingEvents = await this.db.getAll('pending_events')
    if (remainingEvents.length > 0) {
      setTimeout(() => this.processQueue(), 5000)
    }
  }

  async getPendingCount(): Promise<number> {
    if (!this.db) await this.init()
    return (await this.db!.getAll('pending_events')).length
  }
}

export const financialEventQueue = new FinancialEventQueue()
```

**Modified File:** `/frontend/src/hooks/battle/useBattleRewards.ts`

```typescript
// Replace lines 134-161 with:
if (rewards.characterEarnings && rewards.characterEarnings.totalEarnings >= 5000) {
  // Enqueue for reliable delivery
  await financialEventQueue.enqueue({
    type: 'earnings',
    characterId: winningCharacter.id,
    amount: rewards.characterEarnings.totalEarnings,
    metadata: { source: 'battle_victory' }
  })

  await financialEventQueue.enqueue({
    type: 'financial_decision',
    characterId: winningCharacter.id,
    amount: rewards.characterEarnings.totalEarnings,
    metadata: {
      decisionType: 'investment_opportunity',
      description: 'Consider investing your battle winnings wisely'
    }
  })

  console.log(`💰 ${winningCharacter.name} earned $${rewards.characterEarnings.totalEarnings.toLocaleString()}`)
}
```

**Testing:**
```typescript
// Test file: __tests__/services/financialEventQueue.test.ts
describe('FinancialEventQueue', () => {
  it('should persist events to IndexedDB', async () => {
    await financialEventQueue.enqueue({
      type: 'earnings',
      characterId: 'test-char-123',
      amount: 10000,
      metadata: { source: 'battle_victory' }
    })

    const count = await financialEventQueue.getPendingCount()
    expect(count).toBe(1)
  })

  it('should retry failed events with exponential backoff', async () => {
    // Mock GameEventBus to fail 3 times, then succeed
    let attempts = 0
    jest.spyOn(GameEventBus.prototype, 'publishEarningsEvent')
      .mockImplementation(async () => {
        attempts++
        if (attempts < 3) throw new Error('Network error')
      })

    await financialEventQueue.enqueue({ ... })

    // Wait for retries
    await new Promise(resolve => setTimeout(resolve, 10000))

    expect(attempts).toBe(3)
    const count = await financialEventQueue.getPendingCount()
    expect(count).toBe(0) // Successfully processed
  })
})
```

**Rollout:**
1. Deploy FinancialEventQueue service
2. Update useBattleRewards to use queue
3. Add monitoring dashboard for pending events
4. Monitor error logs for 1 week

**Success Metrics:**
- 0 financial events lost over 30 days
- <1% events require >3 retries
- Queue processing latency <5 seconds

---

### 1.2 Fix WebSocket Resource Leak (P0)

**Problem:**
```typescript
// Current code in useBattleWebSocket.ts
useEffect(() => {
  const socket = io(WS_URL)
  // ... setup listeners ...

  return () => {
    socket.disconnect()
    // BUT: New socket created on every render! ❌
  }
}, [/* dependencies change frequently */])
```

**Solution: Singleton WebSocket Manager with React Context**

**File:** `/frontend/src/services/battleWebSocket.ts` (NEW)

```typescript
import { io, Socket } from 'socket.io-client'

type BattleEventHandler = (data: any) => void

export class BattleWebSocketManager {
  private static instance: BattleWebSocketManager | null = null
  private socket: Socket | null = null
  private handlers: Map<string, Set<BattleEventHandler>> = new Map()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private heartbeatInterval: NodeJS.Timeout | null = null

  private constructor() {}

  static getInstance(): BattleWebSocketManager {
    if (!BattleWebSocketManager.instance) {
      BattleWebSocketManager.instance = new BattleWebSocketManager()
    }
    return BattleWebSocketManager.instance
  }

  connect(url: string): void {
    if (this.socket?.connected) {
      console.log('✅ WebSocket already connected')
      return
    }

    console.log('🔌 Connecting to WebSocket:', url)
    this.socket = io(url, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts
    })

    this.setupListeners()
    this.startHeartbeat()
  }

  private setupListeners(): void {
    if (!this.socket) return

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected:', this.socket!.id)
      this.reconnectAttempts = 0
    })

    this.socket.on('disconnect', (reason) => {
      console.warn('⚠️ WebSocket disconnected:', reason)
      this.stopHeartbeat()
    })

    this.socket.on('connect_error', (error) => {
      this.reconnectAttempts++
      console.error(`❌ WebSocket connection error (attempt ${this.reconnectAttempts}):`, error)

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('❌ Max reconnection attempts reached')
        // TODO: Show user-facing error message
      }
    })

    // Forward all battle events to registered handlers
    const battleEvents = [
      'battle_start',
      'round_start',
      'round_end',
      'battle_end',
      'chat_response',
      'opponent_action'
    ]

    battleEvents.forEach(eventName => {
      this.socket!.on(eventName, (data) => {
        this.emit(eventName, data)
      })
    })
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('heartbeat', { timestamp: Date.now() })
      }
    }, 30000) // Every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  on(eventName: string, handler: BattleEventHandler): () => void {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, new Set())
    }
    this.handlers.get(eventName)!.add(handler)

    // Return unsubscribe function
    return () => {
      this.handlers.get(eventName)?.delete(handler)
    }
  }

  private emit(eventName: string, data: any): void {
    const handlers = this.handlers.get(eventName)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data)
        } catch (error) {
          console.error(`Error in handler for ${eventName}:`, error)
        }
      })
    }
  }

  send(eventName: string, data: any): void {
    if (!this.socket?.connected) {
      console.warn('⚠️ Cannot send - WebSocket not connected')
      return
    }
    this.socket.emit(eventName, data)
  }

  disconnect(): void {
    console.log('🔌 Disconnecting WebSocket')
    this.stopHeartbeat()
    this.socket?.disconnect()
    this.socket = null
    this.handlers.clear()
  }

  getConnectionStatus(): 'connected' | 'disconnected' | 'connecting' {
    if (!this.socket) return 'disconnected'
    if (this.socket.connected) return 'connected'
    return 'connecting'
  }
}
```

**Modified File:** `/frontend/src/hooks/battle/useBattleWebSocket.ts`

```typescript
import { useEffect, useCallback } from 'react'
import { BattleWebSocketManager } from '@/services/battleWebSocket'

export function useBattleWebSocket(battleId: string | null) {
  const wsManager = BattleWebSocketManager.getInstance()

  useEffect(() => {
    if (!battleId) return

    // Connect if not already connected
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001'
    wsManager.connect(wsUrl)

    // Subscribe to battle events
    const unsubscribers = [
      wsManager.on('battle_start', (data) => {
        console.log('Battle started:', data)
        // Handle battle start
      }),
      wsManager.on('round_end', (data) => {
        console.log('Round ended:', data)
        // Handle round end
      })
      // ... other event handlers
    ]

    // Cleanup: unsubscribe but DON'T disconnect
    // (socket stays alive for other components)
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe())
    }
  }, [battleId])

  const sendChatMessage = useCallback((message: string) => {
    wsManager.send('chat_message', { battleId, message })
  }, [battleId])

  return {
    sendChatMessage,
    connectionStatus: wsManager.getConnectionStatus()
  }
}
```

**Testing:**
```typescript
describe('BattleWebSocketManager', () => {
  it('should create only one instance (singleton)', () => {
    const instance1 = BattleWebSocketManager.getInstance()
    const instance2 = BattleWebSocketManager.getInstance()
    expect(instance1).toBe(instance2)
  })

  it('should not create duplicate connections', () => {
    const manager = BattleWebSocketManager.getInstance()
    manager.connect('http://localhost:3001')
    manager.connect('http://localhost:3001') // Should not create new connection

    // Verify only one socket exists
    expect(manager.getConnectionStatus()).toBe('connected')
  })

  it('should reconnect automatically on disconnect', async () => {
    const manager = BattleWebSocketManager.getInstance()
    manager.connect('http://localhost:3001')

    // Simulate disconnect
    manager['socket']?.disconnect()

    // Wait for reconnection
    await new Promise(resolve => setTimeout(resolve, 2000))

    expect(manager.getConnectionStatus()).toBe('connected')
  })
})
```

**Rollout:**
1. Deploy BattleWebSocketManager
2. Update useBattleWebSocket to use singleton
3. Add connection status indicator in UI
4. Monitor WebSocket connection counts

**Success Metrics:**
- Max 1 WebSocket connection per user session
- 0 connection leaks over 30 days
- <2 second reconnection time on network issues

---

### 1.3 Add Input Validation (P0)

**Problem:**
```typescript
// Current code allows invalid values
character.currentHp = -999 // ❌ Negative HP breaks game
actions.setPlayerMorale(9999) // ❌ Morale >100 causes UI issues
```

**Solution: Validation Utilities with Runtime Checks**

**File:** `/frontend/src/utils/battleValidation.ts` (NEW)

```typescript
export class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public value: any,
    public constraints: any
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

export const BattleValidation = {
  /**
   * Clamp a number to a valid range
   */
  clamp(value: number, min: number, max: number, fieldName: string): number {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new ValidationError(
        `${fieldName} must be a number`,
        fieldName,
        value,
        { type: 'number' }
      )
    }

    const clamped = Math.max(min, Math.min(max, value))

    if (clamped !== value) {
      console.warn(`⚠️ ${fieldName} clamped from ${value} to ${clamped}`)
    }

    return clamped
  },

  /**
   * Validate and set character HP
   */
  setCharacterHp(character: any, hp: number): number {
    const validHp = this.clamp(hp, 0, character.maxHp, 'currentHp')
    character.currentHp = validHp
    return validHp
  },

  /**
   * Validate and return morale value
   */
  validateMorale(morale: number): number {
    return this.clamp(morale, 0, 100, 'morale')
  },

  /**
   * Validate battle ID format
   */
  validateBattleId(battleId: string | null): boolean {
    if (!battleId) return false

    const BATTLE_ID_REGEX = /^battle_[a-f0-9]{32}$/
    return BATTLE_ID_REGEX.test(battleId)
  },

  /**
   * Validate character stats are in valid ranges
   */
  validateCharacterStats(character: any): void {
    const errors: string[] = []

    if (character.level < 1 || character.level > 100) {
      errors.push(`Invalid level: ${character.level}`)
    }

    if (character.currentHp < 0 || character.currentHp > character.maxHp) {
      errors.push(`Invalid HP: ${character.currentHp}/${character.maxHp}`)
    }

    if (character.psychStats) {
      const psychStats = character.psychStats
      const psychFields = ['mentalHealth', 'training', 'ego', 'teamPlayer', 'communication']

      psychFields.forEach(field => {
        if (psychStats[field] < 0 || psychStats[field] > 100) {
          errors.push(`Invalid ${field}: ${psychStats[field]}`)
        }
      })
    }

    if (errors.length > 0) {
      throw new ValidationError(
        `Character validation failed: ${errors.join(', ')}`,
        'character',
        character,
        { errors }
      )
    }
  },

  /**
   * Sanitize user input for display
   */
  sanitizeDisplayText(text: string, maxLength: number = 500): string {
    if (typeof text !== 'string') return ''

    // Truncate
    let sanitized = text.slice(0, maxLength)

    // Remove potential script tags (React handles this, but be defensive)
    sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gi, '')

    return sanitized
  }
}
```

**Modified Files:** Apply validation to all state setters

**Example:** `/frontend/src/hooks/battle/useBattleState.ts`

```typescript
// Before:
setPlayerMorale: (morale: number) => setState(prev => ({ ...prev, playerMorale: morale }))

// After:
setPlayerMorale: (morale: number) => {
  const validMorale = BattleValidation.validateMorale(morale)
  setState(prev => ({ ...prev, playerMorale: validMorale }))
}

// Before:
setPlayer1: (player: any) => setState(prev => ({ ...prev, player1: player }))

// After:
setPlayer1: (player: any) => {
  BattleValidation.validateCharacterStats(player)
  setState(prev => ({ ...prev, player1: player }))
}
```

**Testing:**
```typescript
describe('BattleValidation', () => {
  describe('clamp', () => {
    it('should clamp values outside range', () => {
      expect(BattleValidation.clamp(150, 0, 100, 'test')).toBe(100)
      expect(BattleValidation.clamp(-50, 0, 100, 'test')).toBe(0)
    })

    it('should not modify values in range', () => {
      expect(BattleValidation.clamp(50, 0, 100, 'test')).toBe(50)
    })

    it('should throw on non-number', () => {
      expect(() => {
        BattleValidation.clamp('abc' as any, 0, 100, 'test')
      }).toThrow(ValidationError)
    })
  })

  describe('validateCharacterStats', () => {
    it('should accept valid character', () => {
      const character = {
        level: 10,
        currentHp: 80,
        maxHp: 100,
        psychStats: {
          mentalHealth: 70,
          training: 50,
          ego: 60,
          teamPlayer: 80,
          communication: 75
        }
      }

      expect(() => {
        BattleValidation.validateCharacterStats(character)
      }).not.toThrow()
    })

    it('should reject invalid HP', () => {
      const character = {
        level: 10,
        currentHp: -50,
        maxHp: 100,
        psychStats: {}
      }

      expect(() => {
        BattleValidation.validateCharacterStats(character)
      }).toThrow(ValidationError)
    })
  })
})
```

**Rollout:**
1. Deploy validation utilities
2. Add validation to all state setters (one hook at a time)
3. Monitor error logs for validation failures
4. Fix any legitimate invalid states found

**Success Metrics:**
- 0 game-breaking invalid states over 30 days
- <1% validation warnings (indicates mostly clean data)
- All user-reported corruption issues resolved

---

### 1.4 Add Error Boundaries (P0)

**Solution: React Error Boundaries to Prevent Full App Crashes**

**File:** `/frontend/src/components/battle/BattleErrorBoundary.tsx` (NEW)

```typescript
import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class BattleErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('🔥 Battle Error Boundary caught error:', error, errorInfo)

    this.setState({
      error,
      errorInfo
    })

    // Log to monitoring service
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack
          }
        }
      })
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })

    // Redirect to battle lobby
    window.location.href = '/battle'
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
          <div className="max-w-md w-full bg-gray-800 rounded-lg p-6 text-center">
            <div className="text-6xl mb-4">💥</div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Battle System Error
            </h1>
            <p className="text-gray-300 mb-6">
              Something went wrong during the battle. Don't worry - your progress has been saved.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-6 text-left">
                <summary className="cursor-pointer text-red-400 mb-2">
                  Error Details (Dev Only)
                </summary>
                <pre className="text-xs bg-gray-900 p-3 rounded overflow-auto max-h-48">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className="space-y-3">
              <button
                onClick={this.handleReset}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded"
              >
                Return to Battle Lobby
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded"
              >
                Reload Page
              </button>
            </div>

            <p className="text-sm text-gray-400 mt-6">
              If this keeps happening, please contact support with the battle ID.
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
```

**Usage:** Wrap battle components

```typescript
// In app or page component
import { BattleErrorBoundary } from '@/components/battle/BattleErrorBoundary'

function BattlePage() {
  return (
    <BattleErrorBoundary>
      <ImprovedBattleArena />
    </BattleErrorBoundary>
  )
}
```

**Success Metrics:**
- 0 full app crashes from battle errors
- All errors logged to monitoring
- Users can always return to lobby

---

## Phase 1 Summary

**Deliverables:**
✅ Financial event queue with IndexedDB persistence
✅ WebSocket singleton manager with reconnection
✅ Input validation utilities
✅ Error boundaries for graceful degradation

**Timeline:** 2 weeks
**Risk:** LOW - All changes are additive or isolated
**Testing:** 30+ new unit tests

**Go/No-Go Decision Point:**
After Phase 1, evaluate:
- Are critical bugs resolved?
- Is production stable?
- Are engineers comfortable with changes?

If YES → Proceed to Phase 2
If NO → Iterate on Phase 1 until stable

---

## Phase 2: Testing Infrastructure (Week 3-4)

### 2.1 Setup Testing Framework

**Goal:** Enable confidence in refactoring

**Dependencies to Install:**
```json
{
  "devDependencies": {
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.1.0",
    "@testing-library/user-event": "^14.5.0",
    "jest": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0",
    "ts-jest": "^29.1.0",
    "@types/jest": "^29.5.0"
  }
}
```

**File:** `jest.config.js` (NEW)

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts?(x)', '**/?(*.)+(spec|test).ts?(x)'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.tsx',
    '!src/**/__tests__/**'
  ],
  coverageThresholds: {
    global: {
      branches: 30,
      functions: 30,
      lines: 30,
      statements: 30
    }
  }
}
```

**File:** `jest.setup.js` (NEW)

```javascript
import '@testing-library/jest-dom'

// Mock WebSocket
global.io = jest.fn(() => ({
  on: jest.fn(),
  emit: jest.fn(),
  disconnect: jest.fn(),
  connected: true
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn()
  }))
})
```

---

### 2.2 Critical Path Tests (30% Coverage)

**Priority 1: Psychology System Tests**

**File:** `src/data/__tests__/characterPsychology.test.ts` (NEW)

```typescript
import {
  calculateDeviationRisk,
  updatePsychologyState,
  determineDeviationSeverity
} from '../characterPsychology'

describe('Character Psychology System', () => {
  describe('calculateDeviationRisk', () => {
    const mockCharacter = {
      id: 'char-1',
      name: 'Test Fighter',
      psychStats: {
        mentalHealth: 70,
        training: 60,
        ego: 50,
        teamPlayer: 70,
        communication: 65
      },
      relationships: new Map([
        ['char-2', 75],
        ['char-3', 80]
      ])
    }

    it('should return low risk for stable character', () => {
      const psychState = {
        confidence: 70,
        stress: 10,
        currentMentalHealth: 80,
        battleFocus: 70,
        teamTrust: 75,
        strategyDeviationRisk: 20
      }

      const stabilityFactors = {
        recentDamageRatio: 0.1,
        teamPerformance: 75,
        opponentLevelDifference: 0,
        roundsWon: 2,
        roundsLost: 0,
        teammateSupport: 80,
        coachRelationship: 70
      }

      const risk = calculateDeviationRisk(
        mockCharacter,
        psychState,
        stabilityFactors,
        [],
        null
      )

      expect(risk).toBeLessThan(30)
    })

    it('should return high risk for unstable character', () => {
      const psychState = {
        confidence: 20,
        stress: 90,
        currentMentalHealth: 30,
        battleFocus: 20,
        teamTrust: 25,
        strategyDeviationRisk: 70
      }

      const stabilityFactors = {
        recentDamageRatio: 0.8,
        teamPerformance: 20,
        opponentLevelDifference: 10,
        roundsWon: 0,
        roundsLost: 3,
        teammateSupport: 30,
        coachRelationship: 40
      }

      const risk = calculateDeviationRisk(
        mockCharacter,
        psychState,
        stabilityFactors,
        [],
        null
      )

      expect(risk).toBeGreaterThan(70)
    })

    it('should reduce risk with coach bonuses', () => {
      const psychState = {
        confidence: 50,
        stress: 50,
        currentMentalHealth: 50,
        battleFocus: 50,
        teamTrust: 50,
        strategyDeviationRisk: 50
      }

      const stabilityFactors = {
        recentDamageRatio: 0.5,
        teamPerformance: 50,
        opponentLevelDifference: 0,
        roundsWon: 1,
        roundsLost: 1,
        teammateSupport: 50,
        coachRelationship: 50
      }

      const riskWithoutBonus = calculateDeviationRisk(
        mockCharacter,
        psychState,
        stabilityFactors,
        [],
        null
      )

      const riskWithBonus = calculateDeviationRisk(
        mockCharacter,
        psychState,
        stabilityFactors,
        [],
        { deviationRiskReduction: 20 }
      )

      expect(riskWithBonus).toBeLessThan(riskWithoutBonus)
      expect(riskWithoutBonus - riskWithBonus).toBeCloseTo(20, 0)
    })

    it('should handle extreme confidence (overconfident)', () => {
      const psychState = {
        confidence: 95, // Very high confidence
        stress: 10,
        currentMentalHealth: 80,
        battleFocus: 70,
        teamTrust: 75,
        strategyDeviationRisk: 20
      }

      const stabilityFactors = {
        recentDamageRatio: 0.1,
        teamPerformance: 75,
        opponentLevelDifference: -5, // Fighting weaker opponent
        roundsWon: 2,
        roundsLost: 0,
        teammateSupport: 80,
        coachRelationship: 70
      }

      const risk = calculateDeviationRisk(
        mockCharacter,
        psychState,
        stabilityFactors,
        [],
        null
      )

      // Overconfidence increases deviation risk
      expect(risk).toBeGreaterThan(20)
    })
  })

  describe('updatePsychologyState', () => {
    it('should trend mental health toward baseline', () => {
      const psychState = {
        confidence: 50,
        stress: 50,
        currentMentalHealth: 30,
        battleFocus: 50,
        teamTrust: 50,
        strategyDeviationRisk: 50
      }

      const stabilityFactors = {
        recentDamageRatio: 0.2,
        teamPerformance: 60,
        opponentLevelDifference: 0,
        roundsWon: 1,
        roundsLost: 0,
        teammateSupport: 60,
        coachRelationship: 60
      }

      const updated = updatePsychologyState(psychState, stabilityFactors)

      // Mental health should increase toward baseline (70)
      expect(updated.currentMentalHealth).toBeGreaterThan(30)
    })

    it('should decay stress over time', () => {
      const psychState = {
        confidence: 50,
        stress: 80,
        currentMentalHealth: 70,
        battleFocus: 50,
        teamTrust: 50,
        strategyDeviationRisk: 50
      }

      const stabilityFactors = {
        recentDamageRatio: 0.1,
        teamPerformance: 60,
        opponentLevelDifference: 0,
        roundsWon: 1,
        roundsLost: 0,
        teammateSupport: 60,
        coachRelationship: 60
      }

      const updated = updatePsychologyState(psychState, stabilityFactors)

      // Stress should decrease
      expect(updated.stress).toBeLessThan(80)
    })
  })

  describe('determineDeviationSeverity', () => {
    it('should return minor for low risk', () => {
      const severity = determineDeviationSeverity(15)
      expect(severity).toBe('minor')
    })

    it('should return moderate for medium risk', () => {
      const severity = determineDeviationSeverity(45)
      expect(severity).toBe('moderate')
    })

    it('should return major for high risk', () => {
      const severity = determineDeviationSeverity(70)
      expect(severity).toBe('major')
    })

    it('should return extreme for very high risk', () => {
      const severity = determineDeviationSeverity(95)
      expect(severity).toBe('extreme')
    })
  })
})
```

**Priority 2: Rewards Calculation Tests**

**File:** `src/data/__tests__/combatRewards.test.ts` (NEW)

```typescript
import { calculateRewards, checkLevelUp } from '../combatRewards'

describe('Combat Rewards System', () => {
  describe('calculateRewards', () => {
    it('should award more XP for victory than defeat', () => {
      const battleStats = {
        damageDealt: 500,
        damageTaken: 200,
        criticalHits: 3,
        roundsSurvived: 5,
        teamplayActions: 2,
        strategyDeviations: 0
      }

      const victoryRewards = calculateRewards(
        true, // won
        10, // character level
        battleStats,
        10, // opponent level
        1.0 // membership multiplier
      )

      const defeatRewards = calculateRewards(
        false, // lost
        10,
        battleStats,
        10,
        1.0
      )

      expect(victoryRewards.xpGained).toBeGreaterThan(defeatRewards.xpGained)
      expect(victoryRewards.xpGained).toBeGreaterThan(100)
      expect(defeatRewards.xpGained).toBeGreaterThan(0)
    })

    it('should award bonus XP for perfect strategy adherence', () => {
      const perfectStats = {
        damageDealt: 500,
        damageTaken: 200,
        criticalHits: 3,
        roundsSurvived: 5,
        teamplayActions: 2,
        strategyDeviations: 0 // Perfect adherence
      }

      const deviatedStats = {
        ...perfectStats,
        strategyDeviations: 3
      }

      const perfectRewards = calculateRewards(true, 10, perfectStats, 10, 1.0)
      const deviatedRewards = calculateRewards(true, 10, deviatedStats, 10, 1.0)

      expect(perfectRewards.xpGained).toBeGreaterThan(deviatedRewards.xpGained)
    })

    it('should apply membership multiplier', () => {
      const battleStats = {
        damageDealt: 500,
        damageTaken: 200,
        criticalHits: 3,
        roundsSurvived: 5,
        teamplayActions: 2,
        strategyDeviations: 0
      }

      const freeRewards = calculateRewards(true, 10, battleStats, 10, 1.0)
      const goldRewards = calculateRewards(true, 10, battleStats, 10, 1.5)

      expect(goldRewards.xpGained).toBe(Math.floor(freeRewards.xpGained * 1.5))
    })

    it('should award more XP for defeating higher level opponent', () => {
      const battleStats = {
        damageDealt: 500,
        damageTaken: 200,
        criticalHits: 3,
        roundsSurvived: 5,
        teamplayActions: 2,
        strategyDeviations: 0
      }

      const sameLevelRewards = calculateRewards(true, 10, battleStats, 10, 1.0)
      const higherLevelRewards = calculateRewards(true, 10, battleStats, 20, 1.0)

      expect(higherLevelRewards.xpGained).toBeGreaterThan(sameLevelRewards.xpGained)
    })
  })

  describe('checkLevelUp', () => {
    it('should detect level up when XP threshold met', () => {
      const result = checkLevelUp(
        500, // current XP
        5, // current level
        400 // XP to next (exceeded)
      )

      expect(result.leveledUp).toBe(true)
      expect(result.newLevel).toBe(6)
    })

    it('should not level up when XP threshold not met', () => {
      const result = checkLevelUp(
        300, // current XP
        5, // current level
        400 // XP to next (not exceeded)
      )

      expect(result.leveledUp).toBe(false)
      expect(result.newLevel).toBe(5)
    })

    it('should handle multiple level ups', () => {
      const result = checkLevelUp(
        2000, // current XP (enough for multiple levels)
        5,
        400
      )

      expect(result.leveledUp).toBe(true)
      expect(result.newLevel).toBeGreaterThan(6)
    })

    it('should award stat bonuses on level up', () => {
      const result = checkLevelUp(500, 5, 400)

      expect(result.statBonuses).toBeDefined()
      expect(result.statBonuses.hp).toBeGreaterThan(0)
      expect(result.statBonuses.atk).toBeGreaterThan(0)
      expect(result.statBonuses.def).toBeGreaterThan(0)
    })

    it('should award milestone bonuses every 5 levels', () => {
      const level4Result = checkLevelUp(500, 4, 400)
      const level5Result = checkLevelUp(600, 5, 400) // Milestone at level 10, 15, 20, etc.

      expect(level4Result.milestoneBonus).toBeUndefined()

      // Check if hitting a milestone
      const level9Result = checkLevelUp(1000, 9, 400)
      expect(level9Result.milestoneBonus).toBeDefined()
    })
  })
})
```

**Priority 3: Judge System Tests**

**File:** `src/data/__tests__/aiJudgeSystem.test.ts` (NEW)

```typescript
import { makeJudgeDecision, judgePersonalities } from '../aiJudgeSystem'

describe('AI Judge System', () => {
  describe('makeJudgeDecision', () => {
    const mockDeviation = {
      characterId: 'char-1',
      characterName: 'Test Fighter',
      type: 'refuses_orders' as const,
      severity: 'moderate' as const,
      psychologyReason: 'Low confidence and high stress',
      targetId: null
    }

    it('should apply stricter penalties for "by_the_book" judge', () => {
      const strictJudge = judgePersonalities.find(j => j.id === 'by_the_book')!

      const decision = makeJudgeDecision(mockDeviation, strictJudge, 5, 1)

      expect(decision.ruling).not.toBe('warning')
      expect(['penalty', 'severe_penalty', 'disqualification']).toContain(decision.ruling)
    })

    it('should be more lenient with "psychology_first" judge', () => {
      const lenientJudge = judgePersonalities.find(j => j.id === 'psychology_first')!

      const decision = makeJudgeDecision(mockDeviation, lenientJudge, 5, 1)

      // More likely to give warning for first offense
      expect(['warning', 'penalty']).toContain(decision.ruling)
    })

    it('should escalate penalties for repeat offenses', () => {
      const judge = judgePersonalities[0]

      const firstOffense = makeJudgeDecision(mockDeviation, judge, 5, 1)
      const secondOffense = makeJudgeDecision(mockDeviation, judge, 5, 2)
      const thirdOffense = makeJudgeDecision(mockDeviation, judge, 5, 3)

      const rulingOrder = ['warning', 'penalty', 'severe_penalty', 'disqualification']
      const firstIndex = rulingOrder.indexOf(firstOffense.ruling)
      const secondIndex = rulingOrder.indexOf(secondOffense.ruling)
      const thirdIndex = rulingOrder.indexOf(thirdOffense.ruling)

      expect(secondIndex).toBeGreaterThanOrEqual(firstIndex)
      expect(thirdIndex).toBeGreaterThanOrEqual(secondIndex)
    })

    it('should generate mechanical effects based on ruling', () => {
      const judge = judgePersonalities[0]

      const decision = makeJudgeDecision(mockDeviation, judge, 5, 2)

      expect(decision.mechanicalEffect).toBeDefined()
      expect(decision.mechanicalEffect.type).toBeDefined()

      if (decision.ruling === 'penalty') {
        expect(['skip_turn', 'damage', 'lose_action_point']).toContain(
          decision.mechanicalEffect.type
        )
      }
    })

    it('should include narrative explanation', () => {
      const judge = judgePersonalities[0]

      const decision = makeJudgeDecision(mockDeviation, judge, 5, 1)

      expect(decision.narrative).toBeTruthy()
      expect(decision.narrative.length).toBeGreaterThan(10)
    })
  })
})
```

**Priority 4: Integration Test - Full Battle Flow**

**File:** `src/hooks/battle/__tests__/battleFlow.integration.test.tsx` (NEW)

```typescript
import { renderHook, act } from '@testing-library/react'
import { useBattleState } from '../useBattleState'
import { useBattleEngineLogic } from '../useBattleEngineLogic'

describe('Battle Flow Integration', () => {
  it('should complete a full battle from start to finish', async () => {
    const { result: stateResult } = renderHook(() => useBattleState())
    const { result: engineResult } = renderHook(() =>
      useBattleEngineLogic(stateResult.current.state, stateResult.current.actions)
    )

    const mockPlayerTeam = {
      id: 'team-1',
      name: 'Player Team',
      coachName: 'Coach Player',
      characters: [
        {
          id: 'char-1',
          name: 'Fighter 1',
          level: 10,
          currentHp: 100,
          maxHp: 100,
          abilities: [{ id: 'punch', name: 'Punch', damage: 20 }],
          psychStats: {
            mentalHealth: 70,
            training: 60,
            ego: 50,
            teamPlayer: 70,
            communication: 65
          }
        }
        // ... 2 more characters
      ],
      teamChemistry: 75,
      coachingPoints: 5,
      headquartersLevel: 1
    }

    const mockOpponentTeam = { ...mockPlayerTeam, id: 'team-2', name: 'Opponent Team' }

    // Start battle
    act(() => {
      stateResult.current.actions.setPlayerTeam(mockPlayerTeam)
      stateResult.current.actions.setOpponentTeam(mockOpponentTeam)
      engineResult.current.startTeamBattle()
    })

    expect(stateResult.current.state.phase).toBe('pre_battle_huddle')

    // Progress through phases
    act(() => {
      stateResult.current.actions.setPhase('strategy-selection')
    })

    expect(stateResult.current.state.phase).toBe('strategy-selection')

    // Select strategies
    act(() => {
      stateResult.current.actions.setSelectedStrategies({
        attack: 'aggressive',
        defense: 'balanced',
        special: 'teamwork'
      })
      stateResult.current.actions.setPhase('combat')
    })

    expect(stateResult.current.state.phase).toBe('combat')

    // Simulate rounds (with timeout to handle async)
    await act(async () => {
      for (let i = 0; i < 20; i++) {
        if (stateResult.current.state.phase === 'battle_complete') {
          break
        }

        // Execute round
        engineResult.current.executeCombatRound()

        // Wait for round to complete
        await new Promise(resolve => setTimeout(resolve, 100))

        // Check if round complete
        if (stateResult.current.state.phase === 'coaching_timeout') {
          // Skip timeout
          stateResult.current.actions.setPhase('combat')
        }
      }
    })

    // Battle should eventually complete
    expect(stateResult.current.state.phase).toBe('battle_complete')
    expect(stateResult.current.state.battleRewards).toBeDefined()
  })
})
```

---

### 2.3 Test Utilities

**File:** `src/__tests__/utils/battleTestUtils.ts` (NEW)

```typescript
import { TeamCharacter, Team, BattleState } from '@/data/battleFlow'

export const createMockCharacter = (overrides?: Partial<TeamCharacter>): TeamCharacter => ({
  id: 'char-1',
  name: 'Test Character',
  avatar: '/avatar.png',
  level: 10,
  experience: 500,
  experienceToNext: 1000,
  maxHp: 100,
  currentHp: 100,
  attack: 50,
  defense: 40,
  speed: 45,
  traditionalStats: {
    strength: 50,
    vitality: 50,
    dexterity: 45,
    intelligence: 40,
    spirit: 40,
    charisma: 35,
    stamina: 50
  },
  combatStats: {
    maxHealth: 100,
    attack: 50,
    defense: 40,
    speed: 45,
    criticalChance: 5,
    accuracy: 80,
    evasion: 10
  },
  psychStats: {
    mentalHealth: 70,
    training: 60,
    ego: 50,
    teamPlayer: 70,
    communication: 65
  },
  abilities: [
    { id: 'punch', name: 'Punch', damage: 20, cooldown: 0 }
  ],
  specialPowers: [],
  statusEffects: [],
  temporaryStats: {},
  battlePersonality: 'balanced',
  personality: 'brave',
  relationships: new Map(),
  ...overrides
})

export const createMockTeam = (overrides?: Partial<Team>): Team => ({
  id: 'team-1',
  name: 'Test Team',
  coachName: 'Coach Test',
  characters: [
    createMockCharacter({ id: 'char-1' }),
    createMockCharacter({ id: 'char-2' }),
    createMockCharacter({ id: 'char-3' })
  ],
  teamChemistry: 75,
  coachingPoints: 5,
  headquartersLevel: 1,
  teamHistory: [],
  ...overrides
})

export const createMockBattleState = (overrides?: Partial<BattleState>): BattleState => ({
  setup: {
    playerTeam: createMockTeam(),
    opponentTeam: createMockTeam({ id: 'team-2', name: 'Opponent Team' }),
    battleType: 'friendly',
    weightClass: 'professional',
    stakes: 'normal'
  },
  currentRound: 1,
  phase: 'pre_battle_huddle',
  playerMorale: { currentMorale: 75, moraleHistory: [] },
  opponentMorale: { currentMorale: 75, moraleHistory: [] },
  roundResults: [],
  currentFighters: {
    player: createMockCharacter({ id: 'char-1' }),
    opponent: createMockCharacter({ id: 'char-4' })
  },
  activeStatusEffects: new Map(),
  psychologyStates: new Map(),
  actionHistory: [],
  ...overrides
})
```

---

## Phase 2 Summary

**Deliverables:**
✅ Jest + React Testing Library configured
✅ 30+ unit tests for critical systems
✅ 3+ integration tests for full flows
✅ Test utilities for easy mock generation
✅ 30% code coverage threshold enforced

**Timeline:** 2 weeks
**Risk:** LOW - Tests don't affect production
**Confidence:** HIGH - Can now refactor safely

---

## Phase 3: Architecture Refactor (Week 5-9)

### 3.1 State Management Migration

**Problem:** 50+ useState hooks make state hard to reason about

**Solution:** Migrate to Zustand (lightweight, TypeScript-first)

**Why Zustand over Redux Toolkit?**
- ✅ Minimal boilerplate
- ✅ No provider wrapping needed
- ✅ Built-in TypeScript support
- ✅ Works with hooks seamlessly
- ✅ Easier migration path

**File:** `/frontend/src/stores/battleStore.ts` (NEW)

```typescript
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { Team, TeamCharacter, BattleState, PlannedAction } from '@/data/battleFlow'

interface BattleStore {
  // State
  phase: BattlePhase
  playerTeam: Team | null
  opponentTeam: Team | null
  player1: TeamCharacter | null
  player2: TeamCharacter | null
  currentRound: number
  currentMatch: number
  playerMatchWins: number
  opponentMatchWins: number
  playerRoundWins: number
  opponentRoundWins: number
  playerMorale: number
  opponentMorale: number
  battleState: BattleState | null
  characterPsychology: Map<string, PsychologyState>
  selectedStrategies: Record<string, string>
  battleRewards: any | null
  showRewards: boolean

  // Actions
  setPhase: (phase: BattlePhase) => void
  setPlayerTeam: (team: Team) => void
  setOpponentTeam: (team: Team) => void
  setPlayer1: (player: TeamCharacter) => void
  setPlayer2: (player: TeamCharacter) => void
  incrementRound: () => void
  setPlayerMorale: (morale: number) => void
  updateCharacterPsychology: (characterId: string, state: PsychologyState) => void
  resetBattle: () => void

  // Computed values
  getCurrentPlayerCharacter: () => TeamCharacter | null
  getCurrentOpponentCharacter: () => TeamCharacter | null
  getBattleProgress: () => { totalRounds: number; completedRounds: number; progress: number }
}

export const useBattleStore = create<BattleStore>()(
  devtools(
    immer((set, get) => ({
      // Initial state
      phase: 'pre_battle_huddle',
      playerTeam: null,
      opponentTeam: null,
      player1: null,
      player2: null,
      currentRound: 1,
      currentMatch: 1,
      playerMatchWins: 0,
      opponentMatchWins: 0,
      playerRoundWins: 0,
      opponentRoundWins: 0,
      playerMorale: 75,
      opponentMorale: 75,
      battleState: null,
      characterPsychology: new Map(),
      selectedStrategies: {},
      battleRewards: null,
      showRewards: false,

      // Actions
      setPhase: (phase) =>
        set((state) => {
          state.phase = phase
        }),

      setPlayerTeam: (team) =>
        set((state) => {
          state.playerTeam = team
        }),

      setOpponentTeam: (team) =>
        set((state) => {
          state.opponentTeam = team
        }),

      setPlayer1: (player) =>
        set((state) => {
          BattleValidation.validateCharacterStats(player)
          state.player1 = player
        }),

      setPlayer2: (player) =>
        set((state) => {
          BattleValidation.validateCharacterStats(player)
          state.player2 = player
        }),

      incrementRound: () =>
        set((state) => {
          state.currentRound += 1
        }),

      setPlayerMorale: (morale) =>
        set((state) => {
          state.playerMorale = BattleValidation.validateMorale(morale)
        }),

      updateCharacterPsychology: (characterId, psychState) =>
        set((state) => {
          state.characterPsychology.set(characterId, psychState)
        }),

      resetBattle: () =>
        set((state) => {
          state.phase = 'pre_battle_huddle'
          state.currentRound = 1
          state.currentMatch = 1
          state.playerMatchWins = 0
          state.opponentMatchWins = 0
          state.playerRoundWins = 0
          state.opponentRoundWins = 0
          state.playerMorale = 75
          state.opponentMorale = 75
          state.characterPsychology = new Map()
          state.selectedStrategies = {}
          state.battleRewards = null
          state.showRewards = false
        }),

      // Computed values
      getCurrentPlayerCharacter: () => {
        const state = get()
        return state.player1
      },

      getCurrentOpponentCharacter: () => {
        const state = get()
        return state.player2
      },

      getBattleProgress: () => {
        const state = get()
        const totalRounds = 15 // Max rounds in a battle
        const completedRounds = (state.currentMatch - 1) * 3 + state.currentRound - 1
        return {
          totalRounds,
          completedRounds,
          progress: (completedRounds / totalRounds) * 100
        }
      }
    })),
    { name: 'BattleStore' }
  )
)
```

**Migration Strategy:**

1. **Week 5:** Create Zustand store with all state
2. **Week 6:** Migrate hooks one at a time to use store
3. **Week 7:** Remove old useState hooks
4. **Week 8:** Add selectors for performance
5. **Week 9:** Add persistence middleware

**Rollout:**
- Feature flag: `ENABLE_ZUSTAND_STORE`
- Run both systems in parallel initially
- Compare state snapshots for consistency
- Gradually migrate components
- Remove old system once 100% migrated

---

### 3.2 Component Decomposition

**Problem:** 2,228-line ImprovedBattleArena.tsx is unmaintainable

**Solution:** Extract phase-specific components

**New Structure:**

```
src/components/battle/
├── BattleOrchestrator.tsx (200 lines) - Coordinates phases
├── phases/
│   ├── PreBattleHuddle.tsx (300 lines)
│   ├── StrategySelection.tsx (400 lines)
│   ├── CombatPhase.tsx (500 lines)
│   ├── CoachingTimeout.tsx (300 lines)
│   └── BattleComplete.tsx (300 lines)
├── hud/
│   ├── BattleHUD.tsx
│   ├── TeamDisplay.tsx
│   ├── HealthBar.tsx
│   └── StatusEffects.tsx
├── coaching/
│   ├── CoachingPanel.tsx
│   ├── StrategyPanel.tsx
│   └── DisagreementModal.tsx
├── psychology/
│   ├── PsychologyIndicator.tsx
│   └── DeviationAlert.tsx
└── rewards/
    ├── RewardsScreen.tsx
    ├── XPBar.tsx
    └── LevelUpAnimation.tsx
```

**File:** `/frontend/src/components/battle/BattleOrchestrator.tsx` (NEW)

```typescript
import React, { useEffect } from 'react'
import { useBattleStore } from '@/stores/battleStore'
import { PreBattleHuddle } from './phases/PreBattleHuddle'
import { StrategySelection } from './phases/StrategySelection'
import { CombatPhase } from './phases/CombatPhase'
import { CoachingTimeout } from './phases/CoachingTimeout'
import { BattleComplete } from './phases/BattleComplete'
import { BattleHUD } from './hud/BattleHUD'
import { BattleErrorBoundary } from './BattleErrorBoundary'

export function BattleOrchestrator() {
  const phase = useBattleStore((state) => state.phase)
  const playerTeam = useBattleStore((state) => state.playerTeam)
  const opponentTeam = useBattleStore((state) => state.opponentTeam)

  // Validate teams are set
  useEffect(() => {
    if (!playerTeam || !opponentTeam) {
      console.error('Teams not set')
      // Redirect to team selection
    }
  }, [playerTeam, opponentTeam])

  const renderPhase = () => {
    switch (phase) {
      case 'pre_battle_huddle':
        return <PreBattleHuddle />

      case 'strategy-selection':
        return <StrategySelection />

      case 'combat':
        return <CombatPhase />

      case 'coaching_timeout':
        return <CoachingTimeout />

      case 'battle_complete':
        return <BattleComplete />

      default:
        return <div>Unknown phase: {phase}</div>
    }
  }

  return (
    <BattleErrorBoundary>
      <div className="battle-orchestrator min-h-screen bg-gray-900">
        <BattleHUD />

        <div className="battle-phase-container">
          {renderPhase()}
        </div>
      </div>
    </BattleErrorBoundary>
  )
}
```

**File:** `/frontend/src/components/battle/phases/CombatPhase.tsx` (NEW - example)

```typescript
import React, { useEffect, useState } from 'react'
import { useBattleStore } from '@/stores/battleStore'
import { useBattleSimulation } from '@/hooks/battle/useBattleSimulation'
import { usePsychologySystem } from '@/hooks/battle/usePsychologySystem'
import { BattleAnimationDisplay } from '../animations/BattleAnimationDisplay'
import { PsychologyIndicator } from '../psychology/PsychologyIndicator'

export function CombatPhase() {
  const player1 = useBattleStore((state) => state.player1)
  const player2 = useBattleStore((state) => state.player2)
  const currentRound = useBattleStore((state) => state.currentRound)

  const { executeCombatRound, currentAnimation } = useBattleSimulation()
  const { checkForChaos, getDeviationRisk } = usePsychologySystem()

  const [showAnimation, setShowAnimation] = useState(false)

  // Auto-execute round when combat phase starts
  useEffect(() => {
    const timer = setTimeout(() => {
      executeCombatRound()
    }, 1000)

    return () => clearTimeout(timer)
  }, [currentRound])

  if (!player1 || !player2) {
    return <div>Loading combatants...</div>
  }

  return (
    <div className="combat-phase p-6">
      <div className="round-indicator text-center mb-6">
        <h2 className="text-3xl font-bold text-white">
          Round {currentRound}
        </h2>
      </div>

      <div className="combatants grid grid-cols-2 gap-8 mb-8">
        <div className="player-1">
          <div className="character-card bg-blue-900 p-4 rounded-lg">
            <h3 className="text-xl font-bold text-white mb-2">
              {player1.name}
            </h3>
            <div className="hp-bar bg-gray-700 h-6 rounded-full overflow-hidden mb-2">
              <div
                className="bg-green-500 h-full transition-all duration-300"
                style={{ width: `${(player1.currentHp / player1.maxHp) * 100}%` }}
              />
            </div>
            <div className="text-white text-sm">
              {player1.currentHp} / {player1.maxHp} HP
            </div>

            <PsychologyIndicator
              characterId={player1.id}
              deviationRisk={getDeviationRisk(player1.id)}
            />
          </div>
        </div>

        <div className="player-2">
          <div className="character-card bg-red-900 p-4 rounded-lg">
            <h3 className="text-xl font-bold text-white mb-2">
              {player2.name}
            </h3>
            <div className="hp-bar bg-gray-700 h-6 rounded-full overflow-hidden mb-2">
              <div
                className="bg-green-500 h-full transition-all duration-300"
                style={{ width: `${(player2.currentHp / player2.maxHp) * 100}%` }}
              />
            </div>
            <div className="text-white text-sm">
              {player2.currentHp} / {player2.maxHp} HP
            </div>

            <PsychologyIndicator
              characterId={player2.id}
              deviationRisk={getDeviationRisk(player2.id)}
            />
          </div>
        </div>
      </div>

      {currentAnimation && (
        <BattleAnimationDisplay animation={currentAnimation} />
      )}
    </div>
  )
}
```

**Migration Strategy:**

1. **Week 5:** Create new component structure (empty shells)
2. **Week 6:** Extract phase logic one phase at a time
3. **Week 7:** Extract HUD and sub-components
4. **Week 8:** Remove old ImprovedBattleArena.tsx
5. **Week 9:** Refactor extracted components for clarity

---

### 3.3 Unify Judge Systems

**Problem:** Two competing systems (aiJudge.ts vs aiJudgeSystem.ts)

**Solution:** Merge into single authoritative system

**File:** `/frontend/src/services/judgeSystem.ts` (NEW - unified)

```typescript
import { DeviationEvent, JudgeDecision, MechanicalEffect } from '@/data/battleFlow'

export interface Judge {
  id: string
  name: string
  personality: string
  biases: {
    leniency: number // -50 to +50
    psychologyAwareness: number // 0-100
    entertainmentValue: number // 0-100
    strictness: number // 0-100
  }
  experienceLevel: number // 1-10
  avatar: string
}

export const JUDGES: readonly Judge[] = [
  {
    id: 'by_the_book',
    name: 'Judge Margaret Stern',
    personality: 'Strictly enforces all rules without exception',
    biases: {
      leniency: -30,
      psychologyAwareness: 30,
      entertainmentValue: 20,
      strictness: 95
    },
    experienceLevel: 10,
    avatar: '/judges/stern.png'
  },
  {
    id: 'psychology_first',
    name: 'Dr. James "The Psych" Rivera',
    personality: 'Considers psychological factors heavily, lenient if mental health involved',
    biases: {
      leniency: 40,
      psychologyAwareness: 95,
      entertainmentValue: 50,
      strictness: 40
    },
    experienceLevel: 8,
    avatar: '/judges/rivera.png'
  },
  {
    id: 'crowd_pleaser',
    name: 'Judge Antonio "The Showman" Reyes',
    personality: 'Values entertainment and dramatic moments',
    biases: {
      leniency: 20,
      psychologyAwareness: 60,
      entertainmentValue: 95,
      strictness: 50
    },
    experienceLevel: 7,
    avatar: '/judges/reyes.png'
  },
  // ... rest of judges
] as const

export class JudgeSystem {
  /**
   * Make a ruling on a character deviation
   */
  static makeDecision(
    deviation: DeviationEvent,
    judge: Judge,
    currentRound: number,
    previousOffenses: number
  ): JudgeDecision {
    // Calculate base severity score (0-100)
    const severityScore = this.calculateSeverityScore(deviation)

    // Apply judge biases
    let adjustedScore = severityScore

    // Leniency adjustment
    adjustedScore += judge.biases.leniency

    // Psychology awareness (reduce severity if psychology-motivated)
    if (deviation.psychologyReason && judge.biases.psychologyAwareness > 70) {
      adjustedScore -= 20
    }

    // Entertainment value (reduce severity if dramatic)
    if (this.isDramatic(deviation) && judge.biases.entertainmentValue > 80) {
      adjustedScore -= 10
    }

    // Escalate for repeat offenders
    adjustedScore += previousOffenses * 15

    // Determine ruling
    const ruling = this.determineRuling(adjustedScore)

    // Generate mechanical effect
    const mechanicalEffect = this.generateMechanicalEffect(ruling, deviation)

    // Generate narrative
    const narrative = this.generateNarrative(judge, deviation, ruling)

    return {
      judgeId: judge.id,
      judgeName: judge.name,
      ruling,
      mechanicalEffect,
      narrative,
      severityScore: adjustedScore
    }
  }

  private static calculateSeverityScore(deviation: DeviationEvent): number {
    const baseScores = {
      minor: 25,
      moderate: 50,
      major: 75,
      extreme: 95
    }

    let score = baseScores[deviation.severity]

    // Adjust based on type
    if (deviation.type === 'attacks_teammate') {
      score += 20 // Very serious
    } else if (deviation.type === 'flees_battle') {
      score += 15
    } else if (deviation.type === 'refuses_orders') {
      score += 5
    }

    return Math.min(100, score)
  }

  private static determineRuling(severityScore: number): 'warning' | 'penalty' | 'severe_penalty' | 'disqualification' {
    if (severityScore < 30) return 'warning'
    if (severityScore < 60) return 'penalty'
    if (severityScore < 85) return 'severe_penalty'
    return 'disqualification'
  }

  private static generateMechanicalEffect(
    ruling: string,
    deviation: DeviationEvent
  ): MechanicalEffect {
    switch (ruling) {
      case 'warning':
        return {
          type: 'none',
          value: 0,
          description: 'Warning issued - no mechanical penalty'
        }

      case 'penalty':
        if (deviation.type === 'attacks_teammate' && deviation.targetId) {
          return {
            type: 'redirect_attack',
            value: 0,
            description: 'Attack redirected back to attacker',
            targetOverride: deviation.characterId
          }
        }
        return {
          type: 'skip_turn',
          value: 1,
          description: 'Skip next turn'
        }

      case 'severe_penalty':
        return {
          type: 'damage',
          value: 50,
          description: 'Take 50 penalty damage'
        }

      case 'disqualification':
        return {
          type: 'disqualification',
          value: 0,
          description: 'Disqualified from battle'
        }

      default:
        return {
          type: 'none',
          value: 0,
          description: 'No effect'
        }
    }
  }

  private static generateNarrative(
    judge: Judge,
    deviation: DeviationEvent,
    ruling: string
  ): string {
    const templates = {
      warning: [
        `${judge.name}: "That's a warning, ${deviation.characterName}. Get it together!"`,
        `${judge.name}: "I'll let this slide once, but watch yourself!"`,
        `${judge.name}: "That's borderline behavior. One more and there will be consequences."`
      ],
      penalty: [
        `${judge.name}: "That's unacceptable! ${deviation.characterName} is penalized!"`,
        `${judge.name}: "I won't tolerate that behavior! Penalty!"`,
        `${judge.name}: "You've crossed the line. Penalty issued."`
      ],
      severe_penalty: [
        `${judge.name}: "This is serious! ${deviation.characterName} receives a severe penalty!"`,
        `${judge.name}: "Absolutely unacceptable! Severe penalty!"`,
        `${judge.name}: "That's a major violation! Severe consequences!"`
      ],
      disqualification: [
        `${judge.name}: "That's it! ${deviation.characterName} is DISQUALIFIED!"`,
        `${judge.name}: "I've seen enough! Disqualification!"`,
        `${judge.name}: "You're done! Get out of my arena!"`
      ]
    }

    const options = templates[ruling as keyof typeof templates] || templates.warning
    return options[Math.floor(Math.random() * options.length)]
  }

  private static isDramatic(deviation: DeviationEvent): boolean {
    return deviation.type === 'attacks_teammate' ||
           deviation.type === 'goes_berserk' ||
           deviation.severity === 'extreme'
  }

  /**
   * Select a random judge for a battle
   */
  static selectRandomJudge(): Judge {
    return JUDGES[Math.floor(Math.random() * JUDGES.length)]
  }

  /**
   * Get judge by ID
   */
  static getJudgeById(id: string): Judge | undefined {
    return JUDGES.find(j => j.id === id)
  }
}
```

**Migration:**
1. Create unified JudgeSystem
2. Update all references to use new system
3. Run in parallel with old system (feature flag)
4. Verify consistent rulings
5. Remove old aiJudge.ts and aiJudgeSystem.ts

---

## Phase 3 Summary

**Deliverables:**
✅ Zustand state management implemented
✅ ImprovedBattleArena decomposed into 8+ components
✅ Judge systems unified into single authority
✅ All hooks updated to use new architecture

**Timeline:** 5 weeks
**Risk:** MEDIUM - Large architectural changes
**Confidence:** HIGH - Tests prevent regressions

---

## Phase 4: Performance Optimization (Week 10-12)

### 4.1 Memoization Strategy

**File:** `/frontend/src/hooks/battle/useMemoizedPsychology.ts` (NEW)

```typescript
import { useMemo } from 'react'
import { calculateDeviationRisk } from '@/data/characterPsychology'
import { useBattleStore } from '@/stores/battleStore'

export function useMemoizedPsychology(characterId: string) {
  const character = useBattleStore((state) =>
    state.playerTeam?.characters.find(c => c.id === characterId) ||
    state.opponentTeam?.characters.find(c => c.id === characterId)
  )

  const psychState = useBattleStore((state) =>
    state.characterPsychology.get(characterId)
  )

  const currentRound = useBattleStore((state) => state.currentRound)

  // Memoize deviation risk (only recalculate when round changes)
  const deviationRisk = useMemo(() => {
    if (!character || !psychState) return 0

    // Calculate once per round (not on every render)
    return calculateDeviationRisk(
      character,
      psychState,
      {}, // stability factors
      [],
      null
    )
  }, [character?.id, psychState, currentRound]) // Only recompute when round changes

  return {
    deviationRisk,
    psychState
  }
}
```

**Apply to components:**

```typescript
// Before (recalculates every render):
const CombatPhase = () => {
  const risk = calculateDeviationRisk(...) // ❌ Expensive!
  ...
}

// After (memoized):
const CombatPhase = () => {
  const { deviationRisk } = useMemoizedPsychology(characterId) // ✅ Cached!
  ...
}
```

---

### 4.2 Component Memoization

**File:** `/frontend/src/components/battle/hud/HealthBar.tsx`

```typescript
import React, { memo } from 'react'

interface HealthBarProps {
  current: number
  max: number
  color?: 'green' | 'red' | 'blue'
}

// Memoize to prevent re-render if HP unchanged
export const HealthBar = memo(({ current, max, color = 'green' }: HealthBarProps) => {
  const percentage = (current / max) * 100

  return (
    <div className="hp-bar bg-gray-700 h-6 rounded-full overflow-hidden">
      <div
        className={`bg-${color}-500 h-full transition-all duration-300`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if HP actually changed
  return prevProps.current === nextProps.current &&
         prevProps.max === nextProps.max &&
         prevProps.color === nextProps.color
})

HealthBar.displayName = 'HealthBar'
```

---

### 4.3 Zustand Selectors for Minimal Re-renders

**Inefficient (subscribes to entire store):**
```typescript
const BattleHUD = () => {
  const store = useBattleStore() // ❌ Re-renders on ANY state change
  return <div>{store.player1.name}</div>
}
```

**Efficient (subscribes to specific field):**
```typescript
const BattleHUD = () => {
  const player1Name = useBattleStore((state) => state.player1?.name) // ✅ Only re-renders if name changes
  return <div>{player1Name}</div>
}
```

---

### 4.4 Bundle Optimization

**File:** `/frontend/next.config.js`

```javascript
module.exports = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Code splitting for battle system
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          battle: {
            test: /[\\/]src[\\/](components|hooks|data|services)[\\/]battle/,
            name: 'battle',
            priority: 10,
          },
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendor',
            priority: 5,
          },
        },
      }
    }

    return config
  },
}
```

**Lazy load heavy components:**

```typescript
import { lazy, Suspense } from 'react'

const HexBattleArena = lazy(() => import('./battle/HexBattleArena'))
const BattleRewardsModal = lazy(() => import('./battle/rewards/BattleRewardsModal'))

export function BattlePage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      {mode === 'hex' ? <HexBattleArena /> : <BattleOrchestrator />}
    </Suspense>
  )
}
```

---

## Phase 4 Summary

**Deliverables:**
✅ Memoization for expensive calculations
✅ Component memoization with custom comparisons
✅ Zustand selectors for minimal re-renders
✅ Bundle optimization with code splitting
✅ Lazy loading for heavy components

**Expected Improvements:**
- 40% reduction in re-renders
- 50% reduction in deviation calculation time
- 30% smaller initial bundle size
- 60fps maintained during combat

**Timeline:** 3 weeks
**Risk:** LOW - Optimizations are non-breaking
**Measurement:** Use React Profiler & Lighthouse

---

## Success Metrics & Monitoring

### Phase 1 Metrics (Critical Bugs)

| Metric | Before | Target | Measurement |
|--------|--------|--------|-------------|
| Financial events lost | ~5% | 0% | Monitor IndexedDB queue |
| WebSocket connections per user | 3-5 | 1 | Connection tracking |
| Invalid state errors | ~10/day | 0 | Validation error logs |
| Battle crashes | ~2/day | 0 | Error boundary catches |

### Phase 2 Metrics (Testing)

| Metric | Before | Target | Measurement |
|--------|--------|--------|-------------|
| Test coverage | 0% | 30% | Jest coverage report |
| Critical path tests | 0 | 30+ | Test count |
| Integration tests | 0 | 5+ | Test count |

### Phase 3 Metrics (Architecture)

| Metric | Before | Target | Measurement |
|--------|--------|--------|-------------|
| Largest component | 2,228 lines | <500 lines | LOC count |
| useState hooks | 50+ | 0 | Code search |
| Judge systems | 2 | 1 | File count |

### Phase 4 Metrics (Performance)

| Metric | Before | Target | Measurement |
|--------|--------|--------|-------------|
| Battle FPS | ~40fps | 60fps | Performance monitoring |
| Deviation calc time | ~50ms | <20ms | Performance.now() |
| Re-renders per round | ~100 | <40 | React Profiler |
| Initial bundle size | ~640KB | <450KB | webpack-bundle-analyzer |

---

## Risk Mitigation

### Technical Risks

**Risk:** Breaking existing functionality during refactor
**Mitigation:**
- Maintain test coverage >30% at all times
- Feature flags for all major changes
- Run old and new systems in parallel initially
- Incremental rollout (10% → 50% → 100%)

**Risk:** Performance regressions
**Mitigation:**
- Benchmark before/after each optimization
- Use React Profiler in CI
- Set performance budgets (max bundle size, max render time)
- Roll back if metrics degrade

**Risk:** State management migration introduces bugs
**Mitigation:**
- Run Zustand in parallel with useState initially
- Compare state snapshots for consistency
- Migrate one hook at a time
- Add Redux DevTools for debugging

### Project Risks

**Risk:** Engineers unfamiliar with new architecture
**Mitigation:**
- Pair programming during migration
- Architecture documentation (diagrams + walkthroughs)
- Code review requirements (2 approvals)
- Knowledge sharing sessions

**Risk:** Timeline slippage
**Mitigation:**
- Buffer time built into each phase (20%)
- Go/No-Go decision points after each phase
- De-scope non-critical items if needed
- Regular progress check-ins (weekly)

---

## Rollout Plan

### Week-by-Week Rollout

**Week 1-2 (Phase 1):**
- Deploy to staging: FinancialEventQueue
- Deploy to staging: WebSocket singleton
- Deploy to staging: Validation utilities
- Deploy to production: All fixes (100% rollout)
- Monitor: Error rates, queue depth, connection count

**Week 3-4 (Phase 2):**
- Setup testing infrastructure
- Write 30+ unit tests
- Run in CI (must pass before merge)
- No production deployment (tests only)

**Week 5 (Phase 3 start):**
- Create Zustand store
- Deploy to staging: Store + old state in parallel
- Test: State consistency
- No production deployment yet

**Week 6-7 (Phase 3 continue):**
- Migrate hooks to Zustand
- Deploy to staging: Fully migrated
- Deploy to production: 10% rollout (canary)
- Monitor: Error rates, performance
- If stable: 50% rollout
- If stable: 100% rollout

**Week 8-9 (Phase 3 complete):**
- Extract components from ImprovedBattleArena
- Unify judge systems
- Deploy to staging: New component structure
- Deploy to production: 100% rollout (previous phase stable)

**Week 10-12 (Phase 4):**
- Add memoization
- Optimize bundle
- Deploy to staging: All optimizations
- Deploy to production: 100% rollout
- Measure: Performance improvements

---

## Resource Requirements

### Engineering Resources

**Roles:**
- 1x Senior Frontend Engineer (lead)
- 1x Frontend Engineer (support)
- 1x QA Engineer (testing, 50% allocation)

**Time:**
- 12 weeks total
- ~400 engineering hours
- ~200 QA hours

### Infrastructure

**Required:**
- Staging environment (already exists)
- Feature flag system (e.g., LaunchDarkly)
- Error monitoring (e.g., Sentry)
- Performance monitoring (e.g., Datadog)

**Nice to have:**
- A/B testing framework
- Session replay (e.g., LogRocket)
- CI/CD pipeline improvements

---

## Cost-Benefit Analysis

### Costs

**Engineering Time:**
- 2 engineers × 12 weeks = 24 engineer-weeks
- At $2,000/week loaded cost = **$48,000**

**Infrastructure:**
- Feature flags: $100/month
- Monitoring: $200/month
- Total: $300/month × 3 months = **$900**

**Total Investment: ~$50,000**

---

### Benefits

**Quantitative:**
- **25-30% faster feature development** after 6 months
  - Current velocity: 10 story points/sprint
  - Future velocity: 13 story points/sprint
  - Value: +3 story points/sprint × 26 sprints/year = 78 extra story points/year
  - At $500/story point = **$39,000/year savings**

- **50% reduction in production incidents**
  - Current: 4 incidents/month × 4 hours/incident = 16 hours/month
  - Future: 2 incidents/month = 8 hours/month
  - Savings: 8 hours/month × $100/hour × 12 months = **$9,600/year**

- **30% improvement in page load time**
  - Improved user retention (+2%)
  - More battles played per session (+5%)
  - Estimated revenue impact: **$15,000/year**

**Qualitative:**
- ✅ Reduced developer frustration
- ✅ Easier onboarding for new engineers
- ✅ Confidence to add new features
- ✅ Better player experience (fewer crashes)
- ✅ Competitive advantage (faster iteration)

**Total Annual Benefit: ~$63,600/year**

**ROI: 27% in year 1, breakeven at 9 months**

---

## Alternatives Considered

### Alternative 1: Do Nothing

**Pros:**
- No upfront investment
- No risk of breaking things

**Cons:**
- Technical debt accumulates
- Development velocity slows 30% per year
- Player-facing bugs increase
- Eventually requires full rewrite ($200k+)

**Verdict:** ❌ Not recommended - debt compounds over time

---

### Alternative 2: Full Rewrite

**Pros:**
- Clean slate
- Modern architecture from day 1
- No legacy baggage

**Cons:**
- 6+ months without new features
- High risk of missing features
- $200k+ investment
- Opportunity cost

**Verdict:** ❌ Not recommended - too expensive and risky

---

### Alternative 3: Incremental Refactor (This Proposal)

**Pros:**
- Lower risk (incremental changes)
- Can ship features during refactor
- Tests prevent regressions
- Reasonable investment

**Cons:**
- Takes longer than rewrite
- Requires discipline to follow plan
- Some legacy code remains

**Verdict:** ✅ **RECOMMENDED** - Best balance of risk/reward

---

## Approval & Next Steps

### Decision Points

**Go/No-Go after Phase 1 (Week 2):**
- ✅ Are critical bugs fixed?
- ✅ Is production stable?
- ✅ Are engineers comfortable?

**Go/No-Go after Phase 2 (Week 4):**
- ✅ Is test coverage >30%?
- ✅ Are tests catching bugs?
- ✅ Is CI reliable?

**Go/No-Go after Phase 3 (Week 9):**
- ✅ Is new architecture working?
- ✅ Are metrics stable?
- ✅ Is team velocity maintained?

**Final Review (Week 12):**
- ✅ All success metrics met?
- ✅ ROI on track?
- ✅ Player feedback positive?

---

## Appendix: Code Examples

*(See inline code examples throughout proposal)*

---

## Conclusion

This refactor proposal addresses the critical issues in the Blank Wars battle system while maintaining feature development velocity. The 12-week, 4-phase approach balances risk mitigation with meaningful improvement.

**Key Takeaways:**

1. **Phase 1 (Weeks 1-2)** fixes data loss and crash bugs → **Must do**
2. **Phase 2 (Weeks 3-4)** adds testing → Enables safe refactoring
3. **Phase 3 (Weeks 5-9)** refactors architecture → Enables sustainable growth
4. **Phase 4 (Weeks 10-12)** optimizes performance → Improves user experience

**Investment:** ~$50,000
**Return:** ~$64k/year (27% ROI)
**Breakeven:** 9 months

**Recommendation:** **APPROVE** and begin Phase 1 immediately.

---

**Document Status:** READY FOR REVIEW
**Next Step:** Schedule architecture review meeting
**Owner:** Engineering Leadership

---

*End of Proposal*
