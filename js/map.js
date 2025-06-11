// Map related functions
function nearBusStop() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;
            
            // Center map on user location
            map.setView([userLat, userLng], 15);
            
            // Search for nearby bus stops
            database.ref('busStops').once('value')
                .then(snapshot => {
                    const busStops = snapshot.val() || {};
                    let nearestStops = [];
                    
                    Object.entries(busStops).forEach(([id, stop]) => {
                        const distance = calculateDistance(
                            { lat: userLat, lng: userLng },
                            { lat: stop.latitude, lng: stop.longitude }
                        );
                        
                        if (distance <= 1000) { // Within 1km
                            nearestStops.push({
                                id,
                                ...stop,
                                distance
                            });
                        }
                    });
                    
                    showNearbyStops(nearestStops);
                });
        });
    }
}

function findBusNearMe() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;
            
            database.ref('BusLocation').once('value')
                .then(snapshot => {
                    const buses = snapshot.val() || {};
                    let nearbyBuses = [];
                    
                    Object.entries(buses).forEach(([busId, locations]) => {
                        const latestLocation = getLatestLocation(locations);
                        if (latestLocation) {
                            const distance = calculateDistance(
                                { lat: userLat, lng: userLng },
                                { lat: latestLocation.latitude, lng: latestLocation.longitude }
                            );
                            
                            if (distance <= 2000) { // Within 2km
                                nearbyBuses.push({
                                    busId,
                                    distance,
                                    ...latestLocation
                                });
                            }
                        }
                    });
                    
                    showNearbyBuses(nearbyBuses);
                });
        });
    }
}

function toggleAvailableBuses() {
    const popup = document.getElementById('popup-available-buses');
    if (popup.classList.contains('hidden')) {
        database.ref('BusLocation').once('value')
            .then(snapshot => {
                const buses = snapshot.val() || {};
                const busList = document.getElementById('available-bus-list');
                busList.innerHTML = '';
                
                Object.entries(buses).forEach(([busId, locations]) => {
                    const latest = getLatestLocation(locations);
                    if (latest) {
                        const li = document.createElement('li');
                        li.innerHTML = `
                            <strong>Bus ${busId}</strong><br>
                            Last seen: ${new Date(latest.timestamp).toLocaleString()}
                        `;
                        busList.appendChild(li);
                    }
                });
                
                popup.classList.remove('hidden');
            });
    } else {
        popup.classList.add('hidden');
    }
}

function getLatestLocation(locations) {
    if (!locations) return null;
    const timestamps = Object.keys(locations);
    if (timestamps.length === 0) return null;
    
    const latestTimestamp = Math.max(...timestamps);
    return locations[latestTimestamp];
}

// Helper functions
function showNearbyStops(stops) {
    const container = document.createElement('div');
    container.className = 'nearby-stops-container';
    
    stops.forEach(stop => {
        const stopElement = document.createElement('div');
        stopElement.className = 'stop-item';
        stopElement.innerHTML = `
            <h3>${stop.name}</h3>
            <p>Distance: ${Math.round(stop.distance)}m</p>
            <button onclick="showStopDetails('${stop.id}')">View Details</button>
        `;
        container.appendChild(stopElement);
    });
    
    // Show in a popup or sidebar
    showPopup(container);
}

function showNearbyBuses(buses) {
    const container = document.createElement('div');
    container.className = 'nearby-buses-container';
    
    buses.forEach(bus => {
        const busElement = document.createElement('div');
        busElement.className = 'bus-item';
        busElement.innerHTML = `
            <h3>Bus ${bus.busId}</h3>
            <p>Distance: ${Math.round(bus.distance)}m</p>
            <button onclick="showBusDetails('${bus.busId}')">Track Bus</button>
        `;
        container.appendChild(busElement);
    });
    
    // Show in a popup or sidebar
    showPopup(container);
}

function showPopup(content) {
    const popup = document.createElement('div');
    popup.className = 'popup';
    popup.innerHTML = `
        <div class="popup-content">
            <span class="close-btn" onclick="this.parentElement.parentElement.remove()">&times;</span>
            ${content.outerHTML}
        </div>
    `;
    document.body.appendChild(popup);
} 