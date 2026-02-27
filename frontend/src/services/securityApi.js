import api from "./api";

export const securityApi = {
  getEvents: async (skip = 0, limit = 20, eventType = "", userId = "") => {
    try {
      const params = new URLSearchParams({ skip, limit });
      if (eventType) params.append("event_type", eventType);
      if (userId) params.append("user_id", userId);

      const response = await api.get(`/api/admin/security/events?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching security events:", error);
      throw error;
    }
  },

  getActiveUsers: async (days = 7) => {
    try {
      const response = await api.get(`/api/admin/security/active-users?days=${days}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching active users:", error);
      throw error;
    }
  },

  getOwnEvents: async (skip = 0, limit = 20, eventType = "") => {
    try {
      const params = new URLSearchParams({ skip, limit });
      if (eventType) params.append("event_type", eventType);

      const response = await api.get(`/api/users/me/security-events?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching personal security events:", error);
      throw error;
    }
  },

  getOwnSessions: async () => {
    try {
      const response = await api.get(`/api/users/me/sessions`);
      return response.data;
    } catch (error) {
      console.error("Error fetching sessions:", error);
      throw error;
    }
  },

  revokeSession: async (sessionId) => {
    try {
      const response = await api.delete(`/api/users/me/sessions/${sessionId}`);
      return response.data;
    } catch (error) {
      console.error(`Error revoking session ${sessionId}:`, error);
      throw error;
    }
  },

  getAllSessions: async () => {
    try {
      const response = await api.get(`/api/admin/security/sessions`);
      return response.data;
    } catch (error) {
      console.error("Error fetching all sessions:", error);
      throw error;
    }
  },

  adminRevokeSession: async (sessionId) => {
    try {
      const response = await api.delete(`/api/admin/security/sessions/${sessionId}`);
      return response.data;
    } catch (error) {
      console.error(`Error admin revoking session ${sessionId}:`, error);
      throw error;
    }
  }
};