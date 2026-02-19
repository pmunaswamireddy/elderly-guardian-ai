import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { API_BASE_URL } from '../../config';
import { RefreshCw } from 'lucide-react';

// Types
interface UserLocation {
    user_id: number;
    lat: number;
    lng: number;
    last_seen: string;
    name: string;
    email: string;
    role?: string;
}

// Helper to handle map resize - Top Level for Purity
const ResizeHandler: React.FC<{ isMaximized: boolean }> = ({ isMaximized }) => {
    const map = useMap();
    useEffect(() => {
        const timer = setTimeout(() => map.invalidateSize(), 400);
        return () => clearTimeout(timer);
    }, [isMaximized, map]);
    return null;
};

const LiveUserMap: React.FC = () => {
    const [locations, setLocations] = useState<UserLocation[]>([]);
    const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
    const [isMaximized, setIsMaximized] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    // Purity fix: use lazy initializer for state
    const [now, setNow] = useState(() => Date.now());

    const fetchLocations = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/locations?minutes=60`);
            if (res.ok) {
                const data = await res.json();
                const filtered = data.locations.filter((l: UserLocation) => l.lat && l.lng && l.lat !== 0);
                setLocations(filtered);
                setNow(Date.now());
            }
        } catch (e) {
            console.error("Failed to fetch locations", e);
        }
    };

    useEffect(() => {
        // Initial fetch
        const loadInitial = async () => {
            await fetchLocations();
        };
        loadInitial();
        
        const interval = setInterval(fetchLocations, 2000); // 2s polling for instant feel

        // Sync with global theme changes
        const observer = new MutationObserver(() => {
            const dark = document.documentElement.classList.contains('dark');
            setIsDark(dark);
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class']
        });

        return () => {
            clearInterval(interval);
            observer.disconnect();
        };
    }, []);

    // Custom Google Maps style Pin
    const createPinIcon = (color: string) => L.divIcon({
        html: `
            <div class="relative group">
                <svg width="34" height="42" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="drop-shadow-xl flex items-center justify-center">
                    <path d="M12 21.7C17.3 17 20 13 20 10C20 5.58172 16.4183 2 12 2C7.58172 2 4 5.58172 4 10C4 13 6.7 17 12 21.7Z" fill="${color}" stroke="white" stroke-width="1.5" />
                    <circle cx="12" cy="10" r="3" fill="white" />
                </svg>
            </div>
        `,
        className: 'custom-pin',
        iconSize: [34, 42],
        iconAnchor: [17, 42]
    });

    if (isMinimized) {
        return (
            <div 
                className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-4 shadow-2xl border border-white/10 cursor-pointer hover:bg-slate-800 transition-all flex justify-between items-center group"
                onClick={() => setIsMinimized(false)}
            >
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                        <RefreshCw className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="font-bold text-white text-lg">Live Map</h2>
                        <p className="text-xs text-slate-400">{locations.length} nodes active</p>
                    </div>
                </div>
                <button className="px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-indigo-500/20">Expand</button>
            </div>
        );
    }

    return (
        <div className={`transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] overflow-hidden ${
            isMaximized 
                ? 'fixed inset-0 z-[9999] rounded-none' 
                : 'h-[600px] relative z-10 rounded-[2.5rem] shadow-2xl shadow-indigo-500/10 border border-white/10 bg-slate-950'
        }`}>
            
            {/* Premium Glass Header */}
            <div className={`absolute top-6 left-6 right-6 flex justify-between items-start pointer-events-none ${isMaximized ? 'z-[10000]' : 'z-20'}`}>
                <div className="bg-slate-900/60 backdrop-blur-2xl p-6 rounded-[2rem] border border-white/10 shadow-2xl pointer-events-auto flex flex-col gap-1 min-w-[200px]">
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(34,197,94,0.6)]" />
                        <h2 className="text-xl font-black text-white tracking-tight uppercase">Live System Grid</h2>
                    </div>
                </div>

                <div className="flex gap-3 pointer-events-auto">
                    {/* Primary actions */}
                    <button onClick={() => setIsMaximized(!isMaximized)} className="w-12 h-12 flex items-center justify-center bg-slate-900/60 backdrop-blur-2xl rounded-2xl border border-white/10 text-white hover:bg-white/10 transition-all shadow-xl">
                        {isMaximized ? '🗗' : '🗖'}
                    </button>
                    {!isMaximized && (
                        <button onClick={() => setIsMinimized(true)} className="w-12 h-12 flex items-center justify-center bg-slate-900/60 backdrop-blur-2xl rounded-2xl border border-white/10 text-white hover:bg-white/10 transition-all shadow-xl">
                            −
                        </button>
                    )}
                </div>
            </div>

            <MapContainer
                center={[20.5937, 78.9629]}
                zoom={5}
                preferCanvas={true} // CRITICAL for performance with 700+ users
                zoomControl={false}
                style={{ height: '100%', width: '100%', background: '#020617' }}
            >
                <ResizeHandler isMaximized={isMaximized} />
                <TileLayer
                    attribution='&copy; CARTO'
                    url={isDark 
                        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    }
                />
                
                {locations.map(loc => {
                    const isOnline = (now - new Date(loc.last_seen).getTime()) < 2 * 60 * 1000;
                    const color = isOnline ? "#22c55e" : "#ef4444"; 

                    return (
                        <Marker
                            key={`user-${loc.user_id}`}
                            position={[
                                loc.lat + (Math.sin(loc.user_id * 123.4) * 0.0002),
                                loc.lng + (Math.cos(loc.user_id * 567.8) * 0.0002)
                            ]}
                            icon={createPinIcon(color)}
                        >
                            <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                                <div className="bg-slate-950/80 backdrop-blur-md text-white px-2 py-1 rounded-lg border border-white/10 shadow-xl">
                                    <p className="font-black text-[10px] flex items-center gap-1.5 whitespace-nowrap">
                                        <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                                        {loc.name}
                                    </p>
                                </div>
                            </Tooltip>
                        </Marker>
                    );
                })}
            </MapContainer>

        </div>
    );
};

export default LiveUserMap;
