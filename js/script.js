// Global variables
let map = null;
let markers = null;
let busMarkers = {};
let placeMarkerMode = false;
let customMarker = null;
let alertMarkers = {};
let activeAlerts = {};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        initMap();
        setupEventListeners();
        loadBusLocations();
        
        // Request notification permission
        if (Notification.permission !== 'granted') {
            Notification.requestPermission();
        }
        
        // Load existing alert markers if user is logged in
        auth.onAuthStateChanged(user => {
            if (user) {
                loadAlertMarkers();
            }
        });
    } catch (error) {
        console.error('Error initializing:', error);
        showNotification('Error initializing application', 'error');
    }
});

function initMap() {
    // Create map
    map = L.map('map').setView([28.2096, 83.9856], 13);

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Initialize marker cluster group
    markers = L.markerClusterGroup();
    map.addLayer(markers);
}

function setupEventListeners() {
    // Only add event listeners if elements exist
    const ratingBtn = document.querySelector('.rating-btn');
    if (ratingBtn) {
        ratingBtn.addEventListener('click', showRatingModal);
    }

    const searchForm = document.getElementById('search-form');
    if (searchForm) {
        searchForm.addEventListener('submit', handleSearchSubmit);
    }
}

function updateBusMarker(busData, busId) {
    try {
        // Get latest location data
        const latestLocation = getLatestBusLocation(busData);
        if (!latestLocation) return;

        // Create or update marker
        if (!busMarkers[busId]) {
            busMarkers[busId] = L.marker([latestLocation.latitude, latestLocation.longitude], {
                icon: L.divIcon({
                    html: '🚌',
                    className: 'bus-marker',
                    iconSize: [30, 30]
                })
            });
            markers.addLayer(busMarkers[busId]);
        } else {
            busMarkers[busId].setLatLng([latestLocation.latitude, latestLocation.longitude]);
        }

        // Update popup content
        busMarkers[busId].bindPopup(createBusPopupContent(busId, latestLocation));
    } catch (error) {
        console.error(`Error updating bus marker for ${busId}:`, error);
    }
}

function getLatestBusLocation(busData) {
    if (!busData) return null;
    
    try {
        const timestamps = Object.keys(busData)
            .filter(key => {
                const data = busData[key];
                return data && (
                    (data.latitude && data.longitude) || 
                    (data.coordinates && data.coordinates.latitude && data.coordinates.longitude)
                );
            });
        
        if (timestamps.length === 0) return null;
        
        const latestTimestamp = Math.max(...timestamps);
        const latestData = busData[latestTimestamp];
        
        // Handle both old and new data structures
        return {
            latitude: latestData.latitude || latestData.coordinates?.latitude,
            longitude: latestData.longitude || latestData.coordinates?.longitude,
            speed: latestData.speed || 0,
            timestamp: parseInt(latestTimestamp)
        };
    } catch (error) {
        console.error('Error getting latest location:', error);
        return null;
    }
}

function showRatingModal(busId = null) {
    if (!auth.currentUser) {
        showNotification('Please log in to rate buses', 'error');
        return;
    }

    if (!busId) {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(position => {
                findNearbyBusForRating({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
            }, error => {
                console.error('Location error:', error);
                showBusSelectionForRating();
            });
        } else {
            showBusSelectionForRating();
        }
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            <h3>Rate Bus ${busId}</h3>
            <div class="rating-container">
                <div class="rating-scale">
                    ${generateRatingScale()}
                </div>
                <textarea id="ratingComment" placeholder="Your feedback (optional)"></textarea>
                <button onclick="submitRating('${busId}')" class="submit-rating">Submit Rating</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    initializeRatingListeners();
}

// Make functions globally available
window.showRatingModal = showRatingModal;
window.submitRating = submitRating;

function loadBusLocations() {
    database.ref('BusLocation').on('value', snapshot => {
        try {
            markers.clearLayers();
            snapshot.forEach(child => {
                const busId = child.key;
                const busData = child.val();
                updateBusMarker(busData, busId);
            });
        } catch (error) {
            console.error('Error loading bus locations:', error);
            showNotification('Error loading bus locations', 'error');
        }
    });
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function generateRatingScale() {
    let html = '<div class="rating-numbers">';
    for (let i = 1; i <= 10; i++) {
        html += `
            <div class="rating-number" data-rating="${i}">
                <span>${i}</span>
            </div>
        `;
    }
    html += '</div>';
    return html;
}

function findNearbyBusForRating(userLocation) {
    let nearbyBusFound = false;
    
    database.ref('BusLocation').once('value')
        .then(snapshot => {
            snapshot.forEach(child => {
                const busData = child.val();
                const latestLocation = getLatestBusLocation(busData);
                
                if (latestLocation) {
                    const distance = calculateDistance(
                        userLocation,
                        { lat: latestLocation.latitude, lng: latestLocation.longitude }
                    );
                    
                    if (distance <= 100) { // Within 100 meters
                        nearbyBusFound = true;
                        showRatingModal(child.key);
                    }
                }
            });
            
            if (!nearbyBusFound) {
                showBusSelectionForRating();
            }
        })
        .catch(error => {
            console.error('Error finding nearby buses:', error);
            showBusSelectionForRating();
        });
}

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

function submitRating(busId) {
    const selectedRating = document.querySelector('.rating-number.selected');
    const comment = document.getElementById('ratingComment').value;

    if (!selectedRating) {
        showNotification('Please select a rating', 'error');
        return;
    }

    const ratingData = {
        rating: parseInt(selectedRating.dataset.rating),
        comment: comment,
        timestamp: Date.now(),
        userId: auth.currentUser.uid,
        busId: busId
    };

    database.ref(`ratings/${busId}`).push(ratingData)
        .then(() => {
            showNotification('Rating submitted successfully');
            document.querySelector('.modal').remove();
            updateBusAverageRating(busId);
        })
        .catch(error => {
            console.error('Error submitting rating:', error);
            showNotification('Failed to submit rating', 'error');
        });
}

function updateBusAverageRating(busId) {
    database.ref(`ratings/${busId}`).once('value')
        .then(snapshot => {
            let total = 0;
            let count = 0;
            
            snapshot.forEach(child => {
                total += child.val().rating;
                count++;
            });

            const average = count > 0 ? (total / count).toFixed(1) : '0.0';
            return database.ref(`busDetails/${busId}/averageRating`).set(average);
        })
        .catch(error => {
            console.error('Error updating average rating:', error);
        });
}

function togglePlaceMarker() {
    const markerBtn = document.querySelector('.control-btn.marker');
    if (!markerBtn) return;

    placeMarkerMode = !placeMarkerMode;
    
    if (placeMarkerMode) {
        markerBtn.classList.add('active');
        showNotification('Click on the map to place a marker', 'info');
        map.on('click', handleMapClick);
    } else {
        markerBtn.classList.remove('active');
        map.off('click', handleMapClick);
    }
}

function handleMapClick(e) {
    if (!placeMarkerMode) return;

    const { lat, lng } = e.latlng;
    
    // Create marker with alert radius
    const alertMarker = L.marker([lat, lng], {
        icon: L.divIcon({
            html: '<i class="fas fa-exclamation-triangle alert-marker"></i>',
            className: 'alert-marker-container',
            iconSize: [30, 30]
        })
    });

    // Add circle to show alert radius
    const alertRadius = L.circle([lat, lng], {
        radius: 100, // 100 meters radius
        color: '#dc3545',
        fillColor: '#dc3545',
        fillOpacity: 0.2
    });

    // Add to map
    alertMarker.addTo(map);
    alertRadius.addTo(map);

    // Save marker data
    saveAlertMarker(lat, lng, alertMarker, alertRadius);
    
    // Disable marker placement mode
    togglePlaceMarker();
}

function saveAlertMarker(lat, lng, marker, circle) {
    if (!auth.currentUser) {
        showNotification('Please log in to set alerts', 'error');
        return;
    }

    const alertData = {
        latitude: lat,
        longitude: lng,
        userId: auth.currentUser.uid,
        timestamp: Date.now(),
        active: true
    };

    database.ref('alerts').push(alertData)
        .then((ref) => {
            const alertId = ref.key;
            alertMarkers[alertId] = {
                marker: marker,
                circle: circle,
                data: alertData
            };
            showNotification('Alert marker placed successfully');
            
            // Start monitoring buses for this alert
            startAlertMonitoring(alertId, lat, lng);
        })
        .catch(error => {
            console.error('Error saving alert:', error);
            showNotification('Failed to save alert', 'error');
            map.removeLayer(marker);
            map.removeLayer(circle);
        });
}

function startAlertMonitoring(alertId, alertLat, alertLng) {
    // Monitor bus locations
    database.ref('BusLocation').on('value', snapshot => {
        snapshot.forEach(child => {
            const busId = child.key;
            const busData = child.val();
            const latestLocation = getLatestBusLocation(busData);
            
            if (latestLocation) {
                const distance = calculateDistance(
                    { lat: alertLat, lng: alertLng },
                    { lat: latestLocation.latitude, lng: latestLocation.longitude }
                );

                // Check if bus is within 100 meters of alert
                if (distance <= 100) {
                    if (!activeAlerts[`${alertId}-${busId}`]) {
                        notifyBusNearAlert(busId, alertId);
                        activeAlerts[`${alertId}-${busId}`] = true;
                    }
                } else {
                    // Reset alert when bus leaves the area
                    delete activeAlerts[`${alertId}-${busId}`];
                }
            }
        });
    });
}

function notifyBusNearAlert(busId, alertId) {
    // Create notification
    const notification = new Notification('Bus Alert', {
        body: `Bus ${busId} is near your alert location!`,
        icon: '../img/vlogo.png'
    });

    // Show in-app notification
    showNotification(`Bus ${busId} is near your alert location!`, 'warning');

    // Play alert sound
    playAlertSound();
}

function playAlertSound() {
    const audio = new Audio('../audio/alert.mp3');
    audio.play().catch(error => console.error('Error playing sound:', error));
}

// Load existing alert markers
function loadAlertMarkers() {
    database.ref('alerts').once('value')
        .then(snapshot => {
            snapshot.forEach(child => {
                const alertData = child.val();
                if (alertData.active && alertData.userId === auth.currentUser?.uid) {
                    const marker = L.marker([alertData.latitude, alertData.longitude], {
                        icon: L.divIcon({
                            html: '<i class="fas fa-exclamation-triangle alert-marker"></i>',
                            className: 'alert-marker-container',
                            iconSize: [30, 30]
                        })
    }).addTo(map);

                    const circle = L.circle([alertData.latitude, alertData.longitude], {
                        radius: 100,
                        color: '#dc3545',
                        fillColor: '#dc3545',
                        fillOpacity: 0.2
                    }).addTo(map);

                    alertMarkers[child.key] = {
                        marker: marker,
                        circle: circle,
                        data: alertData
                    };

                    startAlertMonitoring(child.key, alertData.latitude, alertData.longitude);
                }
            });
        });
}

// Initialize rating listeners
function initializeRatingListeners() {
    document.querySelectorAll('.rating-number').forEach(number => {
        number.addEventListener('click', () => {
            document.querySelectorAll('.rating-number').forEach(n => n.classList.remove('selected'));
            number.classList.add('selected');
        });
    });
}

// Make additional functions globally available
window.togglePlaceMarker = togglePlaceMarker;
window.handleMapClick = handleMapClick;
window.showNotification = showNotification;

// Add createBusPopupContent function
function createBusPopupContent(busId, location) {
    return `
        <div class="bus-popup">
            <h3>Bus ${busId}</h3>
            <div class="bus-info">
                <p><i class="fas fa-clock"></i> Last Updated: ${new Date(location.timestamp).toLocaleString()}</p>
                <p><i class="fas fa-tachometer-alt"></i> Speed: ${location.speed || 0} km/h</p>
            </div>
            <div class="popup-buttons">
                <button onclick="showBusDetails('${busId}')" class="btn-details">
                    <i class="fas fa-info-circle"></i> Details
                </button>
                <button onclick="showRatingModal('${busId}')" class="btn-rate">
                    <i class="fas fa-star"></i> Rate
                </button>
            </div>
        </div>
    `;
}

function redirectToAdditionalInfo() {
    const currentPath = window.location.pathname;
    const basePath = currentPath.substring(0, currentPath.lastIndexOf('/'));
    window.location.href = `${basePath}/additionalinfo.html`;
}

// Make it globally available
window.redirectToAdditionalInfo = redirectToAdditionalInfo;