// Session manager for browser history deduplication
export class SessionManager {
  constructor(sessionTimeoutMs = 30 * 60 * 1000) { // 30 minutes default
    this.sessionTimeoutMs = sessionTimeoutMs;
    this.sessionMap = new Map(); // domain -> { lastVisitTime, lastEventTime }
  }

  // Extract domain from URL (e.g., "facebook.com" from "https://www.facebook.com/profile")
  extractDomain(url) {
    try {
      const hostname = new URL(url).hostname.replace(/^www\./, '');
      const parts = hostname.split('.');
      // Handle cases like "sub.domain.com" -> "domain.com"
      if (parts.length >= 2) {
        return parts.slice(-2).join('.');
      }
      return hostname;
    } catch {
      return url; // fallback to original URL if parsing fails
    }
  }

  // Process a visit and determine if it should create a new timeline event
  processVisit(url, visitTime) {
    const domain = this.extractDomain(url);
    const sessionData = this.sessionMap.get(domain);
    
    if (!sessionData) {
      // First time visiting this domain - create new event
      this.sessionMap.set(domain, {
        lastVisitTime: visitTime,
        lastEventTime: visitTime
      });
      console.log(`[SESSION] 🆕 First visit to ${domain} at ${new Date(visitTime).toLocaleString()}`);
      return { shouldCreateEvent: true, reason: 'first_visit' };
    }

    // Only update session data if this visit is NEWER than the current session
    if (visitTime <= sessionData.lastVisitTime) {
      console.log(`[SESSION] ⏰ Skipping old visit to ${domain}: ${new Date(visitTime).toLocaleString()} (current: ${new Date(sessionData.lastVisitTime).toLocaleString()})`);
      return { shouldCreateEvent: false, reason: 'old_visit' };
    }

    const timeSinceLastEvent = visitTime - sessionData.lastEventTime;
    const oldLastVisitTime = sessionData.lastVisitTime;
    const oldLastEventTime = sessionData.lastEventTime;

    // Update both times to the NEWER visit time
    sessionData.lastVisitTime = visitTime;
    sessionData.lastEventTime = visitTime;
    this.sessionMap.set(domain, sessionData);

    console.log(`[SESSION] Updated ${domain}: ${new Date(oldLastVisitTime).toLocaleString()} → ${new Date(visitTime).toLocaleString()}`);

    if (timeSinceLastEvent > this.sessionTimeoutMs) {
      // It's been more than 30 minutes since we last created an event
      console.log(`[SESSION] ✅ Session expired for ${domain} (${Math.round(timeSinceLastEvent / 1000 / 60)} minutes)`);
      return { shouldCreateEvent: true, reason: 'session_expired' };
    } else {
      // It's been less than 30 minutes - don't create new event
      console.log(`[SESSION] Within session for ${domain} (${Math.round(timeSinceLastEvent / 1000 / 60)} minutes)`);
      return { shouldCreateEvent: false, reason: 'within_session' };
    }
  }

  // Clean up old sessions (remove domains that haven't been visited in 24 hours)
  cleanupOldSessions(currentTime = Date.now()) {
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    const cutoffTime = currentTime - TWENTY_FOUR_HOURS;
    
    let cleanedCount = 0;
    for (const [domain, sessionData] of this.sessionMap.entries()) {
      if (sessionData.lastVisitTime < cutoffTime) {
        this.sessionMap.delete(domain);
        cleanedCount++;
        console.log(`[SESSION] 🧹 Cleaned up old session for: ${domain} (last visit: ${new Date(sessionData.lastVisitTime).toLocaleString()})`);
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`[SESSION] 🧹 Cleaned up ${cleanedCount} old sessions (24h+ old)`);
    }
  }

  // Get session data for persistence
  getSessionData() {
    return Array.from(this.sessionMap.entries());
  }

  // Load session data from storage
  loadSessionData(sessionData) {
    this.sessionMap.clear();
    if (sessionData && Array.isArray(sessionData)) {
      sessionData.forEach(([domain, data]) => {
        // Handle both old format (just timestamp) and new format (object)
        if (typeof data === 'number') {
          this.sessionMap.set(domain, {
            lastVisitTime: data,
            lastEventTime: data
          });
        } else {
          this.sessionMap.set(domain, data);
        }
      });
      console.log(`[SESSION] 📂 Loaded ${sessionData.length} domains from storage`);
    }
  }

  // Debug: Get current session state
  getSessionState() {
    const state = {};
    for (const [domain, data] of this.sessionMap.entries()) {
      state[domain] = {
        lastVisitTime: new Date(data.lastVisitTime).toLocaleString(),
        lastEventTime: new Date(data.lastEventTime).toLocaleString(),
        timeSinceLastEvent: Math.round((Date.now() - data.lastEventTime) / 1000 / 60) + ' minutes ago'
      };
    }
    return state;
  }
}

// Global session manager instance
export const sessionManager = new SessionManager();