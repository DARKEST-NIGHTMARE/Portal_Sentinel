import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { formatDistanceToNow } from "date-fns";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

import { securityApi } from "../services/securityApi";
import { logout } from "../redux/authSlice";
import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";

const SecurityDashboard = () => {
    const dispatch = useDispatch();

    const { user } = useSelector((state) => state.auth);

    const [events, setEvents] = useState([]);
    const [activeUsers, setActiveUsers] = useState([]);
    const [loading, setLoading] = useState(true);
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
        const fetchDashboardData = async () => {
            setLoading(true);
            setError(null);
            try {
                const [eventsData, usersData] = await Promise.all([
                    securityApi.getEvents(page * limit, limit, eventTypeFilter),
                    securityApi.getActiveUsers(7)
                ]);

                setEvents(eventsData);
                setActiveUsers(usersData);
            } catch (err) {
                setError(err.response?.data?.detail || "Failed to load security data.");
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [page, eventTypeFilter]);

    const getEventBadgeClass = (type) => {
        switch (type) {
            case "FAILED_LOGIN": return "badge-failed";
            case "SUSPICIOUS_ACTIVITY": return "badge-suspicious";
            case "ACCOUNT_LOCKED": return "badge-locked";
            case "ACTIVE_SESSION": return "badge-active";
            default: return "badge-default";
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
            <Navbar
                user={user}
                onLogout={handleLogout}
                activePage="security"
            />

            <div className="glass-card">
                <div className="security-header">
                    <h1>Security Center</h1>
                </div>

                {loading && page === 0 ? (
                    <div className="text-center-muted">Loading...</div>
                ) : error ? (
                    <div className="text-center-muted" style={{ color: '#e53e3e' }}>Error: {error}</div>
                ) : (
                    <>
                        <div className="security-grid">

                            <div className="dashboard-card">
                                <h2 style={{ color: '#c53030' }}> Alerts</h2>
                                <div className="alert-list">
                                    {events.filter(e => e.event_type === "SUSPICIOUS_ACTIVITY" || e.event_type === "ACCOUNT_LOCKED").length === 0 ? (
                                        <p className="text-center-muted">No active alerts detected.</p>
                                    ) : (
                                        events
                                            .filter(e => e.event_type === "SUSPICIOUS_ACTIVITY" || e.event_type === "ACCOUNT_LOCKED")
                                            .map(alert => (
                                                <div key={alert.id} className="alert-item">
                                                    <strong>
                                                        {alert.username || "Unknown User"} (ID: {alert.user_id || 'N/A'})
                                                    </strong>
                                                    triggered {alert.event_type.replace("_", " ")}
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
                                <div style={{ height: '250px' }}>
                                    {activeUsers.length === 0 ? (
                                        <div className="text-center-muted">No activity data available</div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
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
                        </div>

                        <div className="dashboard-card">
                            <div className="table-header-flex">
                                <h2 style={{ border: 'none', margin: 0, padding: 0 }}>System Audit Log</h2>

                                <select
                                    className="filter-select"
                                    value={eventTypeFilter}
                                    onChange={(e) => { setEventTypeFilter(e.target.value); setPage(0); }}
                                >
                                    <option value="">All Events</option>
                                    <option value="FAILED_LOGIN">Failed Logins</option>
                                    <option value="ACTIVE_SESSION">Successful Logins</option>
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
                                            <th>User</th>
                                            <th>IP Address</th>
                                            <th>Details</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {events.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" className="text-center-muted">No events found matching your criteria.</td>
                                            </tr>
                                        ) : (
                                            events.map((event) => (
                                                <tr key={event.id}>
                                                    <td style={{ color: '#718096', fontSize: '0.9rem' }}>
                                                        {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                                                    </td>
                                                    <td>
                                                        <span className={`badge ${getEventBadgeClass(event.event_type)}`}>
                                                            {event.event_type.replace("_", " ")}
                                                        </span>
                                                    </td>
                                                    <td style={{ fontWeight: '600', color: '#2d3748' }}>
                                                        {event.username || `Unknown (ID: ${event.user_id || 'N/A'})`}
                                                    </td>
                                                    <td style={{ color: '#718096', fontFamily: 'monospace' }}>
                                                        {event.ip_address || 'N/A'}
                                                        {event.event_metadata?.location && (
                                                          <div style={{ fontSize: '0.75rem', color: '#4a5568', marginTop: '4px', fontFamily: 'Inter, sans-serif' }}>
                                                             📍 {event.event_metadata.location}
                                                                          </div>
                                                                     )}
                                                    </td>
                                                    <td style={{ color: '#718096', fontSize: '0.8rem', maxWidth: '200px' }}>
                                                        {JSON.stringify(event.event_metadata).replace(/[{}]/g, '').replace(/"/g, '')}
                                                    </td>
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
                                    disabled={events.length < limit}
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