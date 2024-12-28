// Initialize Firebase (use your existing config)
const firebaseConfig = {
    // Your Firebase config
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

// Load dashboard data
document.addEventListener('DOMContentLoaded', () => {
    loadQuickStats();
    initializeSpeedChart();
    loadDriverPerformance();
    loadRecentFeedback();
    loadBusStatus();
    initializeRouteChart();
});

// Load quick statistics
function loadQuickStats() {
    database.ref('busDetails').once('value', snapshot => {
        document.getElementById('total-buses').textContent = snapshot.numChildren();
    });

    // Count active drivers
    database.ref('driverInfo').once('value', snapshot => {
        const activeDrivers = [...snapshot.val() || []].filter(driver => driver.status === 'active').length;
        document.getElementById('total-drivers').textContent = activeDrivers;
    });

    // Count active routes
    database.ref('BusLocation').once('value', snapshot => {
        document.getElementById('active-routes').textContent = snapshot.numChildren();
    });

    // Calculate average rating
    database.ref('feedback').once('value', snapshot => {
        let totalRating = 0;
        let count = 0;
        snapshot.forEach(child => {
            if (child.val().rating) {
                totalRating += child.val().rating;
                count++;
            }
        });
        const avgRating = count > 0 ? (totalRating / count).toFixed(1) : '0.0';
        document.getElementById('avg-rating').textContent = avgRating;
    });
}

// Initialize speed analysis chart
function initializeSpeedChart() {
    const ctx = document.getElementById('speedChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['6AM', '9AM', '12PM', '3PM', '6PM', '9PM'],
            datasets: [{
                label: 'Average Speed (km/h)',
                data: [25, 35, 30, 40, 35, 25],
                borderColor: '#007bff',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Average Bus Speed Throughout Day'
                }
            }
        }
    });
}

// Load driver performance data
function loadDriverPerformance() {
    const container = document.getElementById('driverPerformance');
    database.ref('driverInfo').once('value', snapshot => {
        snapshot.forEach(child => {
            const driver = child.val();
            const driverElement = createDriverElement(driver);
            container.appendChild(driverElement);
        });
    });
}

function createDriverElement(driver) {
    const div = document.createElement('div');
    div.className = 'driver-item';
    div.innerHTML = `
        <div>
            <h4>${driver.name}</h4>
            <p>Bus: ${driver.busNumber}</p>
        </div>
        <div class="driver-rating">
            <span>${driver.rating || '4.5'}</span>
            <i class="fas fa-star rating-star"></i>
        </div>
    `;
    return div;
}

// Load recent feedback
function loadRecentFeedback() {
    const container = document.getElementById('recentFeedback');
    database.ref('feedback').orderByChild('timestamp').limitToLast(5).once('value', snapshot => {
        const feedbacks = [];
        snapshot.forEach(child => {
            feedbacks.unshift(child.val());
        });
        
        feedbacks.forEach(feedback => {
            const feedbackElement = createFeedbackElement(feedback);
            container.appendChild(feedbackElement);
        });
    });
}

function createFeedbackElement(feedback) {
    const div = document.createElement('div');
    div.className = 'feedback-item';
    div.innerHTML = `
        <div>
            <p>${feedback.comment}</p>
            <small>${new Date(feedback.timestamp).toLocaleDateString()}</small>
        </div>
        <div class="driver-rating">
            <span>${feedback.rating}</span>
            <i class="fas fa-star rating-star"></i>
        </div>
    `;
    return div;
}

// Load real-time bus status
function loadBusStatus() {
    const container = document.getElementById('busStatus');
    database.ref('BusLocation').on('value', snapshot => {
        container.innerHTML = ''; // Clear existing items
        snapshot.forEach(child => {
            const busStatus = createBusStatusElement(child.key, child.val());
            container.appendChild(busStatus);
        });
    });
}

function createBusStatusElement(busId, data) {
    const div = document.createElement('div');
    div.className = 'bus-status-item';
    
    // Get the latest location update
    const timestamps = Object.keys(data);
    const latestData = data[timestamps[timestamps.length - 1]];
    
    const speed = calculateSpeed(latestData);
    const isSpeedWarning = speed > 60; // Speed warning threshold

    div.innerHTML = `
        <div>
            <h4>Bus ${busId}</h4>
            <p class="${isSpeedWarning ? 'speed-warning' : ''}">
                Speed: ${speed.toFixed(1)} km/h
            </p>
        </div>
        <div class="status-active">
            <i class="fas fa-circle"></i>
            Active
        </div>
    `;
    return div;
}

// Initialize route analysis chart
function initializeRouteChart() {
    const ctx = document.getElementById('routeChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Route 1', 'Route 2', 'Route 3', 'Route 4'],
            datasets: [{
                label: 'Average Daily Passengers',
                data: [120, 150, 100, 80],
                backgroundColor: '#28a745'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Route Usage Analysis'
                }
            }
        }
    });
}

// Utility function to calculate speed from location data
function calculateSpeed(locationData) {
    // Implementation depends on your data structure
    // This is a placeholder that returns a random speed
    return Math.random() * 40 + 20;
}

// Logout function
function logout() {
    firebase.auth().signOut().then(() => {
        window.location.href = '/index.html';
    }).catch((error) => {
        console.error('Error logging out:', error);
    });
}

// Calculate and display speed violations
function trackSpeedViolations() {
    const container = document.getElementById('speedViolations');
    database.ref('BusLocation').on('value', snapshot => {
        let violations = {};
        
        snapshot.forEach(busSnapshot => {
            const busId = busSnapshot.key;
            const locations = busSnapshot.val();
            
            Object.values(locations).forEach(loc => {
                if (calculateSpeed(loc) > 60) { // Speed limit 60 km/h
                    if (!violations[busId]) {
                        violations[busId] = 0;
                    }
                    violations[busId]++;
                }
            });
        });

        displayViolationsChart(violations);
    });
}

// Add peak hours analysis
function analyzePeakHours() {
    const ctx = document.getElementById('peakHoursChart').getContext('2d');
    database.ref('BusLocation').once('value', snapshot => {
        const hourlyData = new Array(24).fill(0);
        
        snapshot.forEach(busSnapshot => {
            Object.values(busSnapshot.val()).forEach(loc => {
                const hour = new Date(loc.timestamp).getHours();
                hourlyData[hour]++;
            });
        });

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array.from({length: 24}, (_, i) => `${i}:00`),
                datasets: [{
                    label: 'Bus Activity',
                    data: hourlyData,
                    borderColor: '#4CAF50',
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Peak Hours Analysis'
                    }
                }
            }
        });
    });
}

// Add fuel efficiency tracking
function trackFuelEfficiency() {
    const container = document.getElementById('fuelEfficiency');
    database.ref('busDetails').once('value', snapshot => {
        const fuelData = {};
        
        snapshot.forEach(child => {
            const bus = child.val();
            if (bus.fuelConsumption) {
                fuelData[bus.busName] = {
                    consumption: bus.fuelConsumption,
                    distance: bus.totalDistance || 0
                };
            }
        });

        displayFuelEfficiencyChart(fuelData);
    });
}

// Add maintenance schedule
function showMaintenanceSchedule() {
    const container = document.getElementById('maintenanceSchedule');
    database.ref('maintenance').orderByChild('nextDate').once('value', snapshot => {
        container.innerHTML = '<h3>Upcoming Maintenance</h3>';
        
        snapshot.forEach(child => {
            const maintenance = child.val();
            const date = new Date(maintenance.nextDate);
            const isOverdue = date < new Date();
            
            container.innerHTML += `
                <div class="maintenance-item ${isOverdue ? 'overdue' : ''}">
                    <div class="maintenance-info">
                        <h4>Bus ${maintenance.busId}</h4>
                        <p>${maintenance.type}</p>
                        <p class="date">${date.toLocaleDateString()}</p>
                    </div>
                    <div class="maintenance-status">
                        ${isOverdue ? 'OVERDUE' : 'Scheduled'}
                    </div>
                </div>
            `;
        });
    });
} 