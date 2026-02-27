import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { formatDistanceToNow } from "date-fns";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

import { securityApi } from "../services/securityApi";
import { logout } from "../redux/authSlice";
import Navbar from "../components/Navbar";
import SecurityMap from "../components/SecurityMap";
import { useNavigate } from "react-router-dom";

const SecurityDashboard = () => {
    const dispatch = useDispatch();

    const { user } = useSelector((state) => state.auth);

    // const [events, setEvents] = useState([]);
    const [logs, setLogs] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [activeUsers, setActiveUsers] = useState([]);
    const [mySessions, setMySessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tableLoading, setTableLoading] = useState(true);
    const [error, setError] = useState(null);

    const [eventTypeFilter, setEventTypeFilter] = useState("");
    const [page, setPage] = useState(0);
    const limit = 10;
    const navigate = useNavigate();
    const handleLogout = () => {
        dispatch(logout());
        navigate("/");
    }

    useEffect(() => {
        const fetchStaticWidgets = async () => {
            try {
                if (user?.role === "admin") {
                    const usersData = await securityApi.getActiveUsers(7);
                    setActiveUsers(usersData);

                    const [suspicious, locked] = await Promise.all([
                        securityApi.getEvents(0, 10, "SUSPICIOUS_ACTIVITY"),
                        securityApi.getEvents(0, 10, "ACCOUNT_LOCKED")
                    ]);

                    const combinedAlerts = [...suspicious, ...locked]
                        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                        .slice(0, 10);

                    setAlerts(combinedAlerts);
                } else {
                    const sessionData = await securityApi.getOwnSessions();
                    setMySessions(sessionData);
                }
            } catch (err) {
                console.error("Failed to load top widgets:", err);
            }
        };

        if (user) {
            fetchStaticWidgets();
        }
    }, [user]);

    useEffect(() => {
        const fetchTableLogs = async () => {
            setTableLoading(true);
            setError(null);
            try {
                let logsData;
                if (user?.role === "admin") {
                    if (eventTypeFilter === "ACTIVE_USER_SESSION") {
                        logsData = await securityApi.getAllSessions();
                        // mock log structure so table code works
                        logsData = logsData.map(s => ({
                            id: s.id,
                            created_at: s.last_active,
                            event_type: "ACTIVE_USER_SESSION",
                            username: s.user_name,
                            user_email: s.user_email,
                            user_id: s.user_id,
                            ip_address: s.ip_address,
                            event_metadata: {
                                device: s.device_info,
                                location: s.location,
                                is_active: s.is_active
                            },
                            is_session: true
                        }));
                    } else {
                        logsData = await securityApi.getEvents(page * limit, limit, eventTypeFilter);
                    }
                } else {
                    logsData = await securityApi.getOwnEvents(page * limit, limit, eventTypeFilter);
                }
                setLogs(logsData);
            } catch (err) {
                setError(err.response?.data?.detail || "Failed to load audit logs.");
            } finally {
                setTableLoading(false);
            }
        };

        if (user) {
            fetchTableLogs();
        }
    }, [page, eventTypeFilter, user]);

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
    }, [eventTypeFilter, limit, user]);

    const getEventBadgeClass = (type) => {
        switch (type) {
            case "FAILED_LOGIN": return "badge-failed";
            case "SUSPICIOUS_ACTIVITY": return "badge-suspicious";
            case "ACCOUNT_LOCKED": return "badge-locked";
            case "ACTIVE_SESSION": return "badge-active";
            default: return "badge-default";
        }
    };

    const handleRevokeSession = async (sessionId) => {
        if (!window.confirm("Are you sure you want to log out this device?")) return;
        try {
            await securityApi.revokeSession(sessionId);
            setMySessions(mySessions.filter(s => s.id !== sessionId));
        } catch (err) {
            alert("Failed to revoke session");
        }
    };

    const handleAdminRevokeSession = async (sessionId) => {
        if (!window.confirm("Are you sure you want to log out this user's device?")) return;
        try {
            await securityApi.adminRevokeSession(sessionId);
            // Updating the logs state to remove revoked session visually
            setLogs(logs.filter(log => log.id !== sessionId || !log.is_session));
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
                                    <div className="dashboard-card">
                                        <h2 style={{ color: '#c53030' }}> Alerts</h2>
                                        <div className="alert-list">
                                            {alerts.length === 0 ? (
                                                <p className="text-center-muted">No active alerts detected.</p>
                                            ) : (
                                                alerts.map(alert => (
                                                    <div key={alert.id} className="alert-item">
                                                        <strong>
                                                            {alert.username || "Unknown User"} (ID: {alert.user_id || 'N/A'})
                                                        </strong>
                                                        {' '}triggered {alert.event_type.replace("_", " ")}
                                                        <div className="alert-meta">
                                                            Reason: {alert.event_metadata?.reason || "Anomaly detected"}
                                                            <br />
                                                            Time: {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    <div className="dashboard-card">
                                        <h2>Recent User Logins (7 Days)</h2>
                                        <div style={{ width: '100%', height: '250px', minWidth: 0 }}>
                                            {activeUsers.length === 0 ? (
                                                <div className="text-center-muted">No activity data available</div>
                                            ) : (
                                                <ResponsiveContainer width="99%" height="100%">
                                                    <BarChart data={activeUsers.slice(0, 5)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#718096', fontSize: 12 }} />
                                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#718096', fontSize: 12 }} />
                                                        <Tooltip cursor={{ fill: '#edf2f7' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                                                        <Bar dataKey="total_logins" fill="#667eea" radius={[4, 4, 0, 0]} name="Total Logins" />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            )}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="dashboard-card" style={{ gridColumn: '1 / -1' }}>
                                        <h2>Your Active Devices</h2>
                                        <div className="table-wrapper">
                                            <table className="emp-table">
                                                <thead>
                                                    <tr>
                                                        <th>Device</th>
                                                        <th>Location</th>
                                                        <th>Last Active</th>
                                                        <th>Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {mySessions.length === 0 ? (
                                                        <tr><td colSpan="4" className="text-center-muted">No active sessions found.</td></tr>
                                                    ) : (
                                                        mySessions.map((session) => (
                                                            <tr key={session.id}>
                                                                <td style={{ fontWeight: '600', color: '#2d3748' }}>
                                                                    {session.device_info || 'Unknown Device'}
                                                                    <div style={{ fontSize: '0.8rem', color: '#718096', fontFamily: 'monospace' }}>
                                                                        IP: {session.ip_address}
                                                                    </div>
                                                                </td>
                                                                <td style={{ color: '#4a5568' }}>
                                                                    📍 {session.location || 'Unknown'}
                                                                </td>
                                                                <td style={{ color: '#718096', fontSize: '0.9rem' }}>
                                                                    {formatDistanceToNow(new Date(session.last_active), { addSuffix: true })}
                                                                </td>
                                                                <td>
                                                                    <button
                                                                        onClick={() => handleRevokeSession(session.id)}
                                                                        className="btn-delete"
                                                                    >
                                                                        Revoke Session
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </>
                            )}

                            <div className="dashboard-card" style={{ gridColumn: user?.role === 'admin' ? 'auto' : '1 / -1' }}>
                                <h2>Live Security Map</h2>
                                <div style={{ width: '100%', height: '250px', minWidth: 0, position: 'relative' }}>
                                    <SecurityMap events={logs} />
                                </div>
                            </div>
                        </div>

                        <div className="dashboard-card">
                            <div className="table-header-flex">
                                <h2 style={{ border: 'none', margin: 0, padding: 0 }}>
                                    {user?.role === "admin" ? "All Logs" : "Your Logs"}
                                    {tableLoading && <span style={{ fontSize: '0.8rem', color: '#718096', marginLeft: '10px' }}>Updating...</span>}
                                </h2>

                                <select
                                    className="filter-select"
                                    value={eventTypeFilter}
                                    onChange={(e) => { setEventTypeFilter(e.target.value); setPage(0); }}
                                >
                                    <option value="">All Events</option>
                                    <option value="FAILED_LOGIN">Failed Logins</option>
                                    <option value="ACTIVE_SESSION">Successful Logins</option>
                                    {user?.role === "admin" && (
                                        <option value="ACTIVE_USER_SESSION">Active User Sessions</option>
                                    )}
                                    <option value="SUSPICIOUS_ACTIVITY">Suspicious Activity</option>
                                    <option value="ACCOUNT_LOCKED">Account Lockouts</option>
                                </select>
                            </div>

                            <div className="table-wrapper">
                                <table className="emp-table">
                                    <thead>
                                        <tr>
                                            <th>Time</th>
                                            <th>Event</th>
                                            {user?.role === "admin" && <th>User</th>}
                                            <th>IP Address</th>
                                            <th>Details</th>
                                            {user?.role === "admin" && eventTypeFilter === "ACTIVE_USER_SESSION" && <th>Action</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tableLoading ? (
                                            <tr>
                                                <td colSpan={user?.role === "admin" ? (eventTypeFilter === "ACTIVE_USER_SESSION" ? "6" : "5") : "4"} className="text-center-muted">Filtering Logs...</td>
                                            </tr>
                                        ) : logs.length === 0 ? (
                                            <tr>
                                                <td colSpan={user?.role === "admin" ? (eventTypeFilter === "ACTIVE_USER_SESSION" ? "6" : "5") : "4"} className="text-center-muted">No events found matching your criteria.</td>
                                            </tr>
                                        ) : (
                                            logs.map((log) => (
                                                <tr key={log.id}>
                                                    <td style={{ color: '#718096', fontSize: '0.9rem' }}>
                                                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                                                    </td>
                                                    <td>
                                                        <span className={`badge ${getEventBadgeClass(log.event_type)}`}>
                                                            {log.event_type.replace("_", " ")}
                                                        </span>
                                                    </td>
                                                    {user?.role === "admin" && (
                                                        <td style={{ fontWeight: '600', color: '#2d3748' }}>
                                                            {log.username || `Unknown (ID: ${log.user_id || 'N/A'})`}
                                                        </td>
                                                    )}
                                                    <td style={{ color: '#718096', fontFamily: 'monospace' }}>
                                                        {log.ip_address || 'N/A'}
                                                        {log.event_metadata?.location && (
                                                            <div style={{ fontSize: '0.75rem', color: '#4a5568', marginTop: '4px', fontFamily: 'Inter, sans-serif' }}>
                                                                📍 {log.event_metadata.location}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td style={{ color: '#718096', fontSize: '0.8rem', maxWidth: '200px' }}>
                                                        {log.event_metadata ? JSON.stringify(log.event_metadata).replace(/[{}]/g, '').replace(/"/g, '') : ''}
                                                        {log.user_email && <div style={{ marginTop: '4px' }}>{log.user_email}</div>}
                                                    </td>
                                                    {user?.role === "admin" && eventTypeFilter === "ACTIVE_USER_SESSION" && (
                                                        <td>
                                                            <button
                                                                onClick={() => handleAdminRevokeSession(log.id)}
                                                                className="btn-delete"
                                                            >
                                                                Revoke Session
                                                            </button>
                                                        </td>
                                                    )}
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="pagination">
                                <button
                                    disabled={page === 0}
                                    onClick={() => setPage(p => Math.max(0, p - 1))}
                                    className="btn-google"
                                    style={{ width: 'auto', padding: '6px 16px', margin: 0 }}
                                >
                                    Previous
                                </button>
                                <span style={{ color: '#718096', alignSelf: 'center', fontSize: '0.9rem' }}>Page {page + 1}</span>
                                <button
                                    disabled={logs.length < limit || eventTypeFilter === "ACTIVE_USER_SESSION"}
                                    onClick={() => setPage(p => p + 1)}
                                    className="btn-google"
                                    style={{ width: 'auto', padding: '6px 16px', margin: 0 }}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default SecurityDashboard;