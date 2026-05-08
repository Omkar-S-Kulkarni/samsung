import React, { useState, useEffect } from 'react';
import cityData from '../data/city-model.json';
import { useGlobalSocket } from '../context/SocketContext';
import { useLocation } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Polyline, Popup, GeoJSON } from 'react-leaflet';
import L from 'leaflet';

// Real Bengaluru Latitude/Longitude approximations
const GEO_COORDS = {
  Z01: [12.9304, 77.6784], // Bellandur (Now Z01)
  Z02: [12.9569, 77.7011], // Marathahalli (Now Z02)
  Z03: [12.9121, 77.6446], // HSR Layout
  Z04: [12.8601, 77.7850], // Sarjapur
  Z05: [12.9716, 77.6411], // Indiranagar
  Z06: [12.9880, 77.6690], // Mahadevapura
  Z07: [12.9698, 77.7499], // Whitefield
  Z08: [12.9279, 77.6271], // Koramangala
  Z09: [12.9166, 77.6101], // BTM Layout
  Z10: [12.8399, 77.6770], // Electronic City
  Z11: [13.0354, 77.5988], // Hebbal
  Z12: [13.1007, 77.5963], // Yelahanka
  Whitefield: [12.9698, 77.7499],
  Koramangala: [12.9279, 77.6271],
  'HSR Layout': [12.9121, 77.6446],
  Sarjapur: [12.8601, 77.7850],
  Indiranagar: [12.9716, 77.6411],
  Mahadevapura: [12.9880, 77.6690],
  Bellandur: [12.9304, 77.6784],
  Marathahalli: [12.9569, 77.7011],
  'BTM Layout': [12.9166, 77.6101],
  'Electronic City': [12.8399, 77.6770],
  Hebbal: [13.0354, 77.5988],
  Yelahanka: [13.1007, 77.5963]
};

const SHELTER_COORDS = {
  S01: [13.035, 77.590], // Hebbal Shelter (RMC Ground Approx)
  S02: [13.100, 77.600], // Yelahanka Shelter (Kanteerava Approx)
  S03: [12.972, 77.755], // Whitefield Shelter (ITPL Approx)
};

const getLatLng = (id) => GEO_COORDS[id] || SHELTER_COORDS[id];

const getZoneIcon = (risk) => {
  let color = '#aaffdc'; // Stable (Emerald)
  let shadow = '#aaffdc';
  
  const isLight = document.documentElement.classList.contains('light');

  if (risk >= 9) {
    color = '#ef4444'; // Red
    shadow = '#ef4444';
  } else if (risk >= 7) {
    color = '#f97316'; // Orange
    shadow = '#f97316';
  } else if (risk >= 5) {
    color = '#eab308'; // Yellow
    shadow = '#eab308';
  } else {
    color = isLight ? '#059669' : '#aaffdc'; // Darker emerald in light mode
    shadow = color;
  }

  return L.divIcon({
    className: 'custom-icon',
    html: `<div style="width: 14px; height: 14px; background-color: ${color}; border-radius: 50%; border: 2px solid #000; box-shadow: 0 0 10px ${shadow}; transition: all 0.5s ease;"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });
};

const shelterIcon = L.divIcon({
  className: 'custom-icon',
  html: `<div style="width: 16px; height: 16px; background-color: #ffffff; border-radius: 2px; border: 2px solid #aaffdc; box-shadow: 0 0 12px #ffffff;"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

const EvacuationUnit = ({ path, delay = 0 }) => {
  const [pos, setPos] = useState(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!path || path.length < 2) return;

    let interval;
    const startTimeout = setTimeout(() => {
      interval = setInterval(() => {
        setIndex(prev => {
          if (prev >= path.length - 1) return 0;
          return prev + 1;
        });
      }, 150); // Speed up slightly for dots
    }, delay);

    return () => {
      clearTimeout(startTimeout);
      if (interval) clearInterval(interval);
    };
  }, [path.length, delay]);

  useEffect(() => {
    if (path && path[index]) {
      setPos(path[index]);
    }
  }, [index, path]);

  if (!pos) return null;

  return (
    <Marker
      position={pos}
      icon={L.divIcon({
        className: 'evacuation-dot',
        html: `<div style="width: 8px; height: 8px; background-color: #2563eb; border-radius: 50%; box-shadow: 0 0 12px #2563eb, 0 0 4px #fff; border: 1px solid rgba(255,255,255,0.3);"></div>`,
        iconSize: [8, 8],
        iconAnchor: [4, 4]
      })}
      interactive={false}
    />
  );
};

export default function RoutePlan() {
  const { data, isConnected } = useGlobalSocket();
  const location = useLocation();
  const [tick, setTick] = useState(0);
  const [activeRoutes, setActiveRoutes] = useState([]);
  const [map, setMap] = useState(null);
  const [selectedDetailZone, setSelectedDetailZone] = useState(null);
  const [detailGeoData, setDetailGeoData] = useState(null);
  const [isLoadingGeo, setIsLoadingGeo] = useState(false);
  const [showPipeline, setShowPipeline] = useState(false);

  const [osrmCache, setOsrmCache] = useState({});

  const edges = cityData.road_network.edges;

  const isLight = document.documentElement.classList.contains('light');

  // Stable calculation of OSRM paths to prevent animation jitter
  const renderOsrmPath = React.useCallback((pointArray) => {
    let fullPath = [];
    for (let i = 0; i < pointArray.length - 1; i++) {
      const p1 = getLatLng(pointArray[i]);
      const p2 = getLatLng(pointArray[i + 1]);
      if (!p1 || !p2) continue;

      const key = `${p1[1]},${p1[0]};${p2[1]},${p2[0]}`;
      if (osrmCache[key]) {
        fullPath = fullPath.concat(osrmCache[key]);
      } else {
        fullPath.push(p1);
        fullPath.push(p2);
      }
    }
    return fullPath;
  }, [osrmCache]);

  const memoizedPaths = React.useMemo(() => {
    return activeRoutes.map(route => ({
      ...route,
      geoPath: renderOsrmPath(route.path)
    }));
  }, [activeRoutes, renderOsrmPath]);

  const memoizedEdges = React.useMemo(() => {
    return edges.map(edge => renderOsrmPath(edge));
  }, [edges, renderOsrmPath]);

  // Handle auto-selection from Pipeline
  useEffect(() => {
    if (location.state?.autoSelectZone) {
      const zoneId = location.state.autoSelectZone;
      setSelectedDetailZone(zoneId);
      
      // Auto-zoom to the zone
      const coords = GEO_COORDS[zoneId] || GEO_COORDS[zoneId.toUpperCase()];
      if (map && coords) {
        map.flyTo(coords, 15);
      }

      // Clear state to prevent re-triggering on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location, map]);

  useEffect(() => {
    if (!selectedDetailZone) {
      setDetailGeoData(null);
      return;
    }

    const zoneKey = selectedDetailZone.toLowerCase();
    
    // Fetch GeoJSON for specific high-fidelity zones
    if (zoneKey.includes('bellandur') || zoneKey === 'z01') {
      setIsLoadingGeo(true);
      fetch('/src/data/bellanduru.geojson')
        .then(res => res.json())
        .then(data => {
          setDetailGeoData(data);
          setIsLoadingGeo(false);
          const coords = GEO_COORDS.Z01 || GEO_COORDS.Bellandur;
          if (map && coords) map.flyTo(coords, 15);
        })
        .catch(() => setIsLoadingGeo(false));
    } else if (zoneKey.includes('marathahalli') || zoneKey === 'z02') {
      setIsLoadingGeo(true);
      fetch('/src/data/marathhalli.geojson')
        .then(res => res.json())
        .then(data => {
          setDetailGeoData(data);
          setIsLoadingGeo(false);
          const coords = GEO_COORDS.Z02 || GEO_COORDS.Marathahalli;
          if (map && coords) map.flyTo(coords, 15);
        })
        .catch(() => setIsLoadingGeo(false));
    } else {
      // General zoom for other zones (Z01-Z06, Z09-Z12)
      setDetailGeoData(null);
      const coords = GEO_COORDS[selectedDetailZone.toUpperCase()] || GEO_COORDS[selectedDetailZone];
      if (map && coords) {
        map.flyTo(coords, 15);
      }
    }
  }, [selectedDetailZone, map]);

  const getSubAreaRisk = (feature) => {
    // Synthetic risk calculation for demo
    // High risk for water bodies or specific names
    const props = feature.properties || {};
    const name = (props.name || "").toLowerCase();
    if (props.natural === 'water' || props.water) return 10;
    if (name.includes('slum') || name.includes('low')) return 9;
    if (name.includes('apartment') || name.includes('residency')) return 4;
    
    // Default random-ish but stable risk based on ID
    const idStr = props['@id'] || props.id || "0";
    const hash = idStr.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0);
    return Math.abs(hash % 8) + 2;
  };

  const geoJsonStyle = (feature) => {
    const risk = getSubAreaRisk(feature);
    let color = '#aaffdc'; // Stable
    if (risk >= 9) color = '#ef4444'; // Critical
    else if (risk >= 7) color = '#f97316'; // High
    else if (risk >= 5) color = '#eab308'; // Elevated

    return {
      fillColor: color,
      weight: 1,
      opacity: 0.8,
      color: 'white',
      fillOpacity: 0.4,
    };
  };

  const onEachFeature = (feature, layer) => {
    const props = feature.properties || {};
    const name = props.name || "Unnamed Sub-area";
    const risk = getSubAreaRisk(feature);
    const riskLabel = risk >= 9 ? 'CRITICAL' : risk >= 7 ? 'HIGH' : risk >= 5 ? 'ELEVATED' : 'STABLE';
    const riskColor = risk >= 9 ? 'text-red-500' : risk >= 7 ? 'text-orange-500' : risk >= 5 ? 'text-yellow-500' : 'text-emerald-400';

    layer.bindPopup(`
      <div style="font-family: inherit; padding: 4px;">
        <div style="font-size: 10px; font-weight: 900; color: #aaffdc; text-transform: uppercase; margin-bottom: 4px;">Detailed Analysis</div>
        <div style="font-size: 12px; font-weight: bold; color: white; margin-bottom: 2px;">${name}</div>
        <div style="font-size: 10px; color: #94a3b8;">Type: ${props.natural || props.building || 'Area'}</div>
        <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.1); margin: 6px 0;" />
        <div style="display: flex; justify-between; align-items: center;">
          <span style="font-size: 9px; font-weight: bold; color: #94a3b8; text-transform: uppercase;">Danger Level:</span>
          <span style="font-size: 9px; font-weight: 900; margin-left: 8px; color: ${risk >= 9 ? '#ef4444' : risk >= 7 ? '#f97316' : risk >= 5 ? '#eab308' : '#10b981'}">${riskLabel} (${risk.toFixed(1)})</span>
        </div>
      </div>
    `);
  };

  useEffect(() => {
    console.log("[RoutePlan] Mount/Data update", data);
    if (data && data.tick !== undefined) {
      setTick(data.tick);
      if (data.routes && data.evacuation_plan) {
        const sortedZones = [...data.evacuation_plan.evacuation_sequence]
          .filter(item => data.routes[item.zone_name])
          .sort((a, b) => {
            const aRisk = a.risk_score ?? 0;
            const bRisk = b.risk_score ?? 0;
            if (bRisk !== aRisk) return bRisk - aRisk;
            return (b.priority_score ?? 0) - (a.priority_score ?? 0);
          });

        const top3 = sortedZones.slice(0, 3);
        const routesArray = top3.map((item, index) => {
          const route = data.routes[item.zone_name];
          const liveZone = data.city_model?.zones?.find(z => z.id === item.zone_id || z.name === item.zone_name);
          return {
            from: item.zone_name,
            to: route.to_zone,
            path: route.path,
            humans: item.next_batch_size || liveZone?.population || 0,
            status: route.status,
            rank: index + 1,
            risk_score: item.risk_score ?? 0,
          };
        });
        console.log("[RoutePlan] activeRoutes set to:", routesArray);
        setActiveRoutes(routesArray);
      }
    }
  }, [data]);



  // Background Async Fetcher for OSRM GeoJSON Paths
  useEffect(() => {
    const fetchPath = async (p1, p2) => {
      const key = `${p1[1]},${p1[0]};${p2[1]},${p2[0]}`; // OSRM is Lng,Lat
      if (osrmCache[key]) return; // Already fetched
      try {
        const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${key}?geometries=geojson`);
        if (!res.ok) return;
        const json = await res.json();
        if (json.code === 'Ok' && json.routes.length > 0) {
          // Convert GeoJSON (Lng, Lat) to Leaflet (Lat, Lng)
          const mapped = json.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
          setOsrmCache(prev => ({ ...prev, [key]: mapped }));
        }
      } catch (e) {
        console.error("OSRM Route Error: ", e);
      }
    };

    const pairsToFetch = [];
    edges.forEach(edge => {
      const start = getLatLng(edge[0]);
      const end = getLatLng(edge[1]);
      if (start && end) pairsToFetch.push([start, end]);
    });

    activeRoutes.forEach(r => {
      for (let i = 0; i < r.path.length - 1; i++) {
        const start = getLatLng(r.path[i]);
        const end = getLatLng(r.path[i + 1]);
        if (start && end) pairsToFetch.push([start, end]);
      }
    });

    const uniquePairs = [];
    const seen = new Set();
    pairsToFetch.forEach(pair => {
      const key = `${pair[0][0]},${pair[0][1]}_${pair[1][0]},${pair[1][1]}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniquePairs.push(pair);
      }
    });

    const loadAll = async () => {
      for (let i = 0; i < uniquePairs.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 300)); // Safer OSRM rate limit
        await fetchPath(uniquePairs[i][0], uniquePairs[i][1]);
      }
    };

    loadAll();
  }, [edges, activeRoutes]); // Re-run if routes change

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-surface-border pb-2">
        <div className="flex items-center gap-4">
          <span className="text-xs font-bold text-primary tracking-[0.2em] uppercase">
            Route Plan Simulation
          </span>
          <div className="h-4 w-px bg-surface-border"></div>
          <span className="text-[10px] font-mono text-surface-muted uppercase tracking-widest">
            Mobility_Agent_V.1.2 // Live_Tick: {tick}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
            <span className="text-[10px] text-surface-muted uppercase font-bold">Mobilization Alpha</span>
          </div>
          <div className="text-[10px] font-mono text-surface-muted tracking-widest uppercase">
            CartoDB geo overlays
          </div>
        </div>
      </div>

      <div className="flex flex-1 relative overflow-hidden rounded-lg border border-surface-border shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        {/* Real Map Area */}
        <div className="absolute inset-0 z-0">
          <style>
            {`
              .leaflet-container { background: var(--surface); font-family: inherit; }
              .custom-popup .leaflet-popup-content-wrapper { background: var(--surface-panel); backdrop-filter: blur(8px); color: var(--surface-foreground); border: 1px solid var(--surface-border); border-radius: 4px; }
              .custom-popup .leaflet-popup-tip { background: var(--surface-panel); }
              @keyframes dash { to { stroke-dashoffset: -20; } }
              .best-path-glow { filter: drop-shadow(0 0 8px #aaffdc); animation: dash 1s linear infinite; }
            `}
          </style>

          <MapContainer
            ref={setMap}
            center={[12.9716, 77.6411]}
            zoom={12}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}>

            <TileLayer
              attribution='&copy; CARTO'
              url={document.documentElement.classList.contains('light') 
                ? "https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png"
                : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"}
            />

            {!selectedDetailZone && memoizedEdges.map((pathGeo, i) => (
              <Polyline key={`edge-${i}`} positions={pathGeo} color="#2a454d" weight={1.5} opacity={0.4} dashArray="5 5" />
            ))}

            {!selectedDetailZone && memoizedPaths.map((route, i) => {
              const isTopRoute = i === 0;
              return (
                <React.Fragment key={`route-group-${i}`}>
                  {isTopRoute && <Polyline positions={route.geoPath} color="#aaffdc" weight={8} opacity={0.3} />}
                  <Polyline
                    positions={route.geoPath}
                    color={route.status === 'ok' ? (isLight ? '#2563eb' : '#aaffdc') : '#ff716c'}
                    weight={route.rank === 1 ? 5 : 3}
                    opacity={route.rank === 1 ? 0.95 : 0.55}
                    dashArray={route.rank === 1 ? "10, 10" : "none"}
                    className={route.rank === 1 ? "best-path-glow" : ""}
                  >
                    <Popup className="custom-popup">
                      <div className="p-1">
                        <div className="text-[10px] font-black text-primary uppercase">PRIORITY {route.rank} PATH</div>
                        <div className="text-[8px] text-white/60 font-mono">ZONE: {route.from} | RISK: {route.risk_score?.toFixed(1)}</div>
                      </div>
                    </Popup>
                  </Polyline>
                  {route.rank === 1 && (
                    <>
                      <EvacuationUnit path={route.geoPath} delay={0} />
                      <EvacuationUnit path={route.geoPath} delay={1500} />
                    </>
                  )}
                </React.Fragment>
              );
            })}

            {!selectedDetailZone && Object.entries(GEO_COORDS).filter(([k]) => k.startsWith('Z')).map(([id, coord]) => {
              const liveZone = data?.city_model?.zones?.find(z => z.id === id);
              const risk = liveZone?.risk_score ?? 0;
              return (
                <Marker key={id} position={coord} icon={getZoneIcon(risk)}>
                  <Popup className="custom-popup">
                    <div className="p-1">
                      <div className="text-[10px] font-black text-primary uppercase">{liveZone?.name || id}</div>
                      <div className="text-[8px] text-surface-muted font-mono">RISK: {risk.toFixed(1)}</div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* In Drill Down Mode: Show only the active zone marker if no GeoJSON */}
            {selectedDetailZone && !detailGeoData && (() => {
              const markerPos = GEO_COORDS[selectedDetailZone] || 
                                GEO_COORDS[selectedDetailZone.toUpperCase()] || 
                                GEO_COORDS[selectedDetailZone.charAt(0).toUpperCase() + selectedDetailZone.slice(1).toLowerCase()];
              return markerPos ? (
                <Marker 
                  position={markerPos} 
                  icon={getZoneIcon(9)}
                />
              ) : null;
            })()}

            {cityData.shelters.map(shelter => (
              <Marker key={shelter.id} position={SHELTER_COORDS[shelter.id]} icon={shelterIcon}>
                <Popup className="custom-popup">
                  <div className="p-1 text-[10px] text-surface-foreground uppercase font-black">SHELTER: {shelter.name}</div>
                </Popup>
              </Marker>
            ))}

            {detailGeoData && (
              <GeoJSON data={detailGeoData} style={geoJsonStyle} onEachFeature={onEachFeature} />
            )}
          </MapContainer>
        </div>

        {/* Left Sidebar - Tactical Detail Selection */}
        <div className="absolute top-6 left-6 w-64 z-[1000] flex flex-col pointer-events-none gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-[12px] font-black text-white dark:text-black tracking-[0.4em] uppercase bg-primary px-2 py-0.5 shadow-lg w-fit">BENGALURU_METRO</span>
              <span className="text-[8px] font-mono text-primary bg-surface-navbar px-2 py-0.5 tracking-[0.2em] uppercase w-fit">Geo_Tactical_Overlay</span>
            </div>

            <div className="bg-surface-navbar backdrop-blur-xl border border-surface-border p-4 rounded-lg shadow-2xl pointer-events-auto space-y-4">
              <h3 className="text-[10px] font-black text-primary tracking-widest uppercase border-b border-surface-border pb-1">Tactical_Drill_Down</h3>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {['Z01', 'Z02', 'Z03', 'Z04', 'Z05', 'Z06', 'Z07', 'Z08', 'Z09', 'Z10', 'Z11', 'Z12'].map(id => (
                    <button
                      key={id}
                      onClick={() => setSelectedDetailZone(selectedDetailZone === id ? null : id)}
                      className={`text-left p-1.5 border transition-all rounded text-[9px] font-bold uppercase ${selectedDetailZone === id ? 'bg-primary/20 border-primary shadow-[0_0_10px_rgba(170,255,220,0.2)] text-surface-foreground' : 'bg-surface-muted border-surface-border hover:border-primary/50 text-surface-muted'}`}
                    >
                      {id} Detail
                    </button>
                  ))}
                </div>
              </div>

              {selectedDetailZone && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                  <div className="bg-surface-muted p-3 rounded border border-surface-border space-y-1">
                    <div className="flex justify-between text-[9px]"><span className="text-surface-muted uppercase">Areas Identified</span><span className="text-surface-foreground font-mono">{detailGeoData?.features?.length || '...'}</span></div>
                    <div className="flex justify-between text-[9px]"><span className="text-surface-muted uppercase">Risk Level</span><span className="text-red-400 font-bold">CRITICAL_OVERLAY</span></div>
                    <button onClick={() => setSelectedDetailZone(null)} className="w-full mt-2 py-1 bg-red-500/20 text-red-400 border border-red-500/40 text-[8px] uppercase font-black hover:bg-red-500/40 transition-all">EXIT_DRILL_DOWN</button>
                  </div>

                  {detailGeoData && (
                    <div className="bg-surface-panel p-2 rounded border border-surface-border space-y-2">
                      <span className="text-[7px] font-black text-surface-muted uppercase tracking-widest">Critical_Alert_Feed</span>
                      <div className="space-y-1.5">
                        {detailGeoData.features
                          .map(f => ({ name: f.properties.name || "Unknown", risk: getSubAreaRisk(f) }))
                          .filter(f => f.risk >= 9)
                          .slice(0, 5)
                          .map((f, i) => (
                            <div key={i} className="flex items-center justify-between text-[8px] border-l-2 border-red-500 pl-2 py-0.5 bg-red-500/5">
                              <span className="text-surface-muted truncate w-32">{f.name}</span>
                              <span className="text-red-500 font-bold">ALERT</span>
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        {/* Right Sidebar - Info Panel Overlay */}
        <div className="absolute top-6 right-6 w-80 z-[1000] flex flex-col pointer-events-none">
          <div className="bg-surface-navbar backdrop-blur-xl border border-surface-border p-4 space-y-4 flex flex-col shadow-2xl pointer-events-auto rounded-lg overflow-hidden">
            <div className="flex items-center justify-between border-b border-surface-border pb-2">
              <h3 className="text-[10px] font-black text-primary tracking-widest uppercase">Tactical_Relocation</h3>
              <span className="text-[8px] font-mono text-emerald-500 animate-pulse">● SIGNAL_OK</span>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto no-scrollbar max-h-80">
              {activeRoutes.length > 0 ? activeRoutes.map((route, i) => (
                <div key={i} className="group relative p-3 bg-surface-muted border border-surface-border hover:border-primary/40 transition-all rounded-sm">
                  <div className="absolute top-0 left-0 w-0.5 h-full bg-primary/20 group-hover:bg-primary transition-all"></div>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-col">
                      <span className="text-[7px] text-surface-muted uppercase font-black tracking-widest">Vector</span>
                      <span className="text-[10px] font-bold text-surface-foreground">{route.from} ➔ {route.to.slice(0, 3)}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[7px] text-surface-muted uppercase font-black tracking-widest">Status</span>
                      <span className={`text-[9px] font-black ${route.status === 'ok' ? 'text-emerald-400' : 'text-orange-400'}`}>
                        {route.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-end justify-between">
                    <div className="text-lg font-mono font-black text-surface-foreground leading-none">
                      {route.humans} <span className="text-[8px] text-surface-muted font-normal">SOULS</span>
                    </div>
                    <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: '70%' }}></div>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-[9px] text-gray-500 italic font-mono py-4 text-center">INITIALIZING_VECTORS...</div>
              )}
            </div>

            <div className="pt-4 border-t border-surface-border space-y-3">
              <div className="flex justify-between items-center text-[8px] text-surface-muted font-black uppercase tracking-[0.2em]">
                <span>Node_Sync_Lat</span>
                <span className="text-primary">12.4ms</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                <div className="bg-surface-muted p-2 rounded-sm border border-surface-border flex flex-col">
                  <span className="text-surface-muted text-[7px] font-bold">REPLAN</span>
                  <span className="text-surface-foreground text-[9px]">AUTOMATIC</span>
                </div>
                <div className="bg-surface-muted p-2 rounded-sm border border-surface-border flex flex-col">
                  <span className="text-surface-muted text-[7px] font-bold">MODE</span>
                  <span className="text-emerald-400 text-[9px]">TACTICAL</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

