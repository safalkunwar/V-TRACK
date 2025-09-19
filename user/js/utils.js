// Utilities Module for V-TRACK
class Utils {
    constructor() {
        this.savedPlaces = {};
        this.recentSearches = [];
        this.loadSavedPlaces();
        this.loadRecentSearches();
    }

    // Local Storage Operations
    loadSavedPlaces() {
        const saved = localStorage.getItem('savedPlaces');
        if (saved) {
            this.savedPlaces = JSON.parse(saved);
        }
    }

    saveSavedPlaces() {
        localStorage.setItem('savedPlaces', JSON.stringify(this.savedPlaces));
    }

    loadRecentSearches() {
        const saved = localStorage.getItem('recentSearches');
        if (saved) {
            this.recentSearches = JSON.parse(saved);
        }
    }

    saveRecentSearches() {
        localStorage.setItem('recentSearches', JSON.stringify(this.recentSearches));
    }

    // Saved Places Management
    addSavedPlace(name, location, type = 'custom') {
        this.savedPlaces[name.toLowerCase()] = {
            name: name,
            location: location,
            type: type
        };
        this.saveSavedPlaces();
        this.updateSavedPlacesList();
    }

    getSavedPlace(placeKey) {
        return this.savedPlaces[placeKey];
    }

    getAllSavedPlaces() {
        return Object.values(this.savedPlaces);
    }

    updateSavedPlacesList() {
        const container = document.getElementById('savedPlaces');
        if (!container) return;

        const places = this.getAllSavedPlaces();
        
        container.innerHTML = places.map(place => `
            <div class="saved-place" onclick="utils.goToSavedPlace('${place.name.toLowerCase()}')">
                <div class="place-icon">
                    <i class="fas fa-${place.type === 'home' ? 'home' : 'map-marker-alt'}"></i>
                </div>
                <div>
                    <div style="font-size: 14px; font-weight: 500;">${place.name}</div>
                    <div style="font-size: 12px; color: #5f6368;">Saved Location</div>
                </div>
            </div>
        `).join('');
    }

    goToSavedPlace(placeKey) {
        const place = this.getSavedPlace(placeKey);
        if (place && window.mapManager) {
            window.mapManager.map.setView(place.location, 16);
            L.marker(place.location)
                .addTo(window.mapManager.map)
                .bindPopup(`<b>${place.name}</b><br>Saved location`)
                .openPopup();
        }
    }

    // Recent Searches Management
    addToRecentSearches(search) {
        if (!this.recentSearches.includes(search)) {
            this.recentSearches.unshift(search);
            this.recentSearches = this.recentSearches.slice(0, 5); // Keep only 5 recent searches
            this.saveRecentSearches();
            this.updateRecentSearchesList();
        }
    }

    getRecentSearches() {
        return this.recentSearches;
    }

    updateRecentSearchesList() {
        const container = document.getElementById('recentSearches');
        if (!container) return;

        container.innerHTML = this.recentSearches.map(search => `
            <div class="sidebar-item" onclick="utils.repeatSearch('${search}')">
                <i class="fas fa-history"></i>
                <span>${search}</span>
            </div>
        `).join('');
    }

    repeatSearch(search) {
        const searchInput = document.querySelector('.search-input');
        if (searchInput) {
            searchInput.value = search;
            // Trigger search event
            const event = new Event('input', { bubbles: true });
            searchInput.dispatchEvent(event);
        }
    }

    // Date and Time Utilities
    formatTime(timestamp) {
        return new Date(timestamp).toLocaleTimeString();
    }

    formatDate(timestamp) {
        return new Date(timestamp).toLocaleDateString();
    }

    getTimeAgo(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        return 'Just now';
    }

    // Distance and Location Utilities
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Radius of the earth in km
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);
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

    // UI Utilities
    showLoading(elementId, message = 'Loading...') {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `
                <div class="loading-spinner"></div>
                <span style="margin-left: 8px; color: #5f6368;">${message}</span>
            `;
        }
    }

    hideLoading(elementId, content = '') {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = content;
        }
    }

    // Notification Utilities
    showNotification(message, type = 'info', duration = 5000) {
        const notification = document.getElementById('bottomNotification');
        if (!notification) return;

        const title = notification.querySelector('.notification-title');
        const subtitle = notification.querySelector('.notification-subtitle');
        const icon = notification.querySelector('.notification-icon i');
        
        title.textContent = message;
        subtitle.textContent = new Date().toLocaleTimeString();
        
        // Update icon based on type
        const icons = {
            'success': 'check-circle',
            'error': 'exclamation-circle',
            'warning': 'exclamation-triangle',
            'info': 'info-circle'
        };
        icon.className = `fas fa-${icons[type] || 'info-circle'}`;
        
        // Show notification
        notification.style.display = 'flex';
        
        // Auto-hide after specified duration
        setTimeout(() => {
            this.hideNotification();
        }, duration);
    }

    hideNotification() {
        const notification = document.getElementById('bottomNotification');
        if (notification) {
            notification.style.display = 'none';
        }
    }

    // Sidebar Utilities
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            const isOpen = sidebar.classList.contains('open');
            if (isOpen) {
                sidebar.classList.remove('open');
            } else {
                sidebar.classList.add('open');
            }
        }
    }

    closeSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.remove('open');
        }
    }

    // NEW Search: Nominatim (OpenStreetMap)
    async performSearch(query) {
        if (!query.trim()) {
            this.clearSearchResults();
            return;
        }

        this.addToRecentSearches(query.trim());
        const results = await this.geocodeSearch(query.trim());
        this.displaySearchResults(results);
    }

    async geocodeSearch(query) {
        try {
            // Use a CORS-friendly free Nominatim proxy
            const url = `https://geocode.maps.co/search?q=${encodeURIComponent(query)}&limit=5`;
            const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
            const json = await res.json();
            return json.map(item => ({
                name: item.display_name || item.name || 'Location',
                type: item.type || 'location',
                location: [parseFloat(item.lat), parseFloat(item.lon)]
            }));
        } catch (e) {
            console.error('Geocoding failed', e);
            return [];
        }
    }

    displaySearchResults(results) {
        const searchInput = document.querySelector('.search-input');
        if (!searchInput) return;

        // Create results container if it doesn't exist
        let resultsContainer = document.getElementById('searchResults');
        if (!resultsContainer) {
            resultsContainer = document.createElement('div');
            resultsContainer.id = 'searchResults';
            resultsContainer.className = 'search-results';
            searchInput.parentNode.appendChild(resultsContainer);
        }

        resultsContainer.innerHTML = results.map(result => `
            <div class="search-result" onclick="utils.goToSearchResult('${result.name}', [${result.location}])">
                <i class="fas fa-${this.getSearchResultIcon(result.type)}"></i>
                <span>${result.name}</span>
            </div>
        `).join('');

        resultsContainer.style.display = 'block';
    }

    clearSearchResults() {
        const resultsContainer = document.getElementById('searchResults');
        if (resultsContainer) {
            resultsContainer.style.display = 'none';
        }
    }

    goToSearchResult(name, location) {
        if (window.mapManager) {
            // Set destination marker and remember selection
            if (window.mapManager.destinationMarker) {
                window.mapManager.map.removeLayer(window.mapManager.destinationMarker);
            }
            window.mapManager.destinationMarker = L.marker(location, {
                icon: L.divIcon({
                    className: 'destination-marker',
                    html: '<i class="fas fa-map-marker-alt"></i>',
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                })
            }).addTo(window.mapManager.map);
            window.mapManager.map.setView(location, 16);
            this.lastSelectedDestination = location;
        }
        this.clearSearchResults();
    }

    getSearchResultIcon(type) {
        const icons = {
            'bus-stop': 'bus',
            'station': 'train',
            'location': 'map-marker-alt',
            'restaurant': 'utensils',
            'hospital': 'hospital',
            'default': 'map-marker-alt'
        };
        return icons[type] || icons.default;
    }

    // Filter Utilities
    filterSearchResults(filter) {
        // Implementation for filtering search results
        console.log('Filtering by:', filter);
    }

    // Validation Utilities
    isValidLatLng(lat, lng) {
        return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
    }

    isValidBusId(busId) {
        return busId && typeof busId === 'string' && busId.trim().length > 0;
    }

    // Error Handling
    handleError(error, context = '') {
        console.error(`Error in ${context}:`, error);
        this.showNotification(`Error: ${error.message}`, 'error');
    }

    // Debounce utility
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Throttle utility
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}

// Export for use in other modules
window.Utils = Utils; 