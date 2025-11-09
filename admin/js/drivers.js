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
let currentDriverId = null;
let buses = [];
let routes = [];
let driverStats = {
    totalDrivers: 0,
    activeDrivers: 0,
    totalTrips: 0,
    totalDistance: 0
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait for navbar to load first
    setTimeout(() => {
        navbarLoader.loadNavbar('navbar-container', 'Driver Management');
        
        // Initialize components after navbar is loaded
        setTimeout(() => {
            loadDrivers();
            loadBusesAndRoutes();
            loadDriverStatistics();
            setupEventListeners();
        }, 500);
    }, 100);
});

// Load buses and routes for dropdowns
function loadBusesAndRoutes() {
    // Load buses
    database.ref('busDetails').once('value')
        .then(snapshot => {
            buses = [];
            snapshot.forEach(child => {
                const bus = child.val();
                buses.push({
                    id: child.key,
                    name: `${bus.busName} - ${bus.busNumber || 'No number'}`
                });
            });
        })
        .catch(error => {
            console.error('Error loading buses:', error);
        });

    // Load routes
    database.ref('routes').once('value')
        .then(snapshot => {
            routes = [];
            snapshot.forEach(child => {
                const route = child.val();
                routes.push({
                    id: child.key,
                    name: route.name
                });
            });
        })
        .catch(error => {
            console.error('Error loading routes:', error);
        });
}

// Load drivers from Firebase
function loadDrivers() {
    // Load pending drivers
    database.ref('pendingDrivers').on('value', snapshot => {
        const container = document.getElementById('pendingDriversContainer');
        const countElement = document.getElementById('pendingCount');
        
        if (!container) return;
        
        let count = 0;
        let html = '';
        
        snapshot.forEach(child => {
            count++;
            const driver = child.val();
            html += `
                <div class="driver-card pending">
                    <div class="driver-info">
                        <h4>${driver.name || 'Unknown'}</h4>
                        <p><i class="fas fa-id-card"></i> License: ${driver.licenseNumber || 'N/A'}</p>
                        <p><i class="fas fa-phone"></i> Phone: ${driver.phone || 'N/A'}</p>
                        <p><i class="fas fa-envelope"></i> Email: ${driver.email || 'N/A'}</p>
                        <p><i class="fas fa-clock"></i> Applied: ${new Date(driver.timestamp || Date.now()).toLocaleDateString()}</p>
                        <span class="status-badge status-pending">Pending</span>
                    </div>
                    <div class="driver-actions">
                        <button onclick="approveDriver('${child.key}')" class="btn btn-approve">
                            <i class="fas fa-check"></i> Approve
                        </button>
                        <button onclick="rejectDriver('${child.key}')" class="btn btn-reject">
                            <i class="fas fa-times"></i> Reject
                        </button>
                    </div>
                </div>
            `;
        });
        
        if (count === 0) {
            html = `
                <div class="empty-state">
                    <i class="fas fa-clock"></i>
                    <h3>No Pending Applications</h3>
                    <p>All driver applications have been processed.</p>
                </div>
            `;
        }
        
        container.innerHTML = html;
        
        // Update count
        if (countElement) {
            countElement.textContent = count;
        }
    });

    // Load active drivers
    database.ref('driverInfo').on('value', async snapshot => {
        const container = document.getElementById('activeDriversContainer');
        const countElement = document.getElementById('activeCount');
        
        if (!container) return;
        
        let count = 0;
        const driverPromises = [];
        
        snapshot.forEach(child => {
            count++;
            const driver = child.val();
            
            // Get bus and route names
            const busName = getBusName(driver.assignedBusId);
            const routeName = getRouteName(driver.assignedRouteId);
            
            // Create promise for driver stats
            driverPromises.push(
                loadDriverTripStats(child.key).then(stats => ({
                    driver,
                    driverId: child.key,
                    busName,
                    routeName,
                    stats
                }))
            );
        });
        
        // Wait for all stats to load
        const driversWithStats = await Promise.all(driverPromises);
        
        let html = '';
        driversWithStats.forEach(({ driver, driverId, busName, routeName, stats }) => {
            html += `
                <div class="driver-card active">
                    <div class="driver-info">
                        <h4>${driver.name || 'Unknown'}</h4>
                        <p><i class="fas fa-id-card"></i> License: ${driver.licenseNumber || 'N/A'}</p>
                        <p><i class="fas fa-phone"></i> Phone: ${driver.phone || 'N/A'}</p>
                        <p><i class="fas fa-envelope"></i> Email: ${driver.email || 'N/A'}</p>
                        <p><i class="fas fa-bus"></i> Bus: ${busName}</p>
                        <p><i class="fas fa-route"></i> Route: ${routeName}</p>
                        <p><i class="fas fa-star"></i> Rank: ${driver.rank || 'Bronze'}</p>
                        <p><i class="fas fa-route"></i> Trips: ${stats.trips || 0}</p>
                        <p><i class="fas fa-road"></i> Distance: ${(stats.distance || 0).toFixed(1)} km</p>
                        <span class="status-badge status-active">Active</span>
                    </div>
                    <div class="driver-actions">
                        <button onclick="editDriver('${driverId}')" class="btn btn-edit">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button onclick="viewDriverStats('${driverId}')" class="btn btn-primary">
                            <i class="fas fa-chart-line"></i> Stats
                        </button>
                        <button onclick="removeDriver('${driverId}')" class="btn btn-remove">
                            <i class="fas fa-trash"></i> Remove
                        </button>
                    </div>
                </div>
            `;
        });
        
        if (count === 0) {
            html = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <h3>No Active Drivers</h3>
                    <p>No drivers have been approved yet.</p>
                </div>
            `;
        }
        
        container.innerHTML = html;
        
        // Update count
        if (countElement) {
            countElement.textContent = count;
        }
    });
}

// Load driver trip statistics
async function loadDriverTripStats(driverId) {
    try {
        let trips = 0;
        let distance = 0;
        
        // Check tripHistory/drivers/{driverId}
        const driverTripsSnapshot = await database.ref(`tripHistory/drivers/${driverId}`).once('value');
        driverTripsSnapshot.forEach(() => {
            trips++;
        });
        
        // Also check trips for this driver
        const allTripsSnapshot = await database.ref('trips').once('value');
        allTripsSnapshot.forEach(busSnapshot => {
            busSnapshot.forEach(tripSnapshot => {
                const trip = tripSnapshot.val();
                if (trip.driverId === driverId) {
                    trips++;
                    distance += trip.distance || trip.totalDistance || 0;
                }
            });
        });
        
        return { trips, distance };
    } catch (error) {
        console.error('Error loading driver trip stats:', error);
        return { trips: 0, distance: 0 };
    }
}

// View driver statistics
async function viewDriverStats(driverId) {
    try {
        const driverSnapshot = await database.ref(`driverInfo/${driverId}`).once('value');
        const driver = driverSnapshot.val();
        
        if (!driver) {
            showNotification('Driver not found', 'error');
            return;
        }
        
        const stats = await loadDriverTripStats(driverId);
        
        const details = `
Driver Statistics:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: ${driver.name || 'Unknown'}
Email: ${driver.email || 'N/A'}
License: ${driver.licenseNumber || 'N/A'}
Phone: ${driver.phone || 'N/A'}
Rank: ${driver.rank || 'Bronze'}
Total Trips: ${stats.trips}
Total Distance: ${stats.distance.toFixed(2)} km
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        `;
        
        alert(details);
    } catch (error) {
        console.error('Error loading driver stats:', error);
        showNotification('Error loading driver statistics', 'error');
    }
}

// Get bus name by ID
function getBusName(busId) {
    if (!busId) return 'Not assigned';
    const bus = buses.find(b => b.id === busId);
    return bus ? bus.name : 'Unknown bus';
}

// Get route name by ID
function getRouteName(routeId) {
    if (!routeId) return 'Not assigned';
    const route = routes.find(r => r.id === routeId);
    return route ? route.name : 'Unknown route';
}

// Show tab content
function showTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

// Approve driver
async function approveDriver(driverId) {
    try {
        const snapshot = await database.ref(`pendingDrivers/${driverId}`).once('value');
        const driverData = snapshot.val();
        
        if (!driverData) {
            showNotification('Driver data not found', 'error');
            return;
        }
        
        // Create approved driver data
        const approvedDriver = {
            ...driverData,
            status: 'active',
            approvedAt: Date.now(),
            rank: 'Bronze',
            assignedBusId: '',
            assignedRouteId: ''
        };
        
        // Move to driverInfo
        await database.ref(`driverInfo/${driverId}`).set(approvedDriver);
        
        // Remove from pending
        await database.ref(`pendingDrivers/${driverId}`).remove();
        
        showNotification('Driver approved successfully');
    } catch (error) {
        console.error('Error approving driver:', error);
        showNotification('Error approving driver', 'error');
    }
}

// Reject driver
async function rejectDriver(driverId) {
    if (!confirm('Are you sure you want to reject this driver?')) {
        return;
    }
    
    try {
        await database.ref(`pendingDrivers/${driverId}`).remove();
        showNotification('Driver rejected successfully');
    } catch (error) {
        console.error('Error rejecting driver:', error);
        showNotification('Error rejecting driver', 'error');
    }
}

// Edit driver
async function editDriver(driverId) {
    try {
        currentDriverId = driverId;
        
        const snapshot = await database.ref(`driverInfo/${driverId}`).once('value');
        const driver = snapshot.val();
        
        if (!driver) {
            showNotification('Driver not found', 'error');
            return;
        }
        
        // Populate form
        document.getElementById('editName').value = driver.name || '';
        document.getElementById('editLicense').value = driver.licenseNumber || '';
        document.getElementById('editPhone').value = driver.phone || '';
        document.getElementById('editRank').value = driver.rank || 'Bronze';
        
        // Populate bus dropdown
        const busSelect = document.getElementById('editBus');
        busSelect.innerHTML = '<option value="">Select Bus</option>';
        buses.forEach(bus => {
            const option = document.createElement('option');
            option.value = bus.id;
            option.textContent = bus.name;
            if (bus.id === driver.assignedBusId) {
                option.selected = true;
            }
            busSelect.appendChild(option);
        });
        
        // Populate route dropdown
        const routeSelect = document.getElementById('editRoute');
        routeSelect.innerHTML = '<option value="">Select Route</option>';
        routes.forEach(route => {
            const option = document.createElement('option');
            option.value = route.id;
            option.textContent = route.name;
            if (route.id === driver.assignedRouteId) {
                option.selected = true;
            }
            routeSelect.appendChild(option);
        });
        
        // Show modal
        document.getElementById('driverEditModal').style.display = 'block';
        
    } catch (error) {
        console.error('Error loading driver data:', error);
        showNotification('Error loading driver data', 'error');
    }
}

// Remove driver
async function removeDriver(driverId) {
    if (!confirm('Are you sure you want to remove this driver? This action cannot be undone.')) {
        return;
    }
    
    try {
        await database.ref(`driverInfo/${driverId}`).remove();
        showNotification('Driver removed successfully');
    } catch (error) {
        console.error('Error removing driver:', error);
        showNotification('Error removing driver', 'error');
    }
}

// Close modal
function closeModal() {
    document.getElementById('driverEditModal').style.display = 'none';
    currentDriverId = null;
}

// Setup event listeners
function setupEventListeners() {
    // Form submission
    const form = document.getElementById('driverEditForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmission);
    }
    
    // Modal close events
    const modal = document.getElementById('driverEditModal');
    const closeBtn = document.querySelector('.close');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }
    
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    }
}

// Handle form submission
async function handleFormSubmission(e) {
    e.preventDefault();
    
    if (!currentDriverId) {
        showNotification('No driver selected for editing', 'error');
        return;
    }
    
    try {
        const updates = {
            name: document.getElementById('editName').value,
            licenseNumber: document.getElementById('editLicense').value,
            phone: document.getElementById('editPhone').value,
            assignedBusId: document.getElementById('editBus').value,
            assignedRouteId: document.getElementById('editRoute').value,
            rank: document.getElementById('editRank').value,
            lastUpdated: Date.now()
        };
        
        await database.ref(`driverInfo/${currentDriverId}`).update(updates);
        
        showNotification('Driver information updated successfully');
        closeModal();
        
    } catch (error) {
        console.error('Error updating driver:', error);
        showNotification('Error updating driver information', 'error');
    }
}

// Show notification
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `<i class="fas fa-${type === 'success' ? 'check' : 'exclamation-triangle'}"></i> ${message}`;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

// Load driver statistics
async function loadDriverStatistics() {
    try {
        // Count total drivers
        const driversSnapshot = await database.ref('driverInfo').once('value');
        let totalDrivers = 0;
        let activeDrivers = 0;
        
        driversSnapshot.forEach(() => {
            totalDrivers++;
            activeDrivers++;
        });
        
        // Count trips and distance
        let totalTrips = 0;
        let totalDistance = 0;
        
        const tripsSnapshot = await database.ref('tripHistory').once('value');
        tripsSnapshot.forEach(busSnapshot => {
            if (busSnapshot.key === 'drivers') {
                // Handle driver-specific trips
                busSnapshot.forEach(driverSnapshot => {
                    driverSnapshot.forEach(tripSnapshot => {
                        totalTrips++;
                        const trip = tripSnapshot.val();
                        totalDistance += trip.distance || trip.totalDistance || 0;
                    });
                });
            } else {
                // Handle bus-specific trips
                busSnapshot.forEach(tripSnapshot => {
                    totalTrips++;
                    const trip = tripSnapshot.val();
                    totalDistance += trip.distance || trip.totalDistance || 0;
                });
            }
        });
        
        // Also check trips path
        const activeTripsSnapshot = await database.ref('trips').once('value');
        activeTripsSnapshot.forEach(busSnapshot => {
            busSnapshot.forEach(tripSnapshot => {
                const trip = tripSnapshot.val();
                if (trip.status === 'active' || !trip.status) {
                    totalTrips++;
                    totalDistance += trip.distance || trip.totalDistance || 0;
                }
            });
        });
        
        driverStats = {
            totalDrivers,
            activeDrivers,
            totalTrips,
            totalDistance
        };
        
        updateDriverStatistics();
    } catch (error) {
        console.error('Error loading driver statistics:', error);
    }
}

// Update driver statistics display
function updateDriverStatistics() {
    document.getElementById('totalDrivers').textContent = driverStats.totalDrivers;
    document.getElementById('activeDriversCount').textContent = driverStats.activeDrivers;
    document.getElementById('totalTrips').textContent = driverStats.totalTrips;
    document.getElementById('totalDistance').textContent = driverStats.totalDistance.toFixed(1);
}

// Make functions globally available
window.showTab = showTab;
window.approveDriver = approveDriver;
window.rejectDriver = rejectDriver;
window.editDriver = editDriver;
window.removeDriver = removeDriver;
window.closeModal = closeModal;
window.viewDriverStats = viewDriverStats; 