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
        this.searchResults = [];
        this.currentSearchFilter = 'all';
        
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
                this.performEnhancedSearch(query);
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
                this.currentSearchFilter = e.target.value;
                this.filterSearchResults();
            });
        }
    }

    // Enhanced search functionality
    performEnhancedSearch(query) {
        if (!query.trim()) {
            this.clearSearchResults();
            return;
        }

        // Add to recent searches
        this.utils.addToRecentSearches(query.trim());

        // Get current bus data
        const busData = this.firebaseManager.mockData || {};
        const busIds = Object.keys(busData);

        // Search in different categories based on filter
        let results = [];
        
        switch (this.currentSearchFilter) {
            case 'nearby-buses':
                results = this.searchBuses(query, busIds, busData);
                break;
            case 'bus-stops':
                results = this.searchBusStops(query);
                break;
            case 'restaurants':
                results = this.searchPlaces(query, 'restaurant');
                break;
            case 'hospitals':
                results = this.searchPlaces(query, 'hospital');
                break;
            default:
                // Search all categories
                results = [
                    ...this.searchBuses(query, busIds, busData),
                    ...this.searchBusStops(query),
                    ...this.searchPlaces(query, 'establishment')
                ];
        }

        this.searchResults = results;
        this.displaySearchResults(results);
    }

    // Search for buses
    searchBuses(query, busIds, busData) {
        const results = [];
        const queryLower = query.toLowerCase();

        busIds.forEach(busId => {
            if (busId.toLowerCase().includes(queryLower)) {
                const bus = busData[busId];
                if (bus) {
                    results.push({
                        type: 'bus',
                        id: busId,
                        name: `Bus ${busId}`,
                        location: [bus.latitude, bus.longitude],
                        data: bus
                    });
                }
            }
        });

        return results;
    }

    // Search for bus stops
    searchBusStops(query) {
        const queryLower = query.toLowerCase();
        const busStops = [
            { name: 'Central Bus Station', location: [6.9271, 79.8612] },
            { name: 'University Bus Stop', location: [6.9020, 79.8607] },
            { name: 'Hospital Bus Stop', location: [6.9271, 79.8612] },
            { name: 'Airport Bus Stop', location: [7.1808, 79.8841] },
            { name: 'Railway Station Bus Stop', location: [6.9369, 79.8507] }
        ];

        return busStops
            .filter(stop => stop.name.toLowerCase().includes(queryLower))
            .map(stop => ({
                type: 'bus-stop',
                name: stop.name,
                location: stop.location
            }));
    }

    // Search for places
    searchPlaces(query, type) {
        const queryLower = query.toLowerCase();
        const places = [
            { name: 'Colombo National Hospital', location: [6.9271, 79.8612], type: 'hospital' },
            { name: 'University of Colombo', location: [6.9020, 79.8607], type: 'university' },
            { name: 'Galle Face Green', location: [6.9271, 79.8412], type: 'park' },
            { name: 'Odel Shopping Mall', location: [6.9147, 79.8587], type: 'shopping' },
            { name: 'Viharamahadevi Park', location: [6.9147, 79.8587], type: 'park' }
        ];

        return places
            .filter(place => place.name.toLowerCase().includes(queryLower) && 
                           (type === 'establishment' || place.type === type))
            .map(place => ({
                type: 'place',
                name: place.name,
                location: place.location,
                category: place.type
            }));
    }

    // Display search results
    displaySearchResults(results) {
        const searchResults = document.querySelector('.search-results');
        if (!searchResults) return;

        if (results.length === 0) {
            searchResults.style.display = 'none';
            return;
        }

        searchResults.innerHTML = results.map(result => `
            <div class="search-result" onclick="dashboard.selectSearchResult('${result.type}', '${result.id || result.name}', ${JSON.stringify(result.location).replace(/"/g, '&quot;')})">
                <i class="fas fa-${this.getSearchResultIcon(result.type)}"></i>
                <div>
                    <div style="font-weight: 500;">${result.name}</div>
                    <div style="font-size: 12px; color: #5f6368;">${this.getSearchResultSubtitle(result)}</div>
                </div>
            </div>
        `).join('');

        searchResults.style.display = 'block';
    }

    // Get search result icon
    getSearchResultIcon(type) {
        const icons = {
            'bus': 'bus',
            'bus-stop': 'map-marker-alt',
            'place': 'map-pin',
            'restaurant': 'utensils',
            'hospital': 'hospital',
            'shopping': 'shopping-bag',
            'park': 'tree',
            'university': 'graduation-cap'
        };
        return icons[type] || 'map-marker-alt';
    }

    // Get search result subtitle
    getSearchResultSubtitle(result) {
        switch (result.type) {
            case 'bus':
                return `Live Bus • ${result.data?.speed || 0} km/h`;
            case 'bus-stop':
                return 'Bus Stop';
            case 'place':
                return result.category || 'Location';
            default:
                return 'Location';
        }
    }

    // Select search result
    selectSearchResult(type, id, location) {
        this.clearSearchResults();

        if (type === 'bus') {
            // Select and center on bus
            this.selectBus(id);
            if (this.mapManager) {
                this.mapManager.map.setView(location, 16);
            }
        } else {
            // Center on location
            if (this.mapManager) {
                this.mapManager.map.setView(location, 16);
                L.marker(location)
                    .addTo(this.mapManager.map)
                    .bindPopup(`<b>${id}</b><br>${type === 'bus-stop' ? 'Bus Stop' : 'Location'}`)
                    .openPopup();
            }
        }
    }

    // Clear search results
    clearSearchResults() {
        const searchResults = document.querySelector('.search-results');
        if (searchResults) {
            searchResults.style.display = 'none';
        }
    }

    // Filter search results
    filterSearchResults() {
        const searchInput = document.querySelector('.search-input');
        if (searchInput && searchInput.value.trim()) {
            this.performEnhancedSearch(searchInput.value.trim());
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

    // Enhanced get directions functionality
    getDirections() {
        if (!this.selectedBus) {
            this.utils.showNotification('Please select a bus first', 'info');
            return;
        }

        if (!this.mapManager || !this.mapManager.currentLocation) {
            this.utils.showNotification('Please get your current location first', 'info');
            return;
        }

        // Get bus location
        const busData = this.firebaseManager.mockData[this.selectedBus];
        if (!busData) {
            this.utils.showNotification('Bus location not available', 'error');
            return;
        }

        const origin = this.mapManager.currentLocation;
        const destination = [busData.latitude, busData.longitude];

        // Use Google Directions API if available
        if (this.mapManager.googleMapsLoaded && this.mapManager.directionsService) {
            this.mapManager.getDirections(origin, destination);
        } else {
            // Fallback to basic directions
            this.mapManager.showBasicDirections(origin, destination);
        }
    }

    // Update bus list with real data
    updateBusList(busData) {
        const busList = document.getElementById('busList');
        if (!busList) return;

        const busIds = Object.keys(busData);
        if (busIds.length === 0) {
            busList.innerHTML = '<div style="color: #5f6368; text-align: center; padding: 20px;">No buses available</div>';
            return;
        }

        busList.innerHTML = busIds.map(busId => {
            const bus = busData[busId];
            const isActive = this.firebaseManager.isBusActive(bus.timestamp);
            const isSelected = this.selectedBus === busId;
            
            return `
                <div class="bus-item ${isSelected ? 'selected' : ''}" onclick="dashboard.selectBus('${busId}')">
                    <div class="bus-icon ${isActive ? 'active' : 'inactive'}">
                        <i class="fas fa-bus"></i>
                    </div>
                    <div class="bus-info">
                        <div class="bus-name">${busId}</div>
                        <div class="bus-status">
                            ${isActive ? 'Active' : 'Inactive'} • ${bus.speed || 0} km/h
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Select bus with enhanced functionality
    selectBus(busId) {
        this.selectedBus = busId;
        
        // Update UI
        document.querySelectorAll('.bus-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        const selectedItem = document.querySelector(`[onclick="dashboard.selectBus('${busId}')"]`);
        if (selectedItem) {
            selectedItem.classList.add('selected');
        }

        // Update map
        if (this.mapManager) {
            this.mapManager.selectBus(busId);
            
            // Center map on selected bus
            const busData = this.firebaseManager.mockData[busId];
            if (busData) {
                this.mapManager.map.setView([busData.latitude, busData.longitude], 16);
            }
        }

        // Show route if route history is active
        if (this.activeFilters.routeHistory) {
            this.mapManager.showRouteHistory(busId);
        }

        this.utils.showNotification(`Selected ${busId}`, 'success');
    }

    // Start real-time updates
    startRealTimeUpdates() {
        if (this.firebaseManager) {
            this.firebaseManager.listenToBusLocations((busData) => {
                if (this.mapManager) {
                    this.mapManager.updateBusMarkers(busData);
                }
                this.updateBusList(busData);
            });
        }
    }

    // Update notification with real data
    updateNotification() {
        const busData = this.firebaseManager.mockData || {};
        const activeCount = Object.keys(busData).filter(busId => 
            this.firebaseManager.isBusActive(busData[busId].timestamp)
        ).length;

        const notification = document.getElementById('bottomNotification');
        if (notification) {
            const title = notification.querySelector('.notification-title');
            const subtitle = notification.querySelector('.notification-subtitle');
            
            title.textContent = 'Live Bus Tracking Active';
            subtitle.textContent = `Tracking ${activeCount} buses in your area • Last updated ${this.utils.getTimeAgo(Date.now())}`;
        }
    }

    // Static methods for global access
    static getCurrentLocation() {
        if (window.dashboard && window.dashboard.mapManager) {
            window.dashboard.mapManager.getCurrentLocation();
        }
    }

    static setHomeLocation() {
        if (window.dashboard && window.dashboard.mapManager && window.dashboard.mapManager.currentLocation) {
            window.utils.addSavedPlace('Home', window.dashboard.mapManager.currentLocation, 'home');
            window.utils.showNotification('Home location saved!', 'success');
        } else {
            window.utils.showNotification('Please get your current location first', 'info');
        }
    }

    static findNearbyBusStops() {
        if (window.dashboard && window.dashboard.mapManager && window.dashboard.mapManager.currentLocation) {
            // Simulate finding nearby bus stops
            const currentLocation = window.dashboard.mapManager.currentLocation;
            const nearbyStops = [
                { name: 'Central Bus Station', location: [currentLocation[0] + 0.001, currentLocation[1] + 0.001] },
                { name: 'University Bus Stop', location: [currentLocation[0] - 0.001, currentLocation[1] - 0.001] }
            ];

            nearbyStops.forEach(stop => {
                L.marker(stop.location)
                    .addTo(window.dashboard.mapManager.map)
                    .bindPopup(`<b>${stop.name}</b><br>Nearby bus stop`)
                    .openPopup();
            });

            window.utils.showNotification(`Found ${nearbyStops.length} nearby bus stops`, 'success');
        } else {
            window.utils.showNotification('Please get your current location first', 'info');
        }
    }

    static addSavedPlace() {
        const name = prompt('Enter place name:');
        if (name && window.dashboard && window.dashboard.mapManager && window.dashboard.mapManager.currentLocation) {
            window.utils.addSavedPlace(name, window.dashboard.mapManager.currentLocation);
            window.utils.showNotification('Place saved!', 'success');
        }
    }

    static goToSavedPlace(placeKey) {
        window.utils.goToSavedPlace(placeKey);
    }

    static repeatSearch(search) {
        window.utils.repeatSearch(search);
    }

    static hideNotification() {
        window.utils.hideNotification();
    }
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new GoogleMapsDashboard();
});

// Make dashboard globally accessible
window.dashboard = window.dashboard || null;