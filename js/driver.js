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
let driverId = null;
let map = null;
let currentPositionMarker = null;
let isTracking = false;
let watchId = null;

// Check authentication and initialize
auth.onAuthStateChanged(user => {
    if (user) {
        driverId = user.uid;
        initializeDriverDashboard();
    } else {
        window.location.href = '../index.html';
    }
});

function initializeDriverDashboard() {
    loadStats();
    loadRatings();
    initializeMap();
    setupEventListeners();
}

function initializeMap() {
    if (!map) {
        const mapContainer = document.getElementById('trackingMap');
        if (mapContainer) {
            map = L.map('trackingMap').setView([28.2096, 83.9856], 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(map);
        }
    }
}

function setupEventListeners() {
    // Section navigation
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = e.currentTarget.getAttribute('onclick').match(/'([^']+)'/)[1];
            showSection(section);
        });
    });

    // Tracking buttons
    const startBtn = document.getElementById('startTrackingBtn');
    const stopBtn = document.getElementById('stopTrackingBtn');
    
    if (startBtn) startBtn.addEventListener('click', startTracking);
    if (stopBtn) stopBtn.addEventListener('click', stopTracking);
}

function showSection(sectionId) {
    document.querySelectorAll('.dashboard-section').forEach(section => {
        section.classList.remove('active');
    });
    
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        if (sectionId === 'overview' && map) {
            map.invalidateSize();
        }
    }

    // Update navigation active state
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('onclick').includes(sectionId)) {
            link.classList.add('active');
        }
    });
}

function startTracking() {
    if (!navigator.geolocation) {
        showNotification('Geolocation is not supported by your browser');
        return;
    }

    if (!driverId) {
        showNotification('Driver ID not found. Please log in again.');
        return;
    }

    document.getElementById('startTrackingBtn').classList.add('hidden');
    document.getElementById('stopTrackingBtn').classList.remove('hidden');
    document.body.classList.add('fullscreen-mode');
    
    isTracking = true;
    updateDriverStatus('active');

    watchId = navigator.geolocation.watchPosition(
        updatePosition,
        handleLocationError,
        {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 5000
        }
    );
}

function stopTracking() {
    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }

    document.getElementById('startTrackingBtn').classList.remove('hidden');
    document.getElementById('stopTrackingBtn').classList.add('hidden');
    document.body.classList.remove('fullscreen-mode');
    
    isTracking = false;
    updateDriverStatus('inactive');
}

function updatePosition(position) {
    if (!isTracking || !driverId) return;

    const { latitude, longitude, speed } = position.coords;
    const pos = [latitude, longitude];
    const timestamp = Date.now();

    // Update marker
    if (!currentPositionMarker && map) {
        currentPositionMarker = L.marker(pos).addTo(map);
    } else if (currentPositionMarker) {
        currentPositionMarker.setLatLng(pos);
    }

    if (map) {
        map.setView(pos);
    }

    // Update speed display
    const speedKmh = speed ? Math.round(speed * 3.6) : 0;
    const speedDisplay = document.getElementById('speedDisplay');
    if (speedDisplay) {
        speedDisplay.textContent = `${speedKmh} km/h`;
    }

    // Save to Firebase
    const locationData = {
        latitude,
        longitude,
        speed: speedKmh,
        timestamp
    };

    database.ref(`BusLocation/${driverId}/${timestamp}`).set(locationData)
        .catch(error => console.error('Error updating location:', error));
    
    database.ref(`drivers/${driverId}/currentLocation`).set(locationData)
        .catch(error => console.error('Error updating current location:', error));
}

function handleLocationError(error) {
    console.error('Location Error:', error);
    showNotification(`Location error: ${error.message}`);
    stopTracking();
}

function updateDriverStatus(status) {
    if (!driverId) return;
    
    database.ref(`drivers/${driverId}/status`).set(status)
        .catch(error => console.error('Error updating status:', error));
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (isTracking) {
        stopTracking();
    }
});

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    showSection('overview');
}); 