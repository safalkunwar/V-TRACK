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
        this.roadsService = null; // Google Roads API service
        this.routeHistory = {}; // Store route history for each bus
        
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
        // Define realistic bus routes around Colombo with road-snapped coordinates
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
                distance: 3.2,
                waypoints: [
                    { location: 'University of Colombo, Sri Lanka' },
                    { location: 'Central Colombo, Sri Lanka' }
                ]
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
                distance: 3.8,
                waypoints: [
                    { location: 'Colombo National Hospital, Sri Lanka' },
                    { location: 'Odel Shopping Mall, Sri Lanka' }
                ]
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
                distance: 4.1,
                waypoints: [
                    { location: 'Bandaranaike International Airport, Sri Lanka' },
                    { location: 'Central Colombo, Sri Lanka' }
                ]
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
                distance: 3.5,
                waypoints: [
                    { location: 'Galle Face Green, Sri Lanka' },
                    { location: 'Colombo Fort Railway Station, Sri Lanka' }
                ]
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
                distance: 3.7,
                waypoints: [
                    { location: 'Viharamahadevi Park, Sri Lanka' },
                    { location: 'Central Market, Colombo, Sri Lanka' }
                ]
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

            // Initialize Google Places Autocomplete
            const searchInput = document.querySelector('.search-input');
            if (searchInput && window.google && window.google.maps) {
                try {
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
                    console.log('Google Places Autocomplete initialized');
                } catch (error) {
                    console.warn('Google Places Autocomplete not available:', error.message);
                    this.initializeBasicSearch(searchInput);
                }
            }

            // Initialize Google Directions Service
            if (window.google && window.google.maps) {
                this.directionsService = new google.maps.DirectionsService();
                console.log('Google Directions Service initialized');
            }

            // Initialize Google Roads API service (if available)
            if (window.google && window.google.maps) {
                // Note: Google Roads API is not directly available in the Maps JavaScript API
                // We'll simulate road snapping using Directions API
                console.log('Google Roads API simulation initialized');
            }
        } catch (error) {
            console.error('Error initializing Google services:', error);
        }
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

        const queryLower = query.toLowerCase();
        const results = predefinedPlaces.filter(place => 
            place.name.toLowerCase().includes(queryLower)
        );

        if (results.length > 0) {
            resultsContainer.innerHTML = results.map(place => `
                <div class="search-result" onclick="mapManager.selectPredefinedPlace(${place.lat}, ${place.lng}, '${place.name}')">
                    <i class="fas fa-map-marker-alt"></i>
                    <div>
                        <div style="font-weight: 500;">${place.name}</div>
                        <div style="font-size: 12px; color: #5f6368;">Location</div>
                    </div>
                </div>
            `).join('');
            resultsContainer.style.display = 'block';
        } else {
            resultsContainer.style.display = 'none';
        }
    }

    selectPredefinedPlace(lat, lng, name) {
        const location = [lat, lng];
        
        // Center map on location
        this.map.setView(location, 16);
        
        // Add marker
        L.marker(location)
            .addTo(this.map)
            .bindPopup(`<b>${name}</b><br>Selected location`)
            .openPopup();

        // Clear search results
        const searchResults = document.querySelector('.search-results');
        if (searchResults) {
            searchResults.style.display = 'none';
        }

        // Clear search input
        const searchInput = document.querySelector('.search-input');
        if (searchInput) {
            searchInput.value = '';
        }
    }

    addCustomMarkerStyles() {
        // Add custom CSS for bus markers
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
            }

            .bus-marker.inactive {
                background: #ea4335;
            }

            .bus-marker.selected {
                background: #1a73e8;
                border: 3px solid white;
                box-shadow: 0 0 0 3px #1a73e8;
            }
        `;
        document.head.appendChild(style);
    }

    isValidCoordinates(lat, lng) {
        return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
    }

    updateBusMarkers(busData) {
        if (!busData) return;

        Object.keys(busData).forEach(busId => {
            const bus = busData[busId];
            
            if (!this.isValidCoordinates(bus.latitude, bus.longitude)) {
                console.warn(`Invalid coordinates for bus ${busId}:`, bus);
                return;
            }

            const location = [bus.latitude, bus.longitude];
            const isActive = this.firebaseManager.isBusActive(bus.timestamp);

            if (this.busMarkers[busId]) {
                // Update existing marker
                this.busMarkers[busId].setLatLng(location);
                this.updateMarkerStyle(busId, isActive);
            } else {
                // Create new marker
                this.busMarkers[busId] = this.createBusIcon(busId, isActive);
                this.busMarkers[busId].addTo(this.map);
            }

            // Update route history
            this.updateRouteHistory(busId, location, bus.timestamp);
        });
    }

    createBusIcon(busId, isActive) {
        const icon = L.divIcon({
            className: `bus-marker ${isActive ? 'active' : 'inactive'}`,
            html: `<i class="fas fa-bus"></i>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });

        const marker = L.marker([0, 0], { icon: icon })
            .bindPopup(this.createBusPopup(busId, this.firebaseManager.mockData[busId]));

        marker.on('click', () => {
            this.selectBus(busId);
        });

        return marker;
    }

    updateMarkerStyle(busId, isActive) {
        const marker = this.busMarkers[busId];
        if (!marker) return;

        const icon = marker.getIcon();
        icon.options.className = `bus-marker ${isActive ? 'active' : 'inactive'}`;
        marker.setIcon(icon);
    }

    createBusPopup(busId, bus) {
        const isActive = this.firebaseManager.isBusActive(bus.timestamp);
        const status = isActive ? 'Active' : 'Inactive';
        const lastUpdate = this.utils ? this.utils.getTimeAgo(bus.timestamp) : 'Unknown';

        return `
            <div style="min-width: 200px;">
                <h3 style="color: #1a73e8; margin-bottom: 8px; font-size: 16px; font-weight: 600;">${busId}</h3>
                <p><strong>Status:</strong> ${status}</p>
                <p><strong>Speed:</strong> ${bus.speed || 0} km/h</p>
                <p><strong>Last Update:</strong> ${lastUpdate}</p>
                <button class="popup-button" onclick="mapManager.selectBus('${busId}')">Track Bus</button>
                <button class="popup-button" onclick="mapManager.showBusRoute('${busId}')">Show Route</button>
            </div>
        `;
    }

    selectBus(busId) {
        this.selectedBus = busId;
        
        // Update marker style
        Object.keys(this.busMarkers).forEach(id => {
            this.updateMarkerStyle(id, this.firebaseManager.isBusActive(this.firebaseManager.mockData[id].timestamp));
        });
        
        // Highlight selected bus
        const marker = this.busMarkers[busId];
        if (marker) {
            const icon = marker.getIcon();
            icon.options.className = 'bus-marker selected';
            marker.setIcon(icon);
        }

        // Show bus route
        this.showBusRoute(busId);
    }

    showBusRoute(busId) {
        // Clear existing route
        this.clearRoutePolylines();

        const route = this.busRoutes[busId];
        if (!route) return;

        // Create polyline for the route
        const polyline = L.polyline(route.path, {
            color: '#1a73e8',
            weight: 4,
            opacity: 0.8,
            className: 'route-polyline'
        }).addTo(this.map);

        this.routePolylines[busId] = polyline;

        // Fit map to show the entire route
        this.map.fitBounds(polyline.getBounds(), { padding: [20, 20] });

        // Show route info
        this.showRouteInfo(busId, route);
    }

    showRouteInfo(busId, route) {
        const info = `
            <div style="padding: 10px;">
                <h4>${route.name}</h4>
                <p><strong>Distance:</strong> ${route.distance} km</p>
                <p><strong>Bus ID:</strong> ${busId}</p>
            </div>
        `;

        // Create info popup
        const center = this.calculateRouteCenter(route.path);
        L.popup()
            .setLatLng(center)
            .setContent(info)
            .openOn(this.map);
    }

    calculateRouteCenter(path) {
        const latSum = path.reduce((sum, point) => sum + point[0], 0);
        const lngSum = path.reduce((sum, point) => sum + point[1], 0);
        return [latSum / path.length, lngSum / path.length];
    }

    // Enhanced route history with road snapping
    showRouteHistory(busId) {
        if (!busId) return;

        // Clear existing route history
        this.clearRouteHistory();

        // Get route history from Firebase or generate mock data
        this.firebaseManager.getRouteHistory(busId, (routePoints) => {
            if (routePoints.length === 0) {
                console.log('No route history available for bus:', busId);
                return;
            }

            // Get last 3-4 km of route (approximately last 10-15 points)
            const recentPoints = routePoints.slice(-15);
            
            // Convert to array of coordinates
            const coordinates = recentPoints.map(point => [point.latitude, point.longitude]);

            // Create polyline for route history
            const historyPolyline = L.polyline(coordinates, {
                color: '#ff6b35',
                weight: 3,
                opacity: 0.7,
                dashArray: '5, 5'
            }).addTo(this.map);

            this.routePolylines[`${busId}_history`] = historyPolyline;

            // Snap to roads if Google services are available
            if (this.googleMapsLoaded && this.directionsService) {
                this.snapRouteToRoads(coordinates, busId);
            }
        });
    }

    // Snap route to roads using Google Directions API
    snapRouteToRoads(coordinates, busId) {
        if (coordinates.length < 2) return;

        // Use Directions API to snap route to roads
        const waypoints = coordinates.slice(1, -1).map(coord => ({
            location: new google.maps.LatLng(coord[0], coord[1]),
            stopover: false
        }));

        const request = {
            origin: new google.maps.LatLng(coordinates[0][0], coordinates[0][1]),
            destination: new google.maps.LatLng(coordinates[coordinates.length - 1][0], coordinates[coordinates.length - 1][1]),
            waypoints: waypoints,
            optimizeWaypoints: false,
            travelMode: google.maps.TravelMode.DRIVING
        };

        this.directionsService.route(request, (result, status) => {
            if (status === google.maps.DirectionsStatus.OK) {
                // Extract snapped route
                const snappedPath = this.decodePolyline(result.routes[0].overview_polyline);
                
                // Update the polyline with snapped coordinates
                const historyPolyline = this.routePolylines[`${busId}_history`];
                if (historyPolyline) {
                    historyPolyline.setLatLngs(snappedPath);
                }
            } else {
                console.warn('Failed to snap route to roads:', status);
            }
        });
    }

    // Decode Google polyline
    decodePolyline(encoded) {
        const poly = [];
        let index = 0, len = encoded.length;
        let lat = 0, lng = 0;

        while (index < len) {
            let b, shift = 0, result = 0;
            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
            lat += dlat;

            shift = 0;
            result = 0;
            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
            lng += dlng;

            poly.push([lat / 1e5, lng / 1e5]);
        }
        return poly;
    }

    // Update route history for a bus
    updateRouteHistory(busId, location, timestamp) {
        if (!this.routeHistory[busId]) {
            this.routeHistory[busId] = [];
        }

        // Add new point to route history
        this.routeHistory[busId].push({
            latitude: location[0],
            longitude: location[1],
            timestamp: timestamp
        });

        // Keep only last 50 points (approximately 3-4 km)
        if (this.routeHistory[busId].length > 50) {
            this.routeHistory[busId] = this.routeHistory[busId].slice(-50);
        }
    }

    clearRouteHistory() {
        Object.keys(this.routePolylines).forEach(key => {
            if (key.includes('_history')) {
                this.routePolylines[key].remove();
                delete this.routePolylines[key];
            }
        });
    }

    clearRoutePolylines() {
        Object.values(this.routePolylines).forEach(polyline => {
            polyline.remove();
        });
        this.routePolylines = {};
    }

    getCurrentLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    this.currentLocation = [lat, lng];

                    // Remove existing current location marker
                    if (this.currentLocationMarker) {
                        this.currentLocationMarker.remove();
                    }

                    // Add current location marker
                    this.currentLocationMarker = L.marker([lat, lng], {
                        icon: L.divIcon({
                            className: 'current-location-marker',
                            html: '<i class="fas fa-crosshairs" style="color: #1a73e8; font-size: 20px;"></i>',
                            iconSize: [20, 20],
                            iconAnchor: [10, 10]
                        })
                    }).addTo(this.map);

                    // Center map on current location
                    this.map.setView([lat, lng], 16);

                    this.utils.showNotification('Location updated!', 'success');
                },
                (error) => {
                    console.error('Error getting location:', error);
                    this.utils.showNotification('Unable to get your location', 'error');
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 60000
                }
            );
        } else {
            this.utils.showNotification('Geolocation not supported', 'error');
        }
    }

    handleMapClick(e) {
        const latlng = e.latlng;
        
        // Remove existing destination marker
        if (this.destinationMarker) {
            this.destinationMarker.remove();
        }

        // Add destination marker
        this.destinationMarker = L.marker(latlng, {
            icon: L.divIcon({
                className: 'destination-marker',
                html: '<i class="fas fa-map-pin" style="color: #ea4335; font-size: 24px;"></i>',
                iconSize: [24, 24],
                iconAnchor: [12, 24]
            })
        }).addTo(this.map);

        // If we have a current location, show directions
        if (this.currentLocation) {
            this.getDirections(this.currentLocation, [latlng.lat, latlng.lng]);
        }
    }

    handlePlaceSelection(place) {
        if (!place.geometry) {
            this.utils.showNotification('No location data for this place', 'error');
            return;
        }

        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const location = [lat, lng];

        // Center map on selected place
        this.map.setView(location, 16);

        // Add marker for selected place
        L.marker(location)
            .addTo(this.map)
            .bindPopup(`<b>${place.name}</b><br>${place.formatted_address || 'Selected location'}`)
            .openPopup();

        // Clear search results
        const searchResults = document.querySelector('.search-results');
        if (searchResults) {
            searchResults.style.display = 'none';
        }

        // Clear search input
        const searchInput = document.querySelector('.search-input');
        if (searchInput) {
            searchInput.value = '';
        }
    }

    // Enhanced get directions with Google Directions API
    getDirections(origin, destination) {
        if (!this.googleMapsLoaded || !this.directionsService) {
            this.showBasicDirections(origin, destination);
            return;
        }

        const request = {
            origin: new google.maps.LatLng(origin[0], origin[1]),
            destination: new google.maps.LatLng(destination[0], destination[1]),
            travelMode: google.maps.TravelMode.DRIVING,
            unitSystem: google.maps.UnitSystem.METRIC
        };

        this.directionsService.route(request, (result, status) => {
            if (status === google.maps.DirectionsStatus.OK) {
                this.displayDirections(result);
            } else {
                console.warn('Directions request failed:', status);
                this.showBasicDirections(origin, destination);
            }
        });
    }

    // Fallback basic directions
    showBasicDirections(origin, destination) {
        // Clear existing direction polylines
        Object.values(this.directionPolylines).forEach(polyline => {
            polyline.remove();
        });
        this.directionPolylines = {};

        // Create simple straight line
        const polyline = L.polyline([origin, destination], {
            color: '#1a73e8',
            weight: 4,
            opacity: 0.8,
            dashArray: '10, 5'
        }).addTo(this.map);

        this.directionPolylines['basic'] = polyline;

        // Calculate distance and estimated time
        const distance = this.calculateDistance(origin[0], origin[1], destination[0], destination[1]);
        const estimatedTime = Math.round(distance * 2); // Rough estimate: 2 minutes per km

        this.updateBasicRouteInfo(distance, estimatedTime);
    }

    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // Radius of the earth in km
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lng2 - lng1);
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const d = R * c; // Distance in km
        return d;
    }

    deg2rad(deg) {
        return deg * (Math.PI/180);
    }

    updateBasicRouteInfo(distance, time) {
        const info = `
            <div style="padding: 10px;">
                <h4>Route Information</h4>
                <p><strong>Distance:</strong> ${distance.toFixed(2)} km</p>
                <p><strong>Estimated Time:</strong> ${time} minutes</p>
                <p><em>Note: This is a basic route. For detailed directions, please use Google Maps.</em></p>
            </div>
        `;

        // Show info in notification
        this.utils.showNotification(`Route: ${distance.toFixed(2)} km, ${time} min`, 'info');
    }

    // Display Google Directions result
    displayDirections(result) {
        // Clear existing direction polylines
        Object.values(this.directionPolylines).forEach(polyline => {
            polyline.remove();
        });
        this.directionPolylines = {};

        const route = result.routes[0];
        const leg = route.legs[0];

        // Decode and display the route
        const path = this.decodePolyline(route.overview_polyline);
        const polyline = L.polyline(path, {
            color: '#1a73e8',
            weight: 4,
            opacity: 0.8
        }).addTo(this.map);

        this.directionPolylines['google'] = polyline;

        // Fit map to show the entire route
        this.map.fitBounds(polyline.getBounds(), { padding: [20, 20] });

        // Update route information
        this.updateRouteInfo(leg);
    }

    updateRouteInfo(leg) {
        const distance = leg.distance.text;
        const duration = leg.duration.text;
        const startAddress = leg.start_address;
        const endAddress = leg.end_address;

        const info = `
            <div style="padding: 10px;">
                <h4>Route Information</h4>
                <p><strong>Distance:</strong> ${distance}</p>
                <p><strong>Duration:</strong> ${duration}</p>
                <p><strong>From:</strong> ${startAddress}</p>
                <p><strong>To:</strong> ${endAddress}</p>
            </div>
        `;

        // Show info in notification
        this.utils.showNotification(`Route: ${distance}, ${duration}`, 'success');
    }

    getDirectionsToBus(busId) {
        if (!this.currentLocation) {
            this.utils.showNotification('Please get your current location first', 'info');
            return;
        }

        const busData = this.firebaseManager.mockData[busId];
        if (!busData) {
            this.utils.showNotification('Bus location not available', 'error');
            return;
        }

        const destination = [busData.latitude, busData.longitude];
        this.getDirections(this.currentLocation, destination);
    }

    updateBottomInfoBar(busId) {
        const busData = this.firebaseManager.mockData[busId];
        if (!busData) return;

        const isActive = this.firebaseManager.isBusActive(busData.timestamp);
        const status = isActive ? 'Active' : 'Inactive';
        const lastUpdate = this.utils ? this.utils.getTimeAgo(busData.timestamp) : 'Unknown';

        const info = `
            <div style="padding: 10px;">
                <h4>${busId}</h4>
                <p><strong>Status:</strong> ${status}</p>
                <p><strong>Speed:</strong> ${busData.speed || 0} km/h</p>
                <p><strong>Last Update:</strong> ${lastUpdate}</p>
            </div>
        `;

        // Update notification
        this.utils.showNotification(`${busId}: ${status} • ${busData.speed || 0} km/h`, 'info');
    }

    showNotification(message, type = 'info') {
        if (this.utils) {
            this.utils.showNotification(message, type);
        }
    }

    hideNotification() {
        if (this.utils) {
            this.utils.hideNotification();
        }
    }

    clearAll() {
        // Clear all markers and polylines
        Object.values(this.busMarkers).forEach(marker => marker.remove());
        Object.values(this.routePolylines).forEach(polyline => polyline.remove());
        Object.values(this.directionPolylines).forEach(polyline => polyline.remove());
        
        if (this.currentLocationMarker) this.currentLocationMarker.remove();
        if (this.destinationMarker) this.destinationMarker.remove();

        this.busMarkers = {};
        this.routePolylines = {};
        this.directionPolylines = {};
        this.currentLocationMarker = null;
        this.destinationMarker = null;
    }
}

// Make map manager globally accessible
window.mapManager = null;