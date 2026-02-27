import React from 'react';
import { formatDistanceToNow } from "date-fns";

const LogsTableWidget = ({ user, logs, tableLoading, page, setPage, limit, eventTypeFilter, setEventTypeFilter, getEventBadgeClass, handleAdminRevokeSession }) => (
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
                                    <span className={`badge ${getEventBadgeClass(log.event_type || 'ACTIVE_USER_SESSION')}`}>
                                        {(log.event_type || 'ACTIVE_USER_SESSION').replace(/_/g, " ")}
                                    </span>
                                </td>
                                {user?.role === "admin" && (
                                    <td style={{ fontWeight: '600', color: '#2d3748' }}>
                                        {log.username || log.user_name || `Unknown (ID: ${log.user_id || 'N/A'})`}
                                    </td>
                                )}
                                <td style={{ color: '#718096', fontFamily: 'monospace' }}>
                                    {log.ip_address || 'N/A'}
                                    {(log.event_metadata?.location || log.location) && (
                                        <div style={{ fontSize: '0.75rem', color: '#4a5568', marginTop: '4px', fontFamily: 'Inter, sans-serif' }}>
                                            📍 {log.event_metadata?.location || log.location}
                                        </div>
                                    )}
                                </td>
                                <td style={{ color: '#718096', fontSize: '0.8rem', maxWidth: '200px' }}>
                                    {log.event_metadata ? JSON.stringify(log.event_metadata).replace(/[{}]/g, '').replace(/"/g, '') : log.device_info || ''}
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
);

export default LogsTableWidget;
