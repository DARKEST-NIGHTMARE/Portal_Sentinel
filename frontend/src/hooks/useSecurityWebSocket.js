import { useEffect } from "react";

export const useSecurityWebSocket = (user, eventTypeFilter, limit, setAlerts, setLogs) => {
    useEffect(() => {
        if (!user || user.role !== "admin") return;

        const backendUrl = process.env.REACT_APP_API_URL || "http://localhost:8081";
        const wsUrl = backendUrl.replace(/^http/, "ws") + "/api/admin/security/ws";
        const ws = new WebSocket(wsUrl);

        ws.onmessage = (event) => {
            const newEvent = JSON.parse(event.data);

            if (newEvent.event_type === "SUSPICIOUS_ACTIVITY" || newEvent.event_type === "ACCOUNT_LOCKED") {
                setAlerts(prevAlerts => [newEvent, ...prevAlerts].slice(0, 10));
            }
            setLogs(prevLogs => {
                if (eventTypeFilter && newEvent.event_type !== eventTypeFilter) {
                    return prevLogs;
                }
                return [newEvent, ...prevLogs].slice(0, limit);
            });
        };

        return () => {
            if (ws.readyState === 1) ws.close();
        };
    }, [eventTypeFilter, limit, user, setAlerts, setLogs]);
};
