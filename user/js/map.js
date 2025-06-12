// Map Module for V-TRACK
class MapManager {
    constructor(firebaseManager) {
        this.map = null;
        this.firebaseManager = firebaseManager;
        this.busMarkers = {};
        this.routePolylines = {};
        this.directionPolylines = {};
        this.currentLocationMarker = null;
        this.destinationMarker = null;
        this.placesService = null;
        this.directionsService = null;
        this.directionsRenderer = null;
        this.selectedBus = null;
        this.currentLocation = null;
        this.googleMapsLoaded = false;
        this.busRoutes = {}; // Store predefined routes for buses
        
        this.initializeMap();
        this.waitForGoogleMaps();
        this.initializeBusRoutes();
    }

    initializeMap() {
        // Initialize Leaflet map
        this.map = L.map('live-map').setView([6.9271, 79.8612], 13); // Colombo, Sri Lanka

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        // Add custom CSS for markers
        this.addCustomMarkerStyles();

        // Add click event for directions
        this.map.on('click', (e) => {
            this.handleMapClick(e);
        });
    }

    // Initialize predefined routes for buses (3-4km realistic paths)
    initializeBusRoutes() {
        // Define realistic bus routes around Colombo
        this.busRoutes = {
            'BUS001': {
                name: 'Central - University Route',
                path: [
                    [6.9271, 79.8612], // Central Colombo
                    [6.9285, 79.8630],
                    [6.9300, 79.8650],
                    [6.9315, 79.8670],
                    [6.9330, 79.8690],
                    [6.9345, 79.8710],
                    [6.9360, 79.8730], // University area
                    [6.9375, 79.8750],
                    [6.9390, 79.8770],
                    [6.9405, 79.8790]
                ],
                distance: 3.2
            },
            'BUS002': {
                name: 'Hospital - Mall Route',
                path: [
                    [6.9271, 79.8612], // Central
                    [6.9255, 79.8590],
                    [6.9240, 79.8570],
                    [6.9225, 79.8550],
                    [6.9210, 79.8530],
                    [6.9195, 79.8510],
                    [6.9180, 79.8490], // Hospital area
                    [6.9165, 79.8470],
                    [6.9150, 79.8450],
                    [6.9135, 79.8430]
                ],
                distance: 3.8
            },
            'BUS003': {
                name: 'Airport - City Route',
                path: [
                    [6.9271, 79.8612], // Central
                    [6.9285, 79.8590],
                    [6.9300, 79.8570],
                    [6.9315, 79.8550],
                    [6.9330, 79.8530],
                    [6.9345, 79.8510],
                    [6.9360, 79.8490],
                    [6.9375, 79.8470],
                    [6.9390, 79.8450], // Airport area
                    [6.9405, 79.8430]
                ],
                distance: 4.1
            },
            'BUS004': {
                name: 'Station - Beach Route',
                path: [
                    [6.9271, 79.8612], // Central
                    [6.9255, 79.8630],
                    [6.9240, 79.8650],
                    [6.9225, 79.8670],
                    [6.9210, 79.8690],
                    [6.9195, 79.8710],
                    [6.9180, 79.8730],
                    [6.9165, 79.8750],
                    [6.9150, 79.8770], // Beach area
                    [6.9135, 79.8790]
                ],
                distance: 3.5
            },
            'BUS005': {
                name: 'Market - Park Route',
                path: [
                    [6.9271, 79.8612], // Central
                    [6.9285, 79.8630],
                    [6.9300, 79.8650],
                    [6.9315, 79.8670],
                    [6.9330, 79.8690],
                    [6.9345, 79.8710],
                    [6.9360, 79.8730],
                    [6.9375, 79.8750],
                    [6.9390, 79.8770], // Park area
                    [6.9405, 79.8790]
                ],
                distance: 3.7
            }
        };
    }

    waitForGoogleMaps() {
        // Check if Google Maps is already loaded
        if (window.google && window.google.maps) {
            this.initializeGoogleServices();
        } else {
            // Wait for Google Maps to load
            const checkGoogleMaps = setInterval(() => {
                if (window.google && window.google.maps) {
                    clearInterval(checkGoogleMaps);
                    this.initializeGoogleServices();
                }
            }, 100);
        }
    }

    initializeGoogleServices() {
        try {
            this.googleMapsLoaded = true;
            console.log('Initializing Google Maps services...');

            // Initialize Google Places Autocomplete with new API
            const searchInput = document.querySelector('.search-input');
            if (searchInput && window.google && window.google.maps) {
                try {
                    // Use the new PlaceAutocompleteElement if available, fallback to old API
                    if (window.google.maps.places.PlaceAutocompleteElement) {
                        // Create a custom autocomplete using the new API
                        this.initializeNewPlacesAutocomplete(searchInput);
                    } else {
                        // Fallback to old API
                        const autocomplete = new google.maps.places.Autocomplete(searchInput, {
                            types: ['establishment', 'geocode'],
                            componentRestrictions: { country: 'LK' }
                        });

                        autocomplete.addListener('place_changed', () => {
                            const place = autocomplete.getPlace();
                            if (place.geometry) {
                                this.handlePlaceSelection(place);
                            }
                        });
                    }
                    console.log('Google Places Autocomplete initialized');
                } catch (error) {
                    console.warn('Google Places Autocomplete not available:', error.message);
                    // Fallback to basic search functionality
                    this.initializeBasicSearch(searchInput);
                }
            }

            // Initialize Google Directions Service
            if (window.google && window.google.maps) {
                this.directionsService = new google.maps.DirectionsService();
                this.directionsRenderer = new google.maps.DirectionsRenderer({
                    suppressMarkers: true,
                    polylineOptions: {
                        strokeColor: '#1a73e8',
                        strokeWeight: 4,
                        strokeOpacity: 0.8
                    }
                });
                console.log('Google Directions Service initialized');
            }
        } catch (error) {
            console.error('Error initializing Google services:', error);
        }
    }

    // Initialize new Places Autocomplete API
    initializeNewPlacesAutocomplete(searchInput) {
        // Create a custom autocomplete using the new API
        const autocomplete = new google.maps.places.PlaceAutocompleteElement({
            inputElement: searchInput,
            types: ['establishment', 'geocode'],
            componentRestrictions: { country: 'LK' }
        });

        autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            if (place.geometry) {
                this.handlePlaceSelection(place);
            }
        });
    }

    // Initialize basic search functionality as fallback
    initializeBasicSearch(searchInput) {
        const searchResults = document.createElement('div');
        searchResults.className = 'search-results';
        searchResults.style.display = 'none';
        searchInput.parentNode.appendChild(searchResults);

        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            if (query.length > 2) {
                this.performBasicSearch(query, searchResults);
            } else {
                searchResults.style.display = 'none';
            }
        });

        // Hide results when clicking outside
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
                searchResults.style.display = 'none';
            }
        });
    }

    // Perform basic search using predefined locations
    performBasicSearch(query, resultsContainer) {
        const predefinedPlaces = [
            { name: 'Central Bus Station', lat: 6.9271, lng: 79.8612 },
            { name: 'University of Colombo', lat: 6.9020, lng: 79.8607 },
            { name: 'Colombo National Hospital', lat: 6.9271, lng: 79.8612 },
            { name: 'Galle Face Green', lat: 6.9271, lng: 79.8412 },
            { name: 'Colombo Fort Railway Station', lat: 6.9369, lng: 79.8507 },
            { name: 'Bandaranaike International Airport', lat: 7.1808, lng: 79.8841 },
            { name: 'Odel Shopping Mall', lat: 6.9147, lng: 79.8587 },
            { name: 'Viharamahadevi Park', lat: 6.9147, lng: 79.8587 }
        ];

        const filteredPlaces = predefinedPlaces.filter(place => 
            place.name.toLowerCase().includes(query.toLowerCase())
        );

        if (filteredPlaces.length > 0) {
            resultsContainer.innerHTML = filteredPlaces.map(place => 
                '<div class="search-result" onclick="mapManager.selectPredefinedPlace(' + place.lat + ', ' + place.lng + ', \'' + place.name + '\')">' +
                '<i class="fas fa-map-marker-alt"></i>' +
                '<span>' + place.name + '</span>' +
                '</div>'
            ).join('');
            resultsContainer.style.display = 'block';
        } else {
            resultsContainer.style.display = 'none';
        }
    }

    // Select predefined place
    selectPredefinedPlace(lat, lng, name) {
        const location = [lat, lng];
        
        // Add destination marker
        if (this.destinationMarker) {
            this.map.removeLayer(this.destinationMarker);
        }
        
        this.destinationMarker = L.marker(location, {
            icon: L.divIcon({
                className: 'destination-marker',
                html: '<i class="fas fa-map-marker-alt"></i>',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            })
        }).addTo(this.map);

        // Get directions if a bus is selected
        if (this.selectedBus && this.busMarkers[this.selectedBus]) {
            const busLocation = this.busMarkers[this.selectedBus].getLatLng();
            this.getDirections(busLocation, location);
        } else {
            // Center map on selected place
            this.map.setView(location, 16);
        }

        // Hide search results
        const searchResults = document.querySelector('.search-results');
        if (searchResults) {
            searchResults.style.display = 'none';
        }
    }

    addCustomMarkerStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .bus-marker {
                background: #34a853;
                border: 2px solid white;
                border-radius: 50%;
                width: 24px !important;
                height: 24px !important;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 12px;
                font-weight: bold;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                transition: all 0.3s ease;
            }
            .bus-marker.inactive {
                background: #ea4335;
            }
            .bus-marker.selected {
                background: #1a73e8;
                border: 3px solid white;
                box-shadow: 0 0 0 3px #1a73e8;
                transform: scale(1.2);
            }
            .current-location-marker {
                background: #1a73e8;
                border: 3px solid white;
                border-radius: 50%;
                width: 20px !important;
                height: 20px !important;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            }
            .destination-marker {
                background: #ea4335;
                border: 3px solid white;
                border-radius: 50%;
                width: 20px !important;
                height: 20px !important;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            }
            .route-marker {
                background: #ff9800;
                border: 2px solid white;
                border-radius: 50%;
                width: 16px !important;
                height: 16px !important;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 10px;
                box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
            }
        `;
        document.head.appendChild(style);
    }

    // Enhanced coordinate validation
    isValidCoordinates(lat, lng) {
        return lat !== null && lat !== undefined && 
               lng !== null && lng !== undefined &&
               !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng)) &&
               parseFloat(lat) >= -90 && parseFloat(lat) <= 90 && 
               parseFloat(lng) >= -180 && parseFloat(lng) <= 180;
    }

    // Update bus markers on map with better error handling
    updateBusMarkers(busData) {
        if (!busData) return;

        Object.keys(busData).forEach(busId => {
            const bus = busData[busId];
            
            // Enhanced coordinate validation
            const lat = parseFloat(bus.latitude);
            const lng = parseFloat(bus.longitude);
            
            if (!this.isValidCoordinates(lat, lng)) {
                console.warn(`Invalid coordinates for bus ${busId}:`, lat, lng);
                return;
            }

            const location = [lat, lng];
            const isActive = this.firebaseManager.isBusActive(bus.timestamp);

            if (this.busMarkers[busId]) {
                // Update existing marker
                try {
                    this.busMarkers[busId].setLatLng(location);
                    this.updateMarkerStyle(busId, isActive);
                } catch (error) {
                    console.error(`Error updating marker for bus ${busId}:`, error);
                }
            } else {
                // Create new marker
                try {
                    const marker = L.marker(location, {
                        icon: this.createBusIcon(busId, isActive)
                    }).addTo(this.map);

                    marker.bindPopup(this.createBusPopup(busId, bus));
                    this.busMarkers[busId] = marker;
                } catch (error) {
                    console.error(`Error creating marker for bus ${busId}:`, error);
                }
            }
        });
    }

    createBusIcon(busId, isActive) {
        const icon = L.divIcon({
            className: `bus-marker ${isActive ? 'active' : 'inactive'}`,
            html: busId,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });
        return icon;
    }

    updateMarkerStyle(busId, isActive) {
        const marker = this.busMarkers[busId];
        if (marker) {
            const icon = marker.getElement();
            if (icon) {
                icon.className = `bus-marker ${isActive ? 'active' : 'inactive'}`;
                if (busId === this.selectedBus) {
                    icon.classList.add('selected');
                }
            }
        }
    }

    createBusPopup(busId, bus) {
        const isActive = this.firebaseManager.isBusActive(bus.timestamp);
        const lastUpdate = new Date(bus.timestamp).toLocaleTimeString();
        const routeInfo = this.busRoutes[busId] || { name: 'Unknown Route', distance: 'N/A' };
        
        return `
            <div style="min-width: 200px;">
                <h3>Bus ${busId}</h3>
                <p><strong>Status:</strong> ${isActive ? 'Active' : 'Inactive'}</p>
                <p><strong>Route:</strong> ${routeInfo.name}</p>
                <p><strong>Distance:</strong> ${routeInfo.distance} km</p>
                <p><strong>Last Update:</strong> ${lastUpdate}</p>
                <p><strong>Speed:</strong> ${bus.speed || 'N/A'} km/h</p>
                <button class="popup-button" onclick="mapManager.selectBus('${busId}')">
                    Track This Bus
                </button>
                <button class="popup-button" onclick="mapManager.getDirectionsToBus('${busId}')">
                    Get Directions
                </button>
                <button class="popup-button" onclick="mapManager.showBusRoute('${busId}')">
                    Show Route
                </button>
            </div>
        `;
    }

    // Select a bus
    selectBus(busId) {
        this.selectedBus = busId;
        
        // Update marker selection
        Object.keys(this.busMarkers).forEach(id => {
            const isActive = this.firebaseManager.isBusActive(this.busMarkers[id].getLatLng());
            this.updateMarkerStyle(id, isActive);
        });

        // Center map on selected bus
        if (this.busMarkers[busId]) {
            this.map.setView(this.busMarkers[busId].getLatLng(), 16);
            this.busMarkers[busId].openPopup();
        }

        // Show route history
        this.showRouteHistory(busId);
        
        // Update bottom info bar
        this.updateBottomInfoBar(busId);
    }

    // Show predefined bus route
    showBusRoute(busId) {
        // Clear existing route
        if (this.routePolylines[busId]) {
            this.map.removeLayer(this.routePolylines[busId]);
        }

        const route = this.busRoutes[busId];
        if (route && route.path.length > 1) {
            // Create route polyline
            const polyline = L.polyline(route.path, {
                color: '#1a73e8',
                weight: 4,
                opacity: 0.8,
                dashArray: '5, 5'
            }).addTo(this.map);
            
            this.routePolylines[busId] = polyline;

            // Add route markers
            route.path.forEach((point, index) => {
                const marker = L.marker(point, {
                    icon: L.divIcon({
                        className: 'route-marker',
                        html: index + 1,
                        iconSize: [16, 16],
                        iconAnchor: [8, 8]
                    })
                }).addTo(this.map);
                
                marker.bindPopup(`Route Point ${index + 1}`);
            });

            // Fit map to show entire route
            this.map.fitBounds(polyline.getBounds(), { padding: [20, 20] });
        }
    }

    // Show route history for selected bus
    showRouteHistory(busId) {
        // Clear existing route
        if (this.routePolylines[busId]) {
            this.map.removeLayer(this.routePolylines[busId]);
        }

        this.firebaseManager.getRouteHistory(busId, (routePoints) => {
            if (routePoints && routePoints.length > 1) {
                const coordinates = routePoints
                    .filter(point => this.isValidCoordinates(point.latitude, point.longitude))
                    .map(point => [parseFloat(point.latitude), parseFloat(point.longitude)]);
                
                if (coordinates.length > 1) {
                    const polyline = L.polyline(coordinates, {
                        color: '#1a73e8',
                        weight: 4,
                        opacity: 0.8,
                        dashArray: '5, 5'
                    }).addTo(this.map);
                    
                    this.routePolylines[busId] = polyline;
                }
            }
        });
    }

    // Clear route history
    clearRouteHistory() {
        Object.values(this.routePolylines).forEach(polyline => {
            this.map.removeLayer(polyline);
        });
        this.routePolylines = {};
    }

    // Get current location
    getCurrentLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const location = [position.coords.latitude, position.coords.longitude];
                    this.currentLocation = location;
                    this.map.setView(location, 16);
                    
                    // Add current location marker
                    if (this.currentLocationMarker) {
                        this.map.removeLayer(this.currentLocationMarker);
                    }
                    
                    this.currentLocationMarker = L.marker(location, {
                        icon: L.divIcon({
                            className: 'current-location-marker',
                            html: '<i class="fas fa-crosshairs"></i>',
                            iconSize: [20, 20],
                            iconAnchor: [10, 10]
                        })
                    }).addTo(this.map);
                },
                (error) => {
                    console.error('Error getting location:', error);
                    this.showNotification('Unable to get your location', 'error');
                }
            );
        } else {
            this.showNotification('Geolocation is not supported by this browser', 'error');
        }
    }

    // Handle map click for directions
    handleMapClick(e) {
        const latlng = e.latlng;
        
        // Add destination marker
        if (this.destinationMarker) {
            this.map.removeLayer(this.destinationMarker);
        }
        
        this.destinationMarker = L.marker(latlng, {
            icon: L.divIcon({
                className: 'destination-marker',
                html: '<i class="fas fa-map-marker-alt"></i>',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            })
        }).addTo(this.map);

        // Get directions if a bus is selected
        if (this.selectedBus && this.busMarkers[this.selectedBus]) {
            const busLocation = this.busMarkers[this.selectedBus].getLatLng();
            this.getDirections(busLocation, latlng);
        }
    }

    // Handle place selection from search
    handlePlaceSelection(place) {
        const location = [place.geometry.location.lat(), place.geometry.location.lng()];
        
        // Add destination marker
        if (this.destinationMarker) {
            this.map.removeLayer(this.destinationMarker);
        }
        
        this.destinationMarker = L.marker(location, {
            icon: L.divIcon({
                className: 'destination-marker',
                html: '<i class="fas fa-map-marker-alt"></i>',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            })
        }).addTo(this.map);

        // Get directions if a bus is selected
        if (this.selectedBus && this.busMarkers[this.selectedBus]) {
            const busLocation = this.busMarkers[this.selectedBus].getLatLng();
            this.getDirections(busLocation, location);
        } else {
            // Center map on selected place
            this.map.setView(location, 16);
        }
    }

    // Get directions using Google Directions API with fallback
    getDirections(origin, destination) {
        if (!this.directionsService) {
            // Fallback to basic directions
            this.showBasicDirections(origin, destination);
            return;
        }

        const request = {
            origin: { lat: origin.lat, lng: origin.lng },
            destination: { lat: destination.lat, lng: destination.lng },
            travelMode: google.maps.TravelMode.DRIVING
        };

        this.directionsService.route(request, (result, status) => {
            if (status === 'OK') {
                this.displayDirections(result);
            } else {
                console.warn('Google Directions failed, using fallback:', status);
                this.showBasicDirections(origin, destination);
            }
        });
    }

    // Basic directions fallback
    showBasicDirections(origin, destination) {
        // Clear existing direction polylines
        Object.values(this.directionPolylines).forEach(polyline => {
            this.map.removeLayer(polyline);
        });
        this.directionPolylines = {};

        // Create a simple straight line between points
        const coordinates = [origin, destination];
        const polyline = L.polyline(coordinates, {
            color: '#ea4335',
            weight: 6,
            opacity: 0.8,
            dashArray: '10, 5'
        }).addTo(this.map);
        
        this.directionPolylines['current'] = polyline;

        // Calculate basic distance and time
        const distance = this.calculateDistance(origin.lat, origin.lng, destination.lat, destination.lng);
        const estimatedTime = Math.round(distance * 2); // Rough estimate: 2 minutes per km

        // Update bottom info bar with route info
        this.updateBasicRouteInfo(distance, estimatedTime);
    }

    // Calculate distance between two points
    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    // Update basic route information
    updateBasicRouteInfo(distance, time) {
        const notification = document.getElementById('bottomNotification');
        const title = notification.querySelector('.notification-title');
        const subtitle = notification.querySelector('.notification-subtitle');
        
        title.textContent = `Route to Destination`;
        subtitle.textContent = `${distance.toFixed(1)} km • ~${time} min • ${new Date().toLocaleTimeString()}`;
        
        notification.style.display = 'flex';
    }

    // Display directions on map
    displayDirections(result) {
        // Clear existing direction polylines
        Object.values(this.directionPolylines).forEach(polyline => {
            this.map.removeLayer(polyline);
        });
        this.directionPolylines = {};

        const route = result.routes[0];
        const leg = route.legs[0];
        
        // Create polyline from route
        const path = route.overview_path;
        const coordinates = path.map(point => [point.lat(), point.lng()]);
        
        const polyline = L.polyline(coordinates, {
            color: '#ea4335',
            weight: 6,
            opacity: 0.8
        }).addTo(this.map);
        
        this.directionPolylines['current'] = polyline;

        // Update bottom info bar with route info
        this.updateRouteInfo(leg);
    }

    // Get directions to a specific bus
    getDirectionsToBus(busId) {
        if (!this.currentLocation) {
            this.showNotification('Please get your current location first', 'info');
            return;
        }

        if (this.busMarkers[busId]) {
            const busLocation = this.busMarkers[busId].getLatLng();
            this.getDirections(this.currentLocation, busLocation);
        }
    }

    // Update route information in bottom bar
    updateRouteInfo(leg) {
        const duration = leg.duration.text;
        const distance = leg.distance.text;
        
        // Update bottom notification with route info
        const notification = document.getElementById('bottomNotification');
        const title = notification.querySelector('.notification-title');
        const subtitle = notification.querySelector('.notification-subtitle');
        
        title.textContent = `Route to ${leg.end_address}`;
        subtitle.textContent = `${distance} • ${duration} • ${new Date().toLocaleTimeString()}`;
        
        notification.style.display = 'flex';
    }

    // Update bottom info bar with bus information
    updateBottomInfoBar(busId) {
        if (!busId || !this.busMarkers[busId]) return;

        const bus = this.busMarkers[busId];
        const isActive = this.firebaseManager.isBusActive(bus.getLatLng());
        const lastUpdate = new Date().toLocaleTimeString();
        const routeInfo = this.busRoutes[busId] || { name: 'Unknown Route', distance: 'N/A' };
        
        const notification = document.getElementById('bottomNotification');
        const title = notification.querySelector('.notification-title');
        const subtitle = notification.querySelector('.notification-subtitle');
        
        title.textContent = `Bus ${busId} - ${routeInfo.name}`;
        subtitle.textContent = `${isActive ? 'Active' : 'Inactive'} • ${routeInfo.distance} km • Last updated: ${lastUpdate}`;
        
        notification.style.display = 'flex';
    }

    // Show notification
    showNotification(message, type = 'info') {
        const notification = document.getElementById('bottomNotification');
        const title = notification.querySelector('.notification-title');
        const subtitle = notification.querySelector('.notification-subtitle');
        const icon = notification.querySelector('.notification-icon i');
        
        title.textContent = message;
        subtitle.textContent = new Date().toLocaleTimeString();
        
        // Update icon based on type
        const icons = {
            'success': 'check-circle',
            'error': 'exclamation-circle',
            'info': 'info-circle'
        };
        icon.className = `fas fa-${icons[type] || 'info-circle'}`;
        
        // Show notification
        notification.style.display = 'flex';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            this.hideNotification();
        }, 5000);
    }

    // Hide notification
    hideNotification() {
        const notification = document.getElementById('bottomNotification');
        notification.style.display = 'none';
    }

    // Clear all markers and polylines
    clearAll() {
        // Clear bus markers
        Object.values(this.busMarkers).forEach(marker => {
            this.map.removeLayer(marker);
        });
        this.busMarkers = {};

        // Clear route polylines
        Object.values(this.routePolylines).forEach(polyline => {
            this.map.removeLayer(polyline);
        });
        this.routePolylines = {};

        // Clear direction polylines
        Object.values(this.directionPolylines).forEach(polyline => {
            this.map.removeLayer(polyline);
        });
        this.directionPolylines = {};

        // Clear other markers
        if (this.currentLocationMarker) {
            this.map.removeLayer(this.currentLocationMarker);
            this.currentLocationMarker = null;
        }

        if (this.destinationMarker) {
            this.map.removeLayer(this.destinationMarker);
            this.destinationMarker = null;
        }
    }
}

// Export for use in other modules
window.MapManager = MapManager;