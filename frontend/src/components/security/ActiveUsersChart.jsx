import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const ActiveUsersChart = ({ activeUsers }) => (
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
);

export default ActiveUsersChart;
