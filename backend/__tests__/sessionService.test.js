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
      getSessionsByUserIdId: jest.fn().mockResolvedValue([]),
      getSessionById: jest.fn(),
      updateSession: jest.fn(),
      deleteSession: jest.fn(),
      deleteSessionsByUser: jest.fn(),
    };

    const { SessionService } = require('../services/sessionService');
    sessionService = new SessionService(mockDataService);
  });

  describe('Session Creation', () => {
    it('should create new session with device info', async () => {
      mockDataService.getSessionsByUserId.mockResolvedValue([]); // No existing sessions
      mockDataService.createSession.mockResolvedValue();

      const session = await sessionService.createSession(1, {
        userAgent: 'Mozilla/5.0 Chrome/96.0',
        ipAddress: '127.0.0.1',
      });

      expect(session).toHaveProperty('id');
      expect(session).toHaveProperty('user_id', 1);
      expect(session).toHaveProperty('device_name');
      expect(session).toHaveProperty('device_type');
      expect(mockDataService.createSession).toHaveBeenCalled();
    });
  });

  describe('Session Validation', () => {
    it('should validate active session', async () => {
      mockDataService.getSessionById.mockResolvedValue({
        session_id: 'test-session-id',
        user_id: 1,
        is_active: 1,
        created_at: new Date().toISOString(),
      });

      const isValid = await sessionService.validateSession('test-session-id');

      expect(isValid).toBe(true);
    });

    it('should reject expired session', async () => {
      // Session older than 30 days
      const oldDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
      mockDataService.getSessionById.mockResolvedValue({
        session_id: 'test-session-id',
        user_id: 1,
        is_active: 1,
        created_at: oldDate.toISOString(),
      });
      mockDataService.updateSession.mockResolvedValue();

      const isValid = await sessionService.validateSession('test-session-id');

      expect(isValid).toBe(false);
    });

    it('should reject revoked session', async () => {
      mockDataService.getSessionById.mockResolvedValue({
        session_id: 'test-session-id',
        user_id: 1,
        is_active: 0,
        created_at: new Date().toISOString(),
      });

      const isValid = await sessionService.validateSession('test-session-id');

      expect(isValid).toBe(false);
    });
  });

  describe('Concurrent Session Management', () => {
    it('should enforce max session limit', async () => {
      const sessions = Array(5).fill(null).map((_, i) => ({
        session_id: `session-${i + 1}`,
        user_id: 1,
        is_active: 1,
        last_activity: new Date(Date.now() - i * 1000).toISOString(),
        created_at: new Date(Date.now() - i * 1000).toISOString(),
      }));
      mockDataService.getSessionsByUserId.mockResolvedValue(sessions);
      mockDataService.createSession.mockResolvedValue();
      mockDataService.updateSession.mockResolvedValue();

      await sessionService.createSession(1, {});

      // Should revoke oldest session when limit exceeded (session-5 has oldest last_activity)
      expect(mockDataService.updateSession).toHaveBeenCalledWith('session-5', expect.objectContaining({ is_active: 0 }));
    });
  });

  describe('Logout Everywhere', () => {
    it('should revoke all user sessions', async () => {
      mockDataService.getSessionsByUserId.mockResolvedValue([
        { session_id: 'session-1', is_active: 1 },
        { session_id: 'session-2', is_active: 1 },
        { session_id: 'session-3', is_active: 1 },
      ]);
      mockDataService.updateSession.mockResolvedValue();

      await sessionService.logoutEverywhere(1);

      // Should revoke all 3 sessions
      expect(mockDataService.updateSession).toHaveBeenCalledTimes(3);
      expect(mockDataService.updateSession).toHaveBeenCalledWith('session-1', expect.objectContaining({ is_active: 0 }));
    });
  });

  describe('Suspicious Activity Detection', () => {
    it('should detect suspicious login from new location', async () => {
      mockDataService.getSessionsByUserId.mockResolvedValue([
        {
          session_id: 'session-1',
          user_id: 1,
          is_active: 1,
          ip_address: '192.168.1.1',
          location: 'US',
        },
        {
          session_id: 'session-2',
          user_id: 1,
          is_active: 1,
          ip_address: '192.168.1.1',
          location: 'UK',
        },
        {
          session_id: 'session-3',
          user_id: 1,
          is_active: 1,
          ip_address: '10.0.0.1',
          location: 'CN',
        },
      ]);

      const alerts = await sessionService.detectSuspiciousActivity(1);

      // Should detect multiple locations (3 different locations)
      expect(alerts).toBeInstanceOf(Array);
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0]).toHaveProperty('type');
      expect(alerts[0]).toHaveProperty('message');
    });
  });
});
