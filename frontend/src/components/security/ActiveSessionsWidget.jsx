import React from 'react';
import { formatDistanceToNow } from "date-fns";

const ActiveSessionsWidget = ({ mySessions, handleRevokeSession }) => (
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
);

export default ActiveSessionsWidget;
