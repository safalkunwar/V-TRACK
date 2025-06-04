

// Initialize map and markers
let map, userMarkers = [], busMarkers = [];
let currentUserPosition = null;

document.addEventListener('DOMContentLoaded', () => {
    // Initialize map
    map = L.map('live-map').setView([28.2096, 83.9856], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    // Initialize features
    initializeRouteList();
    initializeNotifications();
    initializeRating();
    initializeBusTracking();
});

// Bus Tracking Functions
function initializeBusTracking() {
    const busesRef = database.ref('BusLocation');
    busesRef.on('value', (snapshot) => {
        updateBusMarkers(snapshot.val());
    });
}

function updateBusMarkers(buses) {
    // Clear existing bus markers
    busMarkers.forEach(marker => map.removeLayer(marker));
    busMarkers = [];

    // Add new bus markers
    if (buses) {
        Object.entries(buses).forEach(([busId, bus]) => {
            if (bus.latitude && bus.longitude) {
                const marker = L.marker([bus.latitude, bus.longitude], {
                    icon: L.divIcon({
                        className: 'bus-marker',
                        html: `<i class="fas fa-bus"></i>`,
                        iconSize: [30, 30]
                    })
                })
                .bindPopup(`
                    <strong>Bus ${busId}</strong><br>
                    Route: ${bus.route || 'N/A'}<br>
                    Speed: ${bus.speed || 'N/A'} km/h
                `);
                
                marker.addTo(map);
                busMarkers.push(marker);
            }
        });
    }
}

// Route Management
function initializeRouteList() {
    const routeList = document.getElementById('route-list');
    const routesRef = database.ref('routes');
    
    routesRef.on('value', (snapshot) => {
        routeList.innerHTML = '';
        const routes = snapshot.val();
        if (routes) {
            Object.entries(routes).forEach(([routeId, route]) => {
                const div = document.createElement('div');
                div.className = 'route-list-item';
                div.innerHTML = `
                    <div>
                        <strong>${route.name || routeId}</strong>
                        <div>${route.description || ''}</div>
                    </div>
                    <button onclick="viewRouteDetails('${routeId}')">View</button>
                `;
                routeList.appendChild(div);
            });
        }
    });

    // Route search functionality
    const searchInput = document.getElementById('route-search');
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const routeItems = routeList.getElementsByClassName('route-list-item');
        Array.from(routeItems).forEach(item => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    });
}

// Feature Functions
function showSchedules() {
    const schedulesRef = database.ref('routes');
    schedulesRef.once('value')
        .then(snapshot => {
            const routes = snapshot.val();
            if (!routes) {
                showPopup('Bus Schedules', '<p>No schedules available at the moment.</p>');
                return;
            }

            let scheduleContent = '<div class="schedules-container">';
            Object.entries(routes).forEach(([routeId, route]) => {
                scheduleContent += `
                    <div class="schedule-item">
                        <h3>${route.name || routeId}</h3>
                        <p>${route.description || ''}</p>
                        <p>First Bus: ${route.firstBus || 'N/A'}</p>
                        <p>Last Bus: ${route.lastBus || 'N/A'}</p>
                        <p>Frequency: ${route.frequency || 'N/A'}</p>
                    </div>
                `;
            });
            scheduleContent += '</div>';

            showPopup('Bus Schedules', scheduleContent);
        })
        .catch(error => {
            console.error('Error fetching schedules:', error);
            showPopup('Error', 'Failed to load schedules. Please try again.');
        });
}

function showHistory() {
    if (!firebase.auth().currentUser) {
        showPopup('Error', 'Please login to view travel history');
        return;
    }

    const userId = firebase.auth().currentUser.uid;
    const historyRef = database.ref(`users/${userId}/travelHistory`);
    
    historyRef.orderByChild('timestamp').limitToLast(10).once('value')
        .then(snapshot => {
            const history = snapshot.val();
            if (!history) {
                showPopup('Travel History', '<p>No travel history available.</p>');
                return;
            }

            let historyContent = '<div class="history-container">';
            Object.entries(history).reverse().forEach(([tripId, trip]) => {
                const date = new Date(trip.timestamp);
                historyContent += `
                    <div class="history-item">
                        <h3>${trip.routeName || 'Unknown Route'}</h3>
                        <p>Date: ${date.toLocaleDateString()}</p>
                        <p>Time: ${date.toLocaleTimeString()}</p>
                        <p>From: ${trip.from || 'N/A'}</p>
                        <p>To: ${trip.to || 'N/A'}</p>
                    </div>
                `;
            });
            historyContent += '</div>';

            showPopup('Travel History', historyContent);
        })
        .catch(error => {
            console.error('Error fetching history:', error);
            showPopup('Error', 'Failed to load travel history. Please try again.');
        });
}

function showNotifications() {
    const noticesRef = database.ref('notices');
    noticesRef.once('value')
        .then(snapshot => {
            const notices = snapshot.val();
            let content = '<div class="notifications-settings">';
            
            if (notices) {
                content += '<h3>Recent Notices</h3>';
                Object.entries(notices).reverse().forEach(([noticeId, notice]) => {
                    const date = new Date(notice.timestamp || Date.now());
                    content += `
                        <div class="notification-option">
                            <h4>${notice.title || 'Notice'}</h4>
                            <p>${notice.message || ''}</p>
                            <small>${date.toLocaleDateString()}</small>
                        </div>
                    `;
                });
            } else {
                content += '<p>No notices available.</p>';
            }
            
            content += '</div>';
            showPopup('Notifications', content);
        })
        .catch(error => {
            console.error('Error fetching notifications:', error);
            showPopup('Error', 'Failed to load notifications. Please try again.');
        });
}

function showRoutePlanner() {
    const content = `
        <div class="route-planner">
            <h3>Plan Your Journey</h3>
            <div class="route-input">
                <input type="text" id="fromLocation" placeholder="From">
                <input type="text" id="toLocation" placeholder="To">
                <input type="time" id="departureTime">
                <button onclick="planRoute()">Find Routes</button>
            </div>
            <div id="routeResults"></div>
        </div>
    `;
    
    showPopup('Route Planner', content);
}

// Rating System
function initializeRating() {
    const stars = document.querySelectorAll('.rating-stars i');
    let currentRating = 0;

    stars.forEach(star => {
        star.addEventListener('click', () => {
            currentRating = parseInt(star.dataset.rating);
            updateStars(currentRating);
        });
    });

    document.getElementById('submit-rating').addEventListener('click', () => {
        if (currentRating === 0) {
            alert('Please select a rating');
            return;
        }

        const feedback = document.getElementById('feedback-text').value;
        submitRating(currentRating, feedback);
    });
}

function updateStars(rating) {
    document.querySelectorAll('.rating-stars i').forEach(star => {
        const starRating = parseInt(star.dataset.rating);
        star.className = starRating <= rating ? 'fas fa-star' : 'far fa-star';
    });
}

function submitRating(rating, feedback) {
    database.ref('ratings').push({
        rating,
        feedback,
        timestamp: Date.now(),
        userId: firebase.auth().currentUser?.uid || 'anonymous'
    })
    .then(() => {
        alert('Thank you for your feedback!');
        document.getElementById('feedback-text').value = '';
        updateStars(0);
    })
    .catch(error => {
        console.error('Error submitting rating:', error);
        alert('Failed to submit rating. Please try again.');
    });
}

// Helper Functions
function showPopup(title, content) {
    const popup = document.getElementById('popup');
    const popupMessage = document.getElementById('popup-message');
    
    popupMessage.innerHTML = `<h2>${title}</h2>${content}`;
    popup.style.display = 'block';
}

function closePopup() {
    document.getElementById('popup').style.display = 'none';
}

function viewRouteDetails(routeId) {
    const routesRef = database.ref(`routes/${routeId}`);
    routesRef.once('value')
        .then(snapshot => {
            const route = snapshot.val();
            if (!route) {
                showPopup('Route Details', '<p>Route details not available.</p>');
                return;
            }

            const content = `
                <div class="route-details">
                    <h3>${route.name || routeId}</h3>
                    <p>${route.description || ''}</p>
                    <div class="route-info">
                        <p><strong>First Bus:</strong> ${route.firstBus || 'N/A'}</p>
                        <p><strong>Last Bus:</strong> ${route.lastBus || 'N/A'}</p>
                        <p><strong>Frequency:</strong> ${route.frequency || 'N/A'}</p>
                    </div>
                    <div class="route-stops">
                        <h4>Stops</h4>
                        <ul>
                            ${(route.stops || []).map(stop => `<li>${stop}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            `;
            
            showPopup('Route Details', content);
        })
        .catch(error => {
            console.error('Error fetching route details:', error);
            showPopup('Error', 'Failed to load route details. Please try again.');
        });
}

// Check authentication status
firebase.auth().onAuthStateChanged(user => {
    if (!user) {
        window.location.href = '/login.html';
    }
});