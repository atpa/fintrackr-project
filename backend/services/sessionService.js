const crypto = require('crypto');

/**
 * Session Management Service
 * Handles user session tracking and management
 * 
 * Features:
 * - Track active sessions per user
 * - Limit concurrent sessions
 * - Session metadata (device, IP, location)
 * - Revoke individual or all sessions
 */

class SessionService {
  constructor(dataService) {
    this.dataService = dataService;
    this.MAX_SESSIONS_PER_USER = 5;
  }

  /**
   * Create a new session
   */
  async createSession(userId, metadata = {}) {
    const sessionId = crypto.randomBytes(32).toString('hex');
    
    const session = {
      session_id: sessionId,
      user_id: userId,
      device_name: metadata.deviceName || 'Unknown Device',
      device_type: metadata.deviceType || 'web',
      ip_address: metadata.ipAddress || null,
      user_agent: metadata.userAgent || null,
      location: metadata.location || null,
      created_at: new Date().toISOString(),
      last_activity: new Date().toISOString(),
      is_active: 1,
    };

    // Check session limit
    const activeSessions = await this.getActiveSessions(userId);
    
    if (activeSessions.length >= this.MAX_SESSIONS_PER_USER) {
      // Revoke oldest session
      const oldest = activeSessions.sort((a, b) => 
        new Date(a.last_activity) - new Date(b.last_activity)
      )[0];
      
      await this.revokeSession(oldest.session_id);
    }

    // Store in database
    await this.dataService.createSession(session);
    
    return sessionId;
  }

  /**
   * Update session activity
   */
  async updateSessionActivity(sessionId) {
    await this.dataService.updateSession(sessionId, {
      last_activity: new Date().toISOString(),
    });
  }

  /**
   * Get active sessions for a user
   */
  async getActiveSessions(userId) {
    const sessions = await this.dataService.getSessionsByUserId(userId);
    return sessions.filter(s => s.is_active);
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId) {
    return await this.dataService.getSessionById(sessionId);
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(sessionId) {
    await this.dataService.updateSession(sessionId, {
      is_active: 0,
      revoked_at: new Date().toISOString(),
    });
  }

  /**
   * Revoke all sessions for a user (logout everywhere)
   */
  async revokeAllSessions(userId, exceptSessionId = null) {
    const sessions = await this.getActiveSessions(userId);
    
    for (const session of sessions) {
      if (session.session_id !== exceptSessionId) {
        await this.revokeSession(session.session_id);
      }
    }
  }

  /**
   * Check if session is valid
   */
  async isSessionValid(sessionId) {
    const session = await this.getSession(sessionId);
    
    if (!session || !session.is_active) {
      return false;
    }
    
    // Check if session is too old (30 days)
    const MAX_AGE = 30 * 24 * 60 * 60 * 1000;
    const age = Date.now() - new Date(session.created_at).getTime();
    
    if (age > MAX_AGE) {
      await this.revokeSession(sessionId);
      return false;
    }
    
    return true;
  }

  /**
   * Cleanup old sessions
   */
  async cleanupOldSessions() {
    const sessions = await this.dataService.getAllSessions();
    const MAX_AGE = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    
    for (const session of sessions) {
      const age = now - new Date(session.created_at).getTime();
      if (age > MAX_AGE) {
        await this.revokeSession(session.session_id);
      }
    }
  }

  /**
   * Get session statistics for a user
   */
  async getSessionStats(userId) {
    const sessions = await this.dataService.getSessionsByUserId(userId);
    
    const active = sessions.filter(s => s.is_active);
    const devices = [...new Set(active.map(s => s.device_type))];
    const locations = [...new Set(active.map(s => s.location).filter(Boolean))];
    
    return {
      total: sessions.length,
      active: active.length,
      devices,
      locations,
      lastActivity: active.length > 0 
        ? Math.max(...active.map(s => new Date(s.last_activity)))
        : null,
    };
  }

  /**
   * Detect suspicious session activity
   */
  async detectSuspiciousActivity(userId) {
    const sessions = await this.getActiveSessions(userId);
    const alerts = [];
    
    // Check for multiple simultaneous locations
    const locations = sessions
      .map(s => s.location)
      .filter(Boolean);
      
    if (new Set(locations).size > 2) {
      alerts.push({
        type: 'multiple_locations',
        message: 'Account accessed from multiple locations simultaneously',
      });
    }
    
    // Check for unusual number of sessions
    if (sessions.length >= this.MAX_SESSIONS_PER_USER) {
      alerts.push({
        type: 'max_sessions',
        message: 'Maximum number of sessions reached',
      });
    }
    
    // Check for rapid session creation
    const recentSessions = sessions.filter(s => {
      const age = Date.now() - new Date(s.created_at).getTime();
      return age < 5 * 60 * 1000; // Last 5 minutes
    });
    
    if (recentSessions.length > 3) {
      alerts.push({
        type: 'rapid_sessions',
        message: 'Unusual number of recent logins detected',
      });
    }
    
    return alerts;
  }
}

// Cleanup old sessions every hour
let cleanupInterval;

function startSessionCleanup(sessionService) {
  cleanupInterval = setInterval(async () => {
    try {
      await sessionService.cleanupOldSessions();
    } catch (error) {
      console.error('Session cleanup error:', error);
    }
  }, 60 * 60 * 1000); // Every hour
}

function stopSessionCleanup() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
  }
}

module.exports = {
  SessionService,
  startSessionCleanup,
  stopSessionCleanup,
};
