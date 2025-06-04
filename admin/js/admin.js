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
const auth = firebase.auth();
const database = firebase.database();

// Load bus list from busDetails
function loadBusList() {
    database.ref('busDetails').once('value')
        .then(snapshot => {
            const busSelect = document.getElementById('busSelect');
            if (!busSelect) return;

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
            alert("Error loading bus list. Please refresh the page.");
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
    database.ref('BusLocation').child(busId)
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
                document.getElementById('history-list').innerHTML = 
                    '<p>No tracking data found for selected period</p>';
            }
        })
        .catch(error => {
            console.error("Error fetching bus history:", error);
            alert("Error loading bus history. Please try again.");
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
        database.ref('BusLocation').child(busId)
            .orderByChild('timestamp')
            .startAt(startDate)
            .endAt(endDate)
            .once('value')
            .then(snapshot => {
                const updates = {};
                snapshot.forEach(child => {
                    updates[child.key] = null;
                });
                return database.ref('BusLocation').child(busId).update(updates);
            })
            .then(() => {
                alert('Records deleted successfully');
                viewBusHistory();
            })
            .catch(error => {
                console.error('Error deleting records:', error);
                alert('Error deleting records');
            });
    }
}

// Initialize map
let historyMap;
function initHistoryMap() {
    try {
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
    loadBusList();
    initHistoryMap();
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
`;
document.head.appendChild(style);

function loadPendingDrivers() {
    database.ref('pendingDrivers').on('value', snapshot => {
        const container = document.getElementById('pendingDriversContainer');
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
}

async function approveDriver(driverId) {
    try {
        const snapshot = await database.ref(`pendingDrivers/${driverId}`).once('value');
        const driverData = snapshot.val();
        
        // Move to approved drivers
        await database.ref(`driverInfo/${driverData.userId}`).set({
            ...driverData,
            status: 'approved',
            approvedAt: Date.now()
        });
        
        // Remove from pending
        await database.ref(`pendingDrivers/${driverId}`).remove();
        
        showNotification('Driver approved successfully');
    } catch (error) {
        console.error('Error approving driver:', error);
        showNotification('Error approving driver', 'error');
    }
}

function editDriver(driverId) {
    // Load driver data into edit modal
    database.ref(`driverInfo/${driverId}`).once('value')
        .then(snapshot => {
            const driver = snapshot.val();
            document.getElementById('editName').value = driver.name;
            document.getElementById('editLicense').value = driver.licenseNumber;
            document.getElementById('editPhone').value = driver.phone;
            document.getElementById('editBus').value = driver.assignedBus || '';
            document.getElementById('editRoute').value = driver.assignedRoute || '';
            
            // Show modal
            document.getElementById('driverEditModal').style.display = 'block';
            
            // Set current driver ID for form submission
            document.getElementById('driverEditForm').setAttribute('data-driver-id', driverId);
        });
}

// Handle driver edit form submission
document.getElementById('driverEditForm').addEventListener('submit', async (e) => {
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

function sendMessageToDriver(driverId) {
    const message = document.getElementById('driverMessage').value;
    if (!message) return;

    database.ref(`messages/${driverId}`).push({
        message,
        timestamp: Date.now(),
        from: 'admin'
    }).then(() => {
        showNotification('Message sent successfully');
        document.querySelector('.modal').remove();
    }).catch(error => {
        console.error('Error sending message:', error);
        showNotification('Error sending message', 'error');
    });
}

// Load available buses and route analysis
function loadAvailableBuses() {
    const busContainer = document.getElementById('busFleetContainer');
    database.ref('busDetails').on('value', snapshot => {
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
}

function loadRouteAnalysis() {
    const routeContainer = document.getElementById('routeAnalysisContainer');
    database.ref('routes').on('value', snapshot => {
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
}

// Call these functions on page load
document.addEventListener('DOMContentLoaded', () => {
    loadAvailableBuses();
    loadRouteAnalysis();
}); 