import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formatDistanceToNow } from "date-fns";

const createCustomIcon = (color) => L.divIcon({
    className: 'custom-icon',
    html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7]
});

const safeIcon = createCustomIcon('#4299e1');    
const dangerIcon = createCustomIcon('#e53e3e');

const SecurityMap = ({ events }) => {
    const mappableEvents = events.filter(e =>
        e.event_metadata && e.event_metadata.lat && e.event_metadata.lon
    );

    return (
        <div style={{ height: '100%', width: '100%', borderRadius: '12px', overflow: 'hidden', zIndex: 1 }}>
            <MapContainer
                center={[20, 0]} 
                zoom={2}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={false}
            >
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                />

                {mappableEvents.map((event) => {
                    const isDanger = event.event_type === "FAILED_LOGIN" || event.event_type === "SUSPICIOUS_ACTIVITY" || event.event_type === "ACCOUNT_LOCKED";

                    return (
                        <Marker
                            key={event.id}
                            position={[event.event_metadata.lat, event.event_metadata.lon]}
                            icon={isDanger ? dangerIcon : safeIcon}
                        >
                            <Popup>
                                <div style={{ minWidth: '150px' }}>
                                    <strong style={{ color: isDanger ? '#e53e3e' : '#2b6cb0' }}>
                                        {event.event_type.replace('_', ' ')}
                                    </strong>
                                    <br />
                                    <b>User:</b> {event.username || 'Unknown'}
                                    <br />
                                    <b>IP:</b> {event.ip_address}
                                    <br />
                                    <b>Location:</b> {event.event_metadata.location}
                                    <br />
                                    <span style={{ fontSize: '0.8rem', color: '#718096' }}>
                                        {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                                    </span>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
        </div>
    );
};

export default SecurityMap;
