// Firebase Module for V-TRACK
class FirebaseManager {
    constructor() {
        this.database = null;
        this.busListeners = {};
        this.routeHistoryListeners = {};
        this.mockData = this.generateMockData();
        this.initializeFirebase();
    }

    initializeFirebase() {
        // Firebase configuration
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

        try {
            // Initialize Firebase
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            
            this.database = firebase.database();
            console.log('Firebase initialized successfully');
        } catch (error) {
            console.warn('Firebase initialization failed, using mock data:', error);
            this.database = null;
        }
    }

    // Generate mock data for testing
    generateMockData() {
        const baseLat = 6.9271;
        const baseLng = 79.8612;
        const now = Date.now();
        
        return {
            'BUS001': {
                latitude: baseLat + (Math.random() - 0.5) * 0.01,
                longitude: baseLng + (Math.random() - 0.5) * 0.01,
                timestamp: now - Math.random() * 300000, // Random time within last 5 minutes
                speed: Math.floor(Math.random() * 40) + 20 // 20-60 km/h
            },
            'BUS002': {
                latitude: baseLat + (Math.random() - 0.5) * 0.01,
                longitude: baseLng + (Math.random() - 0.5) * 0.01,
                timestamp: now - Math.random() * 300000,
                speed: Math.floor(Math.random() * 40) + 20
            },
            'BUS003': {
                latitude: baseLat + (Math.random() - 0.5) * 0.01,
                longitude: baseLng + (Math.random() - 0.5) * 0.01,
                timestamp: now - Math.random() * 300000,
                speed: Math.floor(Math.random() * 40) + 20
            },
            'BUS004': {
                latitude: baseLat + (Math.random() - 0.5) * 0.01,
                longitude: baseLng + (Math.random() - 0.5) * 0.01,
                timestamp: now - Math.random() * 300000,
                speed: Math.floor(Math.random() * 40) + 20
            },
            'BUS005': {
                latitude: baseLat + (Math.random() - 0.5) * 0.01,
                longitude: baseLng + (Math.random() - 0.5) * 0.01,
                timestamp: now - Math.random() * 300000,
                speed: Math.floor(Math.random() * 40) + 20
            }
        };
    }

    // Update mock data periodically
    updateMockData() {
        if (!this.database) {
            Object.keys(this.mockData).forEach(busId => {
                const bus = this.mockData[busId];
                bus.latitude += (Math.random() - 0.5) * 0.001;
                bus.longitude += (Math.random() - 0.5) * 0.001;
                bus.timestamp = Date.now();
                bus.speed = Math.floor(Math.random() * 40) + 20;
            });
        }
    }

    // Listen to all bus locations
    listenToBusLocations(callback) {
        if (this.database) {
            try {
                const listener = this.database.ref('BusLocation').on('value', (snapshot) => {
                    const busData = snapshot.val();
                    if (busData) {
                        callback(busData);
                    }
                });
                
                this.busListeners['all'] = listener;
                return listener;
            } catch (error) {
                console.warn('Firebase connection failed, using mock data:', error);
            }
        }
        
        // Fallback to mock data
        callback(this.mockData);
        
        // Update mock data every 5 seconds
        setInterval(() => {
            this.updateMockData();
            callback(this.mockData);
        }, 5000);
        
        return null;
    }

    // Listen to specific bus location
    listenToBusLocation(busId, callback) {
        if (this.database) {
            try {
                const listener = this.database.ref(`BusLocation/${busId}`).on('value', (snapshot) => {
                    const busData = snapshot.val();
                    if (busData) {
                        callback(busId, busData);
                    }
                });
                
                this.busListeners[busId] = listener;
                return listener;
            } catch (error) {
                console.warn('Firebase connection failed, using mock data:', error);
            }
        }
        
        // Fallback to mock data
        if (this.mockData[busId]) {
            callback(busId, this.mockData[busId]);
        }
        
        return null;
    }

    // Get route history for a specific bus (today only)
    getRouteHistory(busId, callback) {
        if (this.database) {
            try {
                const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
                
                this.database.ref(`RouteHistory/${busId}/${today}`).once('value', (snapshot) => {
                    const routeData = snapshot.val();
                    if (routeData) {
                        // Convert to array and sort by timestamp
                        const routePoints = Object.values(routeData).sort((a, b) => a.timestamp - b.timestamp);
                        callback(routePoints);
                    } else {
                        callback([]);
                    }
                });
            } catch (error) {
                console.warn('Firebase connection failed, using mock route data:', error);
            }
        }
        
        // Fallback to mock route data
        const mockRoute = this.generateMockRoute(busId);
        callback(mockRoute);
    }

    // Generate mock route data
    generateMockRoute(busId) {
        const baseLat = 6.9271;
        const baseLng = 79.8612;
        const routePoints = [];
        const now = Date.now();
        
        // Generate 10 route points
        for (let i = 0; i < 10; i++) {
            routePoints.push({
                latitude: baseLat + (Math.random() - 0.5) * 0.01,
                longitude: baseLng + (Math.random() - 0.5) * 0.01,
                timestamp: now - (10 - i) * 60000 // Each point 1 minute apart
            });
        }
        
        return routePoints;
    }

    // Listen to route history updates for a specific bus
    listenToRouteHistory(busId, callback) {
        if (this.database) {
            try {
                const today = new Date().toISOString().split('T')[0];
                
                const listener = this.database.ref(`RouteHistory/${busId}/${today}`).on('child_added', (snapshot) => {
                    const routePoint = snapshot.val();
                    if (routePoint) {
                        callback(routePoint);
                    }
                });
                
                this.routeHistoryListeners[busId] = listener;
                return listener;
            } catch (error) {
                console.warn('Firebase connection failed:', error);
            }
        }
        
        return null;
    }

    // Get bus details
    getBusDetails(callback) {
        if (this.database) {
            try {
                this.database.ref('BusDetails').once('value', (snapshot) => {
                    const busDetails = snapshot.val();
                    callback(busDetails || {});
                });
            } catch (error) {
                console.warn('Firebase connection failed, using mock bus details:', error);
            }
        }
        
        // Fallback to mock bus details
        const mockDetails = {
            'BUS001': { driver: 'John Doe', capacity: 50, route: 'Central - University' },
            'BUS002': { driver: 'Jane Smith', capacity: 45, route: 'Hospital - Mall' },
            'BUS003': { driver: 'Mike Johnson', capacity: 55, route: 'Airport - City' },
            'BUS004': { driver: 'Sarah Wilson', capacity: 40, route: 'Station - Beach' },
            'BUS005': { driver: 'Tom Brown', capacity: 50, route: 'Market - Park' }
        };
        callback(mockDetails);
    }

    // Listen to bus details updates
    listenToBusDetails(callback) {
        if (this.database) {
            try {
                const listener = this.database.ref('BusDetails').on('value', (snapshot) => {
                    const busDetails = snapshot.val();
                    if (busDetails) {
                        callback(busDetails);
                    }
                });
                
                this.busListeners['details'] = listener;
                return listener;
            } catch (error) {
                console.warn('Firebase connection failed:', error);
            }
        }
        
        return null;
    }

    // Get current location of a specific bus
    getBusCurrentLocation(busId, callback) {
        if (this.database) {
            try {
                this.database.ref(`BusLocation/${busId}`).once('value', (snapshot) => {
                    const busData = snapshot.val();
                    if (busData) {
                        callback(busData);
                    } else {
                        callback(null);
                    }
                });
            } catch (error) {
                console.warn('Firebase connection failed, using mock data:', error);
            }
        }
        
        // Fallback to mock data
        if (this.mockData[busId]) {
            callback(this.mockData[busId]);
        } else {
            callback(null);
        }
    }

    // Check if bus is active (updated within last 5 minutes)
    isBusActive(timestamp) {
        const now = Date.now();
        const busTime = new Date(timestamp).getTime();
        return (now - busTime) < 300000; // 5 minutes
    }

    // Get active buses count
    getActiveBusesCount(busData) {
        return Object.values(busData).filter(bus => this.isBusActive(bus.timestamp)).length;
    }

    // Remove listeners
    removeBusListener(busId) {
        if (this.database && this.busListeners[busId]) {
            try {
                this.database.ref(`BusLocation/${busId}`).off('value', this.busListeners[busId]);
                delete this.busListeners[busId];
            } catch (error) {
                console.warn('Error removing bus listener:', error);
            }
        }
    }

    removeRouteHistoryListener(busId) {
        if (this.database && this.routeHistoryListeners[busId]) {
            try {
                const today = new Date().toISOString().split('T')[0];
                this.database.ref(`RouteHistory/${busId}/${today}`).off('child_added', this.routeHistoryListeners[busId]);
                delete this.routeHistoryListeners[busId];
            } catch (error) {
                console.warn('Error removing route history listener:', error);
            }
        }
    }

    // Remove all listeners
    removeAllListeners() {
        Object.keys(this.busListeners).forEach(busId => {
            this.removeBusListener(busId);
        });
        
        Object.keys(this.routeHistoryListeners).forEach(busId => {
            this.removeRouteHistoryListener(busId);
        });
    }
}

// Export for use in other modules
window.FirebaseManager = FirebaseManager; 