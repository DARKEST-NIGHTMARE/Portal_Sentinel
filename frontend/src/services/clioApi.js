import api from "./api";

const clioApi = {
    getMatters: () => api.get("/api/clio/matters"),
    createMatter: (payload) => api.post("/api/clio/matters", payload),
    getContacts: () => api.get("/api/clio/contacts"),
    getCalendarEvents: () => api.get("/api/clio/calendar"),
    getCommunications: () => api.get("/api/clio/communications"),
    bookSlot: async (slotData) => {
        const offset = new Date().getTimezoneOffset();
        const sign = offset > 0 ? "-" : "+";
        const absOffset = Math.abs(offset);
        const hours = String(Math.floor(absOffset / 60)).padStart(2, "0");
        const minutes = String(absOffset % 60).padStart(2, "0");
        const timezone_offset = `${sign}${hours}:${minutes}`;

        const response = await api.post('/api/clio/book-slot', { ...slotData, timezone_offset });
        return response.data;
    }
};

export default clioApi;
