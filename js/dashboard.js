// Add these variables at the top
let miniMap = null;
let userMarker = null;
let busMarkers = {};
let isBusLayerVisible = true;

// Initialize Firebase from config.js
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    auth.onAuthStateChanged(user => {
        if (user) {
            initializeMiniMap();
            loadUserData(user.uid);
        } else {
            window.location.href = '../index.html';
        }
    });
});

function loadUserData(userId) {
    loadFavoriteRoutes(userId);
    loadRecentRatings(userId);
    loadTravelHistory(userId);
    loadActivityFeed(userId);
}

function loadFavoriteRoutes(userId) {
    database.ref(`users/${userId}/favorites`).on('value', snapshot => {
        const favorites = snapshot.val() || {};
        const container = document.getElementById('favoriteRoutes');
        container.innerHTML = '';

        Object.entries(favorites).forEach(([routeId, data]) => {
            container.innerHTML += `
                <div class="favorite-route">
                    <h4>Route ${routeId}</h4>
                    <p>${data.from} → ${data.to}</p>
                    <button onclick="trackRoute('${routeId}')">Track</button>
                </div>
            `;
        });
    });
}

function loadRecentRatings(userId) {
    database.ref(`users/${userId}/ratings`).limitToLast(5).on('value', snapshot => {
        const ratings = snapshot.val() || {};
        const container = document.getElementById('recentRatings');
        container.innerHTML = '';

        Object.entries(ratings).forEach(([busId, rating]) => {
            container.innerHTML += `
                <div class="rating-item">
                    <div class="stars">
                        ${'★'.repeat(rating.rating)}${'☆'.repeat(5-rating.rating)}
                    </div>
                    <p>Bus ${busId}</p>
                    <small>${new Date(rating.timestamp).toLocaleDateString()}</small>
                </div>
            `;
        });
    });
}

function loadTravelHistory(userId) {
    database.ref(`users/${userId}/history`).limitToLast(10).on('value', snapshot => {
        const history = snapshot.val() || {};
        const container = document.getElementById('travelHistory');
        container.innerHTML = '';

        Object.entries(history).forEach(([tripId, trip]) => {
            container.innerHTML += `
                <div class="trip-item">
                    <h4>${trip.from} → ${trip.to}</h4>
                    <p>Bus ${trip.busId}</p>
                    <small>${new Date(trip.timestamp).toLocaleString()}</small>
                </div>
            `;
        });
    });
}

function loadActivityFeed(userId) {
    database.ref(`users/${userId}/activity`).limitToLast(20).on('value', snapshot => {
        const activities = snapshot.val() || {};
        const container = document.getElementById('activityFeed');
        container.innerHTML = '';

        Object.entries(activities).reverse().forEach(([id, activity]) => {
            container.innerHTML += `
                <div class="activity-item">
                    <i class="fas ${getActivityIcon(activity.type)}"></i>
                    <div class="activity-content">
                        <p>${activity.message}</p>
                        <small>${new Date(activity.timestamp).toLocaleString()}</small>
                    </div>
                </div>
            `;
        });
    });
}

function getActivityIcon(type) {
    const icons = {
        'rating': 'fa-star',
        'trip': 'fa-bus',
        'search': 'fa-search',
        'favorite': 'fa-heart'
    };
    return icons[type] || 'fa-circle';
}

function logout() {
    auth.signOut().then(() => {
        window.location.href = '../index.html';
    }).catch(error => {
        console.error('Error logging out:', error);
    });
}

function initializeMiniMap() {
    miniMap = L.map('miniMap').setView([28.2096, 83.9856], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
    }).addTo(miniMap);

    // Start tracking buses
    trackBuses();
}

function trackBuses() {
    database.ref('BusLocation').on('value', snapshot => {
        snapshot.forEach(child => {
            const busData = child.val();
            const busId = child.key;
            updateBusMarker(busData, busId);
        });
    });
}

function updateBusMarker(busData, busId) {
    if (!busData) return;
    
    const timestamps = Object.keys(busData);
    if (timestamps.length === 0) return;

    const latestTimestamp = Math.max(...timestamps);
    const location = busData[latestTimestamp];

    if (!location || !location.latitude || !location.longitude) return;

    if (busMarkers[busId]) {
        busMarkers[busId].setLatLng([location.latitude, location.longitude]);
    } else {
        busMarkers[busId] = L.marker([location.latitude, location.longitude], {
            icon: L.divIcon({
                html: '🚌',
                className: 'bus-marker',
                iconSize: [30, 30]
            })
        }).addTo(miniMap);

        busMarkers[busId].bindPopup(`
            <div class="bus-popup">
                <h4>Bus ${busId}</h4>
                <p>Speed: ${location.speed || 0} km/h</p>
                <button onclick="trackBus('${busId}')">Track This Bus</button>
            </div>
        `);
    }
}

function centerOnUser() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const { latitude, longitude } = position.coords;
            miniMap.setView([latitude, longitude], 15);

            if (!userMarker) {
                userMarker = L.marker([latitude, longitude], {
                    icon: L.divIcon({
                        html: '📍',
                        className: 'user-marker',
                        iconSize: [30, 30]
                    })
                }).addTo(miniMap);
            } else {
                userMarker.setLatLng([latitude, longitude]);
            }
        });
    }
}

function toggleBusLayer() {
    isBusLayerVisible = !isBusLayerVisible;
    Object.values(busMarkers).forEach(marker => {
        if (isBusLayerVisible) {
            miniMap.addLayer(marker);
        } else {
            miniMap.removeLayer(marker);
        }
    });
}

function findNearestBus() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;
            let nearestBus = null;
            let shortestDistance = Infinity;

            Object.entries(busMarkers).forEach(([busId, marker]) => {
                const busPos = marker.getLatLng();
                const distance = calculateDistance(
                    { lat: userLat, lng: userLng },
                    { lat: busPos.lat, lng: busPos.lng }
                );

                if (distance < shortestDistance) {
                    shortestDistance = distance;
                    nearestBus = { id: busId, distance };
                }
            });

            if (nearestBus) {
                showNotification(`Nearest bus is Bus ${nearestBus.id} (${Math.round(nearestBus.distance)}m away)`);
                const marker = busMarkers[nearestBus.id];
                miniMap.setView(marker.getLatLng(), 15);
                marker.openPopup();
            }
        });
    }
}

// Add these helper functions
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

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function showFavoriteRoutes() {
    const container = document.getElementById('favoriteRoutes');
    container.parentElement.classList.toggle('fullscreen');
    if (miniMap) {
        setTimeout(() => {
            miniMap.invalidateSize();
        }, 100);
    }
}

function showNotifications() {
    database.ref(`users/${auth.currentUser.uid}/notifications`)
        .limitToLast(10)
        .once('value')
        .then(snapshot => {
            const notifications = snapshot.val() || {};
            showPopup('Notifications', Object.entries(notifications).map(([id, notif]) => `
                <div class="notification-item">
                    <p>${notif.message}</p>
                    <small>${new Date(notif.timestamp).toLocaleString()}</small>
                </div>
            `).join(''));
        });
}

function showPopup(title, content) {
    const popup = document.createElement('div');
    popup.className = 'modal';
    popup.innerHTML = `
        <div class="modal-content">
            <h3>${title}</h3>
            <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
            <div class="modal-body">
                ${content}
            </div>
        </div>
    `;
    document.body.appendChild(popup);
}

// Add full map functionality
function toggleFullMap() {
    const mapCard = document.querySelector('.map-card');
    const dashboardContent = document.querySelector('.dashboard-content');
    
    if (mapCard.classList.contains('fullscreen')) {
        // Return to normal view
        mapCard.classList.remove('fullscreen');
        dashboardContent.style.display = 'block';
        if (miniMap) {
            setTimeout(() => {
                miniMap.invalidateSize();
            }, 100);
        }
    } else {
        // Switch to full map view
        mapCard.classList.add('fullscreen');
        dashboardContent.style.display = 'none';
        loadFullMapFeatures();
    }
}

function loadFullMapFeatures() {
    if (!miniMap) return;

    // Add search control
    const searchControl = L.control({ position: 'topleft' });
    searchControl.onAdd = function() {
        const div = L.DomUtil.create('div', 'search-control');
        div.innerHTML = `
            <input type="text" id="map-search" placeholder="Search location...">
            <div id="search-results" class="search-results"></div>
        `;
        return div;
    };
    searchControl.addTo(miniMap);

    // Add bus filter control
    const filterControl = L.control({ position: 'topright' });
    filterControl.onAdd = function() {
        const div = L.DomUtil.create('div', 'filter-control');
        div.innerHTML = `
            <select id="bus-filter" multiple>
                <option value="all" selected>All Buses</option>
            </select>
        `;
        return div;
    };
    filterControl.addTo(miniMap);

    // Add route planning control
    const routeControl = L.control({ position: 'topleft' });
    routeControl.onAdd = function() {
        const div = L.DomUtil.create('div', 'route-control');
        div.innerHTML = `
            <div class="route-inputs">
                <input type="text" id="from-location" placeholder="From...">
                <input type="text" id="to-location" placeholder="To...">
                <button onclick="planRoute()">Find Route</button>
            </div>
        `;
        return div;
    };
    routeControl.addTo(miniMap);

    // Add bus information panel
    const infoPanel = L.control({ position: 'bottomright' });
    infoPanel.onAdd = function() {
        const div = L.DomUtil.create('div', 'info-panel');
        div.innerHTML = `
            <div class="bus-info">
                <h3>Bus Information</h3>
                <div id="selected-bus-info"></div>
            </div>
        `;
        return div;
    };
    infoPanel.addTo(miniMap);

    // Initialize real-time bus tracking
    initializeRealtimeTracking();
}

function initializeRealtimeTracking() {
    database.ref('BusLocation').on('value', snapshot => {
        const buses = snapshot.val() || {};
        updateBusMarkers(buses);
        updateBusFilter(Object.keys(buses));
    });
}

function updateBusMarkers(buses) {
    Object.entries(buses).forEach(([busId, data]) => {
        const latestLocation = getLatestBusLocation(data);
        if (!latestLocation) return;

        const marker = busMarkers[busId] || createBusMarker(busId, latestLocation);
        marker.setLatLng([latestLocation.latitude, latestLocation.longitude]);
        updateBusInfo(busId, latestLocation);
    });
}

function createBusMarker(busId, location) {
    const marker = L.marker([location.latitude, location.longitude], {
        icon: L.divIcon({
            html: `<div class="bus-marker" data-bus-id="${busId}">🚌</div>`,
            className: 'bus-marker-container',
            iconSize: [40, 40]
        })
    });

    marker.bindPopup(createBusPopup(busId, location));
    marker.addTo(miniMap);
    busMarkers[busId] = marker;

    return marker;
}

function createBusPopup(busId, location) {
    return `
        <div class="bus-popup">
            <h4>Bus ${busId}</h4>
            <p>Speed: ${location.speed || 0} km/h</p>
            <p>Last Updated: ${new Date(location.timestamp).toLocaleString()}</p>
            <div class="popup-actions">
                <button onclick="trackBus('${busId}')">Track</button>
                <button onclick="showBusSchedule('${busId}')">Schedule</button>
                <button onclick="rateBus('${busId}')">Rate</button>
            </div>
        </div>
    `;
}

function updateBusInfo(busId, location) {
    const infoDiv = document.getElementById('selected-bus-info');
    if (!infoDiv) return;

    database.ref(`buses/${busId}`).once('value').then(snapshot => {
        const busDetails = snapshot.val() || {};
        infoDiv.innerHTML = `
            <div class="bus-details">
                <h4>Bus ${busId}</h4>
                <p>Route: ${busDetails.route || 'N/A'}</p>
                <p>Speed: ${location.speed || 0} km/h</p>
                <p>Status: ${busDetails.status || 'Active'}</p>
                <p>Next Stop: ${busDetails.nextStop || 'N/A'}</p>
                <p>Capacity: ${busDetails.capacity || 'N/A'}</p>
                <div class="bus-actions">
                    <button onclick="showBusDetails('${busId}')">More Info</button>
                    <button onclick="reportIssue('${busId}')">Report Issue</button>
                </div>
            </div>
        `;
    });
}

function trackBus(busId) {
    if (!navigator.geolocation) {
        showNotification('Geolocation is not supported by your browser');
        return;
    }

    navigator.geolocation.getCurrentPosition(
        position => {
            const userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            
            const busMarker = busMarkers[busId];
            if (!busMarker) return;

            const busLocation = busMarker.getLatLng();
            
            // Show route on map
            showRouteToBus(userLocation, busLocation, busId);
            
            // Update tracking status
            updateTrackingStatus(busId, userLocation, busLocation);
        },
        error => {
            showLocationRequestModal(busId);
        }
    );
}

function showLocationRequestModal(busId) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>Location Access Required</h3>
            <p>To track the bus, we need your location. Please:</p>
            <ol>
                <li>Enter your location manually</li>
                <li>Or allow location access in your browser</li>
            </ol>
            <div class="location-input">
                <input type="text" id="user-location" placeholder="Enter your location...">
                <button onclick="searchLocation(this.previousElementSibling.value, '${busId}')">
                    Search
                </button>
            </div>
            <div class="modal-actions">
                <button onclick="requestLocationPermission('${busId}')">
                    Allow Location Access
                </button>
                <button onclick="this.closest('.modal').remove()">
                    Cancel
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function showRouteToBus(userLocation, busLocation, busId) {
    // Clear existing route
    if (window.currentRoute) {
        miniMap.removeLayer(window.currentRoute);
    }

    // Add user marker
    if (userMarker) {
        userMarker.setLatLng([userLocation.lat, userLocation.lng]);
    } else {
        userMarker = L.marker([userLocation.lat, userLocation.lng], {
            icon: L.divIcon({
                html: '📍',
                className: 'user-marker',
                iconSize: [30, 30]
            })
        }).addTo(miniMap);
    }

    // Get route using OSRM
    const url = `https://router.project-osrm.org/route/v1/driving/${userLocation.lng},${userLocation.lat};${busLocation.lng},${busLocation.lat}?overview=full&geometries=geojson`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.routes && data.routes[0]) {
                window.currentRoute = L.geoJSON(data.routes[0].geometry, {
                    style: {
                        color: '#007bff',
                        weight: 6,
                        opacity: 0.6
                    }
                }).addTo(miniMap);

                // Fit map to show both points
                miniMap.fitBounds(window.currentRoute.getBounds(), {
                    padding: [50, 50]
                });
            }
        });
}

function showBusDetails(busId) {
    Promise.all([
        database.ref(`buses/${busId}`).once('value'),
        database.ref(`drivers/${busId}`).once('value'),
        database.ref(`ratings/${busId}`).orderByChild('timestamp').limitToLast(5).once('value'),
        database.ref(`feedback/${busId}`).orderByChild('timestamp').limitToLast(5).once('value')
    ]).then(([busSnapshot, driverSnapshot, ratingsSnapshot, feedbackSnapshot]) => {
        const busDetails = busSnapshot.val() || {};
        const driverDetails = driverSnapshot.val() || {};
        const ratings = ratingsSnapshot.val() || {};
        const feedback = feedbackSnapshot.val() || {};

        const modal = document.createElement('div');
        modal.className = 'modal bus-details-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                
                <!-- Slideshow Section -->
                <div class="bus-slideshow">
                    <div class="slideshow-container">
                        <div class="slide">
                            <img src="${busDetails.images?.[0] || '../img/default-bus.jpg'}" alt="Bus Image">
                            <div class="slide-caption">Bus ${busId}</div>
                        </div>
                        <div class="slide">
                            <img src="${driverDetails.image || '../img/default-driver.jpg'}" alt="Driver Image">
                            <div class="slide-caption">Driver: ${driverDetails.name}</div>
                        </div>
                        <div class="slide">
                            <img src="${busDetails.routeMap || '../img/default-route.jpg'}" alt="Route Map">
                            <div class="slide-caption">Route Map</div>
                        </div>
                        <button class="prev" onclick="changeSlide(-1)">❮</button>
                        <button class="next" onclick="changeSlide(1)">❯</button>
                    </div>
                    <div class="slideshow-dots"></div>
                </div>

                <!-- Bus and Driver Details -->
                <div class="details-grid">
                    <div class="detail-section">
                        <h4>Bus Information</h4>
                        <p>Route: ${busDetails.route || 'N/A'}</p>
                        <p>Capacity: ${busDetails.capacity || 'N/A'}</p>
                        <p>Status: ${busDetails.status || 'Active'}</p>
                        <p>License: ${busDetails.license || 'N/A'}</p>
                    </div>

                    <div class="detail-section driver-profile">
                        <h4>Driver Profile</h4>
                        <div class="driver-info">
                            <img src="${driverDetails.image || '../img/default-driver.jpg'}" alt="Driver">
                            <div>
                                <p>Name: ${driverDetails.name || 'N/A'}</p>
                                <p>Experience: ${driverDetails.experience || 'N/A'}</p>
                                <p>Rating: ${calculateAverageRating(ratings)} ⭐</p>
                                <p>License: ${driverDetails.license || 'N/A'}</p>
                            </div>
                        </div>
                    </div>

                    <div class="detail-section">
                        <h4>Schedule</h4>
                        <div class="schedule-list">
                            ${generateScheduleHTML(busDetails.schedule)}
                        </div>
                    </div>

                    <div class="detail-section">
                        <h4>Recent Feedback</h4>
                        <div class="feedback-list">
                            ${generateFeedbackHTML(feedback)}
                        </div>
                        <button onclick="giveFeedback('${busId}')" class="feedback-btn">
                            Give Feedback
                        </button>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="bus-detail-actions">
                    <button onclick="trackBus('${busId}')">
                        <i class="fas fa-location-arrow"></i> Track
                    </button>
                    <button onclick="rateBus('${busId}')">
                        <i class="fas fa-star"></i> Rate
                    </button>
                    <button onclick="reportIssue('${busId}')">
                        <i class="fas fa-exclamation-triangle"></i> Report
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        initializeSlideshow();
    });
}

// Helper functions for the slideshow
let slideIndex = 1;

function initializeSlideshow() {
    showSlides(slideIndex);
    // Add dots
    const dots = document.querySelector('.slideshow-dots');
    const slides = document.querySelectorAll('.slide');
    slides.forEach((_, index) => {
        const dot = document.createElement('span');
        dot.className = 'dot';
        dot.onclick = () => currentSlide(index + 1);
        dots.appendChild(dot);
    });
}

function changeSlide(n) {
    showSlides(slideIndex += n);
}

function currentSlide(n) {
    showSlides(slideIndex = n);
}

function showSlides(n) {
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.dot');
    
    if (n > slides.length) slideIndex = 1;
    if (n < 1) slideIndex = slides.length;

    slides.forEach(slide => slide.style.display = 'none');
    dots.forEach(dot => dot.classList.remove('active'));

    slides[slideIndex - 1].style.display = 'block';
    dots[slideIndex - 1].classList.add('active');
}

// Feedback and Rating Functions
function giveFeedback(busId) {
    const modal = document.createElement('div');
    modal.className = 'modal feedback-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            <h3>Give Feedback</h3>
            <form onsubmit="submitFeedback(event, '${busId}')">
                <div class="rating-stars">
                    ${generateStarRating()}
                </div>
                <textarea placeholder="Your feedback..." required></textarea>
                <button type="submit">Submit Feedback</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
}

function submitFeedback(event, busId) {
    event.preventDefault();
    const form = event.target;
    const rating = parseInt(form.querySelector('.rating-stars').dataset.rating);
    const feedback = form.querySelector('textarea').value;

    const feedbackData = {
        rating,
        feedback,
        userId: auth.currentUser.uid,
        timestamp: Date.now()
    };

    database.ref(`feedback/${busId}`).push(feedbackData)
        .then(() => {
            showNotification('Feedback submitted successfully');
            form.closest('.modal').remove();
        })
        .catch(error => {
            console.error('Error submitting feedback:', error);
            showNotification('Failed to submit feedback', 'error');
        });
}

// Add notice functionality
function loadNotices() {
    database.ref('notices').orderByChild('timestamp').limitToLast(5)
        .on('value', snapshot => {
            const notices = snapshot.val() || {};
            const noticesDiv = document.getElementById('notices');
            noticesDiv.innerHTML = '';

            Object.entries(notices).reverse().forEach(([id, notice]) => {
                const noticeElement = document.createElement('div');
                noticeElement.className = 'notice-item';
                noticeElement.innerHTML = `
                    <div class="notice-content">
                        <h4>${notice.title}</h4>
                        <p>${notice.message}</p>
                        <small>${new Date(notice.timestamp).toLocaleString()}</small>
                    </div>
                `;
                noticesDiv.appendChild(noticeElement);
            });
        });
}

function toggleNotices() {
    const container = document.getElementById('notice-container');
    container.classList.toggle('collapsed');
} 