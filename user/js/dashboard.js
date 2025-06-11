// Enhanced Google Maps Style Dashboard for V-TRACK
class GoogleMapsDashboard {
    constructor() {
        this.firebaseManager = null;
        this.mapManager = null;
        this.utils = null;
        this.selectedBus = null;
        this.activeFilters = {
            activeBuses: true,
            inactiveBuses: true,
            routeHistory: false
        };
        
        this.initialize();
    }

    initialize() {
        // Initialize modules
        this.firebaseManager = new FirebaseManager();
        this.utils = new Utils();
        
        // Wait for Google Maps to load before initializing map manager
        this.waitForGoogleMapsAndInitialize();
        
        // Make managers globally accessible
        window.firebaseManager = this.firebaseManager;
        window.utils = this.utils;
        
        // Initialize UI components
        this.initializeSidebar();
        this.initializeFloatingButtons();
        this.initializeSearch();
        this.initializeBusDropdown();
        
        // Initialize saved places and recent searches
        this.utils.updateSavedPlacesList();
        this.utils.updateRecentSearchesList();
    }

    waitForGoogleMapsAndInitialize() {
        const checkGoogleMaps = setInterval(() => {
            if (window.google && window.google.maps) {
                clearInterval(checkGoogleMaps);
                console.log('Google Maps loaded, initializing map manager...');
                this.mapManager = new MapManager(this.firebaseManager);
                window.mapManager = this.mapManager;
                
                // Start real-time updates after map is ready
                this.startRealTimeUpdates();
                this.updateNotification();
            }
        }, 100);

        // Timeout after 10 seconds
        setTimeout(() => {
            clearInterval(checkGoogleMaps);
            if (!this.mapManager) {
                console.warn('Google Maps failed to load, initializing without Google services...');
                this.mapManager = new MapManager(this.firebaseManager);
                window.mapManager = this.mapManager;
                
                // Start real-time updates
                this.startRealTimeUpdates();
                this.updateNotification();
            }
        }, 10000);
    }

    initializeSidebar() {
        const sidebarToggle = document.getElementById('sidebarToggle');
        const sidebarClose = document.getElementById('sidebarClose');
        const sidebar = document.getElementById('sidebar');

        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => {
                this.utils.toggleSidebar();
            });
        }

        if (sidebarClose) {
            sidebarClose.addEventListener('click', () => {
                this.utils.closeSidebar();
            });
        }

        // Close sidebar when clicking outside
        document.addEventListener('click', (e) => {
            if (sidebar && !sidebar.contains(e.target) && !sidebarToggle?.contains(e.target)) {
                this.utils.closeSidebar();
            }
        });
    }

    initializeFloatingButtons() {
        // Current location button
        const currentLocationBtn = document.getElementById('currentLocationBtn');
        if (currentLocationBtn) {
            currentLocationBtn.addEventListener('click', () => {
                if (this.mapManager) {
                    this.mapManager.getCurrentLocation();
                } else {
                    this.utils.showNotification('Map not ready yet, please wait...', 'info');
                }
            });
        }

        // Active buses button
        const activeBusesBtn = document.getElementById('activeBusesBtn');
        if (activeBusesBtn) {
            activeBusesBtn.addEventListener('click', () => {
                this.toggleActiveBuses();
            });
        }

        // Inactive buses button
        const inactiveBusesBtn = document.getElementById('inactiveBusesBtn');
        if (inactiveBusesBtn) {
            inactiveBusesBtn.addEventListener('click', () => {
                this.toggleInactiveBuses();
            });
        }

        // Route history button
        const routeHistoryBtn = document.getElementById('routeHistoryBtn');
        if (routeHistoryBtn) {
            routeHistoryBtn.addEventListener('click', () => {
                this.toggleRouteHistory();
            });
        }

        // Get directions button
        const directionsBtn = document.getElementById('directionsBtn');
        if (directionsBtn) {
            directionsBtn.addEventListener('click', () => {
                this.getDirections();
            });
        }
    }

    initializeSearch() {
        const searchInput = document.querySelector('.search-input');
        const searchFilter = document.getElementById('searchFilter');

        if (searchInput) {
            // Debounced search
            const debouncedSearch = this.utils.debounce((query) => {
                this.utils.performSearch(query);
            }, 300);

            searchInput.addEventListener('input', (e) => {
                debouncedSearch(e.target.value);
            });

            // Add to recent searches when search is performed
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && searchInput.value.trim()) {
                    this.utils.addToRecentSearches(searchInput.value.trim());
                }
            });
        }

        if (searchFilter) {
            searchFilter.addEventListener('change', (e) => {
                this.utils.filterSearchResults(e.target.value);
            });
        }
    }

    initializeBusDropdown() {
        // Create bus dropdown in sidebar
        const busList = document.getElementById('busList');
        if (busList) {
            this.utils.showLoading('busList', 'Loading buses...');
        }
    }

    // Toggle active buses filter
    toggleActiveBuses() {
        this.activeFilters.activeBuses = !this.activeFilters.activeBuses;
        const btn = document.getElementById('activeBusesBtn');
        if (btn) {
            if (this.activeFilters.activeBuses) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        }
        this.updateBusVisibility();
    }

    // Toggle inactive buses filter
    toggleInactiveBuses() {
        this.activeFilters.inactiveBuses = !this.activeFilters.inactiveBuses;
        const btn = document.getElementById('inactiveBusesBtn');
        if (btn) {
            if (this.activeFilters.inactiveBuses) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        }
        this.updateBusVisibility();
    }

    // Toggle route history
    toggleRouteHistory() {
        this.activeFilters.routeHistory = !this.activeFilters.routeHistory;
        const btn = document.getElementById('routeHistoryBtn');
        if (btn) {
            if (this.activeFilters.routeHistory) {
                btn.classList.add('active');
                if (this.selectedBus && this.mapManager) {
                    this.mapManager.showRouteHistory(this.selectedBus);
                }
            } else {
                btn.classList.remove('active');
                if (this.mapManager) {
                    this.mapManager.clearRouteHistory();
                }
            }
        }
    }

    // Update bus visibility based on filters
    updateBusVisibility() {
        if (!this.mapManager) return;

        Object.keys(this.mapManager.busMarkers).forEach(busId => {
            const marker = this.mapManager.busMarkers[busId];
            const isActive = this.firebaseManager.isBusActive(marker.getLatLng());
            
            if ((isActive && this.activeFilters.activeBuses) || (!isActive && this.activeFilters.inactiveBuses)) {
                marker.addTo(this.mapManager.map);
            } else {
                marker.remove();
            }
        });
    }

    // Get directions functionality
    getDirections() {
        if (!this.selectedBus) {
            this.utils.showNotification('Please select a bus first', 'info');
            return;
        }

        if (!this.mapManager || !this.mapManager.currentLocation) {
            this.utils.showNotification('Please get your current location first', 'info');
            return;
        }

        const busLocation = this.mapManager.busMarkers[this.selectedBus].getLatLng();
        this.mapManager.getDirections(this.mapManager.currentLocation, busLocation);
    }

    // Update bus list in sidebar
    updateBusList(busData) {
        const busList = document.getElementById('busList');
        if (!busList) return;

        const buses = Object.keys(busData).map(busId => {
            const bus = busData[busId];
            const isActive = this.firebaseManager.isBusActive(bus.timestamp);
            return { id: busId, ...bus, isActive };
        });

        busList.innerHTML = buses.map(bus => `
            <div class="bus-item ${bus.id === this.selectedBus ? 'selected' : ''}" 
                 onclick="dashboard.selectBus('${bus.id}')">
                <div class="bus-icon ${bus.isActive ? 'active' : 'inactive'}">
                    ${bus.id}
                </div>
                <div class="bus-info">
                    <div class="bus-name">Bus ${bus.id}</div>
                    <div class="bus-status">${bus.isActive ? 'Active' : 'Inactive'} • ${this.utils.formatTime(bus.timestamp)}</div>
                </div>
            </div>
        `).join('');
    }

    // Select a bus
    selectBus(busId) {
        this.selectedBus = busId;
        
        if (this.mapManager) {
            this.mapManager.selectBus(busId);
        }
        
        // Update bus list selection
        document.querySelectorAll('.bus-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        const selectedItem = document.querySelector(`[onclick="dashboard.selectBus('${busId}')"]`);
        if (selectedItem) {
            selectedItem.classList.add('selected');
        }

        // Show route history if enabled
        if (this.activeFilters.routeHistory && this.mapManager) {
            this.mapManager.showRouteHistory(busId);
        }

        // Update bottom info bar
        if (this.mapManager) {
            this.mapManager.updateBottomInfoBar(busId);
        }
    }

    // Start real-time updates
    startRealTimeUpdates() {
        // Listen to bus locations
        this.firebaseManager.listenToBusLocations((busData) => {
            if (this.mapManager) {
                this.mapManager.updateBusMarkers(busData);
            }
            this.updateBusList(busData);
            this.updateNotification();
        });

        // Listen to bus details
        this.firebaseManager.listenToBusDetails((busDetails) => {
            // Update bus details if needed
            console.log('Bus details updated:', busDetails);
        });

        // Update notification every 30 seconds
        setInterval(() => {
            this.updateNotification();
        }, 30000);
    }

    // Update notification
    updateNotification() {
        if (!this.mapManager) return;

        const activeBuses = Object.values(this.mapManager.busMarkers).filter(marker => 
            this.firebaseManager.isBusActive(marker.getLatLng())
        ).length;
        
        const notification = document.getElementById('bottomNotification');
        if (notification) {
            const subtitle = notification.querySelector('.notification-subtitle');
            if (subtitle) {
                subtitle.textContent = `Tracking ${activeBuses} buses in your area • Last updated ${new Date().toLocaleTimeString()}`;
            }
        }
    }

    // Global functions for onclick handlers
    static getCurrentLocation() {
        if (window.dashboard && window.dashboard.mapManager) {
            window.dashboard.mapManager.getCurrentLocation();
        } else {
            window.dashboard?.utils?.showNotification('Map not ready yet, please wait...', 'info');
        }
    }

    static setHomeLocation() {
        if (window.dashboard && window.dashboard.mapManager && window.dashboard.mapManager.currentLocation) {
            window.dashboard.utils.addSavedPlace('Home', window.dashboard.mapManager.currentLocation, 'home');
            window.dashboard.utils.showNotification('Home location saved!', 'success');
        } else {
            window.dashboard.utils.showNotification('Please get your location first', 'info');
        }
    }

    static findNearbyBusStops() {
        if (window.dashboard && window.dashboard.mapManager && window.dashboard.mapManager.currentLocation) {
            // Simulate finding nearby bus stops
            const nearbyStops = [
                { name: 'Central Bus Stop', distance: '0.2 km' },
                { name: 'University Bus Stop', distance: '0.5 km' },
                { name: 'Hospital Bus Stop', distance: '0.8 km' }
            ];
            
            window.dashboard.utils.showNotification(`Found ${nearbyStops.length} nearby bus stops`, 'info');
        } else {
            window.dashboard.utils.showNotification('Please get your location first', 'info');
        }
    }

    static addSavedPlace() {
        const placeName = prompt('Enter place name:');
        if (placeName && window.dashboard && window.dashboard.mapManager && window.dashboard.mapManager.currentLocation) {
            window.dashboard.utils.addSavedPlace(placeName, window.dashboard.mapManager.currentLocation);
            window.dashboard.utils.showNotification('Place saved!', 'success');
        } else {
            window.dashboard.utils.showNotification('Please get your location first', 'info');
        }
    }

    static goToSavedPlace(placeKey) {
        if (window.dashboard && window.dashboard.utils) {
            window.dashboard.utils.goToSavedPlace(placeKey);
        }
    }

    static repeatSearch(search) {
        if (window.dashboard && window.dashboard.utils) {
            window.dashboard.utils.repeatSearch(search);
        }
    }

    static hideNotification() {
        if (window.dashboard && window.dashboard.utils) {
            window.dashboard.utils.hideNotification();
        }
    }
}

// Initialize dashboard when DOM is loaded
let dashboard;
document.addEventListener('DOMContentLoaded', function() {
    dashboard = new GoogleMapsDashboard();
    
    // Make dashboard globally accessible
    window.dashboard = dashboard;
});

// Global functions for onclick handlers
window.getCurrentLocation = GoogleMapsDashboard.getCurrentLocation;
window.setHomeLocation = GoogleMapsDashboard.setHomeLocation;
window.findNearbyBusStops = GoogleMapsDashboard.findNearbyBusStops;
window.addSavedPlace = GoogleMapsDashboard.addSavedPlace;
window.goToSavedPlace = GoogleMapsDashboard.goToSavedPlace;
window.repeatSearch = GoogleMapsDashboard.repeatSearch;
window.hideNotification = GoogleMapsDashboard.hideNotification;