// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

let routeMap = null;
let routeMarkers = [];
let routePath = null;

document.addEventListener('DOMContentLoaded', () => {
    initializeRouteMap();
    loadExistingRoutes();
});

function initializeRouteMap() {
    routeMap = L.map('routeAssignmentMap').setView([28.2096, 83.9856], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(routeMap);
    
    routePath = L.polyline([], { color: '#007bff' }).addTo(routeMap);
    
    routeMap.on('click', async e => {
        const marker = L.marker(e.latlng).addTo(routeMap);
        const locationName = await reverseGeocode(e.latlng);
        
        const popupContent = `
            <div class="location-edit">
                <input type="text" value="${locationName}" class="location-name-input">
                <button onclick="updateLocationName(${routeMarkers.length})">Save</button>
            </div>
        `;
        marker.bindPopup(popupContent).openPopup();
        
        routeMarkers.push({
            marker: marker,
            name: locationName,
            latlng: e.latlng
        });
        updateRoutePath();
    });

    // Add save route functionality
    document.getElementById('saveRouteBtn').addEventListener('click', showRouteSaveModal);
}

async function reverseGeocode(latlng) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latlng.lat}&lon=${latlng.lng}&format=json`);
        const data = await response.json();
        return data.display_name.split(',')[0] || 'Unknown Location';
    } catch (error) {
        console.error('Error getting location name:', error);
        return 'Unknown Location';
    }
}

function updateLocationName(index) {
    const input = document.querySelector('.location-name-input');
    routeMarkers[index].name = input.value;
    routeMarkers[index].marker.closePopup();
}

function updateRoutePath() {
    const points = routeMarkers.map(marker => marker.latlng);
    routePath.setLatLngs(points);
    document.getElementById('saveRouteBtn').disabled = points.length < 2;
}

function clearRoute() {
    if (routeMarkers.length > 0) {
        routeMarkers.forEach(marker => marker.marker.remove());
        routeMarkers = [];
    }
    if (routePath) {
        routePath.setLatLngs([]);
    }
    document.getElementById('saveRouteBtn').disabled = true;
}

function showRouteSaveModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>Save Route</h3>
            <div class="form-group">
                <label>Route Name</label>
                <input type="text" id="routeName" required>
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea id="routeDescription"></textarea>
            </div>
            <div class="form-group">
                <label>Assign to Bus</label>
                <select id="busSelect">
                    <option value="">Select Bus</option>
                </select>
            </div>
            <div class="button-group">
                <button onclick="saveRoute()">Save</button>
                <button onclick="this.closest('.modal').remove()">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    loadBusesForSelect();
}

async function loadBusesForSelect() {
    const select = document.getElementById('busSelect');
    const snapshot = await database.ref('busDetails').once('value');
    const buses = snapshot.val() || {};
    
    Object.entries(buses).forEach(([id, bus]) => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = `${bus.busNumber} - ${bus.busName}`;
        select.appendChild(option);
    });
}

async function saveRoute() {
    const name = document.getElementById('routeName').value;
    const description = document.getElementById('routeDescription').value;
    const busId = document.getElementById('busSelect').value;

    if (!name) {
        showNotification('Please enter a route name', 'error');
        return;
    }

    try {
        const routeData = {
            name,
            description,
            points: routeMarkers.map(m => ({
                lat: m.latlng.lat,
                lng: m.latlng.lng,
                name: m.name
            })),
            createdAt: Date.now()
        };

        const routeRef = await database.ref('routes').push(routeData);

        if (busId) {
            await database.ref(`busDetails/${busId}`).update({
                route: routeRef.key
            });
        }

        showNotification('Route saved successfully');
        document.querySelector('.modal').remove();
        clearRoute();
    } catch (error) {
        console.error('Error saving route:', error);
        showNotification('Error saving route', 'error');
    }
}

function loadExistingRoutes() {
    const routesList = document.getElementById('routesList');
    database.ref('routes').on('value', snapshot => {
        routesList.innerHTML = '';
        const routes = snapshot.val() || {};
        
        Object.entries(routes).forEach(([id, route]) => {
            routesList.innerHTML += `
                <div class="route-item">
                    <div class="route-info">
                        <h4>${route.name}</h4>
                        <p>${route.description || 'No description'}</p>
                    </div>
                    <div class="route-actions">
                        <button onclick="viewRoute('${id}')">View</button>
                        <button onclick="editRoute('${id}')">Edit</button>
                        <button onclick="deleteRoute('${id}')" class="delete">Delete</button>
                    </div>
                </div>
            `;
        });
    });
}

function viewRoute(routeId) {
    database.ref(`routes/${routeId}`).once('value', snapshot => {
        const route = snapshot.val();
        if (!route) return;

        const points = route.points.map(p => [p.lat, p.lng]);
        routeMap.fitBounds(points);
        
        if (window.viewLayer) {
            routeMap.removeLayer(window.viewLayer);
        }
        window.viewLayer = L.polyline(points, { color: '#28a745' }).addTo(routeMap);
        
        route.points.forEach(point => {
            L.marker([point.lat, point.lng])
                .bindPopup(point.name)
                .addTo(routeMap);
        });
    });
}

async function deleteRoute(routeId) {
    if (!confirm('Are you sure you want to delete this route?')) return;

    try {
        // Remove route from any buses using it
        const busSnapshot = await database.ref('busDetails')
            .orderByChild('route')
            .equalTo(routeId)
            .once('value');
        
        const updates = {};
        busSnapshot.forEach(child => {
            updates[`busDetails/${child.key}/route`] = null;
        });
        
        // Delete the route
        updates[`routes/${routeId}`] = null;
        
        await database.ref().update(updates);
        showNotification('Route deleted successfully');
    } catch (error) {
        console.error('Error deleting route:', error);
        showNotification('Error deleting route', 'error');
    }
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Make functions globally available
window.clearRoute = clearRoute;
window.viewRoute = viewRoute;
window.editRoute = editRoute;
window.deleteRoute = deleteRoute;
window.showNotification = showNotification;
window.updateLocationName = updateLocationName;
window.saveRoute = saveRoute;

async function editRoute(routeId) {
    const routeSnapshot = await database.ref(`routes/${routeId}`).once('value');
    const routeData = routeSnapshot.val();

    // Clear existing route
    clearRoute();

    // Load route points
    routeData.points.forEach(point => {
        const marker = L.marker([point.lat, point.lng]).addTo(routeMap);
        routeMarkers.push({
            marker: marker,
            name: point.name,
            latlng: { lat: point.lat, lng: point.lng }
        });
        marker.bindPopup(`
            <div class="location-edit">
                <input type="text" value="${point.name}" class="location-name-input">
                <button onclick="updateLocationName(${routeMarkers.length - 1})">Save</button>
            </div>
        `);
    });
    updateRoutePath();

    // Show edit modal
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>Edit Route</h3>
            <div class="form-group">
                <label>Route Name</label>
                <input type="text" id="routeName" value="${routeData.name}" required>
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea id="routeDescription">${routeData.description || ''}</textarea>
            </div>
            <div class="button-group">
                <button onclick="updateRoute('${routeId}')">Save Changes</button>
                <button onclick="this.closest('.modal').remove()">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

async function updateRoute(routeId) {
    try {
        const name = document.getElementById('routeName').value;
        const description = document.getElementById('routeDescription').value;

        if (!name) {
            showNotification('Route name is required', 'error');
            return;
        }

        await database.ref(`routes/${routeId}`).update({
            name,
            description,
            points: routeMarkers.map(m => ({
                lat: m.latlng.lat,
                lng: m.latlng.lng,
                name: m.name
            })),
            updatedAt: Date.now()
        });

        showNotification('Route updated successfully');
        document.querySelector('.modal').remove();
        clearRoute();
    } catch (error) {
        console.error('Error updating route:', error);
        showNotification('Error updating route', 'error');
    }
} 