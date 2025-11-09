/**
 * V-Track User Dashboard - Main JavaScript
 * Mobile-first user interface for tracking buses
 * 
 * Firebase Structure:
 * - busDetails/{busId} - Bus metadata (busName, driverName, route, routeId)
 * - BusLocation/{busId}/{timestamp} - Live location data {latitude, longitude}
 * - routes/{routeId}/points - Route waypoints
 * - notices - Global notices/alerts
 * - users/{uid}/savedPlaces - User saved places (optional, requires auth)
 * - reports/{uid} - User reports
 */

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
    // Firebase Configuration (UPDATE WITH YOUR VALUES)
    firebase: {
        apiKey: "AIzaSyBZpFhPq1pFpvTmyndOnA6SRs9_ftb4jfI",
        authDomain: "v-track-gu999.firebaseapp.com",
        databaseURL: "https://v-track-gu999-default-rtdb.firebaseio.com",
        projectId: "v-track-gu999",
        storageBucket: "v-track-gu999.appspot.com",
        messagingSenderId: "1046512747961",
        appId: "1:1046512747961:web:80df40c48bca3159296268",
        measurementId: "G-38X29VT1YT"
    },
    
    // Map defaults
    defaultCenter: [28.2150, 83.9886], // Pokhara, Nepal
    defaultZoom: 13,
    
    // Proximity alert threshold (meters)
    PROXIMITY_THRESHOLD: 300,
    
    // Update intervals
    BUS_UPDATE_INTERVAL: 5000, // 5 seconds
    OFFLINE_CHECK_INTERVAL: 10000, // 10 seconds
    
    // Demo mode (if Firebase unavailable)
    DEMO_MODE: false
};

// ============================================
// GLOBAL STATE
// ============================================

const state = {
    map: null,
    firebase: null,
    database: null,
    buses: new Map(), // busId -> {data, marker, routePolyline}
    userLocation: null,
    userMarker: null,
    savedPlaces: [],
    trackedBusId: null,
    routingControl: null,
    customMarkers: [],
    isOffline: false,
    nightMode: false,
    mapType: 'streets', // 'streets' or 'satellite'
    routes: new Map(), // routeId -> {data, polyline, markers}
    activeAlerts: [], // Array of alert objects
    alertMarkers: new Map(), // alertId -> marker
    alertLocationMode: false, // For picking alert location
    selectedAlertLocation: null
};

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initializeFirebase();
    initializeMap();
    loadSavedPlaces();
    setupEventListeners();
    startBusUpdates();
    loadNotices();
    loadRoutes();
    loadActiveAlerts();
    checkOnlineStatus();
    
    // Request user location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                state.userLocation = {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude
                };
                updateUserLocation();
            },
            (err) => console.warn('Location permission denied:', err)
        );
    }
});

// ============================================
// FIREBASE INITIALIZATION
// ============================================

function initializeFirebase() {
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(CONFIG.firebase);
        }
        state.firebase = firebase;
        state.database = firebase.database();
        
        // Test connection
        state.database.ref('.info/connected').on('value', (snapshot) => {
            const connected = snapshot.val();
            updateConnectionStatus(connected);
        });
        
        console.log('✅ Firebase initialized');
    } catch (error) {
        console.error('❌ Firebase initialization failed:', error);
        CONFIG.DEMO_MODE = true;
        updateConnectionStatus(false);
    }
}

function updateConnectionStatus(connected) {
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    
    if (connected) {
        statusDot.className = 'status-dot connected';
        statusText.textContent = 'Connected';
        statusText.style.color = '#10b981';
    } else {
        statusDot.className = 'status-dot disconnected';
        statusText.textContent = 'Offline';
        statusText.style.color = '#ef4444';
    }
}

// ============================================
// MAP INITIALIZATION
// ============================================

function initializeMap() {
    // Initialize Leaflet map
    state.map = L.map('map').setView(CONFIG.defaultCenter, CONFIG.defaultZoom);
    
    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(state.map);
    
    // Add user location marker if available
    if (state.userLocation) {
        updateUserLocation();
    }
    
    console.log('✅ Map initialized');
}

// ============================================
// BUS TRACKING & UPDATES
// ============================================

function startBusUpdates() {
    if (CONFIG.DEMO_MODE) {
        startDemoMode();
        return;
    }
    
    if (!state.database) {
        console.warn('Database not available, using demo mode');
        startDemoMode();
        return;
    }
    
    // Listen to all bus locations
    state.database.ref('BusLocation').on('value', (snapshot) => {
        const busLocations = snapshot.val() || {};
        
        Object.keys(busLocations).forEach(busId => {
            // Skip if it's not a timestamp (e.g., currentRoute metadata)
            if (isNaN(busId)) return;
            
            const locationData = busLocations[busId];
            if (locationData.latitude && locationData.longitude) {
                // Use alert-aware update function
                updateBusLocationWithAlerts(busId, locationData);
            }
        });
    });
    
    // Load bus details
    state.database.ref('busDetails').on('value', (snapshot) => {
        const busDetails = snapshot.val() || {};
        Object.keys(busDetails).forEach(busId => {
            loadBusDetails(busId, busDetails[busId]);
        });
        // Update bus select for alerts
        updateBusSelectForAlerts();
    });
}

function updateBusLocation(busId, locationData) {
    const { latitude, longitude } = locationData;
    
    if (!state.buses.has(busId)) {
        // Create new bus marker
        const marker = L.marker([latitude, longitude], {
            icon: L.divIcon({
                className: 'bus-marker',
                html: '<div style="background: #3b82f6; color: white; padding: 8px; border-radius: 50%; font-size: 16px; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">🚌</div>',
                iconSize: [32, 32],
                iconAnchor: [16, 16]
            })
        }).addTo(state.map);
        
        marker.on('click', () => showBusInfo(busId));
        
        state.buses.set(busId, {
            marker: marker,
            lastLocation: { lat: latitude, lng: longitude },
            data: null
        });
    } else {
        // Update existing marker
        const bus = state.buses.get(busId);
        bus.marker.setLatLng([latitude, longitude]);
        bus.lastLocation = { lat: latitude, lng: longitude };
        
        // Update popup if open
        if (bus.marker.isPopupOpen()) {
            updateBusPopup(busId);
        }
        
        // Check proximity if tracking this bus
        if (state.trackedBusId === busId && state.userLocation) {
            checkProximity(busId, bus.lastLocation);
        }
        
        // Follow bus if tracking
        if (state.trackedBusId === busId) {
            state.map.setView([latitude, longitude], state.map.getZoom(), { animate: true });
        }
    }
    
    // Cache for offline
    cacheBusLocation(busId, locationData);
}

async function loadBusDetails(busId, busData) {
    if (!state.buses.has(busId)) return;
    
    const bus = state.buses.get(busId);
    bus.data = busData;
    
    // Update marker popup
    updateBusPopup(busId);
    
    // Load route if available
    if (busData.route || busData.routeId) {
        const routeId = busData.route || busData.routeId;
        loadRouteForBus(busId, routeId);
    }
}

function updateBusPopup(busId) {
    const bus = state.buses.get(busId);
    if (!bus || !bus.marker) return;
    
    const data = bus.data || {};
    const driverName = data.driverName || 'Unknown';
    const busName = data.busName || busId;
    const routeName = data.routeName || 'No route';
    const phone = data.driverPhone || '';
    
    const popupContent = `
        <div style="min-width: 200px;">
            <h3 style="margin: 0 0 8px 0; font-size: 16px;">${busName}</h3>
            <p style="margin: 4px 0; font-size: 14px;"><strong>Driver:</strong> ${driverName}</p>
            <p style="margin: 4px 0; font-size: 14px;"><strong>Route:</strong> ${routeName}</p>
            ${phone ? `<p style="margin: 4px 0;"><a href="tel:${phone}" style="color: #3b82f6; text-decoration: none;">📞 ${phone}</a></p>` : ''}
            <button onclick="trackBus('${busId}')" style="margin-top: 8px; padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; width: 100%;">📍 Track Bus</button>
        </div>
    `;
    
    bus.marker.bindPopup(popupContent);
}

async function loadRouteForBus(busId, routeId) {
    if (!state.database) return;
    
    try {
        const snapshot = await state.database.ref(`routes/${routeId}`).once('value');
        const route = snapshot.val();
        
        if (!route || !route.points || route.points.length < 2) return;
        
        const bus = state.buses.get(busId);
        if (!bus) return;
        
        // Remove existing route polyline
        if (bus.routePolyline) {
            state.map.removeLayer(bus.routePolyline);
        }
        
        // Create route polyline
        const points = route.points
            .filter(p => p.lat && p.lng)
            .map(p => [p.lat, p.lng]);
        
        if (points.length >= 2) {
            bus.routePolyline = L.polyline(points, {
                color: '#3b82f6',
                weight: 4,
                opacity: 0.7,
                dashArray: '10, 5'
            }).addTo(state.map);
        }
    } catch (error) {
        console.error(`Error loading route for bus ${busId}:`, error);
    }
}

// ============================================
// BUS INFO POPUP
// ============================================

function showBusInfo(busId) {
    const bus = state.buses.get(busId);
    if (!bus || !bus.data) {
        alert('Bus information not available');
        return;
    }
    
    const data = bus.data;
    document.getElementById('popupBusName').textContent = data.busName || busId;
    document.getElementById('popupDriverName').textContent = data.driverName || 'Unknown';
    document.getElementById('popupRouteName').textContent = data.routeName || 'No route';
    document.getElementById('popupStatus').textContent = 'Online';
    
    const phone = data.driverPhone || '';
    const callBtn = document.getElementById('popupCallBtn');
    if (phone) {
        callBtn.href = `tel:${phone}`;
        callBtn.style.display = 'block';
    } else {
        callBtn.style.display = 'none';
    }
    
    document.getElementById('popupTrackBtn').onclick = () => {
        trackBus(busId);
        closeBusInfoPopup();
    };
    
    document.getElementById('busInfoPopup').style.display = 'block';
}

function closeBusInfoPopup() {
    document.getElementById('busInfoPopup').style.display = 'none';
}

// ============================================
// BUS TRACKING
// ============================================

function trackBus(busId) {
    state.trackedBusId = busId;
    const bus = state.buses.get(busId);
    
    if (bus && bus.lastLocation) {
        state.map.setView([bus.lastLocation.lat, bus.lastLocation.lng], 15, { animate: true });
    }
    
    // Update UI
    document.getElementById('trackBusBtn').classList.add('active');
    document.getElementById('trackBusBtn').querySelector('.fab-label').textContent = 'Tracking';
    
    console.log(`Tracking bus: ${busId}`);
}

function stopTracking() {
    state.trackedBusId = null;
    document.getElementById('trackBusBtn').classList.remove('active');
    document.getElementById('trackBusBtn').querySelector('.fab-label').textContent = 'Track';
}

// ============================================
// PROXIMITY ALERT
// ============================================

function checkProximity(busId, busLocation) {
    if (!state.userLocation) return;
    
    const distance = calculateDistance(
        state.userLocation.lat,
        state.userLocation.lng,
        busLocation.lat,
        busLocation.lng
    );
    
    if (distance <= CONFIG.PROXIMITY_THRESHOLD) {
        showProximityAlert(busId, distance);
    }
}

function showProximityAlert(busId, distance) {
    const alertEl = document.getElementById('proximityAlert');
    const bus = state.buses.get(busId);
    const busName = bus?.data?.busName || busId;
    
    alertEl.querySelector('.alert-text').textContent = 
        `Your bus "${busName}" is ${Math.round(distance)}m away!`;
    alertEl.style.display = 'flex';
    
    // Auto-hide after 10 seconds
    setTimeout(() => {
        alertEl.style.display = 'none';
    }, 10000);
}

// ============================================
// PLACE MARKER
// ============================================

let placeMarkerMode = false;

function togglePlaceMarker() {
    placeMarkerMode = !placeMarkerMode;
    
    if (placeMarkerMode) {
        state.map.on('click', handleMapClickForMarker);
        state.map.getContainer().style.cursor = 'crosshair';
        document.getElementById('placeMarkerBtn').classList.add('active');
    } else {
        state.map.off('click', handleMapClickForMarker);
        state.map.getContainer().style.cursor = '';
        document.getElementById('placeMarkerBtn').classList.remove('active');
    }
}

function handleMapClickForMarker(e) {
    const { lat, lng } = e.latlng;
    
    const name = prompt('Enter a name for this place:');
    if (!name) {
        togglePlaceMarker();
        return;
    }
    
    const place = {
        id: Date.now().toString(),
        name: name,
        lat: lat,
        lng: lng,
        timestamp: Date.now()
    };
    
    // Add marker to map
    const marker = L.marker([lat, lng], {
        icon: L.divIcon({
            className: 'custom-place-marker',
            html: '<div style="background: #10b981; color: white; padding: 6px; border-radius: 50%; font-size: 14px; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">📍</div>',
            iconSize: [28, 28],
            iconAnchor: [14, 14]
        })
    }).addTo(state.map);
    
    marker.bindPopup(`<strong>${name}</strong><br>${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    
    state.customMarkers.push({ marker, place });
    state.savedPlaces.push(place);
    
    // Save to localStorage
    savePlacesToLocal();
    
    // Optionally save to Firebase (requires user auth)
    // savePlaceToFirebase(place);
    
    togglePlaceMarker();
    updateSavedPlacesList();
    
    console.log('Place saved:', place);
}

// ============================================
// SAVED PLACES
// ============================================

function loadSavedPlaces() {
    try {
        const saved = localStorage.getItem('vtrack_saved_places');
        if (saved) {
            state.savedPlaces = JSON.parse(saved);
            state.savedPlaces.forEach(place => {
                const marker = L.marker([place.lat, place.lng], {
                    icon: L.divIcon({
                        className: 'custom-place-marker',
                        html: '<div style="background: #10b981; color: white; padding: 6px; border-radius: 50%; font-size: 14px; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">📍</div>',
                        iconSize: [28, 28],
                        iconAnchor: [14, 14]
                    })
                }).addTo(state.map);
                
                marker.bindPopup(`<strong>${place.name}</strong><br>${place.lat.toFixed(6)}, ${place.lng.toFixed(6)}`);
                state.customMarkers.push({ marker, place });
            });
        }
    } catch (error) {
        console.error('Error loading saved places:', error);
    }
}

function savePlacesToLocal() {
    try {
        localStorage.setItem('vtrack_saved_places', JSON.stringify(state.savedPlaces));
    } catch (error) {
        console.error('Error saving places:', error);
    }
}

function updateSavedPlacesList() {
    const container = document.getElementById('savedPlacesList');
    
    if (state.savedPlaces.length === 0) {
        container.innerHTML = '<div class="empty-state">No saved places yet. Tap "Mark" to save a location.</div>';
        return;
    }
    
    container.innerHTML = state.savedPlaces.map(place => `
        <div class="place-item">
            <div class="place-info">
                <div class="place-name">${escapeHtml(place.name)}</div>
                <div class="place-coords">${place.lat.toFixed(6)}, ${place.lng.toFixed(6)}</div>
            </div>
            <div class="place-actions">
                <button class="btn-icon" onclick="getDirectionsToPlace(${place.lat}, ${place.lng}, '${escapeHtml(place.name)}')" title="Directions">🧭</button>
                <button class="btn-icon" onclick="removePlace('${place.id}')" title="Remove">🗑️</button>
            </div>
        </div>
    `).join('');
}

function removePlace(placeId) {
    const index = state.savedPlaces.findIndex(p => p.id === placeId);
    if (index === -1) return;
    
    const place = state.savedPlaces[index];
    const markerData = state.customMarkers.find(m => m.place.id === placeId);
    
    if (markerData) {
        state.map.removeLayer(markerData.marker);
        state.customMarkers = state.customMarkers.filter(m => m.place.id !== placeId);
    }
    
    state.savedPlaces.splice(index, 1);
    savePlacesToLocal();
    updateSavedPlacesList();
}

function clearSavedPlaces() {
    if (!confirm('Clear all saved places?')) return;
    
    state.customMarkers.forEach(m => state.map.removeLayer(m.marker));
    state.customMarkers = [];
    state.savedPlaces = [];
    savePlacesToLocal();
    updateSavedPlacesList();
}

// ============================================
// SEARCH & DIRECTIONS
// ============================================

async function searchAddress(query, callback) {
    if (!query || query.trim() === '') {
        if (callback) callback([]);
        return;
    }
    
    const resultsContainer = document.getElementById('searchResults');
    if (resultsContainer) {
        resultsContainer.innerHTML = '<div class="loading">Searching...</div>';
    }
    
    try {
        // Use Nominatim (OpenStreetMap) - free, no API key needed
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
            {
                headers: {
                    'User-Agent': 'V-Track User Dashboard'
                }
            }
        );
        
        const results = await response.json();
        
        if (callback) {
            callback(results);
            return;
        }
        
        if (results.length === 0) {
            if (resultsContainer) {
                resultsContainer.innerHTML = '<div class="empty-state">No results found</div>';
            }
            return;
        }
        
        if (resultsContainer) {
            resultsContainer.innerHTML = results.map(result => {
                const lat = parseFloat(result.lat) || 0;
                const lon = parseFloat(result.lon) || 0;
                return `
                    <div class="result-item" onclick="selectSearchResult(${lat}, ${lon}, '${escapeHtml(result.display_name)}')">
                        <strong>${escapeHtml(result.display_name)}</strong>
                        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
                            ${lat.toFixed(6)}, ${lon.toFixed(6)}
                        </div>
                    </div>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Search error:', error);
        if (callback) {
            callback([]);
        } else if (resultsContainer) {
            resultsContainer.innerHTML = '<div class="empty-state">Search failed. Please try again.</div>';
        }
    }
}

function selectSearchResult(lat, lng, name) {
    // Add marker for search result
    const marker = L.marker([lat, lng], {
        icon: L.divIcon({
            className: 'search-result-marker',
            html: '<div style="background: #f59e0b; color: white; padding: 8px; border-radius: 50%; font-size: 16px; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">📍</div>',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        })
    }).addTo(state.map);
    
    marker.bindPopup(`<strong>${name}</strong>`);
    
    state.map.setView([lat, lng], 15, { animate: true });
    
    // Show directions option
    getDirectionsToPlace(lat, lng, name);
}

function getDirectionsToPlace(lat, lng, name) {
    if (!state.userLocation) {
        alert('Please enable location access to get directions');
        return;
    }
    
    // Remove existing routing control
    if (state.routingControl) {
        state.map.removeControl(state.routingControl);
    }
    
    // Create routing control
    state.routingControl = L.Routing.control({
        waypoints: [
            L.latLng(state.userLocation.lat, state.userLocation.lng),
            L.latLng(lat, lng)
        ],
        routeWhileDragging: false,
        addWaypoints: false,
        show: false,
        lineOptions: {
            styles: [{ color: '#10b981', weight: 5, opacity: 0.8 }]
        },
        createMarker: function(i, wp) {
            if (i === 0) {
                return L.marker(wp.latLng, {
                    icon: L.divIcon({
                        className: 'route-start-marker',
                        html: '<div style="background: #22c55e; color: white; padding: 8px; border-radius: 50%; font-size: 16px; border: 3px solid white;">📍</div>',
                        iconSize: [32, 32],
                        iconAnchor: [16, 16]
                    })
                }).bindPopup('Your Location');
            } else {
                return L.marker(wp.latLng, {
                    icon: L.divIcon({
                        className: 'route-end-marker',
                        html: '<div style="background: #f59e0b; color: white; padding: 8px; border-radius: 50%; font-size: 16px; border: 3px solid white;">📍</div>',
                        iconSize: [32, 32],
                        iconAnchor: [16, 16]
                    })
                }).bindPopup(name || 'Destination');
            }
        }
    }).addTo(state.map);
    
    state.routingControl.on('routesfound', function(e) {
        const route = e.routes[0];
        const distance = (route.summary.totalDistance / 1000).toFixed(2);
        const time = Math.round(route.summary.totalTime / 60);
        
        const directionsContent = document.getElementById('directionsContent');
        directionsContent.innerHTML = `
            <div class="route-summary">
                <div class="route-summary-item">
                    <span>Distance:</span>
                    <strong>${distance} km</strong>
                </div>
                <div class="route-summary-item">
                    <span>Estimated Time:</span>
                    <strong>${time} minutes</strong>
                </div>
                <div class="route-summary-item">
                    <span>Destination:</span>
                    <strong>${name || 'Location'}</strong>
                </div>
            </div>
        `;
        
        togglePanel('directionsPanel');
    });
    
    state.routingControl.on('routingerror', function(e) {
        console.error('Routing error:', e);
        alert('Could not calculate route. Please try again.');
    });
}

// ============================================
// USER LOCATION
// ============================================

function updateUserLocation() {
    if (!state.userLocation) return;
    
    if (!state.userMarker) {
        state.userMarker = L.marker([state.userLocation.lat, state.userLocation.lng], {
            icon: L.divIcon({
                className: 'user-location-marker',
                html: '<div style="background: #22c55e; color: white; padding: 10px; border-radius: 50%; font-size: 18px; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">📍</div>',
                iconSize: [36, 36],
                iconAnchor: [18, 18]
            })
        }).addTo(state.map);
        state.userMarker.bindPopup('Your Location');
    } else {
        state.userMarker.setLatLng([state.userLocation.lat, state.userLocation.lng]);
    }
}

// ============================================
// BUS LIST
// ============================================

function updateBusList() {
    const container = document.getElementById('busList');
    
    if (state.buses.size === 0) {
        container.innerHTML = '<div class="empty-state">No buses available</div>';
        return;
    }
    
    const busesArray = Array.from(state.buses.entries()).map(([busId, bus]) => ({
        id: busId,
        data: bus.data,
        location: bus.lastLocation
    }));
    
    container.innerHTML = busesArray.map(bus => {
        const data = bus.data || {};
        const busName = data.busName || bus.id;
        const driverName = data.driverName || 'Unknown';
        const routeName = data.routeName || 'No route';
        const isOnline = bus.location !== null;
        
        return `
            <div class="bus-item" onclick="selectBusFromList('${bus.id}')">
                <div class="bus-item-header">
                    <span class="bus-name">${escapeHtml(busName)}</span>
                    <span class="bus-status ${isOnline ? '' : 'offline'}">${isOnline ? 'Online' : 'Offline'}</span>
                </div>
                <div class="bus-info">
                    <div>Driver: ${escapeHtml(driverName)}</div>
                    <div>Route: ${escapeHtml(routeName)}</div>
                </div>
            </div>
        `;
    }).join('');
}

function selectBusFromList(busId) {
    const bus = state.buses.get(busId);
    if (bus && bus.lastLocation) {
        state.map.setView([bus.lastLocation.lat, bus.lastLocation.lng], 15, { animate: true });
        bus.marker.openPopup();
    }
    closePanel('busListPanel');
}

// ============================================
// NOTICES
// ============================================

function loadNotices() {
    if (CONFIG.DEMO_MODE || !state.database) {
        document.getElementById('noticesList').innerHTML = '<div class="empty-state">No notices available</div>';
        return;
    }
    
    state.database.ref('notices').on('value', (snapshot) => {
        const notices = snapshot.val() || {};
        const noticesArray = Object.entries(notices)
            .map(([id, notice]) => ({ id, ...notice }))
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
            .slice(0, 10); // Show latest 10
        
        const container = document.getElementById('noticesList');
        
        if (noticesArray.length === 0) {
            container.innerHTML = '<div class="empty-state">No notices available</div>';
            return;
        }
        
        container.innerHTML = noticesArray.map(notice => `
            <div class="notice-item">
                <div class="notice-title">${escapeHtml(notice.title || 'Notice')}</div>
                <div class="notice-content">${escapeHtml(notice.message || notice.content || '')}</div>
                <div class="notice-time">${formatTimestamp(notice.timestamp)}</div>
            </div>
        `).join('');
    });
}

// ============================================
// REPORT FORM
// ============================================

document.getElementById('reportForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const type = document.getElementById('reportType').value;
    const description = document.getElementById('reportDescription').value;
    const busId = document.getElementById('reportBusId').value.trim();
    
    if (!type || !description) {
        alert('Please fill in all required fields');
        return;
    }
    
    const report = {
        type: type,
        description: description,
        busId: busId || null,
        timestamp: Date.now(),
        location: state.userLocation,
        userAgent: navigator.userAgent
    };
    
    try {
        if (state.database) {
            // Try to get user ID if authenticated, otherwise use anonymous
            let userId = `anon_${Date.now()}`;
            try {
                if (firebase.auth && firebase.auth().currentUser) {
                    userId = firebase.auth().currentUser.uid;
                }
            } catch (e) {
                // Auth not available, use anonymous
            }
            await state.database.ref(`reports/${userId}`).push(report);
            window.alert('Report submitted successfully!');
            document.getElementById('reportForm').reset();
            closePanel('reportPanel');
        } else {
            // Fallback: save to localStorage
            const reports = JSON.parse(localStorage.getItem('vtrack_reports') || '[]');
            reports.push(report);
            localStorage.setItem('vtrack_reports', JSON.stringify(reports));
            window.alert('Report saved locally (offline mode)');
            document.getElementById('reportForm').reset();
            closePanel('reportPanel');
        }
    } catch (error) {
        console.error('Error submitting report:', error);
        alert('Failed to submit report. Please try again.');
    }
});

// ============================================
// OFFLINE HANDLING
// ============================================

function checkOnlineStatus() {
    setInterval(() => {
        const wasOffline = state.isOffline;
        state.isOffline = !navigator.onLine;
        
        if (state.isOffline !== wasOffline) {
            if (state.isOffline) {
                showOfflineIndicator();
                loadCachedData();
            } else {
                hideOfflineIndicator();
                // Resume live updates
                startBusUpdates();
            }
        }
    }, CONFIG.OFFLINE_CHECK_INTERVAL);
}

function showOfflineIndicator() {
    document.getElementById('offlineIndicator').style.display = 'inline-block';
    state.isOffline = true;
}

function hideOfflineIndicator() {
    document.getElementById('offlineIndicator').style.display = 'none';
    state.isOffline = false;
}

function cacheBusLocation(busId, locationData) {
    try {
        const cache = JSON.parse(localStorage.getItem('vtrack_bus_cache') || '{}');
        cache[busId] = {
            location: locationData,
            timestamp: Date.now()
        };
        localStorage.setItem('vtrack_bus_cache', JSON.stringify(cache));
    } catch (error) {
        console.error('Error caching bus location:', error);
    }
}

function loadCachedData() {
    try {
        const cache = JSON.parse(localStorage.getItem('vtrack_bus_cache') || '{}');
        Object.entries(cache).forEach(([busId, data]) => {
            if (data.location && Date.now() - data.timestamp < 300000) { // 5 minutes
                updateBusLocation(busId, data.location);
            }
        });
    } catch (error) {
        console.error('Error loading cached data:', error);
    }
}

// ============================================
// DEMO MODE
// ============================================

function startDemoMode() {
    console.log('🚀 Starting demo mode');
    
    // Simulate a bus moving along a route
    const demoRoute = [
        [28.2150, 83.9886],
        [28.2160, 83.9890],
        [28.2170, 83.9895],
        [28.2180, 83.9900],
        [28.2190, 83.9905]
    ];
    
    let currentIndex = 0;
    const demoBusId = 'demo_bus_1';
    
    setInterval(() => {
        if (currentIndex >= demoRoute.length) currentIndex = 0;
        
        const [lat, lng] = demoRoute[currentIndex];
        updateBusLocation(demoBusId, { latitude: lat, longitude: lng });
        
        if (!state.buses.get(demoBusId)?.data) {
            loadBusDetails(demoBusId, {
                busName: 'Demo Bus 1',
                driverName: 'Demo Driver',
                routeName: 'Demo Route',
                routeId: 'demo_route'
            });
        }
        
        currentIndex++;
    }, 3000);
}

// ============================================
// UI CONTROLS
// ============================================

function togglePanel(panelId) {
    const panel = document.getElementById(panelId);
    const overlay = document.querySelector('.panel-overlay') || createOverlay();
    
    if (panel.classList.contains('active')) {
        closePanel(panelId);
    } else {
        // Close other panels first
        document.querySelectorAll('.slide-panel.active').forEach(p => {
            p.classList.remove('active');
        });
        
        panel.classList.add('active');
        overlay.classList.add('active');
        
        // Update nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.panel === panelId) {
                btn.classList.add('active');
            }
        });
    }
}

function closePanel(panelId) {
    const panel = document.getElementById(panelId);
    const overlay = document.querySelector('.panel-overlay');
    
    panel.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
    
    // Update nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if (btn.dataset.panel === panelId) {
            btn.classList.remove('active');
        }
    });
}

function createOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'panel-overlay';
    overlay.onclick = () => {
        document.querySelectorAll('.slide-panel.active').forEach(p => {
            p.classList.remove('active');
        });
        overlay.classList.remove('active');
    };
    document.body.appendChild(overlay);
    return overlay;
}

function toggleMenu() {
    const menu = document.getElementById('menuDropdown');
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}

function toggleNightMode() {
    state.nightMode = !state.nightMode;
    document.body.classList.toggle('dark-mode', state.nightMode);
    localStorage.setItem('vtrack_night_mode', state.nightMode);
}

function toggleMapType() {
    state.mapType = state.mapType === 'streets' ? 'satellite' : 'streets';
    
    state.map.eachLayer(layer => {
        if (layer instanceof L.TileLayer) {
            state.map.removeLayer(layer);
        }
    });
    
    if (state.mapType === 'satellite') {
        // Use Esri World Imagery for satellite
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: '&copy; Esri',
            maxZoom: 19
        }).addTo(state.map);
    } else {
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(state.map);
    }
    
    localStorage.setItem('vtrack_map_type', state.mapType);
}

function showNearbyStops() {
    if (!state.userLocation) {
        alert('Please enable location access');
        return;
    }
    
    // Find buses within 1km
    const nearbyBuses = Array.from(state.buses.entries())
        .filter(([busId, bus]) => {
            if (!bus.lastLocation) return false;
            const dist = calculateDistance(
                state.userLocation.lat,
                state.userLocation.lng,
                bus.lastLocation.lat,
                bus.lastLocation.lng
            );
            return dist <= 1000; // 1km
        })
        .map(([busId, bus]) => ({ id: busId, ...bus }));
    
    if (nearbyBuses.length === 0) {
        alert('No buses nearby');
        return;
    }
    
    alert(`Found ${nearbyBuses.length} bus(es) within 1km`);
    toggleMenu();
}

function setProximityAlert() {
    const threshold = prompt('Set proximity alert distance (meters):', CONFIG.PROXIMITY_THRESHOLD);
    if (threshold && !isNaN(threshold) && threshold > 0) {
        CONFIG.PROXIMITY_THRESHOLD = parseInt(threshold);
        localStorage.setItem('vtrack_proximity_threshold', CONFIG.PROXIMITY_THRESHOLD);
        alert(`Proximity alert set to ${threshold}m`);
    }
    toggleMenu();
}

function resetMap() {
    state.map.setView(CONFIG.defaultCenter, CONFIG.defaultZoom, { animate: true });
    if (state.routingControl) {
        state.map.removeControl(state.routingControl);
        state.routingControl = null;
    }
    toggleMenu();
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    // FAB buttons
    document.getElementById('trackBusBtn').addEventListener('click', () => {
        if (state.trackedBusId) {
            stopTracking();
        } else {
            togglePanel('busListPanel');
        }
    });
    
    document.getElementById('placeMarkerBtn').addEventListener('click', togglePlaceMarker);
    document.getElementById('searchBtn').addEventListener('click', () => togglePanel('searchPanel'));
    document.getElementById('setAlertBtn').addEventListener('click', () => togglePanel('alertSetupPanel'));
    document.getElementById('trackFromLocationBtn').addEventListener('click', trackBusFromLocation);
    
    // Search
    document.getElementById('searchSubmitBtn').addEventListener('click', () => {
        const query = document.getElementById('searchInput').value;
        searchAddress(query);
    });
    
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = document.getElementById('searchInput').value;
            searchAddress(query);
        }
    });
    
    // Top search bar functionality
    setupTopSearchBar();
    
    // Toggle buttons
    document.getElementById('toggleNightMode').addEventListener('click', toggleNightMode);
    document.getElementById('toggleMapType').addEventListener('click', toggleMapType);
    
    // Load saved preferences
    if (localStorage.getItem('vtrack_night_mode') === 'true') {
        toggleNightMode();
    }
    
    const savedMapType = localStorage.getItem('vtrack_map_type');
    if (savedMapType && savedMapType !== state.mapType) {
        toggleMapType();
    }
    
    const savedThreshold = localStorage.getItem('vtrack_proximity_threshold');
    if (savedThreshold) {
        CONFIG.PROXIMITY_THRESHOLD = parseInt(savedThreshold);
    }
    
    // Update bus list periodically
    setInterval(updateBusList, CONFIG.BUS_UPDATE_INTERVAL);
    
    // Initial bus list update
    updateBusList();
    
    // Setup alert form
    setupAlertForm();
    
    // Update bus select for alerts when buses load
    setTimeout(() => {
        updateBusSelectForAlerts();
    }, 2000);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth radius in meters
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRadians(degrees) {
    return degrees * Math.PI / 180;
}

function formatTimestamp(timestamp) {
    if (!timestamp) return 'Unknown time';
    const date = new Date(timestamp);
    return date.toLocaleString();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// ROUTES MANAGEMENT
// ============================================

function loadRoutes() {
    if (CONFIG.DEMO_MODE || !state.database) {
        document.getElementById('routesList').innerHTML = '<div class="empty-state">No routes available</div>';
        return;
    }
    
    state.database.ref('routes').on('value', (snapshot) => {
        const routes = snapshot.val() || {};
        const routesArray = Object.entries(routes)
            .map(([id, route]) => ({ id, ...route }));
        
        const container = document.getElementById('routesList');
        
        if (routesArray.length === 0) {
            container.innerHTML = '<div class="empty-state">No routes available</div>';
            return;
        }
        
        container.innerHTML = routesArray.map(route => `
            <div class="route-item" onclick="showRouteOnMap('${route.id}')">
                <div class="route-name">${escapeHtml(route.name || 'Unnamed Route')}</div>
                <div class="route-description">${escapeHtml(route.description || 'No description')}</div>
                <div class="route-points">${route.points ? route.points.length : 0} waypoints</div>
            </div>
        `).join('');
        
        // Store routes in state
        routesArray.forEach(route => {
            state.routes.set(route.id, { data: route });
        });
    });
}

function showRouteOnMap(routeId) {
    const route = state.routes.get(routeId);
    if (!route || !route.data.points || route.data.points.length < 2) {
        alert('Route data not available');
        return;
    }
    
    // Clear existing route display
    if (route.polyline) {
        state.map.removeLayer(route.polyline);
    }
    if (route.markers) {
        route.markers.forEach(m => state.map.removeLayer(m));
    }
    
    // Create route polyline
    const points = route.data.points
        .filter(p => p.lat && p.lng)
        .map(p => [p.lat, p.lng]);
    
    if (points.length >= 2) {
        route.polyline = L.polyline(points, {
            color: '#3b82f6',
            weight: 5,
            opacity: 0.8,
            dashArray: '10, 5'
        }).addTo(state.map);
        
        // Add numbered markers for waypoints
        route.markers = [];
        route.data.points.forEach((point, index) => {
            if (point.lat && point.lng) {
                const marker = L.marker([point.lat, point.lng], {
                    icon: L.divIcon({
                        className: 'route-waypoint-marker',
                        html: `<div style="background: #3b82f6; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">${index + 1}</div>`,
                        iconSize: [24, 24],
                        iconAnchor: [12, 12]
                    })
                }).addTo(state.map);
                
                marker.bindPopup(`<strong>${point.name || `Waypoint ${index + 1}`}</strong>`);
                route.markers.push(marker);
            }
        });
        
        // Fit map to show entire route
        state.map.fitBounds(route.polyline.getBounds(), { padding: [50, 50] });
    }
    
    closePanel('routesPanel');
}

// ============================================
// BUS ARRIVAL ALERTS
// ============================================

function loadActiveAlerts() {
    try {
        const saved = localStorage.getItem('vtrack_active_alerts');
        if (saved) {
            state.activeAlerts = JSON.parse(saved);
            state.activeAlerts.forEach(alert => {
                createAlertMarker(alert);
            });
            updateActiveAlertsList();
        }
    } catch (error) {
        console.error('Error loading active alerts:', error);
    }
}

function saveActiveAlerts() {
    try {
        localStorage.setItem('vtrack_active_alerts', JSON.stringify(state.activeAlerts));
    } catch (error) {
        console.error('Error saving active alerts:', error);
    }
}

function pickAlertLocation() {
    state.alertLocationMode = true;
    state.map.getContainer().style.cursor = 'crosshair';
    
    const handler = (e) => {
        state.selectedAlertLocation = {
            lat: e.latlng.lat,
            lng: e.latlng.lng
        };
        
        document.getElementById('alertLocationDisplay').textContent = 
            `${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}`;
        
        state.map.off('click', handler);
        state.map.getContainer().style.cursor = '';
        state.alertLocationMode = false;
    };
    
    state.map.on('click', handler);
    
    // Show temporary marker
    if (state.selectedAlertLocation) {
        const tempMarker = L.marker([state.selectedAlertLocation.lat, state.selectedAlertLocation.lng], {
            icon: L.divIcon({
                className: 'alert-marker',
                html: '🔔',
                iconSize: [40, 40],
                iconAnchor: [20, 20]
            })
        }).addTo(state.map);
        
        setTimeout(() => {
            state.map.removeLayer(tempMarker);
        }, 2000);
    }
}

function setupAlertForm() {
    const form = document.getElementById('alertSetupForm');
    if (!form) return;
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const busSelect = document.getElementById('alertBusSelect').value;
        const alertName = document.getElementById('alertName').value;
        const distance = parseInt(document.getElementById('alertDistance').value);
        
        if (!state.selectedAlertLocation) {
            window.alert('Please pick a location on the map first');
            return;
        }
        
        if (!busSelect) {
            window.alert('Please select a bus');
            return;
        }
        
        const alertObj = {
            id: Date.now().toString(),
            name: alertName,
            location: state.selectedAlertLocation,
            busId: busSelect === 'all' ? 'all' : busSelect,
            distance: distance,
            createdAt: Date.now(),
            active: true
        };
        
        state.activeAlerts.push(alertObj);
        createAlertMarker(alertObj);
        saveActiveAlerts();
        updateActiveAlertsList();
        updateBusSelectForAlerts();
        
        // Reset form
        form.reset();
        state.selectedAlertLocation = null;
        document.getElementById('alertLocationDisplay').textContent = 'No location selected';
        closePanel('alertSetupPanel');
        
        console.log('Alert set:', alertObj);
    });
}

function createAlertMarker(alert) {
    if (state.alertMarkers.has(alert.id)) {
        state.map.removeLayer(state.alertMarkers.get(alert.id));
    }
    
    const marker = L.marker([alert.location.lat, alert.location.lng], {
        icon: L.divIcon({
            className: 'alert-marker',
            html: '🔔',
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        })
    }).addTo(state.map);
    
    marker.bindPopup(`
        <strong>${escapeHtml(alert.name)}</strong><br>
        Bus: ${alert.busId === 'all' ? 'All Buses' : alert.busId}<br>
        Distance: ${alert.distance}m
    `);
    
    state.alertMarkers.set(alert.id, marker);
}

function updateActiveAlertsList() {
    const container = document.getElementById('activeAlertsList');
    
    if (state.activeAlerts.length === 0) {
        container.innerHTML = '<div class="empty-state">No active alerts. Set an alert to be notified when a bus arrives.</div>';
        return;
    }
    
    container.innerHTML = state.activeAlerts.map(alert => `
        <div class="alert-item">
            <div class="alert-info">
                <div class="alert-name">${escapeHtml(alert.name)}</div>
                <div class="alert-details">
                    <div>Bus: ${alert.busId === 'all' ? 'All Buses' : escapeHtml(alert.busId)}</div>
                    <div>Distance: ${alert.distance}m</div>
                    <div>Location: ${alert.location.lat.toFixed(6)}, ${alert.location.lng.toFixed(6)}</div>
                </div>
            </div>
            <div class="alert-actions">
                <button class="btn-icon-small" onclick="removeAlert('${alert.id}')" title="Remove">🗑️</button>
            </div>
        </div>
    `).join('');
}

function removeAlert(alertId) {
    const index = state.activeAlerts.findIndex(a => a.id === alertId);
    if (index === -1) return;
    
    const alert = state.activeAlerts[index];
    
    // Remove marker
    if (state.alertMarkers.has(alertId)) {
        state.map.removeLayer(state.alertMarkers.get(alertId));
        state.alertMarkers.delete(alertId);
    }
    
    state.activeAlerts.splice(index, 1);
    saveActiveAlerts();
    updateActiveAlertsList();
}

function checkBusArrivalAlerts(busId, busLocation) {
    state.activeAlerts.forEach(alert => {
        if (!alert.active) return;
        
        // Check if alert is for this bus or all buses
        if (alert.busId !== 'all' && alert.busId !== busId) return;
        
        const distance = calculateDistance(
            alert.location.lat,
            alert.location.lng,
            busLocation.lat,
            busLocation.lng
        );
        
        if (distance <= alert.distance) {
            // Bus has arrived!
            showBusArrivalNotification(alert, busId, distance);
            // Optionally deactivate alert after first trigger
            // alert.active = false;
        }
    });
}

function showBusArrivalNotification(alert, busId, distance) {
    const bus = state.buses.get(busId);
    const busName = bus?.data?.busName || busId;
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'bus-arrival-alert';
    notification.innerHTML = `
        <h4>🚌 Bus Arrived!</h4>
        <p><strong>${escapeHtml(alert.name)}</strong></p>
        <p>Bus: ${escapeHtml(busName)}</p>
        <p>Distance: ${Math.round(distance)}m away</p>
        <button onclick="this.parentElement.remove()" style="margin-top: 8px; padding: 8px 16px; background: white; color: #059669; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">Dismiss</button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 10000);
    
    // Play notification sound if available
    try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OSdTgwOUKbk8LZjHAY4kdfyznksBSR3x/DdkEAKFF606euoVRQKRp/g8r5sIQUrgc7y2Yk2CBtpvfDknU4MDlCm5PC2YxwGOJHX8s55LAUkd8fw3ZBAC');
        audio.play().catch(() => {}); // Ignore errors
    } catch (e) {}
}

function updateBusSelectForAlerts() {
    const select = document.getElementById('alertBusSelect');
    if (!select) return;
    
    // Clear existing options except "All Buses"
    select.innerHTML = '<option value="">Select bus...</option><option value="all">All Buses</option>';
    
    // Add all available buses
    state.buses.forEach((bus, busId) => {
        const option = document.createElement('option');
        option.value = busId;
        option.textContent = bus.data?.busName || busId;
        select.appendChild(option);
    });
}

// ============================================
// TRACK BUS FROM USER LOCATION
// ============================================

function trackBusFromLocation() {
    if (!state.userLocation) {
        alert('Please enable location access first');
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    state.userLocation = {
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude
                    };
                    updateUserLocation();
                    trackBusFromLocation();
                },
                (err) => alert('Location permission denied')
            );
        }
        return;
    }
    
    // Show bus list to select
    togglePanel('busListPanel');
    
    // Add click handler to bus items
    setTimeout(() => {
        document.querySelectorAll('.bus-item').forEach(item => {
            item.addEventListener('click', function() {
                const busId = this.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
                if (busId) {
                    getDirectionsToBus(busId);
                }
            });
        });
    }, 100);
}

function getDirectionsToBus(busId) {
    if (!state.userLocation) {
        alert('Please enable location access');
        return;
    }
    
    const bus = state.buses.get(busId);
    if (!bus || !bus.lastLocation) {
        alert('Bus location not available');
        return;
    }
    
    // Remove existing routing control
    if (state.routingControl) {
        state.map.removeControl(state.routingControl);
    }
    
    // Create routing control
    state.routingControl = L.Routing.control({
        waypoints: [
            L.latLng(state.userLocation.lat, state.userLocation.lng),
            L.latLng(bus.lastLocation.lat, bus.lastLocation.lng)
        ],
        routeWhileDragging: false,
        addWaypoints: false,
        show: false,
        lineOptions: {
            styles: [{ color: '#10b981', weight: 5, opacity: 0.8 }]
        },
        createMarker: function(i, wp) {
            if (i === 0) {
                return L.marker(wp.latLng, {
                    icon: L.divIcon({
                        className: 'route-start-marker',
                        html: '<div style="background: #22c55e; color: white; padding: 8px; border-radius: 50%; font-size: 16px; border: 3px solid white;">📍</div>',
                        iconSize: [32, 32],
                        iconAnchor: [16, 16]
                    })
                }).bindPopup('Your Location');
            } else {
                const busName = bus.data?.busName || busId;
                return L.marker(wp.latLng, {
                    icon: L.divIcon({
                        className: 'route-end-marker',
                        html: '<div style="background: #3b82f6; color: white; padding: 8px; border-radius: 50%; font-size: 16px; border: 3px solid white;">🚌</div>',
                        iconSize: [32, 32],
                        iconAnchor: [16, 16]
                    })
                }).bindPopup(`Bus: ${busName}`);
            }
        }
    }).addTo(state.map);
    
    state.routingControl.on('routesfound', function(e) {
        const route = e.routes[0];
        const distance = (route.summary.totalDistance / 1000).toFixed(2);
        const time = Math.round(route.summary.totalTime / 60);
        
        const directionsContent = document.getElementById('directionsContent');
        const busName = bus.data?.busName || busId;
        directionsContent.innerHTML = `
            <div class="route-summary">
                <div class="route-summary-item">
                    <span>Distance:</span>
                    <strong>${distance} km</strong>
                </div>
                <div class="route-summary-item">
                    <span>Estimated Time:</span>
                    <strong>${time} minutes</strong>
                </div>
                <div class="route-summary-item">
                    <span>Destination:</span>
                    <strong>${escapeHtml(busName)}</strong>
                </div>
            </div>
        `;
        
        togglePanel('directionsPanel');
    });
    
    state.routingControl.on('routingerror', function(e) {
        console.error('Routing error:', e);
        alert('Could not calculate route. Please try again.');
    });
    
    closePanel('busListPanel');
}

// Update bus location to check alerts
function updateBusLocationWithAlerts(busId, locationData) {
    updateBusLocation(busId, locationData);
    
    // Check arrival alerts
    if (state.buses.has(busId)) {
        const bus = state.buses.get(busId);
        if (bus.lastLocation) {
            checkBusArrivalAlerts(busId, bus.lastLocation);
        }
    }
}

// Make functions globally available
window.trackBus = trackBus;
window.selectSearchResult = selectSearchResult;
window.getDirectionsToPlace = getDirectionsToPlace;
window.removePlace = removePlace;
window.selectBusFromList = selectBusFromList;
window.togglePanel = togglePanel;
window.closePanel = closePanel;
window.closeBusInfoPopup = closeBusInfoPopup;
window.showNearbyStops = showNearbyStops;
window.setProximityAlert = setProximityAlert;
window.clearSavedPlaces = clearSavedPlaces;
window.resetMap = resetMap;
window.toggleMenu = toggleMenu;
window.showRouteOnMap = showRouteOnMap;
window.pickAlertLocation = pickAlertLocation;
window.removeAlert = removeAlert;
window.trackBusFromLocation = trackBusFromLocation;
window.getDirectionsToBus = getDirectionsToBus;

// ============================================
// TOP SEARCH BAR (Google Maps Style)
// ============================================

function setupTopSearchBar() {
    const topSearchInput = document.getElementById('topSearchInput');
    const searchClearBtn = document.getElementById('searchClearBtn');
    const searchSuggestions = document.getElementById('searchSuggestions');
    const topSearchBar = document.getElementById('topSearchBar');
    
    if (!topSearchInput) return;
    
    let searchTimeout;
    let recentSearches = JSON.parse(localStorage.getItem('vtrack_recent_searches') || '[]');
    
    // Show/hide clear button
    topSearchInput.addEventListener('input', (e) => {
        const value = e.target.value.trim();
        searchClearBtn.style.display = value ? 'flex' : 'none';
        
        // Debounced search
        clearTimeout(searchTimeout);
        if (value.length >= 2) {
            searchTimeout = setTimeout(() => {
                performTopSearch(value);
            }, 300);
        } else if (value.length === 0) {
            showRecentSearches();
        } else {
            searchSuggestions.style.display = 'none';
        }
    });
    
    // Clear button
    searchClearBtn.addEventListener('click', () => {
        topSearchInput.value = '';
        searchClearBtn.style.display = 'none';
        searchSuggestions.style.display = 'none';
        topSearchInput.focus();
    });
    
    // Focus effects
    topSearchInput.addEventListener('focus', () => {
        topSearchBar.classList.add('focused');
        document.querySelector('.map-container').classList.add('map-elevated');
        if (topSearchInput.value.length === 0) {
            showRecentSearches();
        }
    });
    
    topSearchInput.addEventListener('blur', () => {
        setTimeout(() => {
            topSearchBar.classList.remove('focused');
            document.querySelector('.map-container').classList.remove('map-elevated');
            searchSuggestions.style.display = 'none';
        }, 200);
    });
    
    // Enter key
    topSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = topSearchInput.value.trim();
            if (query) {
                performTopSearch(query, true);
            }
        }
    });
    
    // Voice search button (placeholder)
    const voiceBtn = document.getElementById('searchVoiceBtn');
    if (voiceBtn) {
        voiceBtn.addEventListener('click', () => {
            window.alert('Voice search coming soon!');
        });
    }
    
    function showRecentSearches() {
        if (recentSearches.length === 0) {
            searchSuggestions.style.display = 'none';
            return;
        }
        
        searchSuggestions.innerHTML = `
            <div style="padding: 12px; font-size: 12px; color: var(--text-secondary); font-weight: 600; border-bottom: 1px solid var(--border-color);">
                Recent Searches
            </div>
            ${recentSearches.slice(0, 5).map(item => `
                <div class="suggestion-item" onclick="selectRecentSearch('${escapeHtml(item)}')">
                    <div class="suggestion-icon">🕒</div>
                    <div class="suggestion-content">
                        <div class="suggestion-title">${escapeHtml(item)}</div>
                    </div>
                </div>
            `).join('')}
        `;
        searchSuggestions.style.display = 'block';
    }
    
    function performTopSearch(query, isEnter = false) {
        if (!topSearchInput) return;
        searchAddress(query, (results) => {
            if (results && results.length > 0) {
                // Add to recent searches
                recentSearches = recentSearches.filter(s => s !== query);
                recentSearches.unshift(query);
                recentSearches = recentSearches.slice(0, 10);
                localStorage.setItem('vtrack_recent_searches', JSON.stringify(recentSearches));
                
                // Show suggestions
                searchSuggestions.innerHTML = results.map(result => {
                    const lat = parseFloat(result.lat) || 0;
                    const lon = parseFloat(result.lon) || 0;
                    return `
                        <div class="suggestion-item" onclick="selectTopSearchResult(${lat}, ${lon}, '${escapeHtml(result.display_name)}')">
                            <div class="suggestion-icon">📍</div>
                            <div class="suggestion-content">
                                <div class="suggestion-title">${escapeHtml(result.display_name)}</div>
                                <div class="suggestion-subtitle">${lat.toFixed(4)}, ${lon.toFixed(4)}</div>
                            </div>
                        </div>
                    `;
                }).join('');
                searchSuggestions.style.display = 'block';
            } else {
                searchSuggestions.innerHTML = '<div class="empty-state" style="padding: 20px; text-align: center;">No results found</div>';
                searchSuggestions.style.display = 'block';
            }
        });
    }
}

function selectTopSearchResult(lat, lng, name) {
    selectSearchResult(lat, lng, name);
    document.getElementById('topSearchInput').value = name;
    document.getElementById('searchSuggestions').style.display = 'none';
    document.querySelector('.map-container').classList.remove('map-elevated');
}

function selectRecentSearch(query) {
    const topSearchInput = document.getElementById('topSearchInput');
    if (topSearchInput) {
        topSearchInput.value = query;
        searchAddress(query, (results) => {
            if (results && results.length > 0) {
                const firstResult = results[0];
                const lat = parseFloat(firstResult.lat) || 0;
                const lon = parseFloat(firstResult.lon) || 0;
                selectTopSearchResult(lat, lon, firstResult.display_name);
            }
        });
    }
}

window.selectTopSearchResult = selectTopSearchResult;
window.selectRecentSearch = selectRecentSearch;

console.log('✅ V-Track User Dashboard loaded');

