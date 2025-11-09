// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBZpFhPq1pFpvTmyndOnA6SRs9_ftb4jfI",
    authDomain: "v-track-gu999.firebaseapp.com",
    databaseURL: "https://v-track-gu999-default-rtdb.firebaseio.com",
    projectId: "v-track-gu999",
    storageBucket: "v-track-gu999.appspot.com",
    messagingSenderId: "1046512747961",
    appId: "1:1046512747961:web:80df40c48bca3159296268",
    measurementId: "G-38X29VT1YT"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

// Global variables
let allTrips = [];
let filteredTrips = [];
let tripMap = null;
let currentTripView = null;
let driverNames = {}; // Cache for driver names

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        navbarLoader.loadNavbar('navbar-container', 'Trip History');
        
        setTimeout(() => {
            initializeMap();
            loadDriverNames();
            loadAllTrips();
            loadFilterOptions();
        }, 500);
    }, 100);
});

// Initialize Leaflet map
function initializeMap() {
    if (typeof L === 'undefined') {
        setTimeout(initializeMap, 1000);
        return;
    }

    tripMap = L.map('tripMap').setView([28.215176984699085, 83.98871119857192], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18,
    }).addTo(tripMap);
}

// Load all trips from Firebase
async function loadAllTrips() {
    try {
        const tripListContainer = document.getElementById('tripList');
        tripListContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner"></i><p>Loading trips...</p></div>';

        // Fetch trips from both trips and tripHistory paths
        const [tripsSnapshot, tripHistorySnapshot] = await Promise.all([
            database.ref('trips').once('value'),
            database.ref('tripHistory').once('value')
        ]);

        allTrips = [];
        
        // Process trips from /trips/{busId}/{tripId}
        if (tripsSnapshot.exists()) {
            tripsSnapshot.forEach(busSnapshot => {
                const busId = busSnapshot.key;
                busSnapshot.forEach(tripSnapshot => {
                    const tripData = tripSnapshot.val();
                    allTrips.push({
                        ...tripData,
                        tripId: tripSnapshot.key,
                        busId: busId,
                        source: 'trips'
                    });
                });
            });
        }

        // Process trips from /tripHistory/{busId}/{tripId}
        if (tripHistorySnapshot.exists()) {
            tripHistorySnapshot.forEach(busSnapshot => {
                const busId = busSnapshot.key;
                if (busId === 'drivers') {
                    // Handle driver-specific trip history
                    busSnapshot.forEach(driverSnapshot => {
                        const driverId = driverSnapshot.key;
                        driverSnapshot.forEach(tripSnapshot => {
                            const tripData = tripSnapshot.val();
                            allTrips.push({
                                ...tripData,
                                tripId: tripSnapshot.key,
                                driverId: driverId,
                                source: 'tripHistory/drivers'
                            });
                        });
                    });
                } else {
                    // Handle bus-specific trip history
                    busSnapshot.forEach(tripSnapshot => {
                        const tripData = tripSnapshot.val();
                        // Check if trip already exists from /trips
                        const existingIndex = allTrips.findIndex(t => 
                            t.tripId === tripSnapshot.key && t.busId === busId
                        );
                        
                        if (existingIndex >= 0) {
                            // Merge data
                            allTrips[existingIndex] = {
                                ...allTrips[existingIndex],
                                ...tripData,
                                source: 'both'
                            };
                        } else {
                            allTrips.push({
                                ...tripData,
                                tripId: tripSnapshot.key,
                                busId: busId,
                                source: 'tripHistory'
                            });
                        }
                    });
                }
            });
        }

        // Sort by start time (newest first)
        allTrips.sort((a, b) => {
            const timeA = a.startTime || a.createdAt || 0;
            const timeB = b.startTime || b.createdAt || 0;
            return timeB - timeA;
        });

        filteredTrips = [...allTrips];
        updateStatistics();
        displayTrips();
    } catch (error) {
        console.error('Error loading trips:', error);
        document.getElementById('tripList').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error Loading Trips</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

// Load driver names into cache
async function loadDriverNames() {
    try {
        const driversSnapshot = await database.ref('driverInfo').once('value');
        driversSnapshot.forEach(driverSnapshot => {
            const driver = driverSnapshot.val();
            driverNames[driverSnapshot.key] = driver.name || driver.email || driverSnapshot.key;
        });
    } catch (error) {
        console.error('Error loading driver names:', error);
    }
}

// Get driver name by ID
function getDriverName(driverId) {
    if (!driverId) return 'Unknown';
    return driverNames[driverId] || driverId;
}

// Load filter options (buses, drivers, routes)
async function loadFilterOptions() {
    try {
        // Load buses
        const busesSnapshot = await database.ref('busDetails').once('value');
        const busSelect = document.getElementById('busFilter');
        if (busSelect) {
            busesSnapshot.forEach(busSnapshot => {
                const bus = busSnapshot.val();
                const option = document.createElement('option');
                option.value = busSnapshot.key;
                option.textContent = `${bus.busName || busSnapshot.key} - ${bus.busNumber || 'No number'}`;
                busSelect.appendChild(option);
            });
        }

        // Load drivers - show all drivers, not just approved
        const driversSnapshot = await database.ref('driverInfo').once('value');
        const driverSelect = document.getElementById('driverFilter');
        if (driverSelect) {
            driversSnapshot.forEach(driverSnapshot => {
                const driver = driverSnapshot.val();
                const option = document.createElement('option');
                option.value = driverSnapshot.key;
                option.textContent = driver.name || driver.email || driverSnapshot.key;
                driverSelect.appendChild(option);
            });
        }

        // Load routes
        const routesSnapshot = await database.ref('routes').once('value');
        const routeSelect = document.getElementById('routeFilter');
        if (routeSelect) {
            routesSnapshot.forEach(routeSnapshot => {
                const route = routeSnapshot.val();
                const option = document.createElement('option');
                option.value = routeSnapshot.key;
                option.textContent = route.name || routeSnapshot.key;
                routeSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading filter options:', error);
    }
}

// Filter trips based on selected filters
function filterTrips() {
    const busFilter = document.getElementById('busFilter').value;
    const driverFilter = document.getElementById('driverFilter').value;
    const routeFilter = document.getElementById('routeFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    const startDateFilter = document.getElementById('startDateFilter').value;
    const endDateFilter = document.getElementById('endDateFilter').value;

    filteredTrips = allTrips.filter(trip => {
        // Bus filter
        if (busFilter && trip.busId !== busFilter) return false;
        
        // Driver filter
        if (driverFilter && trip.driverId !== driverFilter) return false;
        
        // Route filter
        if (routeFilter && trip.routeId !== routeFilter) return false;
        
        // Status filter
        if (statusFilter && trip.status !== statusFilter) return false;
        
        // Date filters
        const tripStartTime = trip.startTime || trip.createdAt || 0;
        if (startDateFilter) {
            const startDate = new Date(startDateFilter).getTime();
            if (tripStartTime < startDate) return false;
        }
        if (endDateFilter) {
            const endDate = new Date(endDateFilter).getTime() + 24 * 60 * 60 * 1000; // End of day
            if (tripStartTime > endDate) return false;
        }
        
        return true;
    });

    updateStatistics();
    displayTrips();
}

// Update statistics
function updateStatistics() {
    const totalTrips = filteredTrips.length;
    const activeTrips = filteredTrips.filter(t => t.status === 'active').length;
    const completedTrips = filteredTrips.filter(t => t.status === 'completed').length;
    const totalDistance = filteredTrips.reduce((sum, t) => sum + (t.distance || t.totalDistance || 0), 0);
    const totalStudents = filteredTrips.reduce((sum, t) => {
        const students = t.totalStudents || (t.studentsBoarded ? Object.keys(t.studentsBoarded).length : 0) || 0;
        return sum + students;
    }, 0);

    document.getElementById('totalTrips').textContent = totalTrips;
    document.getElementById('activeTrips').textContent = activeTrips;
    document.getElementById('completedTrips').textContent = completedTrips;
    document.getElementById('totalDistance').textContent = totalDistance.toFixed(1);
    document.getElementById('totalStudents').textContent = totalStudents;
}

// Display trips in the list
function displayTrips() {
    const tripListContainer = document.getElementById('tripList');
    
    if (filteredTrips.length === 0) {
        tripListContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-route"></i>
                <h3>No Trips Found</h3>
                <p>No trips match the selected filters.</p>
            </div>
        `;
        return;
    }

    let html = '';
    filteredTrips.forEach(trip => {
        const startTime = trip.startTime || trip.createdAt || 0;
        const endTime = trip.endTime || startTime;
        const duration = endTime && startTime ? Math.round((endTime - startTime) / 1000 / 60) : 0;
        const distance = trip.distance || trip.totalDistance || 0;
        const status = trip.status || 'completed';
        const routeName = trip.routeName || trip.route?.name || 'Unknown Route';
        const totalStops = trip.totalStops || trip.stops?.length || 0;
        const totalStudents = trip.totalStudents || (trip.studentsBoarded ? Object.keys(trip.studentsBoarded).length : 0) || 0;

        html += `
            <div class="trip-card ${status}">
                <div class="trip-header">
                    <h3 class="trip-title">
                        <i class="fas fa-bus"></i> ${trip.busId || 'Unknown Bus'} - ${routeName}
                    </h3>
                    <span class="trip-status status-${status}">${status}</span>
                </div>
                <div class="trip-details">
                    <div class="trip-detail-item">
                        <i class="fas fa-user-tie"></i>
                        <span><strong>Driver:</strong> ${getDriverName(trip.driverId)}</span>
                    </div>
                    <div class="trip-detail-item">
                        <i class="fas fa-calendar"></i>
                        <span><strong>Start:</strong> ${new Date(startTime).toLocaleString()}</span>
                    </div>
                    <div class="trip-detail-item">
                        <i class="fas fa-clock"></i>
                        <span><strong>Duration:</strong> ${duration} minutes</span>
                    </div>
                    <div class="trip-detail-item">
                        <i class="fas fa-road"></i>
                        <span><strong>Distance:</strong> ${distance.toFixed(2)} km</span>
                    </div>
                    <div class="trip-detail-item">
                        <i class="fas fa-map-marker-alt"></i>
                        <span><strong>Stops:</strong> ${totalStops}</span>
                    </div>
                    <div class="trip-detail-item">
                        <i class="fas fa-users"></i>
                        <span><strong>Students:</strong> ${totalStudents}</span>
                    </div>
                </div>
                <div class="trip-timeline">
                    <div class="timeline-item">
                        <i class="fas fa-play-circle"></i>
                        <span>Started: ${new Date(startTime).toLocaleString()}</span>
                    </div>
                    ${endTime && endTime !== startTime ? `
                    <div class="timeline-item">
                        <i class="fas fa-stop-circle"></i>
                        <span>Ended: ${new Date(endTime).toLocaleString()}</span>
                    </div>
                    ` : ''}
                </div>
                <div class="trip-actions">
                    <button class="btn btn-primary" onclick="viewTripRoute('${trip.tripId}', '${trip.busId}')">
                        <i class="fas fa-map-marked-alt"></i> View Route
                    </button>
                    <button class="btn btn-secondary" onclick="viewTripDetails('${trip.tripId}')">
                        <i class="fas fa-info-circle"></i> Details
                    </button>
                </div>
            </div>
        `;
    });

    tripListContainer.innerHTML = html;
}

// View trip route on map
function viewTripRoute(tripId, busId) {
    const trip = filteredTrips.find(t => t.tripId === tripId && t.busId === busId);
    if (!trip) return;

    currentTripView = trip;
    document.getElementById('tripMapContainer').style.display = 'block';
    
    // Clear existing map layers
    if (tripMap) {
        tripMap.eachLayer(layer => {
            if (layer instanceof L.Marker || layer instanceof L.Polyline) {
                tripMap.removeLayer(layer);
            }
        });
    }

    // Load bus location history for this trip
    if (busId) {
        database.ref(`BusLocation/${busId}`).once('value')
            .then(snapshot => {
                if (!snapshot.exists()) return;

                const locations = [];
                const startTime = trip.startTime || trip.createdAt || 0;
                const endTime = trip.endTime || Date.now();

                snapshot.forEach(locationSnapshot => {
                    const timestamp = parseInt(locationSnapshot.key);
                    if (timestamp >= startTime && timestamp <= endTime) {
                        const location = locationSnapshot.val();
                        if (location.latitude && location.longitude) {
                            locations.push({
                                lat: location.latitude,
                                lng: location.longitude,
                                timestamp: timestamp
                            });
                        }
                    }
                });

                if (locations.length > 0) {
                    // Sort by timestamp
                    locations.sort((a, b) => a.timestamp - b.timestamp);

                    // Draw polyline
                    const positions = locations.map(loc => [loc.lat, loc.lng]);
                    const polyline = L.polyline(positions, {
                        color: '#667eea',
                        weight: 4,
                        opacity: 0.8
                    }).addTo(tripMap);

                    // Add start marker
                    if (locations.length > 0) {
                        L.marker([locations[0].lat, locations[0].lng], {
                            icon: L.divIcon({
                                className: 'start-marker',
                                html: '<div style="background: #28a745; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-weight: bold;">S</div>',
                                iconSize: [24, 24]
                            })
                        }).addTo(tripMap).bindPopup('Start Point');
                    }

                    // Add end marker
                    if (locations.length > 1) {
                        L.marker([locations[locations.length - 1].lat, locations[locations.length - 1].lng], {
                            icon: L.divIcon({
                                className: 'end-marker',
                                html: '<div style="background: #dc3545; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-weight: bold;">E</div>',
                                iconSize: [24, 24]
                            })
                        }).addTo(tripMap).bindPopup('End Point');
                    }

                    // Fit map to route
                    tripMap.fitBounds(polyline.getBounds(), { padding: [20, 20] });
                }
            })
            .catch(error => {
                console.error('Error loading trip route:', error);
            });
    }
}

// View trip details
function viewTripDetails(tripId) {
    const trip = filteredTrips.find(t => t.tripId === tripId);
    if (!trip) return;

    const driverName = getDriverName(trip.driverId);
    const startTime = trip.startTime || trip.createdAt || 0;
    const endTime = trip.endTime || startTime;
    const duration = endTime && startTime ? Math.round((endTime - startTime) / 1000 / 60) : 0;

    const details = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TRIP DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Trip ID: ${trip.tripId}
Bus ID: ${trip.busId || 'Unknown'}
Driver: ${driverName} (${trip.driverId || 'N/A'})
Route: ${trip.routeName || trip.route?.name || 'Unknown'}
Status: ${trip.status || 'Unknown'}

Start Time: ${new Date(startTime).toLocaleString()}
End Time: ${endTime && endTime !== startTime ? new Date(endTime).toLocaleString() : 'N/A'}
Duration: ${duration} minutes

Distance: ${(trip.distance || trip.totalDistance || 0).toFixed(2)} km
Total Stops: ${trip.totalStops || trip.stops?.length || 0}
Total Students: ${trip.totalStudents || (trip.studentsBoarded ? Object.keys(trip.studentsBoarded).length : 0)}

Source: ${trip.source || 'Unknown'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `;

    alert(details);
}

