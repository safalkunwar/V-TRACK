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

        // Initialize notices and routes
        this.initializeNotices();
        this.initializeRoutes();
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

        // Map type buttons
        const streetViewBtn = document.getElementById('streetViewBtn');
        const satelliteViewBtn = document.getElementById('satelliteViewBtn');
        const terrainViewBtn = document.getElementById('terrainViewBtn');
        const darkViewBtn = document.getElementById('darkViewBtn');

        if (streetViewBtn) {
            streetViewBtn.addEventListener('click', () => {
                if (this.mapManager) {
                    this.mapManager.changeMapType('street');
                }
            });
        }

        if (satelliteViewBtn) {
            satelliteViewBtn.addEventListener('click', () => {
                if (this.mapManager) {
                    this.mapManager.changeMapType('satellite');
                }
            });
        }

        if (terrainViewBtn) {
            terrainViewBtn.addEventListener('click', () => {
                if (this.mapManager) {
                    this.mapManager.changeMapType('terrain');
                }
            });
        }

        if (darkViewBtn) {
            darkViewBtn.addEventListener('click', () => {
                if (this.mapManager) {
                    this.mapManager.changeMapType('dark');
                }
            });
        }
    }

    initializeSearch() {
        const searchInput = document.getElementById('newSearchInput');
        const directionBtn = document.getElementById('directionBtn');

        if (searchInput) {
            // Debounced search
            const debouncedSearch = this.utils.debounce((query) => {
                this.utils.performSearch(query);
            }, 400);

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

        if (directionBtn) {
            directionBtn.addEventListener('click', async () => {
                await this.getDirectionsFromSearch();
            });
        }
    }

    // Get directions from search input
    async getDirectionsFromSearch() {
        const searchInput = document.getElementById('newSearchInput');
        if (!searchInput || !searchInput.value.trim()) {
            this.utils.showNotification('Please enter a destination first', 'info');
            return;
        }

        if (!this.mapManager) return;
        // If we don't yet have current location, try to fetch it
        if (!this.mapManager.currentLocation) {
            await new Promise(resolve => {
                navigator.geolocation?.getCurrentPosition((pos) => {
                    this.mapManager.currentLocation = [pos.coords.latitude, pos.coords.longitude];
                    resolve();
                }, () => resolve(), { enableHighAccuracy: true, timeout: 5000 });
            });
        }

        if (!this.mapManager.currentLocation) {
            this.utils.showNotification('Please get your current location first', 'info');
            return;
        }

        // Nominatim search
        const results = await this.utils.geocodeSearch(searchInput.value.trim());
        if (results.length === 0) {
            this.utils.showNotification('Location not found', 'error');
            return;
        }
        const destination = results[0].location;

        // Leaflet routing/draw fallback
        const origin = this.mapManager.currentLocation;
        const waypoints = [L.latLng(origin[0], origin[1]), L.latLng(destination[0], destination[1])];
        if (this.mapManager.routingControl) {
            this.mapManager.map.removeControl(this.mapManager.routingControl);
            this.mapManager.routingControl = null;
        }
        this.mapManager.routingControl = L.Routing.control({
            waypoints,
            routeWhileDragging: false,
            show: false,
            addWaypoints: false,
            lineOptions: { styles: [{ color: '#1a73e8', weight: 5, opacity: 0.9 }] }
        })
        .on('routesfound', (e) => {
            const coords = e.routes[0].coordinates.map(c => [c.lat, c.lng]);
            this.mapManager.clearRouteDisplay();
            this.mapManager.drawBaseRoute(coords);
            this.mapManager.animateAlongCoordinates(coords);
            this.mapManager.map.fitBounds(L.latLngBounds(coords), { padding: [20, 20] });
        })
        .addTo(this.mapManager.map);

        // Fallback if routing fails
        setTimeout(() => {
            if (!this.mapManager.baseRoutePolyline && !this.mapManager.progressRoutePolyline) {
                const coords = waypoints.map(w => [w.lat, w.lng]);
                this.mapManager.drawBaseRoute(coords);
                this.mapManager.animateAlongCoordinates(coords);
                this.mapManager.map.fitBounds(L.latLngBounds(coords), { padding: [20, 20] });
            }
        }, 2000);
    }

    initializeBusDropdown() {
        // Create bus dropdown in sidebar
        const busList = document.getElementById('busList');
        if (busList) {
            this.utils.showLoading('busList', 'Loading buses...');
        }
    }

    // Initialize notices
    initializeNotices() {
        const noticesList = document.getElementById('noticesList');
        if (noticesList) {
            this.utils.showLoading('noticesList', 'Loading notices...');
        }

        // Listen to notices from Firebase
        if (this.firebaseManager.database) {
            this.firebaseManager.database.ref('notices').on('value', (snapshot) => {
                const notices = snapshot.val();
                this.updateNoticesList(notices);
            });
        } else {
            // Fallback for when Firebase is not available
            setTimeout(() => {
                const noticesList = document.getElementById('noticesList');
                if (noticesList) {
                    noticesList.innerHTML = '<div style="text-align: center; color: #6c757d; padding: 20px;">Firebase not connected</div>';
                }
            }, 2000);
        }
    }

    // Initialize routes
    initializeRoutes() {
        const routesList = document.getElementById('routesList');
        if (routesList) {
            this.utils.showLoading('routesList', 'Loading routes...');
        }

        // Listen to routes from Firebase
        if (this.firebaseManager.database) {
            this.firebaseManager.database.ref('routes').on('value', (snapshot) => {
                const routes = snapshot.val();
                this.updateRoutesList(routes);
            });
        } else {
            // Fallback for when Firebase is not available
            setTimeout(() => {
                const routesList = document.getElementById('routesList');
                if (routesList) {
                    routesList.innerHTML = '<div style="text-align: center; color: #6c757d; padding: 20px;">Firebase not connected</div>';
                }
            }, 2000);
        }
    }

    // Update notices list
    updateNoticesList(notices) {
        const noticesList = document.getElementById('noticesList');
        if (!noticesList) return;

        if (!notices) {
            noticesList.innerHTML = '<div style="text-align: center; color: #6c757d; padding: 20px;">No notices available</div>';
            return;
        }

        const noticesArray = Object.keys(notices).map(key => ({
            id: key,
            ...notices[key]
        })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        noticesList.innerHTML = noticesArray.map(notice => `
            <div class="notice-item" onclick="dashboard.showNoticeDetails('${notice.id}')">
                <div class="notice-content">${notice.content || 'No content'}</div>
                <div class="notice-description">${notice.description || 'No description'}</div>
                <div class="notice-date">${notice.createdAt ? new Date(notice.createdAt).toLocaleDateString() : 'Unknown date'}</div>
            </div>
        `).join('');
    }

    // Update routes list
    updateRoutesList(routes) {
        const routesList = document.getElementById('routesList');
        if (!routesList) return;

        if (!routes) {
            routesList.innerHTML = '<div style="text-align: center; color: #6c757d; padding: 20px;">No routes available</div>';
            return;
        }

        const routesArray = Object.keys(routes).map(key => ({
            id: key,
            ...routes[key]
        }));

        routesList.innerHTML = routesArray.map(route => `
            <div class="route-item" onclick="dashboard.showRouteDetails('${route.id}')">
                <div class="route-name">${route.name || 'Unnamed Route'}</div>
                <div class="route-description">${route.description || 'No description'}</div>
                <div class="route-points">${route.points ? Object.keys(route.points).length : 0} points</div>
            </div>
        `).join('');
    }

    // Show notice details
    showNoticeDetails(noticeId) {
        this.firebaseManager.database.ref(`notices/${noticeId}`).once('value', (snapshot) => {
            const notice = snapshot.val();
            if (notice) {
                const popupContent = `
                    <div style="min-width: 300px; max-width: 400px;">
                        <h3>📢 Notice Details</h3>
                        <div style="margin: 10px 0;">
                            <p><strong>Content:</strong> ${notice.content || 'N/A'}</p>
                            <p><strong>Description:</strong> ${notice.description || 'N/A'}</p>
                            <p><strong>Created:</strong> ${notice.createdAt ? new Date(notice.createdAt).toLocaleString() : 'N/A'}</p>
                        </div>
                    </div>
                `;

                // Show popup at center of map
                L.popup()
                    .setLatLng(this.mapManager.map.getCenter())
                    .setContent(popupContent)
                    .openOn(this.mapManager.map);
            }
        });
    }

    // Show route details
    showRouteDetails(routeId) {
        this.firebaseManager.database.ref(`routes/${routeId}`).once('value', (snapshot) => {
            const route = snapshot.val();
            if (route && route.points) {
                // Prepare waypoints in order
                const pointsArray = Object.values(route.points);
                // Clear existing route/routing/animation
                this.mapManager.clearRouteDisplay();

                // Build waypoints (every point)
                const waypoints = pointsArray.map(p => L.latLng(p.lat, p.lng));

                // Compute routed path and animate along it (same technique as path history)
                this.mapManager.routeAnimating = false;
                this.mapManager.routingControl = L.Routing.control({
                    waypoints: waypoints,
                    routeWhileDragging: false,
                    show: false,
                    addWaypoints: false,
                    lineOptions: { styles: [{ color: '#8ab4f8', weight: 5, opacity: 0.9 }] }
                })
                .on('routesfound', (e) => {
                    this.mapManager.routeAnimating = true;
                    const coords = e.routes[0].coordinates.map(c => [c.lat, c.lng]);
                    this.mapManager.drawBaseRoute(coords);
                    this.mapManager.animateAlongCoordinates(coords);
                    this.mapManager.map.fitBounds(L.latLngBounds(coords), { padding: [20, 20] });
                })
                .addTo(this.mapManager.map);

                // Fallback if routing is blocked/slow
                setTimeout(() => {
                    if (!this.mapManager.routeAnimating) {
                        const coords = waypoints.map(w => [w.lat, w.lng]);
                        this.mapManager.drawBaseRoute(coords);
                        this.mapManager.animateAlongCoordinates(coords);
                        this.mapManager.map.fitBounds(L.latLngBounds(coords), { padding: [20, 20] });
                    }
                }, 2000);

                // Add route markers with names
                pointsArray.forEach((point, index) => {
                    const marker = L.marker([point.lat, point.lng], {
                        icon: L.divIcon({
                            className: 'route-marker',
                            html: index + 1,
                            iconSize: [16, 16],
                            iconAnchor: [8, 8]
                        })
                    }).addTo(this.mapManager.map);
                    marker.bindPopup(`<b>${point.name || `Point ${index + 1}`}</b>`);
                });

                // Show route info popup
                const popupContent = `
                    <div style="min-width: 300px; max-width: 400px;">
                        <h3>🚌 ${route.name || 'Route Details'}</h3>
                        <div style="margin: 10px 0;">
                            <p><strong>Description:</strong> ${route.description || 'N/A'}</p>
                            <p><strong>Points:</strong> ${Object.keys(route.points).length}</p>
                        </div>
                    </div>
                `;

                L.popup()
                    .setLatLng(this.mapManager.map.getCenter())
                    .setContent(popupContent)
                    .openOn(this.mapManager.map);
            }
        });
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