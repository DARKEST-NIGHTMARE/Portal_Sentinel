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
  }
};