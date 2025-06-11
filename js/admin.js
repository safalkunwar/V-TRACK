// Admin specific functionality
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

// Initialize Firebase for admin
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const database = firebase.database();

// Check if user is admin
function checkAdminStatus() {
    auth.onAuthStateChanged(user => {
        if (user) {
            database.ref('admins').child(user.uid).once('value')
                .then(snapshot => {
                    if (!snapshot.exists()) {
                        // Not an admin, redirect to user page
                        window.location.href = '/html/miniindex.html';
                    }
                });
        } else {
            // Not logged in, redirect to login page
            window.location.href = '/index.html';
        }
    });
}

// Admin Functions
function addBus(busData) {
    return database.ref('busDetails').push(busData);
}

function updateBus(busId, busData) {
    return database.ref('busDetails').child(busId).update(busData);
}

function deleteBus(busId) {
    return database.ref('busDetails').child(busId).remove();
}

function addNotice(notice) {
    return database.ref('notices').push({
        content: notice,
        timestamp: Date.now()
    });
}

function updateBusLocation(busId, location) {
    return database.ref('BusLocation').child(busId).push({
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: Date.now()
    });
}

// Load bus list into select dropdown
function loadBusList() {
    database.ref('busDetails').once('value')
        .then(snapshot => {
            const busSelect = document.getElementById('busSelect');
            busSelect.innerHTML = '<option value="">Select Bus</option>';
            
            snapshot.forEach(child => {
                const bus = child.val();
                const option = document.createElement('option');
                option.value = child.key;
                option.textContent = bus.busName;
                busSelect.appendChild(option);
            });
        });
}

// Initialize map for history tracking
let historyMap;
function initHistoryMap() {
    historyMap = L.map('history-map').setView([28.2096, 83.9856], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
    }).addTo(historyMap);
}

// Function to view bus history
function viewBusHistory(busId) {
    clearMap(); // Clear existing markers and paths
    
    database.ref(`BusLocation/${busId}`).once('value')
        .then(snapshot => {
            const locationData = snapshot.val();
            if (!locationData) {
                throw new Error('No location data available');
            }

            // Convert location data to array of points
            const points = Object.entries(locationData)
                .map(([timestamp, data]) => ({
                    timestamp: parseInt(timestamp),
                    latitude: data.latitude,
                    longitude: data.longitude,
                    speed: data.speed || 0
                }))
                .sort((a, b) => a.timestamp - b.timestamp); // Sort by timestamp

            if (points.length === 0) {
                throw new Error('No valid points found');
            }

            displayBusPath(points, busId);
        })
        .catch(error => {
            console.error('Error displaying bus path:', error);
            showNotification('Error: ' + error.message, 'error');
        });
}

// Function to display bus path
function displayBusPath(points, busId) {
    if (points.length < 2) {
        throw new Error('Not enough valid points to display path');
    }

    // Create path coordinates
    const pathCoordinates = points.map(point => [point.latitude, point.longitude]);

    // Draw the path
    const path = L.polyline(pathCoordinates, {
        color: '#007bff',
        weight: 3,
        opacity: 0.8
    }).addTo(historyMap);

    // Add markers for start and end points
    addEndpointMarkers(points[0], points[points.length - 1], busId);

    // Fit map to show the entire path
    historyMap.fitBounds(path.getBounds());

    // Add timestamp markers
    points.forEach((point, index) => {
        if (index % 5 === 0) { // Add marker every 5th point to avoid cluttering
            L.marker([point.latitude, point.longitude], {
                icon: L.divIcon({
                    html: `<div class="time-marker">${new Date(point.timestamp).toLocaleTimeString()}</div>`,
                    className: 'time-marker-container'
                })
            }).addTo(historyMap);
        }
    });
}

// Function to add start and end markers
function addEndpointMarkers(startPoint, endPoint, busId) {
    // Start marker
    L.marker([startPoint.latitude, startPoint.longitude], {
        icon: L.divIcon({
            html: '<i class="fas fa-play-circle"></i>',
            className: 'start-marker',
            iconSize: [30, 30]
        })
    })
    .bindPopup(`<b>Bus ${busId} Start</b><br>${new Date(startPoint.timestamp).toLocaleString()}`)
    .addTo(historyMap);

    // End marker
    L.marker([endPoint.latitude, endPoint.longitude], {
        icon: L.divIcon({
            html: '<i class="fas fa-stop-circle"></i>',
            className: 'end-marker',
            iconSize: [30, 30]
        })
    })
    .bindPopup(`<b>Bus ${busId} End</b><br>${new Date(endPoint.timestamp).toLocaleString()}`)
    .addTo(historyMap);
}

// Function to delete history
function deleteRecords(busId) {
    if (!confirm(`Are you sure you want to delete all location history for Bus ${busId}?`)) {
        return;
    }

    const twoDaysAgo = Date.now() - (2 * 24 * 60 * 60 * 1000); // 2 days in milliseconds

    database.ref(`BusLocation/${busId}`).once('value')
        .then(snapshot => {
            const updates = {};
            snapshot.forEach(child => {
                const timestamp = parseInt(child.key);
                if (timestamp < twoDaysAgo) {
                    updates[child.key] = null;
                }
            });

            return database.ref(`BusLocation/${busId}`).update(updates);
        })
        .then(() => {
            showNotification('Old records deleted successfully');
            viewBusHistory(busId); // Refresh the display
        })
        .catch(error => {
            console.error('Error deleting records:', error);
            showNotification('Error deleting records', 'error');
        });
}

// Function to clear map
function clearMap() {
    historyMap.eachLayer((layer) => {
        if (layer instanceof L.Marker || layer instanceof L.Polyline) {
            historyMap.removeLayer(layer);
        }
    });
}

// Add these styles to your CSS
const styles = `
.time-marker-container {
    background: none;
    border: none;
}

.time-marker {
    font-size: 10px;
    color: #666;
    background: white;
    padding: 2px 4px;
    border-radius: 3px;
    border: 1px solid #ccc;
}

.start-marker {
    color: #28a745;
    font-size: 24px;
    text-align: center;
    line-height: 30px;
}

.end-marker {
    color: #dc3545;
    font-size: 24px;
    text-align: center;
    line-height: 30px;
}
`;

// Add styles to document
const styleSheet = document.createElement('style');
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    checkAdminStatus();
    loadBusList();
    initHistoryMap();
});

// Add to window object for HTML access
window.viewBusHistory = viewBusHistory;
window.deleteRecords = deleteRecords;

// Export admin functions
window.adminFunctions = {
    checkAdminStatus,
    addBus,
    updateBus,
    deleteBus,
    addNotice,
    updateBusLocation
};

function loadPendingDrivers() {
    const container = document.getElementById('pendingDriversContainer');
    
    database.ref('pendingDrivers').on('value', snapshot => {
        container.innerHTML = '<h3>Pending Driver Applications</h3>';
        
        snapshot.forEach(child => {
            const driver = child.val();
            const driverId = child.key;
            
            container.innerHTML += `
                <div class="pending-driver-card">
                    <div class="driver-info">
                        <h4>${driver.name}</h4>
                        <p>Phone: ${driver.phone}</p>
                        <p>License: ${driver.licenseNumber}</p>
                        <p>Experience: ${driver.experience} years</p>
                    </div>
                    <div class="action-buttons">
                        <button onclick="approveDriver('${driverId}')" class="btn-approve">
                            Approve
                        </button>
                        <button onclick="rejectDriver('${driverId}')" class="btn-reject">
                            Reject
                        </button>
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