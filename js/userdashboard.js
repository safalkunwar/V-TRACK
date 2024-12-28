// Initialize Firebase with your config
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

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

document.addEventListener('DOMContentLoaded', () => {
    loadLiveBusStatus();
    loadUserRoutes();
    loadBusSchedule();
    loadNotifications();
});

function loadLiveBusStatus() {
    const container = document.getElementById('liveBusStatus');
    database.ref('BusLocation').on('value', snapshot => {
        container.innerHTML = '';
        snapshot.forEach(child => {
            const busData = child.val();
            const latestUpdate = getLatestUpdate(busData);
            
            container.innerHTML += `
                <div class="bus-status-item">
                    <div class="bus-info">
                        <h4>Bus ${child.key}</h4>
                        <p>Last Updated: ${new Date(latestUpdate.timestamp).toLocaleTimeString()}</p>
                    </div>
                    <div class="bus-location">
                        <button onclick="showOnMap('${child.key}')">View on Map</button>
                    </div>
                </div>
            `;
        });
    });
}

function loadUserRoutes() {
    // Load user's favorite/recent routes
    const userId = firebase.auth().currentUser?.uid;
    if (!userId) return;

    database.ref(`users/${userId}/routes`).on('value', snapshot => {
        const container = document.getElementById('userRoutes');
        container.innerHTML = '';
        
        snapshot.forEach(child => {
            const route = child.val();
            container.innerHTML += `
                <div class="route-item">
                    <div class="route-info">
                        <h4>${route.name}</h4>
                        <p>${route.from} → ${route.to}</p>
                    </div>
                    <button onclick="trackRoute('${child.key}')">Track</button>
                </div>
            `;
        });
    });
}

function loadBusSchedule() {
    const container = document.getElementById('busSchedule');
    const today = new Date().toISOString().split('T')[0];
    
    database.ref('schedule').orderByChild('date').equalTo(today).once('value', snapshot => {
        container.innerHTML = '';
        snapshot.forEach(child => {
            const schedule = child.val();
            container.innerHTML += `
                <div class="schedule-item">
                    <div class="time">${schedule.time}</div>
                    <div class="route-info">
                        <p>Bus ${schedule.busId}</p>
                        <p>${schedule.route}</p>
                    </div>
                    <div class="status ${schedule.status.toLowerCase()}">
                        ${schedule.status}
                    </div>
                </div>
            `;
        });
    });
}

function loadNotifications() {
    const container = document.getElementById('userNotifications');
    database.ref('notices').orderByChild('timestamp').limitToLast(5).on('value', snapshot => {
        container.innerHTML = '';
        const notices = [];
        snapshot.forEach(child => {
            notices.unshift(child.val());
        });
        
        notices.forEach(notice => {
            container.innerHTML += `
                <div class="notification-item">
                    <p>${notice.content}</p>
                    <small>${new Date(notice.timestamp).toLocaleString()}</small>
                </div>
            `;
        });
    });
}

// Utility functions
function getLatestUpdate(busData) {
    const timestamps = Object.keys(busData);
    const latestTimestamp = Math.max(...timestamps);
    return {
        ...busData[latestTimestamp],
        timestamp: parseInt(latestTimestamp)
    };
}

function showOnMap(busId) {
    // Implement map view functionality
    window.location.href = `map.html?bus=${busId}`;
}

function trackRoute(routeId) {
    // Implement route tracking functionality
    window.location.href = `track.html?route=${routeId}`;
} 