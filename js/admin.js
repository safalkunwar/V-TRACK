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

// View bus history
function viewBusHistory() {
    const busId = document.getElementById('busSelect').value;
    const startDate = new Date(document.getElementById('startDate').value).getTime();
    const endDate = new Date(document.getElementById('endDate').value).getTime();
    
    if (!busId || !startDate || !endDate) {
        alert('Please select bus and date range');
        return;
    }

    // Clear previous data
    historyMap.eachLayer((layer) => {
        if (layer instanceof L.Marker || layer instanceof L.Polyline) {
            historyMap.removeLayer(layer);
        }
    });

    // Fetch location history
    database.ref('BusLocation').child(busId).orderByChild('timestamp')
        .startAt(startDate)
        .endAt(endDate)
        .once('value')
        .then(snapshot => {
            const historyList = document.getElementById('history-list');
            historyList.innerHTML = '';
            
            const locations = [];
            snapshot.forEach(child => {
                const location = child.val();
                locations.push({
                    lat: location.latitude,
                    lng: location.longitude,
                    timestamp: location.timestamp
                });
            });

            // Sort locations by timestamp
            locations.sort((a, b) => a.timestamp - b.timestamp);

            // Draw path on map
            if (locations.length > 0) {
                // Create markers and path
                const path = locations.map(loc => [loc.lat, loc.lng]);
                L.polyline(path, {color: 'blue'}).addTo(historyMap);
                
                // Add markers for start and end points
                L.marker([locations[0].lat, locations[0].lng], {
                    icon: L.divIcon({html: '🟢', className: 'start-point'})
                }).addTo(historyMap).bindPopup('Start Point');
                
                L.marker([locations[locations.length-1].lat, locations[locations.length-1].lng], {
                    icon: L.divIcon({html: '🔴', className: 'end-point'})
                }).addTo(historyMap).bindPopup('End Point');

                // Fit map to show all points
                historyMap.fitBounds(path);

                // Display history list
                locations.forEach(loc => {
                    const date = new Date(loc.timestamp);
                    historyList.innerHTML += `
                        <div class="track-point">
                            <span class="timestamp">${date.toLocaleString()}</span>
                            <span>Lat: ${loc.lat.toFixed(4)}, Lng: ${loc.lng.toFixed(4)}</span>
                        </div>
                    `;
                });
            } else {
                historyList.innerHTML = '<p>No tracking data found for selected period</p>';
            }
        });
}

// Delete records
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
                viewBusHistory(); // Refresh the view
            })
            .catch(error => {
                console.error('Error deleting records:', error);
                alert('Error deleting records');
            });
    }
}

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