// Update Firebase config
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

// Add bus slideshow functionality
let currentBusIndex = 0;
let busesData = [];

function initializeBusSlideshow() {
    database.ref('busDetails').on('value', snapshot => {
        busesData = [];
        snapshot.forEach(child => {
            busesData.push({
                id: child.key,
                ...child.val()
            });
        });
        if (busesData.length > 0) {
            showBusDetails(busesData[0].id);
        }
    });

    // Auto-rotate bus details every 10 seconds
    setInterval(() => {
        currentBusIndex = (currentBusIndex + 1) % busesData.length;
        if (busesData[currentBusIndex]) {
            showBusDetails(busesData[currentBusIndex].id);
        }
    }, 10000);
}

async function showBusDetails(busId) {
    try {
        const busSnapshot = await database.ref(`busDetails/${busId}`).once('value');
        const busData = busSnapshot.val();
        
        // Update Speed Analysis
        updateSpeedChart(busId);
        
        // Update Driver Performance
        updateDriverPerformance(busData.driverId);
        
        // Update Recent Feedback
        updateRecentFeedback(busId);
        
        // Update Bus Status
        document.getElementById('busStatus').innerHTML = `
            <div class="status-card">
                <h4>${busData.busName}</h4>
                <p>Current Status: ${busData.status || 'Inactive'}</p>
                <p>Last Active: ${new Date(busData.lastActive || Date.now()).toLocaleString()}</p>
                <button onclick="contactDriver('${busData.driverId}')">Contact Driver</button>
            </div>
        `;
    } catch (error) {
        console.error('Error showing bus details:', error);
    }
}

function contactDriver(driverId) {
    database.ref(`driverInfo/${driverId}`).once('value')
        .then(snapshot => {
            const driver = snapshot.val();
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <span class="close">&times;</span>
                    <h3>Contact Driver</h3>
                    <div class="contact-info">
                        <p><strong>Name:</strong> ${driver.name}</p>
                        <p><strong>Phone:</strong> <a href="tel:${driver.phone}">${driver.phone}</a></p>
                        <p><strong>Email:</strong> <a href="mailto:${driver.email}">${driver.email}</a></p>
                    </div>
                    <div class="message-section">
                        <h4>Send Message</h4>
                        <textarea id="driverMessage" placeholder="Type your message"></textarea>
                        <button onclick="sendMessageToDriver('${driverId}')">Send Message</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            
            modal.querySelector('.close').onclick = () => modal.remove();
        });
}

function sendMessageToDriver(driverId) {
    const message = document.getElementById('driverMessage').value;
    if (!message) return;

    database.ref(`driverMessages/${driverId}`).push({
        message,
        timestamp: Date.now(),
        from: 'admin'
    }).then(() => {
        showNotification('Message sent successfully');
        document.querySelector('.modal').remove();
    }).catch(error => {
        console.error('Error sending message:', error);
        showNotification('Error sending message', 'error');
    });
}

// Update the loadPendingRequests function
function loadPendingRequests() {
    const container = document.getElementById('pendingRequestsContainer');
    if (!container) return;

    database.ref('pendingDrivers').on('value', snapshot => {
        container.innerHTML = '';
        let hasRequests = false;
        
        snapshot.forEach(child => {
            hasRequests = true;
            const driver = child.val();
            container.innerHTML += `
                <div class="request-item">
                    <div class="request-info">
                        <h4>${driver.name}</h4>
                        <p>License: ${driver.licenseNumber}</p>
                        <p>Experience: ${driver.experience} years</p>
                        <p>Phone: ${driver.phone}</p>
                        <small>Applied: ${new Date(driver.timestamp).toLocaleDateString()}</small>
                    </div>
                    <div class="request-actions">
                        <button onclick="approveDriver('${child.key}')" class="btn-approve">
                            <i class="fas fa-check"></i> Approve
                        </button>
                        <button onclick="rejectDriver('${child.key}')" class="btn-reject">
                            <i class="fas fa-times"></i> Reject
                        </button>
                    </div>
                </div>
            `;
        });
        
        if (!hasRequests) {
            container.innerHTML = '<p class="no-requests">No pending requests</p>';
        }
    });
}

// Add slideshow functionality for bus details
let currentSlideIndex = 0;
const slideDuration = 5000; // 5 seconds per slide

function initializeDashboardSlideshow() {
    // Initialize bus slideshow
    showBusSlide(currentSlideIndex);
    
    // Auto advance slides
    setInterval(() => {
        currentSlideIndex++;
        showBusSlide(currentSlideIndex);
    }, slideDuration);
}

function showBusSlide(index) {
    database.ref('busDetails').once('value', snapshot => {
        const buses = [];
        snapshot.forEach(child => {
            buses.push({ id: child.key, ...child.val() });
        });

        if (buses.length === 0) return;

        currentSlideIndex = ((index % buses.length) + buses.length) % buses.length;
        const currentBus = buses[currentSlideIndex];

        // Update dashboard sections with current bus data
        updateDashboardSections(currentBus);
    });
}

async function updateDashboardSections(busData) {
    try {
        const speedAnalysis = document.getElementById('speedAnalysis');
        const driverPerformance = document.getElementById('driverPerformance');
        const recentFeedback = document.getElementById('recentFeedback');

        if (speedAnalysis) speedAnalysis.innerHTML = generateSpeedChart(busData.speedData || {});
        if (driverPerformance) updateDriverPerformance(busData.driverId);
        if (recentFeedback) updateRecentFeedback(busData.id);
    } catch (error) {
        console.error('Error updating dashboard sections:', error);
    }
}

// Add marker radius control to the map
function initializeMarkerRadius(map, marker) {
    let radius = 100; // Default radius in meters
    let radiusCircle = L.circle(marker.getLatLng(), {
        radius: radius,
        color: '#007bff',
        fillColor: '#007bff',
        fillOpacity: 0.2
    }).addTo(map);

    // Add radius control
    const radiusControl = L.control({ position: 'topright' });
    radiusControl.onAdd = function() {
        const div = L.DomUtil.create('div', 'radius-control');
        div.innerHTML = `
            <div class="radius-input">
                <label>Stop Radius (m)</label>
                <input type="range" min="50" max="500" value="${radius}" 
                    oninput="updateRadius(this.value)">
                <span>${radius}m</span>
            </div>
        `;
        return div;
    };
    radiusControl.addTo(map);

    window.updateRadius = function(value) {
        radius = parseInt(value);
        radiusCircle.setRadius(radius);
        document.querySelector('.radius-input span').textContent = `${radius}m`;
    };

    // Update circle when marker moves
    marker.on('move', function(e) {
        radiusCircle.setLatLng(e.latlng);
    });
}

// Helper functions
function calculateAverageSpeed(speedData) {
    const speeds = Object.values(speedData);
    return speeds.length > 0 
        ? (speeds.reduce((a, b) => a + b, 0) / speeds.length).toFixed(1)
        : 'N/A';
}

function findMaxSpeed(speedData) {
    const speeds = Object.values(speedData);
    return speeds.length > 0 
        ? Math.max(...speeds).toFixed(1)
        : 'N/A';
}

function calculateDriverRating(driverData) {
    return driverData.rating ? driverData.rating.toFixed(1) : 'N/A';
}

function calculateOnTimeRate(busData) {
    return busData.onTimeRate || 'N/A';
}

function calculateSafetyScore(speedData) {
    // Implement safety score calculation based on speed data
    // This is a simplified example
    const speeds = Object.values(speedData);
    if (speeds.length === 0) return 'N/A';

    const maxSpeed = Math.max(...speeds);
    const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
    
    // Penalize for high speeds and speed variations
    let score = 100;
    if (maxSpeed > 80) score -= 20;
    if (avgSpeed > 60) score -= 10;
    
    return Math.max(0, Math.min(100, score));
}

// Add this function to generate speed chart
function generateSpeedChart(speedData) {
    if (!speedData || Object.keys(speedData).length === 0) {
        return '<div class="no-data">No speed data available</div>';
    }

    const labels = Object.keys(speedData).map(timestamp => 
        new Date(parseInt(timestamp)).toLocaleTimeString()
    );
    const speeds = Object.values(speedData);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Speed (km/h)',
                data: speeds,
                borderColor: '#007bff',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Speed (km/h)'
                    }
                }
            }
        }
    });

    return canvas.outerHTML;
}

// Add route assignment functionality
function initializeRouteAssignment() {
    const routeMap = L.map('routeAssignmentMap').setView([28.2096, 83.9856], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(routeMap);

    const markers = [];
    const routePath = L.polyline([], { color: '#007bff' }).addTo(routeMap);

    routeMap.on('click', e => {
        const marker = L.marker(e.latlng).addTo(routeMap);
        markers.push(marker);
        
        // Update polyline
        routePath.setLatLngs(markers.map(m => m.getLatLng()));

        // Enable save button if at least 2 points
        if (markers.length >= 2) {
            document.getElementById('saveRouteBtn').disabled = false;
        }
    });

    // Add save route functionality
    document.getElementById('saveRouteBtn').addEventListener('click', async () => {
        const routeName = await promptRouteName();
        if (!routeName) return;

        const routePoints = markers.map(m => ({
            lat: m.getLatLng().lat,
            lng: m.getLatLng().lng
        }));

        saveRoute(routeName, routePoints);
    });
}

async function promptRouteName() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>Save Route</h3>
            <div class="form-group">
                <label>Route Name</label>
                <input type="text" id="routeName" placeholder="Enter route name">
            </div>
            <div class="form-group">
                <label>Route Description</label>
                <textarea id="routeDescription" placeholder="Enter route description"></textarea>
            </div>
            <div class="button-group">
                <button id="confirmRoute" class="btn-primary">Save</button>
                <button id="cancelRoute" class="btn-secondary">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    return new Promise(resolve => {
        document.getElementById('confirmRoute').onclick = () => {
            const name = document.getElementById('routeName').value;
            const description = document.getElementById('routeDescription').value;
            modal.remove();
            resolve({ name, description });
        };
        document.getElementById('cancelRoute').onclick = () => {
            modal.remove();
            resolve(null);
        };
    });
}

async function saveRoute(routeData, points) {
    try {
        const routeRef = await database.ref('routes').push({
            name: routeData.name,
            description: routeData.description,
            points: points,
            createdAt: Date.now()
        });

        showNotification('Route saved successfully');
        return routeRef.key;
    } catch (error) {
        console.error('Error saving route:', error);
        showNotification('Error saving route', 'error');
    }
}

// Add route assignment to driver
async function assignRouteToDriver(driverId) {
    const routesSnapshot = await database.ref('routes').once('value');
    const routes = routesSnapshot.val() || {};

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>Assign Route</h3>
            <div class="routes-list">
                ${Object.entries(routes).map(([id, route]) => `
                    <div class="route-item">
                        <div class="route-info">
                            <h4>${route.name}</h4>
                            <p>${route.description}</p>
                        </div>
                        <button onclick="confirmRouteAssignment('${driverId}', '${id}')">
                            Assign
                        </button>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

async function confirmRouteAssignment(driverId, routeId) {
    try {
        await database.ref(`driverInfo/${driverId}/assignedRoute`).set(routeId);
        showNotification('Route assigned successfully');
        document.querySelector('.modal').remove();
    } catch (error) {
        console.error('Error assigning route:', error);
        showNotification('Error assigning route', 'error');
    }
}

// Add missing approveDriver function
async function approveDriver(driverId) {
    try {
        const driverSnapshot = await database.ref(`pendingDrivers/${driverId}`).once('value');
        const driverData = driverSnapshot.val();
        
        if (!driverData) {
            showNotification('Driver not found', 'error');
            return;
        }

        // Move to approved drivers
        await database.ref(`driverInfo/${driverData.userId}`).set({
            ...driverData,
            status: 'approved',
            approvedAt: Date.now()
        });

        // Remove from pending
        await database.ref(`pendingDrivers/${driverId}`).remove();
        showNotification('Driver approved successfully');
    } catch (error) {
        console.error('Error approving driver:', error);
        showNotification('Error approving driver', 'error');
    }
}

// Make functions globally available
window.approveDriver = approveDriver;

// Add message management functions
function showMessages() {
    database.ref('driverInfo').once('value', snapshot => {
        const drivers = snapshot.val();
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close">&times;</span>
                <h3>Driver Messages</h3>
                <div class="drivers-list">
                    ${Object.entries(drivers).map(([id, driver]) => `
                        <div class="driver-item">
                            <div class="driver-info">
                                <h4>${driver.name}</h4>
                                <p>${driver.phone}</p>
                            </div>
                            <button onclick="openMessageThread('${id}', '${driver.name}')">
                                Message
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        modal.querySelector('.close').onclick = () => modal.remove();
    });
}

function openMessageThread(driverId, driverName) {
    const threadModal = document.createElement('div');
    threadModal.className = 'modal';
    threadModal.innerHTML = `
        <div class="modal-content">
            <span class="close">&times;</span>
            <h3>Messages with ${driverName}</h3>
            <div class="message-thread" id="messageThread"></div>
            <div class="message-input">
                <textarea id="newMessage" placeholder="Type your message"></textarea>
                <button onclick="sendMessage('${driverId}')">Send</button>
            </div>
        </div>
    `;
    document.body.appendChild(threadModal);
    
    loadMessages(driverId);
    threadModal.querySelector('.close').onclick = () => threadModal.remove();
}

function loadMessages(driverId) {
    const thread = document.getElementById('messageThread');
    database.ref(`messages/${driverId}`).on('value', snapshot => {
        const messages = snapshot.val() || {};
        thread.innerHTML = Object.entries(messages)
            .sort(([,a], [,b]) => a.timestamp - b.timestamp)
            .map(([,msg]) => `
                <div class="message ${msg.from === 'admin' ? 'sent' : 'received'}">
                    <p>${msg.text}</p>
                    <small>${new Date(msg.timestamp).toLocaleString()}</small>
                </div>
            `).join('');
        thread.scrollTop = thread.scrollHeight;
    });
}

function sendMessage(driverId) {
    const text = document.getElementById('newMessage').value;
    if (!text.trim()) return;

    database.ref(`messages/${driverId}`).push({
        text,
        from: 'admin',
        timestamp: Date.now()
    });
    document.getElementById('newMessage').value = '';
}

// Make functions globally available
window.showMessages = showMessages;
window.openMessageThread = openMessageThread;
window.sendMessage = sendMessage;

// Initialize everything
document.addEventListener('DOMContentLoaded', () => {
    initializeDashboardSlideshow();
    loadPendingRequests();
    // ... other initialization code
});

// Add missing function
function updateDriverPerformance(driverId) {
    if (!driverId) return;
    
    database.ref(`driverInfo/${driverId}`).once('value')
        .then(snapshot => {
            const driver = snapshot.val();
            if (!driver) return;

            const performanceDiv = document.getElementById('driverPerformance');
            if (performanceDiv) {
                performanceDiv.innerHTML = `
                    <div class="driver-stats">
                        <div class="stat-item">
                            <span class="label">Rating</span>
                            <span class="value">${driver.rating || 'N/A'} ⭐</span>
                        </div>
                        <div class="stat-item">
                            <span class="label">Experience</span>
                            <span class="value">${driver.experience} years</span>
                        </div>
                        <div class="stat-item">
                            <span class="label">Status</span>
                            <span class="value">${driver.status || 'Active'}</span>
                        </div>
                    </div>
                `;
            }
        });
}

// Add missing updateRecentFeedback function
async function updateRecentFeedback(busId) {
    try {
        const feedbackRef = await database.ref(`feedback/${busId}`)
            .orderByChild('timestamp')
            .limitToLast(5)
            .once('value');
        
        const feedbackData = feedbackRef.val() || {};
        const feedbackDiv = document.getElementById('recentFeedback');
        
        if (feedbackDiv) {
            feedbackDiv.innerHTML = Object.entries(feedbackData)
                .sort(([,a], [,b]) => b.timestamp - a.timestamp)
                .map(([id, feedback]) => `
                    <div class="feedback-item">
                        <div class="rating">${'⭐'.repeat(feedback.rating)}</div>
                        <p>${feedback.comment}</p>
                        <small>${new Date(feedback.timestamp).toLocaleString()}</small>
                    </div>
                `).join('') || '<p>No feedback yet</p>';
        }
    } catch (error) {
        console.error('Error updating feedback:', error);
    }
}

// Add missing updateTrackingStatus function
function updateTrackingStatus(status) {
    const statusDiv = document.getElementById('trackingStatus');
    if (statusDiv) {
        statusDiv.innerHTML = `
            <div class="status ${status.toLowerCase()}">
                <i class="fas fa-circle"></i>
                ${status}
            </div>
        `;
    }
}

function addBus(event) {
    event.preventDefault();
    const busName = document.getElementById('busName').value;
    const busNumber = document.getElementById('busNumber').value;
    const busRoute = document.getElementById('busRoute').value;
    const driverName = document.getElementById('driverName').value;
    const driverNum = document.getElementById('driverNum').value;
    const additionalDetails = document.getElementById('additionalDetails').value;

    // Add bus to the database
    database.ref('buses').push({
        busName,
        busNumber,
        busRoute,
        driverName,
        driverNum,
        additionalDetails
    }).then(() => {
        alert('Bus added successfully!');
        document.getElementById('bus-form').reset(); // Reset the form
    }).catch(error => {
        console.error('Error adding bus:', error);
    });
} 