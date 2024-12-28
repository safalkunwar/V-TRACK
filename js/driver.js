// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const database = firebase.database();
let driverId = null;

// Check authentication
auth.onAuthStateChanged(user => {
    if (user) {
        driverId = user.uid;
        loadDriverData();
    } else {
        window.location.href = '../index.html';
    }
});

function loadDriverData() {
    // Load driver stats
    loadStats();
    // Load ratings
    loadRatings();
    // Load route
    loadRoute();
    // Load alerts
    loadAlerts();
}

function showSection(sectionId) {
    document.querySelectorAll('.dashboard-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(sectionId).classList.add('active');
    
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.classList.remove('active');
    });
    event.currentTarget.classList.add('active');
}

function loadStats() {
    if (!driverId) return;

    database.ref(`drivers/${driverId}`).on('value', snapshot => {
        const driverData = snapshot.val() || {};
        const stats = driverData.stats || {};
        const status = driverData.status || 'inactive';

        document.getElementById('avgRating').textContent = 
            stats.averageRating?.toFixed(1) || '0.0';
        document.getElementById('distanceToday').textContent = 
            `${stats.distanceToday?.toFixed(1) || '0'} km`;
        document.getElementById('hoursActive').textContent = 
            `${stats.hoursActive || '0'}h`;
        
        const statusIndicator = document.getElementById('statusIndicator');
        statusIndicator.className = `status-${status}`;
        statusIndicator.querySelector('span').textContent = 
            status.charAt(0).toUpperCase() + status.slice(1);
    });
}

function loadRatings() {
    if (!driverId) return;

    database.ref(`ratings/${driverId}`).orderByChild('timestamp').limitToLast(10)
        .on('value', snapshot => {
            const container = document.getElementById('ratingsContainer');
            container.innerHTML = '';
            
            const ratings = [];
            snapshot.forEach(child => {
                ratings.unshift(child.val());
            });
            
            ratings.forEach(rating => {
                container.innerHTML += `
                    <div class="rating-card">
                        <div class="rating-stars">
                            ${'★'.repeat(rating.rating)}${'☆'.repeat(5-rating.rating)}
                        </div>
                        <p>${rating.comment || 'No comment provided'}</p>
                        <small>${new Date(rating.timestamp).toLocaleString()}</small>
                    </div>
                `;
            });
            
            if (ratings.length === 0) {
                container.innerHTML = '<p>No ratings yet</p>';
            }
        });
}

function loadRoute() {
    if (!driverId) return;

    // Initialize route map
    const routeMap = L.map('routeMap').setView([28.2096, 83.9856], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(routeMap);

    // Load and display route
    database.ref(`routes/${driverId}/current`).on('value', snapshot => {
        const routeData = snapshot.val();
        if (routeData) {
            // Display route on map
            displayRoute(routeMap, routeData);
        }
    });
}

function loadAlerts() {
    if (!driverId) return;

    database.ref(`alerts/${driverId}`).orderByChild('timestamp').limitToLast(10)
        .on('value', snapshot => {
            const container = document.getElementById('alertsContainer');
            container.innerHTML = '';
            
            const alerts = [];
            snapshot.forEach(child => {
                alerts.unshift(child.val());
            });
            
            alerts.forEach(alert => {
                container.innerHTML += `
                    <div class="alert-card ${alert.type}">
                        <h4>${alert.title}</h4>
                        <p>${alert.message}</p>
                        <small>${new Date(alert.timestamp).toLocaleString()}</small>
                    </div>
                `;
            });
            
            if (alerts.length === 0) {
                container.innerHTML = '<p>No alerts</p>';
            }
        });
}

function logout() {
    auth.signOut().then(() => {
        window.location.href = '../index.html';
    }).catch(error => {
        console.error('Error logging out:', error);
    });
}

function startTrackingSession() {
    window.location.href = '../driver/tracking.html';
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    showSection('overview');
}); 