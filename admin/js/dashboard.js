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

// Global variables
let currentBusIndex = 0;
let busesData = [];

// Initialize dashboard
function initializeDashboard() {
    console.log('Initializing dashboard...');
    
    // Test Firebase connection
    database.ref('.info/connected').on('value', (snapshot) => {
        console.log('Firebase connected:', snapshot.val());
    });
    
    // Check if database is accessible
    database.ref('pendingDrivers').once('value')
        .then(snapshot => {
            console.log('Database accessible, pendingDrivers data:', snapshot.val());
        })
        .catch(error => {
            console.error('Database access error:', error);
        });
    
    loadBusFleetOverview();
    loadPendingRequests();
    updateStatistics();
    
    // Set up periodic updates
    setInterval(() => {
        loadBusFleetOverview(); // Refresh bus fleet every 30 seconds
    }, 30000);
    
    // Set up feedback refresh
    setInterval(() => {
        updateRecentFeedback(); // Refresh feedback every 60 seconds
    }, 60000);
    
    console.log('Dashboard initialization complete');
}

// Enhanced bus fleet overview with proper data loading
function loadBusFleetOverview() {
    const container = document.getElementById('busFleetContainer');
    if (!container) return;

    container.innerHTML = '<div class="loading-container"><div class="loading"></div><p>Loading bus fleet...</p></div>';

    // Load bus data from multiple sources
    Promise.all([
        database.ref('busDetails').once('value'),
        database.ref('BusLocation').once('value'),
        database.ref('driverInfo').once('value')
    ]).then(([busDetailsSnapshot, busLocationSnapshot, driverInfoSnapshot]) => {
        const busDetails = busDetailsSnapshot.val() || {};
        const busLocation = busLocationSnapshot.val() || {};
        const driverInfo = driverInfoSnapshot.val() || {};

        const buses = [];
        
        // Combine data from different sources
        Object.keys(busLocation).forEach(busId => {
            const locationData = busLocation[busId];
            const details = busDetails[busId] || {};
            const driver = driverInfo[details.driverId] || {};
            
            // Get latest location
            const timestamps = Object.keys(locationData).filter(key => !isNaN(parseInt(key)));
            const latestTimestamp = timestamps.length > 0 ? Math.max(...timestamps.map(ts => parseInt(ts))) : Date.now();
            const latestLocation = locationData[latestTimestamp];
            
            // Parse location data
            let lat, lng;
            if (typeof latestLocation === 'string' && latestLocation.includes(',')) {
                const coords = latestLocation.split(',');
                lat = parseFloat(coords[0]);
                lng = parseFloat(coords[1]);
            }
            
            // Determine status based on last activity
            const lastActive = latestTimestamp || Date.now();
            const timeSinceLastUpdate = Date.now() - lastActive;
            const isActive = timeSinceLastUpdate < 5 * 60 * 1000; // 5 minutes
            
            buses.push({
                id: busId,
                name: details.busName || `Bus ${busId.toUpperCase()}`,
                number: details.busNumber || busId,
                driver: driver.name || 'Unassigned',
                status: isActive ? 'active' : 'inactive',
                lastActive: new Date(lastActive).toLocaleString(),
                location: lat && lng ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : 'Unknown',
                route: details.route || 'No route assigned',
                rating: details.rating || 0,
                distance: details.totalDistance || 0
            });
        });

        if (buses.length > 0) {
            container.innerHTML = buses.map(bus => `
                <div class="bus-card ${bus.status === 'active' ? 'active' : ''}" onclick="selectBus('${bus.id}')">
                    <div class="bus-card-header">
                        <h4 class="bus-card-title">${bus.name}</h4>
                        <span class="bus-status-badge ${bus.status}">${bus.status}</span>
                    </div>
                    <div class="bus-card-content">
                        <div class="bus-info-item">
                            <span class="bus-info-label">Bus Number</span>
                            <span class="bus-info-value">${bus.number}</span>
                        </div>
                        <div class="bus-info-item">
                            <span class="bus-info-label">Driver</span>
                            <span class="bus-info-value">${bus.driver}</span>
                        </div>
                        <div class="bus-info-item">
                            <span class="bus-info-label">Last Active</span>
                            <span class="bus-info-value">${bus.lastActive}</span>
                        </div>
                        <div class="bus-info-item">
                            <span class="bus-info-label">Rating</span>
                            <span class="bus-info-value">${'⭐'.repeat(Math.floor(bus.rating))} ${bus.rating.toFixed(1)}</span>
                        </div>
                        <div class="bus-info-item">
                            <span class="bus-info-label">Route</span>
                            <span class="bus-info-value">${bus.route}</span>
                        </div>
                        <div class="bus-info-item">
                            <span class="bus-info-label">Distance</span>
                            <span class="bus-info-value">${(bus.distance / 1000).toFixed(1)} km</span>
                        </div>
                    </div>
                    <div class="bus-card-actions">
                        <button class="bus-action-btn primary" onclick="viewBusDetails('${bus.id}'); event.stopPropagation();">
                            <i class="fas fa-eye"></i> View
                        </button>
                        <button class="bus-action-btn secondary" onclick="editBus('${bus.id}'); event.stopPropagation();">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="bus-action-btn danger" onclick="deleteBus('${bus.id}'); event.stopPropagation();">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 40px;">No buses found in the fleet</p>';
        }
    }).catch(error => {
        console.error('Error loading bus fleet:', error);
        container.innerHTML = '<p style="text-align: center; color: #dc3545; padding: 40px;">Error loading bus fleet data</p>';
    });
}

// Update the loadPendingRequests function
function loadPendingRequests() {
    const container = document.getElementById('pendingRequestsContainer');
    if (!container) {
        console.error('pendingRequestsContainer not found');
        return;
    }

    console.log('Loading pending requests...');
    
    // Add loading indicator
    container.innerHTML = '<div class="loading-container"><div class="loading"></div><p>Loading pending requests...</p></div>';

    // Check both pendingDrivers and driverInfo for pending drivers
    Promise.all([
        database.ref('pendingDrivers').once('value'),
        database.ref('driverInfo').orderByChild('status').equalTo('pending').once('value'),
        database.ref('driverInfo').orderByChild('verified').equalTo(false).once('value')
    ]).then(([pendingDriversSnapshot, pendingDriverInfoSnapshot, unverifiedDriversSnapshot]) => {
        console.log('Firebase snapshots received:');
        console.log('pendingDrivers:', pendingDriversSnapshot.val());
        console.log('pending driverInfo:', pendingDriverInfoSnapshot.val());
        console.log('unverified drivers:', unverifiedDriversSnapshot.val());
        
        container.innerHTML = '';
        let hasRequests = false;
        const allRequests = [];
        
        // Process pendingDrivers
        if (pendingDriversSnapshot.exists()) {
            pendingDriversSnapshot.forEach(child => {
                const driver = child.val();
                allRequests.push({
                    id: child.key,
                    source: 'pendingDrivers',
                    ...driver
                });
            });
        }
        
        // Process driverInfo with status='pending'
        if (pendingDriverInfoSnapshot.exists()) {
            pendingDriverInfoSnapshot.forEach(child => {
                const driver = child.val();
                allRequests.push({
                    id: child.key,
                    source: 'driverInfo',
                    ...driver
                });
            });
        }
        
        // Process unverified drivers
        if (unverifiedDriversSnapshot.exists()) {
            unverifiedDriversSnapshot.forEach(child => {
                const driver = child.val();
                // Only add if not already in the list
                const exists = allRequests.find(req => req.id === child.key);
                if (!exists) {
                    allRequests.push({
                        id: child.key,
                        source: 'unverified',
                        ...driver
                    });
                }
            });
        }
        
        console.log('All requests found:', allRequests);
        
        if (allRequests.length > 0) {
            hasRequests = true;
            allRequests.forEach(request => {
                container.innerHTML += `
                    <div class="request-item">
                        <div class="request-info">
                            <h4>${request.name || 'Unknown'}</h4>
                            <p>License: ${request.licenseNumber || request.license || 'N/A'}</p>
                            <p>Experience: ${request.experience || 0} years</p>
                            <p>Phone: ${request.phone || 'N/A'}</p>
                            <p>Email: ${request.email || 'N/A'}</p>
                            <small>Applied: ${new Date(request.timestamp || request.createdAt || Date.now()).toLocaleDateString()}</small>
                            <small style="color: #6c757d;">Source: ${request.source}</small>
                        </div>
                        <div class="request-actions">
                            <button onclick="approveDriver('${request.id}', '${request.source}')" class="btn-approve">
                                <i class="fas fa-check"></i> Approve
                            </button>
                            <button onclick="rejectDriver('${request.id}', '${request.source}')" class="btn-reject">
                                <i class="fas fa-times"></i> Reject
                            </button>
                        </div>
                    </div>
                `;
            });
        }
        
        if (!hasRequests) {
            console.log('No pending requests found');
            container.innerHTML = '<p class="no-requests">No pending requests</p>';
        } else {
            console.log('Found pending requests, displaying them');
        }
    }).catch(error => {
        console.error('Error loading pending requests:', error);
        container.innerHTML = '<p style="text-align: center; color: #dc3545; padding: 20px;">Error loading pending requests</p>';
    });
}

// Enhanced bus selection function
function selectBus(busId) {
    // Remove active class from all cards
    document.querySelectorAll('.bus-card').forEach(card => {
        card.classList.remove('active');
    });
    
    // Add active class to selected card
    const selectedCard = document.querySelector(`[onclick="selectBus('${busId}')"]`);
    if (selectedCard) {
        selectedCard.classList.add('active');
    }
    
    // Update dashboard with selected bus data
    showBusDetails(busId);
    
    // Update statistics
    updateBusStatistics(busId);
}

// Enhanced bus details view
async function viewBusDetails(busId) {
    try {
        const [busDetails, driverInfo, feedback] = await Promise.all([
            database.ref(`busDetails/${busId}`).once('value'),
            database.ref('driverInfo').orderByChild('busId').equalTo(busId).once('value'),
            database.ref(`feedback/${busId}`).orderByChild('timestamp').limitToLast(3).once('value')
        ]);
        
        const bus = busDetails.val() || {};
        const driver = Object.values(driverInfo.val() || {})[0] || {};
        const feedbackData = feedback.val() || {};
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">${bus.busName || `Bus ${busId.toUpperCase()}`}</h3>
                    <button class="close">&times;</button>
                </div>
                <div class="bus-details-content">
                    <div class="bus-details-grid">
                        <div class="detail-section">
                            <h4>Bus Information</h4>
                            <div class="detail-item">
                                <span class="detail-label">Bus Number:</span>
                                <span class="detail-value">${bus.busNumber || busId}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Status:</span>
                                <span class="detail-value status-${bus.status || 'inactive'}">${bus.status || 'Inactive'}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Route:</span>
                                <span class="detail-value">${bus.route || 'No route assigned'}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Rating:</span>
                                <span class="detail-value">${'⭐'.repeat(Math.floor(bus.rating || 0))} ${(bus.rating || 0).toFixed(1)}</span>
                            </div>
                        </div>
                        <div class="detail-section">
                            <h4>Driver Information</h4>
                            <div class="detail-item">
                                <span class="detail-label">Name:</span>
                                <span class="detail-value">${driver.name || 'Unassigned'}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Phone:</span>
                                <span class="detail-value">${driver.phone || 'N/A'}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Experience:</span>
                                <span class="detail-value">${driver.experience || 0} years</span>
                            </div>
                        </div>
                    </div>
                    <div class="detail-section">
                        <h4>Recent Feedback</h4>
                        <div class="feedback-preview">
                            ${Object.entries(feedbackData).length > 0 ? 
                                Object.entries(feedbackData).map(([id, feedback]) => `
                                    <div class="feedback-preview-item">
                                        <div class="feedback-preview-header">
                                            <span class="feedback-stars">${'⭐'.repeat(feedback.rating || 5)}</span>
                                            <span class="feedback-date">${new Date(feedback.timestamp).toLocaleDateString()}</span>
                                        </div>
                                        <p class="feedback-preview-content">${feedback.comment || feedback.feedback || 'No comment'}</p>
                                    </div>
                                `).join('') : 
                                '<p style="color: #6c757d; text-align: center;">No feedback available</p>'
                            }
                        </div>
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="route-btn primary" onclick="editBus('${busId}')">
                        <i class="fas fa-edit"></i> Edit Bus
                    </button>
                    <button class="route-btn secondary" onclick="assignRoute('${busId}')">
                        <i class="fas fa-route"></i> Assign Route
                    </button>
                    <button class="route-btn secondary" onclick="contactDriver('${driver.id || ''}')">
                        <i class="fas fa-phone"></i> Contact Driver
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close modal functionality
        modal.querySelector('.close').onclick = () => modal.remove();
        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };
        
    } catch (error) {
        console.error('Error viewing bus details:', error);
        showNotification('Error loading bus details', 'error');
    }
}

// Enhanced bus statistics update
function updateBusStatistics(busId) {
    database.ref(`busDetails/${busId}`).once('value')
        .then(snapshot => {
            const bus = snapshot.val();
            if (!bus) return;
            
            // Update statistics display
            const statsElements = {
                'total-buses': document.getElementById('total-buses'),
                'active-buses': document.getElementById('active-buses'),
                'inactive-buses': document.getElementById('inactive-buses'),
                'most-active-bus': document.getElementById('most-active-bus')
            };
            
            if (statsElements['most-active-bus']) {
                statsElements['most-active-bus'].textContent = bus.busName || busId.toUpperCase();
            }
        })
        .catch(error => {
            console.error('Error updating bus statistics:', error);
        });
}

// Enhanced feedback management functions
function replyToFeedback(feedbackId, feedbackType) {
    const reply = prompt('Enter your reply:');
    if (!reply) return;
    
    const replyData = {
        reply,
        timestamp: Date.now(),
        adminId: 'admin'
    };
    
    const ref = feedbackType === 'user' ? 
        database.ref(`userFeedback/${feedbackId}/replies`) :
        database.ref(`feedback/${feedbackId}/replies`);
    
    ref.push(replyData)
        .then(() => {
            showNotification('Reply sent successfully');
            updateRecentFeedback(); // Refresh feedback display
        })
        .catch(error => {
            console.error('Error sending reply:', error);
            showNotification('Error sending reply', 'error');
        });
}

function deleteFeedback(feedbackId, feedbackType) {
    if (!confirm('Are you sure you want to delete this feedback?')) return;
    
    const ref = feedbackType === 'user' ? 
        database.ref(`userFeedback/${feedbackId}`) :
        database.ref(`feedback/${feedbackId}`);
    
    ref.remove()
        .then(() => {
            showNotification('Feedback deleted successfully');
            updateRecentFeedback(); // Refresh feedback display
        })
        .catch(error => {
            console.error('Error deleting feedback:', error);
            showNotification('Error deleting feedback', 'error');
        });
}

// Enhanced notification function
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideInRight 0.3s ease reverse';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Add missing approveDriver function
async function approveDriver(driverId, source = 'pendingDrivers') {
    try {
        let driverData;
        
        // Get driver data based on source
        if (source === 'pendingDrivers') {
            const driverSnapshot = await database.ref(`pendingDrivers/${driverId}`).once('value');
            driverData = driverSnapshot.val();
            
            if (!driverData) {
                showNotification('Driver not found', 'error');
                return;
            }

            // Move to approved drivers
            await database.ref(`driverInfo/${driverData.userId || driverId}`).set({
                ...driverData,
                status: 'approved',
                verified: true,
                approvedAt: Date.now()
            });

            // Remove from pending
            await database.ref(`pendingDrivers/${driverId}`).remove();
            
        } else if (source === 'driverInfo' || source === 'unverified') {
            // Update existing driver in driverInfo
            await database.ref(`driverInfo/${driverId}`).update({
                status: 'approved',
                verified: true,
                approvedAt: Date.now()
            });
        }
        
        showNotification('Driver approved successfully');
        loadPendingRequests(); // Refresh the list
    } catch (error) {
        console.error('Error approving driver:', error);
        showNotification('Error approving driver', 'error');
    }
}

// Add missing rejectDriver function
async function rejectDriver(driverId, source = 'pendingDrivers') {
    if (!confirm('Are you sure you want to reject this driver?')) return;
    
    try {
        if (source === 'pendingDrivers') {
            await database.ref(`pendingDrivers/${driverId}`).remove();
        } else if (source === 'driverInfo' || source === 'unverified') {
            await database.ref(`driverInfo/${driverId}`).remove();
        }
        
        showNotification('Driver rejected successfully');
        loadPendingRequests(); // Refresh the list
    } catch (error) {
        console.error('Error rejecting driver:', error);
        showNotification('Error rejecting driver', 'error');
    }
}

// Add missing updateRecentFeedback function
async function updateRecentFeedback(busId) {
    try {
        // Get feedback from multiple sources
        const [feedbackRef, userFeedbackRef] = await Promise.all([
            database.ref(`feedback/${busId || ''}`).orderByChild('timestamp').limitToLast(5).once('value'),
            database.ref('userFeedback').orderByChild('timestamp').limitToLast(5).once('value')
        ]);
        
        const feedbackData = feedbackRef.val() || {};
        const userFeedbackData = userFeedbackRef.val() || {};
        
        const feedbackDiv = document.getElementById('recentFeedback');
        
        if (feedbackDiv) {
            // Combine and sort all feedback
            const allFeedback = [];
            
            // Add bus-specific feedback
            Object.entries(feedbackData).forEach(([id, feedback]) => {
                allFeedback.push({
                    id,
                    ...feedback,
                    type: 'bus'
                });
            });
            
            // Add general user feedback
            Object.entries(userFeedbackData).forEach(([id, feedback]) => {
                allFeedback.push({
                    id,
                    ...feedback,
                    type: 'user'
                });
            });
            
            // Sort by timestamp (newest first)
            allFeedback.sort((a, b) => b.timestamp - a.timestamp);
            
            if (allFeedback.length > 0) {
                feedbackDiv.innerHTML = allFeedback.slice(0, 5).map(feedback => `
                    <div class="feedback-item">
                        <div class="feedback-header">
                            <div class="feedback-rating">
                                <span class="feedback-stars">${'⭐'.repeat(feedback.rating || 5)}</span>
                                <span class="feedback-author">${feedback.name || feedback.author || 'Anonymous'}</span>
                            </div>
                            <span class="feedback-date">${new Date(feedback.timestamp).toLocaleDateString()}</span>
                        </div>
                        <div class="feedback-content">${feedback.comment || feedback.msgContent || feedback.feedback || 'No comment provided'}</div>
                        <div class="feedback-actions">
                            <button class="feedback-action-btn reply" onclick="replyToFeedback('${feedback.id}', '${feedback.type}')">
                                <i class="fas fa-reply"></i> Reply
                            </button>
                            <button class="feedback-action-btn delete" onclick="deleteFeedback('${feedback.id}', '${feedback.type}')">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </div>
                    </div>
                `).join('');
            } else {
                feedbackDiv.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 20px;">No feedback available yet</p>';
            }
        }
    } catch (error) {
        console.error('Error updating feedback:', error);
        const feedbackDiv = document.getElementById('recentFeedback');
        if (feedbackDiv) {
            feedbackDiv.innerHTML = '<p style="text-align: center; color: #dc3545; padding: 20px;">Error loading feedback</p>';
        }
    }
}

// Add missing functions for bus management
function addNewBus() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3 class="modal-title">Add New Bus</h3>
                <button class="close">&times;</button>
            </div>
            <div class="bus-details-content">
                <form id="addBusForm">
                    <div class="form-group">
                        <label class="form-label" for="newBusName">Bus Name</label>
                        <input type="text" id="newBusName" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="newBusNumber">Bus Number</label>
                        <input type="text" id="newBusNumber" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="newBusRoute">Route</label>
                        <input type="text" id="newBusRoute" class="form-input">
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="newDriverId">Driver ID</label>
                        <input type="text" id="newDriverId" class="form-input">
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="newBusCapacity">Capacity</label>
                        <input type="number" id="newBusCapacity" class="form-input" min="1" max="100">
                    </div>
                </form>
            </div>
            <div class="modal-actions">
                <button class="route-btn secondary" onclick="closeModal()">Cancel</button>
                <button class="route-btn primary" onclick="saveNewBus()">Add Bus</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal functionality
    modal.querySelector('.close').onclick = () => modal.remove();
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
}

function saveNewBus() {
    const busName = document.getElementById('newBusName').value;
    const busNumber = document.getElementById('newBusNumber').value;
    const route = document.getElementById('newBusRoute').value;
    const driverId = document.getElementById('newDriverId').value;
    const capacity = document.getElementById('newBusCapacity').value;
    
    if (!busName || !busNumber) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    const busData = {
        busName,
        busNumber,
        route: route || 'No route assigned',
        driverId: driverId || null,
        capacity: capacity ? parseInt(capacity) : 50,
        status: 'inactive',
        rating: 0,
        totalDistance: 0,
        createdAt: Date.now()
    };
    
    // Generate a unique bus ID
    const busId = 'bus_' + Date.now();
    
    database.ref(`busDetails/${busId}`).set(busData)
        .then(() => {
            showNotification('Bus added successfully');
            closeModal();
            loadBusFleetOverview(); // Refresh the fleet view
        })
        .catch(error => {
            console.error('Error adding bus:', error);
            showNotification('Error adding bus', 'error');
        });
}

function editBus(busId) {
    // Load bus data and show edit modal
    database.ref(`busDetails/${busId}`).once('value')
        .then(snapshot => {
            const bus = snapshot.val();
            if (!bus) {
                showNotification('Bus not found', 'error');
                return;
            }
            
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title">Edit Bus: ${bus.busName}</h3>
                        <button class="close">&times;</button>
                    </div>
                    <div class="bus-details-content">
                        <form id="editBusForm">
                            <div class="form-group">
                                <label class="form-label" for="editBusName">Bus Name</label>
                                <input type="text" id="editBusName" class="form-input" value="${bus.busName || ''}" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="editBusNumber">Bus Number</label>
                                <input type="text" id="editBusNumber" class="form-input" value="${bus.busNumber || ''}" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="editBusRoute">Route</label>
                                <input type="text" id="editBusRoute" class="form-input" value="${bus.route || ''}">
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="editDriverId">Driver ID</label>
                                <input type="text" id="editDriverId" class="form-input" value="${bus.driverId || ''}">
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="editBusCapacity">Capacity</label>
                                <input type="number" id="editBusCapacity" class="form-input" value="${bus.capacity || 50}" min="1" max="100">
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="editBusStatus">Status</label>
                                <select id="editBusStatus" class="form-select">
                                    <option value="active" ${bus.status === 'active' ? 'selected' : ''}>Active</option>
                                    <option value="inactive" ${bus.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                                    <option value="maintenance" ${bus.status === 'maintenance' ? 'selected' : ''}>Maintenance</option>
                                </select>
                            </div>
                        </form>
                    </div>
                    <div class="modal-actions">
                        <button class="route-btn secondary" onclick="closeModal()">Cancel</button>
                        <button class="route-btn primary" onclick="updateBus('${busId}')">Update Bus</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Close modal functionality
            modal.querySelector('.close').onclick = () => modal.remove();
            modal.onclick = (e) => {
                if (e.target === modal) modal.remove();
            };
        })
        .catch(error => {
            console.error('Error loading bus data:', error);
            showNotification('Error loading bus data', 'error');
        });
}

function updateBus(busId) {
    const busName = document.getElementById('editBusName').value;
    const busNumber = document.getElementById('editBusNumber').value;
    const route = document.getElementById('editBusRoute').value;
    const driverId = document.getElementById('editDriverId').value;
    const capacity = document.getElementById('editBusCapacity').value;
    const status = document.getElementById('editBusStatus').value;
    
    if (!busName || !busNumber) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    const updateData = {
        busName,
        busNumber,
        route: route || 'No route assigned',
        driverId: driverId || null,
        capacity: capacity ? parseInt(capacity) : 50,
        status,
        updatedAt: Date.now()
    };
    
    database.ref(`busDetails/${busId}`).update(updateData)
        .then(() => {
            showNotification('Bus updated successfully');
            closeModal();
            loadBusFleetOverview(); // Refresh the fleet view
        })
        .catch(error => {
            console.error('Error updating bus:', error);
            showNotification('Error updating bus', 'error');
        });
}

function deleteBus(busId) {
    if (!confirm('Are you sure you want to delete this bus? This action cannot be undone.')) {
        return;
    }
    
    // Delete bus from multiple locations
    Promise.all([
        database.ref(`busDetails/${busId}`).remove(),
        database.ref(`BusLocation/${busId}`).remove(),
        database.ref(`feedback/${busId}`).remove()
    ])
        .then(() => {
            showNotification('Bus deleted successfully');
            loadBusFleetOverview(); // Refresh the fleet view
        })
        .catch(error => {
            console.error('Error deleting bus:', error);
            showNotification('Error deleting bus', 'error');
        });
}

function refreshFleet() {
    loadBusFleetOverview();
    showNotification('Fleet data refreshed');
}

function viewAllFeedback() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3 class="modal-title">All Feedback</h3>
                <button class="close">&times;</button>
            </div>
            <div class="bus-details-content">
                <div id="allFeedbackContainer">
                    <div class="loading-container">
                        <div class="loading"></div>
                        <p>Loading all feedback...</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal functionality
    modal.querySelector('.close').onclick = () => modal.remove();
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
    
    // Load all feedback
    loadAllFeedback();
}

function loadAllFeedback() {
    const container = document.getElementById('allFeedbackContainer');
    if (!container) return;
    
    Promise.all([
        database.ref('feedback').once('value'),
        database.ref('userFeedback').once('value')
    ]).then(([feedbackSnapshot, userFeedbackSnapshot]) => {
        const feedbackData = feedbackSnapshot.val() || {};
        const userFeedbackData = userFeedbackSnapshot.val() || {};
        
        const allFeedback = [];
        
        // Process bus-specific feedback
        Object.entries(feedbackData).forEach(([busId, busFeedback]) => {
            Object.entries(busFeedback).forEach(([feedbackId, feedback]) => {
                allFeedback.push({
                    id: feedbackId,
                    busId,
                    ...feedback,
                    type: 'bus'
                });
            });
        });
        
        // Process general user feedback
        Object.entries(userFeedbackData).forEach(([feedbackId, feedback]) => {
            allFeedback.push({
                id: feedbackId,
                ...feedback,
                type: 'user'
            });
        });
        
        // Sort by timestamp (newest first)
        allFeedback.sort((a, b) => b.timestamp - a.timestamp);
        
        if (allFeedback.length > 0) {
            container.innerHTML = allFeedback.map(feedback => `
                <div class="feedback-item">
                    <div class="feedback-header">
                        <div class="feedback-rating">
                            <span class="feedback-stars">${'⭐'.repeat(feedback.rating || 5)}</span>
                            <span class="feedback-author">${feedback.name || feedback.author || 'Anonymous'}</span>
                            ${feedback.busId ? `<span class="feedback-bus">(Bus: ${feedback.busId})</span>` : ''}
                        </div>
                        <span class="feedback-date">${new Date(feedback.timestamp).toLocaleString()}</span>
                    </div>
                    <div class="feedback-content">${feedback.comment || feedback.msgContent || feedback.feedback || 'No comment provided'}</div>
                    <div class="feedback-actions">
                        <button class="feedback-action-btn reply" onclick="replyToFeedback('${feedback.id}', '${feedback.type}')">
                            <i class="fas fa-reply"></i> Reply
                        </button>
                        <button class="feedback-action-btn delete" onclick="deleteFeedback('${feedback.id}', '${feedback.type}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 40px;">No feedback available</p>';
        }
    }).catch(error => {
        console.error('Error loading all feedback:', error);
        container.innerHTML = '<p style="text-align: center; color: #dc3545; padding: 40px;">Error loading feedback</p>';
    });
}

function closeModal() {
    const modal = document.querySelector('.modal');
    if (modal) {
        modal.remove();
    }
}

function assignRoute(busId) {
    const route = prompt('Enter route for this bus:');
    if (!route) return;
    
    database.ref(`busDetails/${busId}`).update({
        route: route,
        updatedAt: Date.now()
    })
        .then(() => {
            showNotification('Route assigned successfully');
            loadBusFleetOverview(); // Refresh the fleet view
        })
        .catch(error => {
            console.error('Error assigning route:', error);
            showNotification('Error assigning route', 'error');
        });
}

function contactDriver(driverId) {
    if (!driverId) {
        showNotification('No driver assigned to this bus', 'error');
        return;
    }
    
    database.ref(`driverInfo/${driverId}`).once('value')
        .then(snapshot => {
            const driver = snapshot.val();
            if (!driver) {
                showNotification('Driver information not found', 'error');
                return;
            }
            
            const message = `Driver: ${driver.name}\nPhone: ${driver.phone || 'N/A'}\nExperience: ${driver.experience || 0} years`;
            alert(message);
        })
        .catch(error => {
            console.error('Error loading driver info:', error);
            showNotification('Error loading driver information', 'error');
        });
}

function showBusDetails(busId) {
    // This function is called when a bus is selected
    // It can be used to update other parts of the dashboard
    console.log('Selected bus:', busId);
}

// Additional initialization
function refreshDashboard() {
    loadBusFleetOverview();
    loadPendingRequests();
    updateStatistics();
    showNotification('Dashboard refreshed successfully');
}

function updateStatistics() {
    // Update statistics from Firebase
    database.ref('busDetails').once('value')
        .then(snapshot => {
            const buses = snapshot.val() || {};
            const totalBuses = Object.keys(buses).length;
            const activeBuses = Object.values(buses).filter(bus => bus.status === 'active').length;
            const inactiveBuses = totalBuses - activeBuses;

            document.getElementById('total-buses').textContent = totalBuses;
            document.getElementById('active-buses').textContent = activeBuses;
            document.getElementById('inactive-buses').textContent = inactiveBuses;
        });

    // Update pending requests count from all sources
    Promise.all([
        database.ref('pendingDrivers').once('value'),
        database.ref('driverInfo').orderByChild('status').equalTo('pending').once('value'),
        database.ref('driverInfo').orderByChild('verified').equalTo(false).once('value')
    ]).then(([pendingDriversSnapshot, pendingDriverInfoSnapshot, unverifiedDriversSnapshot]) => {
        let pendingCount = 0;
        
        // Count from pendingDrivers
        pendingCount += pendingDriversSnapshot.numChildren();
        
        // Count from driverInfo with status='pending'
        pendingCount += pendingDriverInfoSnapshot.numChildren();
        
        // Count unverified drivers (but avoid double counting)
        const unverifiedDrivers = unverifiedDriversSnapshot.val() || {};
        const pendingDriverInfo = pendingDriverInfoSnapshot.val() || {};
        
        Object.keys(unverifiedDrivers).forEach(driverId => {
            if (!pendingDriverInfo[driverId]) {
                pendingCount++;
            }
        });
        
        document.getElementById('pending-requests').textContent = pendingCount;
    }).catch(error => {
        console.error('Error updating pending requests count:', error);
    });
}

// Test function to manually check database
function testPendingDrivers() {
    console.log('Testing pending drivers...');
    
    // Check multiple possible locations
    Promise.all([
        database.ref('pendingDrivers').once('value'),
        database.ref('driverInfo').orderByChild('status').equalTo('pending').once('value'),
        database.ref('driverInfo').orderByChild('verified').equalTo(false).once('value'),
        database.ref('driverInfo').once('value'),
        database.ref('drivers').once('value')
    ]).then(([pendingDrivers, pendingDriverInfo, unverifiedDrivers, allDriverInfo, allDrivers]) => {
        console.log('pendingDrivers data:', pendingDrivers.val());
        console.log('pending driverInfo data:', pendingDriverInfo.val());
        console.log('unverified drivers data:', unverifiedDrivers.val());
        console.log('all driverInfo data:', allDriverInfo.val());
        console.log('all drivers data:', allDrivers.val());
        
        // Calculate counts
        const pendingCount = pendingDrivers.numChildren();
        const pendingInfoCount = pendingDriverInfo.numChildren();
        const unverifiedCount = unverifiedDrivers.numChildren();
        const totalDriverInfoCount = allDriverInfo.numChildren();
        
        // Display results in a modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Database Test Results</h3>
                    <button class="close">&times;</button>
                </div>
                <div class="modal-body">
                    <h4>Summary:</h4>
                    <ul>
                        <li>pendingDrivers: ${pendingCount} records</li>
                        <li>driverInfo with status='pending': ${pendingInfoCount} records</li>
                        <li>driverInfo with verified=false: ${unverifiedCount} records</li>
                        <li>Total driverInfo records: ${totalDriverInfoCount} records</li>
                    </ul>
                    
                    <h4>pendingDrivers node:</h4>
                    <pre>${JSON.stringify(pendingDrivers.val(), null, 2)}</pre>
                    
                    <h4>driverInfo with status='pending':</h4>
                    <pre>${JSON.stringify(pendingDriverInfo.val(), null, 2)}</pre>
                    
                    <h4>driverInfo with verified=false:</h4>
                    <pre>${JSON.stringify(unverifiedDrivers.val(), null, 2)}</pre>
                    
                    <h4>All driverInfo:</h4>
                    <pre>${JSON.stringify(allDriverInfo.val(), null, 2)}</pre>
                    
                    <h4>All drivers:</h4>
                    <pre>${JSON.stringify(allDrivers.val(), null, 2)}</pre>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close modal functionality
        modal.querySelector('.close').onclick = () => modal.remove();
        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };
    }).catch(error => {
        console.error('Test error:', error);
        alert('Error testing database: ' + error.message);
    });
}

// Initialize everything with enhanced functionality
document.addEventListener('DOMContentLoaded', () => {
    initializeDashboard();
});

// Make functions globally available
window.selectBus = selectBus;
window.viewBusDetails = viewBusDetails;
window.editBus = editBus;
window.deleteBus = deleteBus;
window.replyToFeedback = replyToFeedback;
window.deleteFeedback = deleteFeedback;
window.showNotification = showNotification;
window.loadBusFleetOverview = loadBusFleetOverview;
window.addNewBus = addNewBus;
window.refreshFleet = refreshFleet;
window.viewAllFeedback = viewAllFeedback;
window.assignRoute = assignRoute;
window.contactDriver = contactDriver;
window.closeModal = closeModal;
window.approveDriver = approveDriver;
window.rejectDriver = rejectDriver;
window.refreshDashboard = refreshDashboard;
window.updateStatistics = updateStatistics;
window.testPendingDrivers = testPendingDrivers; 