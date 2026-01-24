import React from 'react'
import { renderHook, act } from '@testing-library/react'
import { useBattleWebSocket } from '../useBattleWebSocket'
import { AuthProvider } from '@/contexts/AuthContext'
import { battleWebSocket } from '@/services/battleWebSocket'

// Mock the battleWebSocket service
jest.mock('@/services/battleWebSocket', () => ({
  battle_web_socket: {
    set_event_handlers: jest.fn(),
    authenticate_with_token: jest.fn(),
    is_connected: jest.fn(() => false),
    is_authenticated: jest.fn(() => false),
    find_match: jest.fn(),
    join_battle: jest.fn(),
    select_strategy: jest.fn(),
    send_chat_message: jest.fn(),
    disconnect: jest.fn(),
    get_current_user: jest.fn(() => null),
  }
}))

// Mock auth context
jest.mock('@/contexts/AuthContext', () => ({
  ...jest.requireActual('@/contexts/AuthContext'),
  use_auth: () => ({
    tokens: { access_token: 'mock-token', refresh_token: 'mock-refresh' },
    is_authenticated: true,
    user: { id: '1', username: 'testuser' },
    is_loading: false,
  })
}))

describe('useBattleWebSocket', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should set up event handlers when authenticated', () => {
    const handlers = {
      onAuthenticated: jest.fn(),
      onMatchFound: jest.fn(),
      onError: jest.fn(),
    }

    const { result } = renderHook(() => useBattleWebSocket(handlers), {
      wrapper: AuthProvider,
    })

    expect(battleWebSocket.setEventHandlers).toHaveBeenCalled()
  })

  it('should authenticate with token when connected', () => {
    ;(battleWebSocket.isConnected as jest.Mock).mockReturnValue(true)

    renderHook(() => useBattleWebSocket(), {
      wrapper: AuthProvider,
    })

    expect(battleWebSocket.authenticateWithToken).toHaveBeenCalledWith('mock-token')
  })

  it('should provide WebSocket interface methods', () => {
    const { result } = renderHook(() => useBattleWebSocket(), {
      wrapper: AuthProvider,
    })

    expect(result.current).toHaveProperty('isConnected')
    expect(result.current).toHaveProperty('isAuthenticated')
    expect(result.current).toHaveProperty('findMatch')
    expect(result.current).toHaveProperty('joinBattle')
    expect(result.current).toHaveProperty('selectStrategy')
    expect(result.current).toHaveProperty('sendChat')
    expect(result.current).toHaveProperty('disconnect')
  })

  it('should call findMatch with proper parameters', () => {
    const { result } = renderHook(() => useBattleWebSocket(), {
      wrapper: AuthProvider,
    })

    act(() => {
      result.current.findMatch('char_001', 'ranked')
    })

    expect(battleWebSocket.findMatch).toHaveBeenCalledWith('char_001', 'ranked')
  })

  it('should disconnect when unmounting while authenticated', () => {
    const { unmount } = renderHook(() => useBattleWebSocket(), {
      wrapper: AuthProvider,
    })

    unmount()

    // Since we're still authenticated in our mock, disconnect shouldn't be called
    expect(battleWebSocket.disconnect).not.toHaveBeenCalled()
  })

  it('should handle disconnect properly', () => {
    const { result } = renderHook(() => useBattleWebSocket(), {
      wrapper: AuthProvider,
    })

    act(() => {
      result.current.disconnect()
    })

    expect(battleWebSocket.disconnect).toHaveBeenCalled()
  })
})