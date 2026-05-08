import React, { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup } from "react-leaflet";
import L from "leaflet";
import { useGlobalSocket } from "../context/SocketContext";
import cityData from "../data/city-model.json";

const GEO_COORDS = {
    Z01: [12.9698, 77.7499], // Whitefield
    Z02: [12.9279, 77.6271], // Koramangala
    Z03: [12.9121, 77.6446], // HSR Layout
    Z04: [12.8601, 77.7850], // Sarjapur
    Z05: [12.9716, 77.6411], // Indiranagar
    Z06: [12.9880, 77.6690], // Mahadevapura
    Z07: [12.9304, 77.6784], // Bellandur
    Z08: [12.9569, 77.7011], // Marathahalli
    Z09: [12.9166, 77.6101], // BTM Layout
    Z10: [12.8399, 77.6770], // Electronic City
    Z11: [13.0354, 77.5988], // Hebbal
    Z12: [13.1007, 77.5963], // Yelahanka
};

const SHELTER_COORDS = {
    S01: [13.035, 77.590],
    S02: [13.100, 77.600],
    S03: [12.972, 77.755],
};

const getLatLng = (id) => GEO_COORDS[id] || SHELTER_COORDS[id] || [12.9716, 77.6411];

const getZoneIcon = (risk, evacuated) => {
    const isLight = document.documentElement.classList.contains('light');
    const color = evacuated ? '#555' : risk >= 9 ? '#ef4444' : risk >= 7 ? '#f97316' : risk >= 5 ? '#eab308' : (isLight ? '#059669' : '#aaffdc');
    return L.divIcon({
        className: 'custom-zone-icon',
        html: `<div style="width: 14px; height: 14px; background-color: ${color}; border-radius: 50%; border: 2px solid ${isLight ? '#fff' : '#111'}; box-shadow: 0 0 10px ${color};"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
    });
};

const shelterIcon = L.divIcon({
    className: 'custom-shelter-icon',
    html: `<div style="width: 16px; height: 16px; background-color: #7dd3fc; border-radius: 4px; border: 2px solid #0ea5e9; box-shadow: 0 0 12px rgba(125,211,252,0.65);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
});

export default function SimulationMap() {
    const { data } = useGlobalSocket();
    const [notification, setNotification] = useState(null);
    const prevTopZoneKeyRef = useRef(null);
    const prevFullShelterRef = useRef(null);

    const cityModel = data?.city_model || cityData;
    const evacSequence = data?.evacuation_plan?.evacuation_sequence || [];
    const routeMap = data?.routes || {};
    const zoneList = cityModel.zones || cityData.zones;
    const shelterList = data?.shelter_status || cityModel.shelters.map((s) => ({
        id: s.id,
        name: s.name,
        current_occupancy: s.current_occupancy ?? 0,
        capacity: s.capacity ?? 0,
        available_capacity: Math.max((s.capacity ?? 0) - (s.current_occupancy ?? 0), 0),
        load_pct: s.capacity > 0 ? Math.round(((s.current_occupancy ?? 0) / s.capacity) * 100) : 0,
    }));
    const edges = cityData.road_network?.edges || [];

    const zoneByName = useMemo(() => {
        const map = {};
        zoneList.forEach((zone) => {
            map[zone.name] = zone;
            if (zone.id) map[zone.id] = zone;
        });
        return map;
    }, [zoneList]);

    const evacuatedZones = useMemo(() => {
        return zoneList.filter((zone) => zone.status === 'evacuated' || zone.status === 'EVACUATED');
    }, [zoneList]);

    const remainingTop3 = useMemo(() => {
        return evacSequence
            .filter((order) => {
                const route = routeMap[order.zone_name] || routeMap[order.zone_id];
                const zone = zoneByName[order.zone_name] || zoneByName[order.zone_id];
                return !!route && !(zone?.status === 'evacuated' || zone?.status === 'EVACUATED');
            })
            .sort((a, b) => {
                const aRisk = a.risk_score ?? 0;
                const bRisk = b.risk_score ?? 0;
                if (bRisk !== aRisk) return bRisk - aRisk;
                return (b.priority_score ?? 0) - (a.priority_score ?? 0);
            })
            .slice(0, 3)
            .map((order, index) => {
                const route = routeMap[order.zone_name] || routeMap[order.zone_id] || {};
                return {
                    zoneKey: order.zone_name || order.zone_id,
                    zoneName: order.zone_name || order.zone_id,
                    route,
                    rank: index + 1,
                    risk_score: order.risk_score ?? 0,
                    assigned_shelter: order.assigned_shelter || route.to_zone,
                    humans: order.next_batch_size || zoneByName[order.zone_name]?.population || zoneByName[order.zone_id]?.population || 0,
                };
            });
    }, [evacSequence, routeMap, zoneByName]);

    const currentOrder = useMemo(() => {
        return remainingTop3[0] || null;
    }, [remainingTop3]);

    const currentZone = currentOrder ? zoneByName[currentOrder.zoneKey] : null;
    const currentZoneCoord = getLatLng(currentZone?.id || currentZone?.name || currentOrder?.zoneKey);
    const currentRoute = currentOrder?.route;

    const assignedShelterId = currentOrder?.assigned_shelter;
    const assignedShelter = shelterList.find((shelter) => shelter.id === assignedShelterId);
    const fallbackShelter = useMemo(() => {
        if (assignedShelter && assignedShelter.available_capacity <= 0) {
            return shelterList
                .filter((shelter) => shelter.available_capacity > 0 && shelter.id !== assignedShelterId)
                .sort((a, b) => b.available_capacity - a.available_capacity)[0] || assignedShelter;
        }
        return assignedShelter;
    }, [assignedShelter, assignedShelterId, shelterList]);

    const effectiveShelter = fallbackShelter || assignedShelter;
    const currentRoutePath = useMemo(() => {
        if (!currentZoneCoord) return [];
        if (fallbackShelter && fallbackShelter.id !== assignedShelterId) {
            return [currentZoneCoord, getLatLng(fallbackShelter.id)].filter(Boolean);
        }
        return currentRoute?.path?.map((point) => getLatLng(point)).filter(Boolean) || [];
    }, [currentRoute, currentZoneCoord, fallbackShelter, assignedShelterId]);

    const fullShelters = useMemo(() => {
        return shelterList.filter((shelter) => shelter.available_capacity <= 0 || shelter.load_pct >= 100);
    }, [shelterList]);

    useEffect(() => {
        const previousKey = prevTopZoneKeyRef.current;
        const currentKey = currentOrder?.zoneKey || null;

        if (previousKey && previousKey !== currentKey) {
            const prevZone = zoneByName[previousKey];
            if (prevZone && (prevZone.status === 'evacuated' || prevZone.status === 'EVACUATED')) {
                const nextZone = currentOrder ? zoneByName[currentKey]?.name || currentKey : null;
                setNotification(`Zone ${prevZone.name || previousKey} is fully evacuated. ${nextZone ? `Now moving to ${nextZone}.` : 'All top 3 danger zones are now evacuated.'}`);
            }
        }

        if (!previousKey && !currentKey && remainingTop3.length === 0 && evacSequence.length > 0) {
            setNotification('All top 3 danger zones are now evacuated.');
        }

        prevTopZoneKeyRef.current = currentKey;
    }, [currentOrder, remainingTop3.length, zoneByName, evacSequence.length]);

    useEffect(() => {
        const currentFullShelterId = assignedShelterId;
        const isFull = assignedShelter && assignedShelter.available_capacity <= 0;
        if (isFull && fallbackShelter && fallbackShelter.id !== currentFullShelterId) {
            if (prevFullShelterRef.current !== currentFullShelterId) {
                setNotification(`Shelter ${assignedShelter.name} is full. Reassigning to ${fallbackShelter.name}.`);
            }
        }
        prevFullShelterRef.current = currentFullShelterId;
    }, [assignedShelter, assignedShelterId, fallbackShelter]);

    useEffect(() => {
        if (!notification) return;
        const timer = window.setTimeout(() => setNotification(null), 4500);
        return () => window.clearTimeout(timer);
    }, [notification]);

    return (
        <div className="flex flex-col h-screen w-full space-y-4 overflow-hidden">
            <div className="flex items-center justify-between border-b border-surface-border pb-2 px-4 pt-4">
                <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-primary uppercase tracking-[0.2em]">Evacuation Simulation</span>
                    <span className="text-[10px] text-surface-muted font-mono uppercase tracking-widest">Live tick: {data?.tick ?? 0}</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-surface-panel border border-surface-border p-3 rounded-xl">
                        <div className="text-[10px] text-surface-muted uppercase tracking-[0.2em]">Zones evacuated</div>
                        <div className="text-3xl font-black text-surface-foreground">{evacuatedZones.length}</div>
                    </div>
                    <div className="bg-surface-panel border border-surface-border p-3 rounded-xl">
                        <div className="text-[10px] text-surface-muted uppercase tracking-[0.2em]">Active paths</div>
                        <div className="text-3xl font-black text-surface-foreground">{currentOrder ? 1 : 0}</div>
                    </div>
                    <div className="bg-surface-panel border border-surface-border p-3 rounded-xl">
                        <div className="text-[10px] text-surface-muted uppercase tracking-[0.2em]">Shelters full</div>
                        <div className="text-3xl font-black text-surface-foreground">{fullShelters.length}</div>
                    </div>
                </div>
            </div>

            {notification && (
                <div className="fixed right-6 top-24 z-50 max-w-xs rounded-2xl border border-surface-border bg-surface-panel p-4 text-sm shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
                    <div className="text-xs font-bold text-primary uppercase tracking-[0.2em] mb-2">Alert</div>
                    <div className="text-surface-foreground">{notification}</div>
                </div>
            )}

            <div className="grid gap-4 xl:grid-cols-[0.7fr_0.3fr] flex-1 overflow-hidden px-4 pb-4">
                <div className="rounded-3xl border border-surface-border overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.45)] relative h-full">
                    <MapContainer
                        center={[12.9716, 77.6411]}
                        zoom={12}
                        scrollWheelZoom={true}
                        style={{ height: '100%', width: '100%' }}
                        className="w-full h-full">
                        <TileLayer
                            attribution='&copy; CARTO'
                            url={document.documentElement.classList.contains('light') 
                                ? "https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png"
                                : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"}
                        />

                        {edges.map((edge, index) => {
                            const edgeGeo = [getLatLng(edge[0]), getLatLng(edge[1])];
                            return (
                                <Polyline
                                    key={`edge-${index}`}
                                    positions={edgeGeo}
                                    color="#25303a"
                                    weight={1}
                                    opacity={0.35}
                                />
                            );
                        })}

                        {remainingTop3.map((order, index) => {
                            const isCurrent = index === 0;
                            const zone = zoneByName[order.zoneKey];
                            const assignedShelterId = order.assigned_shelter;
                            const assignedShelter = shelterList.find((s) => s.id === assignedShelterId);
                            const fallbackShelter = isCurrent && assignedShelter && assignedShelter.available_capacity <= 0 ? shelterList.find((s) => s.available_capacity > 0 && s.id !== assignedShelterId) : null;
                            const effectiveShelter = fallbackShelter || assignedShelter;
                            const routePath = isCurrent && fallbackShelter ? [getLatLng(order.zoneKey), getLatLng(fallbackShelter.id)].filter(Boolean) : order.route?.path?.map((point) => getLatLng(point)).filter(Boolean) || [];
                            if (routePath.length < 2) return null;
                            return (
                                <React.Fragment key={`route-${order.zoneKey}`}>
                                    <Polyline
                                        positions={routePath}
                                        color={isCurrent ? (document.documentElement.classList.contains('light') ? "#2563eb" : "#7dd3fc") : "#f97316"}
                                        weight={isCurrent ? 4 : 3}
                                        opacity={isCurrent ? 0.85 : 0.6}
                                        dashArray={isCurrent ? "12, 8" : null}
                                    >
                                        <Popup>
                                            <div className="text-sm font-bold text-slate-900">{order.zoneName}</div>
                                            <div className="text-xs text-emerald-600 font-medium">Shelter: {effectiveShelter?.name || order.assigned_shelter}</div>
                                            <div className="text-xs text-emerald-600 font-medium">Risk: {order.risk_score?.toFixed(1)}</div>
                                            <div className="text-xs text-emerald-600 font-medium">Batch: {order.humans}</div>
                                            <div className="text-xs text-emerald-600 font-medium">Status: {isCurrent ? 'Active' : 'Pending'}</div>
                                        </Popup>
                                    </Polyline>
                                    <Marker position={routePath[0]} icon={getZoneIcon(order.risk_score, false)}>
                                        <Popup>
                                            <div className="text-sm font-bold text-slate-900">Zone {order.zoneName}</div>
                                            <div className="text-xs text-emerald-600 font-medium">{isCurrent ? 'Active evacuation route' : 'Pending evacuation'}</div>
                                        </Popup>
                                    </Marker>
                                    {effectiveShelter && (
                                        <Marker position={getLatLng(effectiveShelter.id)} icon={shelterIcon}>
                                            <Popup>
                                                <div className="text-sm font-bold text-slate-900">Shelter {effectiveShelter.name}</div>
                                                <div className="text-xs text-emerald-600 font-medium">Receiving evacuees</div>
                                            </Popup>
                                        </Marker>
                                    )}
                                </React.Fragment>
                            );
                        })}

                        {(() => {
                            const top3ZoneKeys = new Set(remainingTop3.map(order => order.zoneKey));
                            return zoneList.filter(zone => top3ZoneKeys.has(zone.name) || top3ZoneKeys.has(zone.id)).map((zone) => {
                                const coord = getLatLng(zone.id || zone.name);
                                if (!coord) return null;
                                const isEvacuated = zone.status === 'evacuated' || zone.status === 'EVACUATED';
                                const risk = zone.risk_score ?? zone.flood_risk_base ?? 0;
                                return (
                                    <Marker key={`zone-marker-${zone.id || zone.name}`} position={coord} icon={getZoneIcon(risk, isEvacuated)}>
                                        <Popup>
                                            <div className="text-sm font-bold text-slate-900">{zone.name || zone.id}</div>
                                            <div className="text-xs text-emerald-600 font-medium">Status: {isEvacuated ? 'Evacuated' : 'Pending'}</div>
                                            <div className="text-xs text-emerald-600 font-medium">Risk: {risk.toFixed(1)}</div>
                                        </Popup>
                                    </Marker>
                                );
                            });
                        })()}

                        {shelterList.map((shelter) => {
                            const coord = getLatLng(shelter.id);
                            if (!coord) return null;
                            return (
                                <Marker key={`shelter-${shelter.id}`} position={coord} icon={shelterIcon}>
                                    <Popup>
                                        <div className="text-sm font-bold text-slate-900">{shelter.name}</div>
                                        <div className="text-xs text-emerald-600 font-medium">Occupancy: {shelter.current_occupancy}/{shelter.capacity}</div>
                                        <div className="text-xs text-emerald-600 font-medium">Load: {Math.min(shelter.load_pct, 100)}%</div>
                                    </Popup>
                                </Marker>
                            );
                        })}
                    </MapContainer>
                </div>

                <div className="space-y-4 overflow-y-auto">
                    <div className="rounded-3xl border border-surface-border bg-surface-panel p-5 shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <div className="text-xs font-bold text-primary uppercase tracking-[0.2em]">Top 3 Danger Zones</div>
                                <div className="text-[10px] text-surface-muted uppercase tracking-[0.2em]">Live evacuation priorities</div>
                            </div>
                            <div className="text-[10px] text-surface-muted uppercase tracking-[0.2em]">{data?.scenario || 'moderate_flood'}</div>
                        </div>
                        <div className="space-y-3">
                            {remainingTop3.length === 0 ? (
                                <div className="rounded-2xl border border-gray-800 p-4 text-sm text-gray-400">No active top-3 danger zones available or all are evacuated.</div>
                            ) : (
                                remainingTop3.map((order, index) => {
                                    const isCurrent = index === 0;
                                    const zone = zoneByName[order.zoneKey];
                                    const effectiveShelterName = order.zoneKey === currentOrder?.zoneKey ? (effectiveShelter?.name || order.assigned_shelter) : order.assigned_shelter;
                                    const pathLength = currentRoutePath.length;
                                    return (
                                        <div key={`top-${order.zoneKey}`} className={"rounded-3xl border p-4 " + (isCurrent ? "border-primary bg-primary/10" : "border-surface-border bg-surface-muted")}>
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <div className="text-sm font-black text-surface-foreground">{zone?.name || order.zoneName}</div>
                                                    <div className="text-[10px] uppercase tracking-[0.2em] text-surface-muted">Shelter {effectiveShelterName}</div>
                                                </div>
                                                <div className="text-2xl font-black text-surface-foreground">#{order.rank}</div>
                                            </div>
                                            <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-surface-muted">
                                                <div>Risk: {order.risk_score?.toFixed(1)}</div>
                                                <div>Batch: {order.humans}</div>
                                                <div>Path length: {isCurrent ? pathLength : order.route?.path?.length || 0}</div>
                                                <div>Status: {isCurrent ? 'current' : 'pending'}</div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    <div className="rounded-3xl border border-surface-border bg-surface-panel p-5 shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
                        <div className="text-xs font-bold text-primary uppercase tracking-[0.2em] mb-4">Shelter Load Summary</div>
                        <div className="space-y-3">
                            {shelterList.map((shelter) => {
                                const percentage = Math.min(Math.round(shelter.load_pct), 100);
                                return (
                                    <div key={`summary-${shelter.id}`} className="rounded-3xl border border-surface-border p-4 bg-surface-muted">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="text-sm font-bold text-surface-foreground">{shelter.name}</div>
                                                <div className="text-[10px] uppercase tracking-[0.2em] text-surface-muted">{shelter.available_capacity <= 0 ? 'FULL' : `${shelter.available_capacity} seats left`}</div>
                                            </div>
                                            <div className={`text-xs font-black ${percentage >= 100 ? 'text-red-500' : 'text-emerald-400'}`}>{percentage}%</div>
                                        </div>
                                        <div className="mt-3 h-2 w-full rounded-full bg-slate-900 overflow-hidden">
                                            <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500" style={{ width: `${percentage}%` }}></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
