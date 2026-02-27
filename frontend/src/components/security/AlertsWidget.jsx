import React from 'react';
import { formatDistanceToNow } from 'date-fns';

const AlertsWidget = ({ alerts }) => (
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
);

export default AlertsWidget;
