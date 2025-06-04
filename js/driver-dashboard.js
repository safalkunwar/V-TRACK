// Initialize Firebase and check authentication
let driverId = null;
let routeMap = null;

document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(user => {
        if (user) {
            driverId = user.uid;
            initializeDriverDashboard();
        } else {
            window.location.href = '../index.html';
        }
    });
});

function initializeDriverDashboard() {
    loadDriverProfile();
    initializeRouteMap();
    loadStats();
    loadFeedback();
}

function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.dashboard-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(`${sectionId}-section`).classList.add('active');
    
    // Update navigation
    document.querySelectorAll('.nav-right a').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`.nav-right a[onclick*="${sectionId}"]`).classList.add('active');
}

function loadDriverProfile() {
    // First get the driver's bus assignment from driverInfo
    database.ref('driverInfo').orderByChild('email').equalTo(auth.currentUser.email)
        .once('value')
        .then(snapshot => {
            const driverData = Object.values(snapshot.val() || {})[0];
            if (!driverData) return;

            // Store driver ID for other functions
            driverId = driverData.id || auth.currentUser.uid;

            // Now get bus details
            return database.ref('busDetails').orderByChild('driverName')
                .equalTo(driverData.name || driverData.fullName)
                .once('value');
        })
        .then(busSnapshot => {
            const busData = Object.values(busSnapshot.val() || {})[0];
            
            // Update profile information
            document.getElementById('driver-name').textContent = busData.driverName || 'N/A';
            document.getElementById('driver-id').textContent = `ID: ${driverId}`;
            document.getElementById('driver-license').textContent = busData.driverNum || 'N/A';
            document.getElementById('assigned-bus').textContent = busData.busNumber || 'N/A';
            
            // Store bus ID for route tracking
            window.assignedBusId = busData.busName;

            // Update additional details
            document.getElementById('route-name').textContent = busData.busRoute || 'N/A';
            
            // Load current location and stats
            initializeLocationTracking(busData.busName);
            loadBusStats(busData.busName);
        });
}

function loadDriverRating(driverId) {
    database.ref(`ratings/${driverId}`).once('value')
        .then(snapshot => {
            const ratings = snapshot.val() || {};
            const ratingValues = Object.values(ratings).map(r => r.rating);
            const averageRating = ratingValues.length > 0 
                ? (ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length).toFixed(1)
                : 'N/A';
            
            document.getElementById('driver-rating').innerHTML = 
                `${averageRating} <i class="fas fa-star" style="color: #ffc107;"></i>`;
        });
}

function initializeRouteMap() {
    if (!routeMap) {
        routeMap = L.map('route-map').setView([28.2096, 83.9856], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap'
        }).addTo(routeMap);
    }

    // Load and display route
    loadCurrentRoute();
}

function loadCurrentRoute() {
    if (!window.assignedBusId) return;

    database.ref(`busDetails`).orderByChild('busName').equalTo(window.assignedBusId)
        .once('value')
        .then(snapshot => {
            const busData = Object.values(snapshot.val() || {})[0];
            if (busData && busData.busRoute) {
                const routePoints = parseRouteString(busData.busRoute);
                displayRoute(routePoints);
                updateRouteDetails(busData);
            }
        });
}

function displayRoute(routeData) {
    // Clear existing route
    if (window.currentRouteLayer) {
        routeMap.removeLayer(window.currentRouteLayer);
    }

    // Draw new route
    const routeCoordinates = routeData.coordinates.map(coord => [coord.lat, coord.lng]);
    window.currentRouteLayer = L.polyline(routeCoordinates, {
        color: '#007bff',
        weight: 5
    }).addTo(routeMap);

    // Add stops
    routeData.stops.forEach(stop => {
        L.marker([stop.lat, stop.lng], {
            icon: L.divIcon({
                html: '<i class="fas fa-bus" style="color: #007bff;"></i>',
                className: 'bus-stop-marker',
                iconSize: [20, 20]
            })
        })
        .bindPopup(`<b>${stop.name}</b><br>Scheduled: ${stop.time}`)
        .addTo(routeMap);
    });

    // Fit map to route
    routeMap.fitBounds(window.currentRouteLayer.getBounds());
}

function updateRouteDetails(routeData) {
    const detailsContainer = document.getElementById('route-details');
    detailsContainer.innerHTML = `
        <div class="route-info-item">
            <h4>${routeData.name}</h4>
            <p>Start: ${routeData.startTime}</p>
            <p>End: ${routeData.endTime}</p>
        </div>
        <div class="stops-list">
            <h4>Stops</h4>
            ${routeData.stops.map(stop => `
                <div class="stop-item">
                    <i class="fas fa-circle"></i>
                    <div>
                        <p>${stop.name}</p>
                        <small>${stop.time}</small>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function loadStats() {
    const statsContainer = document.querySelector('.stats-grid');
    
    // Load various statistics from Firebase
    Promise.all([
        database.ref(`drivers/${driverId}/stats/trips`).once('value'),
        database.ref(`drivers/${driverId}/stats/distance`).once('value'),
        database.ref(`drivers/${driverId}/stats/passengers`).once('value'),
        database.ref(`drivers/${driverId}/stats/rating`).once('value')
    ]).then(([trips, distance, passengers, rating]) => {
        statsContainer.innerHTML = `
            <div class="stat-card">
                <i class="fas fa-route"></i>
                <h3>Total Trips</h3>
                <p>${trips.val() || 0}</p>
            </div>
            <div class="stat-card">
                <i class="fas fa-road"></i>
                <h3>Distance Covered</h3>
                <p>${Math.round(distance.val() || 0)} km</p>
            </div>
            <div class="stat-card">
                <i class="fas fa-users"></i>
                <h3>Passengers Served</h3>
                <p>${passengers.val() || 0}</p>
            </div>
            <div class="stat-card">
                <i class="fas fa-star"></i>
                <h3>Average Rating</h3>
                <p>${(rating.val() || 0).toFixed(1)}</p>
            </div>
        `;
    });
}

function loadFeedback() {
    const feedbackContainer = document.querySelector('.feedback-container');
    
    database.ref(`feedback/${driverId}`).orderByChild('timestamp').limitToLast(10)
        .once('value')
        .then(snapshot => {
            const feedback = snapshot.val() || {};
            
            feedbackContainer.innerHTML = `
                <h3>Recent Feedback</h3>
                <div class="feedback-list">
                    ${Object.entries(feedback).reverse().map(([id, data]) => `
                        <div class="feedback-item">
                            <div class="rating">
                                ${'★'.repeat(data.rating)}${'☆'.repeat(5-data.rating)}
                            </div>
                            <p>${data.feedback}</p>
                            <small>${new Date(data.timestamp).toLocaleString()}</small>
                        </div>
                    `).join('')}
                </div>
            `;
        });
}

function logout() {
    auth.signOut().then(() => {
        window.location.href = '../index.html';
    }).catch(error => {
        console.error('Error logging out:', error);
    });
}

// Add function to track real-time location
function initializeLocationTracking(busId) {
    database.ref(`BusLocation/${busId}`).on('value', snapshot => {
        const locationData = snapshot.val();
        if (!locationData) return;

        // Get latest location
        const timestamps = Object.keys(locationData);
        const latestTimestamp = Math.max(...timestamps);
        const latestLocation = locationData[latestTimestamp];

        if (latestLocation && latestLocation.latitude && latestLocation.longitude) {
            updateDriverLocation(latestLocation);
        }
    });
}

function updateDriverLocation(location) {
    if (!routeMap) return;

    // Update driver marker
    if (window.driverMarker) {
        window.driverMarker.setLatLng([location.latitude, location.longitude]);
    } else {
        window.driverMarker = L.marker([location.latitude, location.longitude], {
            icon: L.divIcon({
                html: '<i class="fas fa-bus"></i>',
                className: 'driver-marker',
                iconSize: [30, 30]
            })
        }).addTo(routeMap);
    }

    // Center map on driver location
    routeMap.setView([location.latitude, location.longitude], 15);
}

// Update loadStats function to use correct data structure
function loadBusStats(busId) {
    const statsContainer = document.querySelector('.stats-grid');
    
    // Get bus details for stats
    database.ref(`busDetails`).orderByChild('busName').equalTo(busId)
        .once('value')
        .then(snapshot => {
            const busData = Object.values(snapshot.val() || {})[0];
            
            statsContainer.innerHTML = `
                <div class="stat-card">
                    <i class="fas fa-route"></i>
                    <h3>Route</h3>
                    <p>${busData.busRoute || 'N/A'}</p>
                </div>
                <div class="stat-card">
                    <i class="fas fa-bus"></i>
                    <h3>Bus Number</h3>
                    <p>${busData.busNumber || 'N/A'}</p>
                </div>
                <div class="stat-card">
                    <i class="fas fa-star"></i>
                    <h3>Rating</h3>
                    <p>${busData.averageRating || '0.0'}</p>
                </div>
                <div class="stat-card">
                    <i class="fas fa-info-circle"></i>
                    <h3>Status</h3>
                    <p id="bus-status">Active</p>
                </div>
            `;
        });
}

// Add real-time status update function
function updateBusStatus(status) {
    const statusElement = document.getElementById('bus-status');
    if (statusElement) {
        statusElement.textContent = status;
        statusElement.className = `status-${status.toLowerCase()}`;
    }
}

function parseRouteString(routeString) {
    // Split route string into stops
    const stops = routeString.split(' - ').map(stop => ({
        name: stop,
        // You might want to add actual coordinates for each stop
        // This is just a placeholder
        coordinates: getDefaultCoordinatesForStop(stop)
    }));

    return {
        name: routeString,
        stops: stops,
        startTime: '6:00 AM', // Default values
        endTime: '8:00 PM'
    };
}

// Add this helper function
function getDefaultCoordinatesForStop(stopName) {
    // You should replace these with actual coordinates for each stop
    // This is just a placeholder
    return {
        lat: 28.2096,
        lng: 83.9856
    };
} 