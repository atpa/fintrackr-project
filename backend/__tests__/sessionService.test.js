/**
 * Session Service Tests
 * Tests for Phase 4 - Session Management
 */

describe('SessionService', () => {
  let sessionService;
  let mockDataService;

  beforeEach(() => {
    mockDataService = {
      createSession: jest.fn(),
      getSessionsByUser: jest.fn(),
      getSessionById: jest.fn(),
      updateSession: jest.fn(),
      deleteSession: jest.fn(),
      deleteSessionsByUser: jest.fn(),
    };

    const SessionService = require('../services/sessionService');
    sessionService = new SessionService(mockDataService);
  });

  describe('Session Creation', () => {
    it('should create new session with device info', async () => {
      mockDataService.createSession.mockResolvedValue({
        id: 1,
        user_id: 1,
        token: 'test-token',
        device: 'Chrome/Windows',
        ip: '127.0.0.1',
      });

      const session = await sessionService.createSession(1, 'test-token', {
        userAgent: 'Mozilla/5.0 Chrome/96.0',
        ip: '127.0.0.1',
      });

      expect(session).toHaveProperty('id');
      expect(session).toHaveProperty('user_id', 1);
      expect(session).toHaveProperty('device');
      expect(mockDataService.createSession).toHaveBeenCalled();
    });
  });

  describe('Session Validation', () => {
    it('should validate active session', async () => {
      mockDataService.getSessionById.mockResolvedValue({
        id: 1,
        user_id: 1,
        token: 'test-token',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        revoked: 0,
      });

      const isValid = await sessionService.validateSession(1);

      expect(isValid).toBe(true);
    });

    it('should reject expired session', async () => {
      mockDataService.getSessionById.mockResolvedValue({
        id: 1,
        user_id: 1,
        token: 'test-token',
        expires_at: new Date(Date.now() - 1000).toISOString(),
        revoked: 0,
      });

      const isValid = await sessionService.validateSession(1);

      expect(isValid).toBe(false);
    });

    it('should reject revoked session', async () => {
      mockDataService.getSessionById.mockResolvedValue({
        id: 1,
        user_id: 1,
        token: 'test-token',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        revoked: 1,
      });

      const isValid = await sessionService.validateSession(1);

      expect(isValid).toBe(false);
    });
  });

  describe('Concurrent Session Management', () => {
    it('should enforce max session limit', async () => {
      const sessions = Array(5).fill(null).map((_, i) => ({
        id: i + 1,
        user_id: 1,
        created_at: new Date(Date.now() - i * 1000).toISOString(),
      }));
      mockDataService.getSessionsByUser.mockResolvedValue(sessions);
      mockDataService.createSession.mockResolvedValue({ id: 6 });

      await sessionService.createSession(1, 'new-token', {});

      // Should delete oldest session when limit exceeded
      expect(mockDataService.deleteSession).toHaveBeenCalledWith(5);
    });
  });

  describe('Logout Everywhere', () => {
    it('should revoke all user sessions', async () => {
      mockDataService.getSessionsByUser.mockResolvedValue([
        { id: 1 },
        { id: 2 },
        { id: 3 },
      ]);

      await sessionService.logoutEverywhere(1);

      expect(mockDataService.deleteSessionsByUser).toHaveBeenCalledWith(1);
    });
  });

  describe('Suspicious Activity Detection', () => {
    it('should detect suspicious login from new location', async () => {
      mockDataService.getSessionsByUser.mockResolvedValue([
        {
          id: 1,
          user_id: 1,
          ip: '192.168.1.1',
          location: 'US',
        },
      ]);

      const isSuspicious = await sessionService.detectSuspiciousActivity(1, {
        ip: '10.0.0.1',
        location: 'CN',
      });

      expect(isSuspicious).toBe(true);
    });
  });
});
