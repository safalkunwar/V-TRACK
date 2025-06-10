// Live Dashboard with Firebase Realtime Database Integration
class LiveDashboard {
    constructor() {
        this.database = null;
        this.charts = {};
        this.busData = {};
        this.alertsData = {};
        this.activeBuses = 0;
        this.inactiveBuses = 0;
        this.totalAlerts = 0;
        this.updateInterval = null;
    }

    // Initialize Firebase and start real-time updates
    async initialize() {
        try {
            // Initialize Firebase if not already done
            if (typeof firebase !== 'undefined' && !firebase.apps.length) {
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
                firebase.initializeApp(firebaseConfig);
            }
            
            this.database = firebase.database();
            
            // Start real-time listeners
            this.startBusLocationListener();
            this.startAlertsListener();
            this.startBusDetailsListener();
            
            // Initialize charts
            this.initializeCharts();
            
            // Update stats every 5 seconds
            this.updateInterval = setInterval(() => {
                this.updateDashboardStats();
            }, 5000);
            
            console.log('Live Dashboard initialized successfully');
        } catch (error) {
            console.error('Error initializing Live Dashboard:', error);
        }
    }

    // Listen to real-time bus location updates
    startBusLocationListener() {
        const busLocationRef = this.database.ref('BusLocation');
        
        busLocationRef.on('value', (snapshot) => {
            this.busData = {};
            let activeCount = 0;
            let inactiveCount = 0;
            
            snapshot.forEach((childSnapshot) => {
                const busId = childSnapshot.key;
                const busInfo = childSnapshot.val();
                
                if (busInfo) {
                    this.busData[busId] = {
                        id: busId,
                        latitude: busInfo.latitude || 0,
                        longitude: busInfo.longitude || 0,
                        timestamp: busInfo.timestamp || Date.now(),
                        active: busInfo.active || false,
                        lastUpdate: new Date(busInfo.timestamp || Date.now())
                    };
                    
                    if (busInfo.active) {
                        activeCount++;
                    } else {
                        inactiveCount++;
                    }
                }
            });
            
            this.activeBuses = activeCount;
            this.inactiveBuses = inactiveCount;
            
            this.updateDashboardStats();
            this.updateBusStatusCards();
            this.updateBusActivityChart();
            this.updateBusMovementChart();
        });
    }

    // Listen to real-time alerts
    startAlertsListener() {
        const alertsRef = this.database.ref('alerts');
        
        alertsRef.on('value', (snapshot) => {
            this.alertsData = {};
            let totalAlerts = 0;
            
            snapshot.forEach((childSnapshot) => {
                const alertId = childSnapshot.key;
                const alertInfo = childSnapshot.val();
                
                if (alertInfo) {
                    this.alertsData[alertId] = {
                        id: alertId,
                        latitude: alertInfo.latitude || 0,
                        longitude: alertInfo.longitude || 0,
                        timestamp: alertInfo.timestamp || Date.now(),
                        active: alertInfo.active || false,
                        userId: alertInfo.userId || 'Unknown',
                        date: new Date(alertInfo.timestamp || Date.now())
                    };
                    
                    if (alertInfo.active) {
                        totalAlerts++;
                    }
                }
            });
            
            this.totalAlerts = totalAlerts;
            this.updateDashboardStats();
            this.updateAlertsList();
        });
    }

    // Listen to bus details
    startBusDetailsListener() {
        const busDetailsRef = this.database.ref('busDetails');
        
        busDetailsRef.on('value', (snapshot) => {
            const busDetails = [];
            snapshot.forEach((childSnapshot) => {
                const busDetail = childSnapshot.val();
                if (busDetail) {
                    busDetails.push({
                        id: childSnapshot.key,
                        ...busDetail
                    });
                }
            });
            
            this.updateBusDetailsCards(busDetails);
        });
    }

    // Update dashboard statistics
    updateDashboardStats() {
        // Update total buses
        const totalBusesElement = document.getElementById('total-buses');
        if (totalBusesElement) {
            totalBusesElement.textContent = this.activeBuses + this.inactiveBuses;
        }

        // Update active drivers (approximation based on active buses)
        const totalDriversElement = document.getElementById('total-drivers');
        if (totalDriversElement) {
            totalDriversElement.textContent = this.activeBuses;
        }

        // Update active routes (approximation)
        const activeRoutesElement = document.getElementById('active-routes');
        if (activeRoutesElement) {
            activeRoutesElement.textContent = Math.ceil(this.activeBuses / 2);
        }

        // Update alerts count
        const avgRatingElement = document.getElementById('avg-rating');
        if (avgRatingElement) {
            avgRatingElement.textContent = this.totalAlerts;
        }
    }

    // Update bus status cards
    updateBusStatusCards() {
        const busStatusContainer = document.getElementById('busStatus');
        if (!busStatusContainer) return;

        let html = '';
        Object.values(this.busData).forEach(bus => {
            const statusClass = bus.active ? 'status-active' : 'status-inactive';
            const statusText = bus.active ? 'Active' : 'Inactive';
            const lastUpdate = bus.lastUpdate.toLocaleTimeString();
            
            html += `
                <div class="bus-status-item">
                    <h4>${bus.id}</h4>
                    <p class="${statusClass}">Status: ${statusText}</p>
                    <p>Last Update: ${lastUpdate}</p>
                    <p>Location: ${bus.latitude.toFixed(4)}, ${bus.longitude.toFixed(4)}</p>
                </div>
            `;
        });

        if (html === '') {
            html = '<p>No bus data available</p>';
        }

        busStatusContainer.innerHTML = html;
    }

    // Update alerts list
    updateAlertsList() {
        const alertsContainer = document.getElementById('recentFeedback');
        if (!alertsContainer) return;

        let html = '';
        const recentAlerts = Object.values(this.alertsData)
            .filter(alert => alert.active)
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 5);

        recentAlerts.forEach(alert => {
            const alertTime = alert.date.toLocaleString();
            html += `
                <div class="feedback-item">
                    <h4>Alert from User: ${alert.userId.substring(0, 8)}...</h4>
                    <p>Location: ${alert.latitude.toFixed(4)}, ${alert.longitude.toFixed(4)}</p>
                    <p>Time: ${alertTime}</p>
                </div>
            `;
        });

        if (html === '') {
            html = '<p>No active alerts</p>';
        }

        alertsContainer.innerHTML = html;
    }

    // Update bus details cards
    updateBusDetailsCards(busDetails) {
        const busFleetContainer = document.getElementById('busFleetContainer');
        if (!busFleetContainer) return;

        let html = '';
        busDetails.forEach(bus => {
            const isActive = this.busData[bus.id] && this.busData[bus.id].active;
            const statusClass = isActive ? 'status-active' : 'status-inactive';
            const statusText = isActive ? 'Active' : 'Inactive';
            
            html += `
                <div class="driver-card">
                    <h4>${bus.busName || bus.id}</h4>
                    <p><i class="fas fa-bus"></i> Bus Number: ${bus.busNumber || 'N/A'}</p>
                    <p><i class="fas fa-route"></i> Route: ${bus.busRoute || 'N/A'}</p>
                    <p><i class="fas fa-user"></i> Driver: ${bus.driverName || 'N/A'}</p>
                    <p class="${statusClass}"><i class="fas fa-circle"></i> Status: ${statusText}</p>
                </div>
            `;
        });

        if (html === '') {
            html = '<p>No bus details available</p>';
        }

        busFleetContainer.innerHTML = html;
    }

    // Initialize charts
    initializeCharts() {
        this.createBusStatusPieChart();
        this.createBusMovementLineChart();
    }

    // Create pie chart for active vs inactive buses
    createBusStatusPieChart() {
        const ctx = document.getElementById('vehicleTypeChart');
        if (!ctx) return;

        this.charts.busStatus = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Active Buses', 'Inactive Buses'],
                datasets: [{
                    data: [this.activeBuses, this.inactiveBuses],
                    backgroundColor: ['#28a745', '#dc3545'],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Bus Status Distribution',
                        font: {
                            size: 16,
                            weight: 'bold'
                        },
                        color: '#2c3e50'
                    },
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            color: '#2c3e50'
                        }
                    }
                }
            }
        });
    }

    // Create line chart for bus movement timestamps
    createBusMovementLineChart() {
        const ctx = document.getElementById('dailyActiveVehiclesChart');
        if (!ctx) return;

        // Get recent timestamps for each bus
        const busMovements = Object.values(this.busData)
            .filter(bus => bus.active)
            .map(bus => ({
                busId: bus.id,
                timestamp: bus.timestamp
            }))
            .sort((a, b) => a.timestamp - b.timestamp);

        const labels = busMovements.map(movement => 
            new Date(movement.timestamp).toLocaleTimeString()
        );
        const data = busMovements.map((_, index) => index + 1);

        this.charts.busMovement = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Bus Movement Activity',
                    data: data,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#667eea',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Recent Bus Movement Activity',
                        font: {
                            size: 16,
                            weight: 'bold'
                        },
                        color: '#2c3e50'
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(44, 62, 80, 0.1)'
                        },
                        ticks: {
                            color: '#2c3e50'
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(44, 62, 80, 0.1)'
                        },
                        ticks: {
                            color: '#2c3e50'
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    }

    // Update bus activity chart
    updateBusActivityChart() {
        if (this.charts.busStatus) {
            this.charts.busStatus.data.datasets[0].data = [this.activeBuses, this.inactiveBuses];
            this.charts.busStatus.update();
        }
    }

    // Update bus movement chart
    updateBusMovementChart() {
        if (this.charts.busMovement) {
            const busMovements = Object.values(this.busData)
                .filter(bus => bus.active)
                .map(bus => ({
                    busId: bus.id,
                    timestamp: bus.timestamp
                }))
                .sort((a, b) => a.timestamp - b.timestamp);

            const labels = busMovements.map(movement => 
                new Date(movement.timestamp).toLocaleTimeString()
            );
            const data = busMovements.map((_, index) => index + 1);

            this.charts.busMovement.data.labels = labels;
            this.charts.busMovement.data.datasets[0].data = data;
            this.charts.busMovement.update();
        }
    }

    // Cleanup on page unload
    cleanup() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        if (this.database) {
            this.database.ref('BusLocation').off();
            this.database.ref('alerts').off();
            this.database.ref('busDetails').off();
        }
        
        Object.values(this.charts).forEach(chart => {
            if (chart) {
                chart.destroy();
            }
        });
    }
}

// Initialize live dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const liveDashboard = new LiveDashboard();
    liveDashboard.initialize();
    
    // Make it globally accessible
    window.liveDashboard = liveDashboard;
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        liveDashboard.cleanup();
    });
}); 