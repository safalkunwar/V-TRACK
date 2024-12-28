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

// Initialize map
let map;
let markers = L.markerClusterGroup();
let routingControl = null;
let currentLocationMarker = null;

// Initialize map when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeMap();
    loadBusLocations();
    loadNotices();
});

function initializeMap() {
    map = L.map('map').setView([28.2096, 83.9856], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    markers.addTo(map);
}

function loadBusLocations() {
    database.ref('BusLocation').on('value', snapshot => {
        markers.clearLayers();
        snapshot.forEach(child => {
            const busData = child.val();
            const latestUpdate = getLatestUpdate(busData);
            
            if (latestUpdate.latitude && latestUpdate.longitude) {
                const marker = L.marker([latestUpdate.latitude, latestUpdate.longitude])
                    .bindPopup(`Bus ${child.key}<br>Last Updated: ${new Date(latestUpdate.timestamp).toLocaleTimeString()}`);
                markers.addLayer(marker);
            }
        });
    });
}

function loadNotices() {
    const noticeContainer = document.getElementById('notice');
    database.ref('notices').orderByChild('timestamp').limitToLast(1).on('value', snapshot => {
        snapshot.forEach(child => {
            const notice = child.val();
            noticeContainer.innerHTML = `
                <h3>Notice</h3>
                <p>${notice.content}</p>
                <small>${new Date(notice.timestamp).toLocaleString()}</small>
            `;
        });
    });
}

// Utility Functions
function getLatestUpdate(busData) {
    const timestamps = Object.keys(busData);
    const latestTimestamp = Math.max(...timestamps);
    return {
        ...busData[latestTimestamp],
        timestamp: parseInt(latestTimestamp)
    };
}

function togglePopup(popupId) {
    const popup = document.getElementById(popupId);
    popup.classList.toggle('show');
}

function nearBusStop() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;
            
            // Find nearest bus stop logic here
            showNearestBusStops(userLat, userLng);
        });
    }
}

function findBusNearMe() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;
            
            // Find nearest bus logic here
            showNearestBuses(userLat, userLng);
        });
    }
}

function startDirections() {
    const fromLocation = document.getElementById('from-location').value;
    const toLocation = document.getElementById('to-location').value;
    
    if (!fromLocation || !toLocation) {
        alert('Please enter both locations');
        return;
    }

    // Implement directions logic here
    calculateRoute(fromLocation, toLocation);
}

function redirectToAdditionalInfo() {
    window.location.href = '../html/additionalinfo.html';
}

// Make functions available globally
window.nearBusStop = nearBusStop;
window.findBusNearMe = findBusNearMe;
window.startDirections = startDirections;
window.togglePopup = togglePopup;
window.redirectToAdditionalInfo = redirectToAdditionalInfo;