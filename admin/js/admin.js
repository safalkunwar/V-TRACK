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
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Check if Firebase is properly initialized
function checkFirebaseConnection() {
    if (!firebase.apps.length) {
        console.error('Firebase not initialized');
        return false;
    }
    if (!database) {
        console.error('Database not initialized');
        return false;
    }
    return true;
}

// Helper function to safely use database
function safeDatabaseCall(callback) {
    if (!checkFirebaseConnection()) {
        console.error('Firebase not available');
        return;
    }
    try {
        callback(database);
    } catch (error) {
        console.error('Database operation failed:', error);
    }
}

// Load bus list from busDetails
function loadBusList() {
    safeDatabaseCall((db) => {
        db.ref('busDetails').once('value')
            .then(snapshot => {
                const busSelect = document.getElementById('busSelect');
                if (!busSelect) {
                    console.warn('busSelect element not found');
                    return;
                }

                busSelect.innerHTML = '<option value="">Select Bus</option>';
                
                snapshot.forEach(child => {
                    const bus = child.val();
                    if (bus.busName) {
                        const option = document.createElement('option');
                        option.value = bus.busName.toLowerCase().replace(/\s+/g, ''); // Convert to bus1, bus2 format
                        option.textContent = `${bus.busName} - ${bus.busNumber || 'No number'}`;
                        busSelect.appendChild(option);
                    }
                });
            })
            .catch(error => {
                console.error("Error loading bus list:", error);
            });
    });
}

// View bus history from BusLocation
function viewBusHistory() {
    const busId = document.getElementById('busSelect').value;
    const startDate = new Date(document.getElementById('startDate').value).getTime();
    const endDate = new Date(document.getElementById('endDate').value).getTime();
    
    if (!busId || !startDate || !endDate) {
        alert('Please select bus and date range');
        return;
    }

    clearMap();

    // Fetch location history
    safeDatabaseCall((db) => {
        db.ref('BusLocation').child(busId)
            .orderByKey()
            .startAt(startDate.toString())
            .endAt(endDate.toString())
            .once('value')
            .then(snapshot => {
                const locations = [];
                
                snapshot.forEach(child => {
                    const data = child.val();
                    const timestamp = parseInt(child.key);

                    // Handle both data structures
                    if (typeof data === 'object') {
                        // Case 1: Data with nested timestamp
                        if (data.timestamp) {
                            if (data.latitude && data.longitude) {
                                locations.push({
                                    lat: data.latitude,
                                    lng: data.longitude,
                                    timestamp: data.timestamp
                                });
                            }
                        }
                        // Case 2: Data without nested timestamp
                        else if (data.latitude && data.longitude) {
                            locations.push({
                                lat: data.latitude,
                                lng: data.longitude,
                                timestamp: timestamp
                            });
                        }
                    }
                });

                // Sort locations by timestamp
                locations.sort((a, b) => a.timestamp - b.timestamp);

                if (locations.length > 0) {
                    displayBusPath(locations);
                    displayTimelineList(locations);
                } else {
                    const historyList = document.getElementById('history-list');
                    if (historyList) {
                        historyList.innerHTML = '<p>No tracking data found for selected period</p>';
                    }
                }
            })
            .catch(error => {
                console.error("Error fetching bus history:", error);
                alert("Error loading bus history. Please try again.");
            });
    });
}

// Update the processLocationData function to use local processing instead of API calls
function processLocationData(locations) {
    // Sort by timestamp first
    locations.sort((a, b) => a.timestamp - b.timestamp);
    
    // Filter outliers and smooth the path
    return filterAndSmoothPath(locations);
}

function filterAndSmoothPath(locations) {
    const filtered = [];
    const minDistance = 5; // Minimum 5 meters between points
    const maxDistance = 500; // Maximum 500 meters between points
    const minTimeDiff = 10; // Minimum 10 seconds between points
    const maxSpeed = 60; // Maximum speed in km/h

    for (let i = 0; i < locations.length; i++) {
        const current = locations[i];
        const prev = filtered[filtered.length - 1];

        if (!prev) {
            filtered.push(current);
            continue;
        }

        const distance = calculateDistance(current, prev);
        const timeDiff = (current.timestamp - prev.timestamp) / 1000; // seconds
        const speed = (distance / 1000) / (timeDiff / 3600); // km/h

        // Filter based on realistic constraints
        if (distance >= minDistance && 
            distance <= maxDistance && 
            timeDiff >= minTimeDiff &&
            speed <= maxSpeed) {
            filtered.push(current);
        }
    }

    return filtered;
}

// Kalman Filter implementation for position smoothing
function applyKalmanFilter(current, prev) {
    const Q = 1e-5; // Process noise
    const R = 0.0001; // Measurement noise
    
    // Simple Kalman filter for position
    const K = prev.uncertainty ? 
        prev.uncertainty / (prev.uncertainty + R) : 0.5;

    const smoothedLat = prev.lat + K * (current.lat - prev.lat);
    const smoothedLng = prev.lng + K * (current.lng - prev.lng);
    
    // Update uncertainty
    const uncertainty = (1 - K) * (prev.uncertainty || R) + Q;

    return {
        ...current,
        lat: smoothedLat,
        lng: smoothedLng,
        uncertainty: uncertainty
    };
}

// Update the displayBusPath function
function displayBusPath(locations) {
    try {
        const processedLocations = processLocationData(locations);
        
        if (processedLocations.length < 2) {
            throw new Error('Not enough valid points to display path');
        }

        const path = processedLocations.map(loc => [loc.lat, loc.lng]);

        const pathLine = L.polyline(path, {
            color: 'blue',
            weight: 4,
            opacity: 0.8,
            smoothFactor: 1,
            lineCap: 'round',
            lineJoin: 'round'
        }).addTo(historyMap);

        // Add markers and popups with error handling
        addEndpointMarkers(processedLocations);
        addPathArrows(pathLine);

        historyMap.fitBounds(pathLine.getBounds(), {
            padding: [50, 50]
        });

        displayTimelineList(processedLocations);
    } catch (error) {
        console.error("Error displaying bus path:", error);
        alert("Error displaying bus path. Please try again.");
    }
}

// Update displayTimelineList for better formatting
function displayTimelineList(locations) {
    const historyList = document.getElementById('history-list');
    historyList.innerHTML = '<h3>Timeline</h3>';
    
    locations.forEach((loc, index) => {
        const date = new Date(loc.timestamp);
        historyList.innerHTML += `
            <div class="track-point">
                <span class="timestamp">
                    ${date.toLocaleTimeString()} 
                    ${index === 0 ? '(Start)' : 
                      index === locations.length - 1 ? '(End)' : ''}
                </span>
                <span class="coordinates">
                    ${loc.lat.toFixed(6)}, ${loc.lng.toFixed(6)}
                </span>
            </div>
        `;
    });
}

// Delete records function
function deleteRecords() {
    const busId = document.getElementById('busSelect').value;
    const startDate = new Date(document.getElementById('startDate').value).getTime();
    const endDate = new Date(document.getElementById('endDate').value).getTime();
    
    if (!busId || !startDate || !endDate) {
        alert('Please select bus and date range');
        return;
    }

    if (confirm('Are you sure you want to delete these records? This action cannot be undone.')) {
        safeDatabaseCall((db) => {
            db.ref('BusLocation').child(busId)
                .orderByChild('timestamp')
                .startAt(startDate)
                .endAt(endDate)
                .once('value')
                .then(snapshot => {
                    const updates = {};
                    snapshot.forEach(child => {
                        updates[child.key] = null;
                    });
                    return db.ref('BusLocation').child(busId).update(updates);
                })
                .then(() => {
                    alert('Records deleted successfully');
                    viewBusHistory();
                })
                .catch(error => {
                    console.error('Error deleting records:', error);
                    alert('Error deleting records');
                });
        });
    }
}

// Initialize map
let historyMap;
function initHistoryMap() {
    try {
        // Check if Leaflet is loaded
        if (typeof L === 'undefined') {
            console.warn('Leaflet not loaded yet, retrying in 1 second...');
            setTimeout(initHistoryMap, 1000);
            return;
        }

        const mapContainer = document.getElementById('history-map');
        if (!mapContainer) {
            console.warn('History map container not found');
            return;
        }

        if (!historyMap) {
            historyMap = L.map('history-map').setView([28.2096, 83.9856], 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '© OpenStreetMap'
            }).addTo(historyMap);
        }
    } catch (error) {
        console.error("Error initializing map:", error);
        const mapContainer = document.getElementById('history-map');
        if (mapContainer) {
            mapContainer.innerHTML = '<p class="error-message">Error loading map. Please refresh the page.</p>';
        }
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for all scripts to load
    setTimeout(() => {
        loadBusList();
        initHistoryMap();
    }, 500);
});

// Make functions globally available
window.viewBusHistory = viewBusHistory;
window.deleteRecords = deleteRecords;

// Add this function for distance calculation
function calculateDistance(point1, point2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = point1.lat * Math.PI/180;
    const φ2 = point2.lat * Math.PI/180;
    const Δφ = (point2.lat - point1.lat) * Math.PI/180;
    const Δλ = (point2.lng - point1.lng) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
}

// Update addPathArrows function
function addPathArrows(pathLine) {
    if (!L.polylineDecorator) return;

    L.polylineDecorator(pathLine, {
        patterns: [
            {
                offset: '5%',
                repeat: '15%',
                symbol: L.Symbol.arrowHead({
                    pixelSize: 12,
                    polygon: false,
                    pathOptions: {
                        color: '#0000ff',
                        fillOpacity: 1,
                        weight: 2
                    }
                })
            }
        ]
    }).addTo(historyMap);
}

// Update clearMap function
function clearMap() {
    if (historyMap) {
        historyMap.eachLayer((layer) => {
            if (!(layer instanceof L.TileLayer)) {
                historyMap.removeLayer(layer);
            }
        });
    }
}

// Add CSS for error message
const style = document.createElement('style');
style.textContent = `
    .error-message {
        color: red;
        text-align: center;
        padding: 20px;
        background: #fff;
        border-radius: 8px;
        margin: 10px;
    }
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 5px;
        color: white;
        z-index: 1000;
        max-width: 300px;
    }
    .notification.success {
        background-color: #28a745;
    }
    .notification.error {
        background-color: #dc3545;
    }
    .notification.info {
        background-color: #17a2b8;
    }
`;
document.head.appendChild(style);

// Helper function for notifications
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

function loadPendingDrivers() {
    safeDatabaseCall((db) => {
        db.ref('pendingDrivers').on('value', snapshot => {
            const container = document.getElementById('pendingDriversContainer');
            if (!container) {
                console.warn('pendingDriversContainer not found');
                return;
            }
            
            container.innerHTML = '';
            
            snapshot.forEach(child => {
                const driver = child.val();
                container.innerHTML += `
                    <div class="driver-card pending">
                        <div class="driver-info">
                            <h4>${driver.name}</h4>
                            <p>License: ${driver.licenseNumber}</p>
                            <p>Experience: ${driver.experience} years</p>
                            <p>Phone: ${driver.phone}</p>
                        </div>
                        <div class="driver-actions">
                            <button onclick="approveDriver('${child.key}')">Approve</button>
                            <button onclick="rejectDriver('${child.key}')" class="reject">Reject</button>
                        </div>
                    </div>
                `;
            });
        });
    });
}

async function approveDriver(driverId) {
    try {
        safeDatabaseCall(async (db) => {
            const snapshot = await db.ref(`pendingDrivers/${driverId}`).once('value');
            const driverData = snapshot.val();
            
            // Move to approved drivers
            await db.ref(`driverInfo/${driverData.userId}`).set({
                ...driverData,
                status: 'approved',
                approvedAt: Date.now()
            });
            
            // Remove from pending
            await db.ref(`pendingDrivers/${driverId}`).remove();
            
            showNotification('Driver approved successfully');
        });
    } catch (error) {
        console.error('Error approving driver:', error);
        showNotification('Error approving driver', 'error');
    }
}

async function rejectDriver(driverId) {
    try {
        safeDatabaseCall(async (db) => {
            // Remove from pending drivers
            await db.ref(`pendingDrivers/${driverId}`).remove();
            showNotification('Driver rejected successfully');
        });
    } catch (error) {
        console.error('Error rejecting driver:', error);
        showNotification('Error rejecting driver', 'error');
    }
}

function editDriver(driverId) {
    // Load driver data into edit modal
    safeDatabaseCall((db) => {
        db.ref(`driverInfo/${driverId}`).once('value')
            .then(snapshot => {
                const driver = snapshot.val();
                if (!driver) {
                    showNotification('Driver not found', 'error');
                    return;
                }
                
                const editName = document.getElementById('editName');
                const editLicense = document.getElementById('editLicense');
                const editPhone = document.getElementById('editPhone');
                const editBus = document.getElementById('editBus');
                const editRoute = document.getElementById('editRoute');
                
                if (editName) editName.value = driver.name || '';
                if (editLicense) editLicense.value = driver.licenseNumber || '';
                if (editPhone) editPhone.value = driver.phone || '';
                if (editBus) editBus.value = driver.assignedBus || '';
                if (editRoute) editRoute.value = driver.assignedRoute || '';
                
                // Show modal
                const modal = document.getElementById('driverEditModal');
                if (modal) {
                    modal.style.display = 'block';
                }
                
                // Set current driver ID for form submission
                const form = document.getElementById('driverEditForm');
                if (form) {
                    form.setAttribute('data-driver-id', driverId);
                }
            })
            .catch(error => {
                console.error('Error loading driver data:', error);
                showNotification('Error loading driver data', 'error');
            });
    });
}

// Handle driver edit form submission
const driverEditForm = document.getElementById('driverEditForm');
if (driverEditForm) {
    driverEditForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const driverId = e.target.getAttribute('data-driver-id');
        const updates = {
            name: document.getElementById('editName').value,
            licenseNumber: document.getElementById('editLicense').value,
            phone: document.getElementById('editPhone').value,
            assignedBus: document.getElementById('editBus').value,
            assignedRoute: document.getElementById('editRoute').value,
            lastUpdated: Date.now()
        };

        try {
            await database.ref(`driverInfo/${driverId}`).update(updates);
            showNotification('Driver information updated successfully');
            document.getElementById('driverEditModal').style.display = 'none';
        } catch (error) {
            console.error('Error updating driver:', error);
            showNotification('Error updating driver information', 'error');
        }
    });
}

function sendMessageToDriver(driverId) {
    const messageInput = document.getElementById('driverMessage');
    if (!messageInput) {
        showNotification('Message input not found', 'error');
        return;
    }
    
    const message = messageInput.value;
    if (!message) {
        showNotification('Please enter a message', 'error');
        return;
    }

    safeDatabaseCall((db) => {
        db.ref(`messages/${driverId}`).push({
            message,
            timestamp: Date.now(),
            from: 'admin'
        }).then(() => {
            showNotification('Message sent successfully');
            const modal = document.querySelector('.modal');
            if (modal) {
                modal.remove();
            }
        }).catch(error => {
            console.error('Error sending message:', error);
            showNotification('Error sending message', 'error');
        });
    });
}

// Load available buses and route analysis
function loadAvailableBuses() {
    const busContainer = document.getElementById('busFleetContainer');
    if (!busContainer) {
        console.warn('busFleetContainer not found');
        return;
    }
    
    safeDatabaseCall((db) => {
        db.ref('busDetails').on('value', snapshot => {
            busContainer.innerHTML = ''; // Clear existing content
            snapshot.forEach(child => {
                const busData = child.val();
                busContainer.innerHTML += `
                    <div class="bus-card">
                        <h4>${busData.busName}</h4>
                        <p>Bus Number: ${busData.busNumber}</p>
                        <p>Assigned Driver: ${busData.driverName || 'N/A'}</p>
                    </div>
                `;
            });
        });
    });
}

function loadRouteAnalysis() {
    const routeContainer = document.getElementById('routeAnalysisContainer');
    if (!routeContainer) {
        console.warn('routeAnalysisContainer not found');
        return;
    }
    
    safeDatabaseCall((db) => {
        db.ref('routes').on('value', snapshot => {
            routeContainer.innerHTML = ''; // Clear existing content
            snapshot.forEach(child => {
                const routeData = child.val();
                routeContainer.innerHTML += `
                    <div class="route-card">
                        <h4>${routeData.name}</h4>
                        <p>Description: ${routeData.description || 'No description available'}</p>
                    </div>
                `;
            });
        });
    });
}

// Call these functions on page load
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for all scripts to load
    setTimeout(() => {
        loadAvailableBuses();
        loadRouteAnalysis();
    }, 1000);
});

// Add endpoint markers to the map
function addEndpointMarkers(locations) {
    if (!historyMap || locations.length < 2) return;
    
    try {
        // Add start marker
        const startMarker = L.marker([locations[0].lat, locations[0].lng], {
            icon: L.divIcon({
                className: 'start-marker',
                html: '<i class="fas fa-play" style="color: #28a745; font-size: 20px;"></i>',
                iconSize: [20, 20]
            })
        }).addTo(historyMap);
        
        // Add end marker
        const endMarker = L.marker([locations[locations.length - 1].lat, locations[locations.length - 1].lng], {
            icon: L.divIcon({
                className: 'end-marker',
                html: '<i class="fas fa-stop" style="color: #dc3545; font-size: 20px;"></i>',
                iconSize: [20, 20]
            })
        }).addTo(historyMap);
        
        // Add popups
        startMarker.bindPopup(`<b>Start Point</b><br>${new Date(locations[0].timestamp).toLocaleString()}`);
        endMarker.bindPopup(`<b>End Point</b><br>${new Date(locations[locations.length - 1].timestamp).toLocaleString()}`);
        
    } catch (error) {
        console.error('Error adding endpoint markers:', error);
    }
} 