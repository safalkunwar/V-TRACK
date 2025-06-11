// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const database = firebase.database();
let map, currentPositionMarker;
let isTracking = false;
let watchId = null;
let driverId = null;

// Initialize map
function initMap() {
    map = L.map('trackingMap').setView([28.2096, 83.9856], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
}

// Check authentication
auth.onAuthStateChanged(user => {
    if (user) {
        driverId = user.uid;
        initMap();
    } else {
        window.location.href = '../index.html';
    }
});

function startTracking() {
    if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser');
        return;
    }

    document.querySelector('.start-tracking').style.display = 'none';
    document.querySelector('.stop-tracking').style.display = 'block';
    isTracking = true;

    watchId = navigator.geolocation.watchPosition(
        position => {
            const { latitude, longitude, speed } = position.coords;
            updatePosition(latitude, longitude, speed);
        },
        error => {
            console.error('Error getting location:', error);
            alert('Error getting location. Please check your GPS settings.');
        },
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
    }
    
    document.querySelector('.start-tracking').style.display = 'block';
    document.querySelector('.stop-tracking').style.display = 'none';
    isTracking = false;

    // Update driver status
    database.ref(`drivers/${driverId}/status`).set('inactive');
}

function updatePosition(latitude, longitude, speed) {
    const position = [latitude, longitude];
    const timestamp = Date.now();

    // Update marker on map
    if (!currentPositionMarker) {
        currentPositionMarker = L.marker(position).addTo(map);
    } else {
        currentPositionMarker.setLatLng(position);
    }

    map.setView(position);

    // Update speed display
    const speedKmh = speed ? Math.round(speed * 3.6) : 0;
    document.getElementById('speedDisplay').textContent = `${speedKmh} km/h`;

    // Save to Firebase
    const locationData = {
        latitude,
        longitude,
        speed: speedKmh,
        timestamp
    };

    database.ref(`BusLocation/${driverId}`).push(locationData);
    database.ref(`drivers/${driverId}/currentLocation`).set(locationData);
    database.ref(`drivers/${driverId}/status`).set('active');
}

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (isTracking) {
        stopTracking();
    }
}); 