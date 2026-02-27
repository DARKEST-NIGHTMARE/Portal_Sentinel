import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { securityApi } from "../services/securityApi";
import { logout } from "../redux/authSlice";
import Navbar from "../components/layout/Navbar";
import SecurityMap from "../components/security/SecurityMap";
import { useNavigate } from "react-router-dom";
import { useSecurityWebSocket } from "../hooks/useSecurityWebSocket";

import AlertsWidget from "../components/security/AlertsWidget";
import ActiveUsersChart from "../components/security/ActiveUsersChart";
import ActiveSessionsWidget from "../components/security/ActiveSessionsWidget";
import LogsTableWidget from "../components/security/LogsTableWidget";

const SecurityDashboard = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const { user, token } = useSelector((state) => state.auth);

    const [alerts, setAlerts] = useState([]);
    const [activeUsers, setActiveUsers] = useState([]);
    const [mySessions, setMySessions] = useState([]);
    const [logs, setLogs] = useState([]);
    const [error, setError] = useState(null);

    const [page, setPage] = useState(0);
    const limit = 20;
    const [eventTypeFilter, setEventTypeFilter] = useState("");
    const [tableLoading, setTableLoading] = useState(false);

    const handleLogout = () => {
        dispatch(logout());
        navigate("/");
    };

    useEffect(() => {
        const fetchStaticWidgets = async () => {
            if (!user) return;
            try {
                if (user.role === "admin") {
                    const [alertsRes, activeUsersRes] = await Promise.all([
                        securityApi.getEvents(0, 10, "SUSPICIOUS_ACTIVITY"),
                        securityApi.getActiveUsers()
                    ]);
                    setAlerts(alertsRes);
                    setActiveUsers(activeUsersRes);
                } else {
                    const sessionsRes = await securityApi.getOwnSessions();
                    setMySessions(sessionsRes);
                }
            } catch (err) {
                console.error("Failed to load dashboard widgets", err);
                setError("Failed to load dashboard data. Are you connected to the internet?");
            }
        };

        fetchStaticWidgets();
    }, [user]);

    useEffect(() => {
        const fetchTableLogs = async () => {
            if (!user) return;
            setTableLoading(true);
            try {
                let response;
                if (user.role === "admin") {
                    if (eventTypeFilter === "ACTIVE_USER_SESSION") {
                        response = await securityApi.getAllSessions();
                    } else {
                        response = await securityApi.getEvents(page * limit, limit, eventTypeFilter);
                    }
                } else {
                    response = await securityApi.getOwnEvents(page * limit, limit, eventTypeFilter);
                }
                setLogs(response);
            } catch (err) {
                setError(err.response?.data?.detail || "Failed to load audit logs.");
            } finally {
                setTableLoading(false);
            }
        };

        if (user) {
            fetchTableLogs();
        }
    }, [page, eventTypeFilter, user, limit]);

    useSecurityWebSocket(user, eventTypeFilter, limit, setAlerts, setLogs);

    const getEventBadgeClass = (type) => {
        switch (type) {
            case "FAILED_LOGIN": return "badge-failed";
            case "ACTIVE_SESSION": return "badge-success";
            case "SUSPICIOUS_ACTIVITY": return "badge-warning";
            case "ACCOUNT_LOCKED": return "badge-danger";
            case "ACTIVE_USER_SESSION": return "badge-info";
            default: return "badge-default";
        }
    };

    const handleRevokeSession = async (sessionId) => {
        try {
            await securityApi.revokeSession(sessionId);
            setMySessions(prev => prev.filter(s => s.id !== sessionId));
        } catch (err) {
            alert("Failed to revoke session");
        }
    };

    const handleAdminRevokeSession = async (sessionId) => {
        try {
            await securityApi.adminRevokeSession(sessionId);
            setLogs(prev => prev.filter(s => s.id !== sessionId));
        } catch (err) {
            alert("Failed to revoke session");
        }
    };

    if (!user) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '50px' }}>
                <h3>Loading Profile...</h3>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            <Navbar user={user} onLogout={handleLogout} activePage="security" />

            <div className="glass-card">
                <div className="security-header">
                    <h1>Security Center</h1>
                </div>

                {error ? (
                    <div className="text-center-muted" style={{ color: '#e53e3e' }}>Error: {error}</div>
                ) : (
                    <>
                        <div className="security-grid">
                            {user?.role === "admin" ? (
                                <>
                                    <AlertsWidget alerts={alerts} />
                                    <ActiveUsersChart activeUsers={activeUsers} />
                                </>
                            ) : (
                                <ActiveSessionsWidget
                                    mySessions={mySessions}
                                    handleRevokeSession={handleRevokeSession}
                                />
                            )}

                            <div className="dashboard-card" style={{ gridColumn: user?.role === 'admin' ? 'auto' : '1 / -1' }}>
                                <h2>Live Security Map</h2>
                                <div style={{ width: '100%', height: '250px', minWidth: 0, position: 'relative' }}>
                                    <SecurityMap events={logs} />
                                </div>
                            </div>
                        </div>

                        <LogsTableWidget
                            user={user}
                            logs={logs}
                            tableLoading={tableLoading}
                            page={page}
                            setPage={setPage}
                            limit={limit}
                            eventTypeFilter={eventTypeFilter}
                            setEventTypeFilter={setEventTypeFilter}
                            getEventBadgeClass={getEventBadgeClass}
                            handleAdminRevokeSession={handleAdminRevokeSession}
                        />
                    </>
                )}
            </div>
        </div>
    );
};

export default SecurityDashboard;