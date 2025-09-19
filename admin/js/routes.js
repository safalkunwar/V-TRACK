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
    
    routeMap.on('click', e => {
        const marker = L.marker(e.latlng).addTo(routeMap);
        const locationName = getFallbackLocationName(e.latlng);
        
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

function getFallbackLocationName(latlng) {
    // Predefined location names for common areas
    const locations = [
        { lat: 28.2096, lng: 83.9856, name: 'Pokhara Center' },
        { lat: 28.2606, lng: 83.8965, name: 'Lakeside Area' },
        { lat: 28.2627, lng: 83.8965, name: 'Phewa Lake' },
        { lat: 28.2461, lng: 84.0489, name: 'Mountain View' },
        { lat: 28.2742, lng: 83.9298, name: 'Airport Area' },
        { lat: 28.2760, lng: 83.9298, name: 'Tourist District' },
        { lat: 28.2600, lng: 83.9888, name: 'Downtown' },
        { lat: 28.2620, lng: 83.9888, name: 'Business District' },
        { lat: 28.2533, lng: 84.0232, name: 'Residential Area' },
        { lat: 28.2234, lng: 84.0596, name: 'Suburban Area' }
    ];
    
    // Find the closest predefined location
    let closestLocation = locations[0];
    let minDistance = calculateDistance(latlng, closestLocation);
    
    for (const location of locations) {
        const distance = calculateDistance(latlng, location);
        if (distance < minDistance) {
            minDistance = distance;
            closestLocation = location;
        }
    }
    
    // If very close to a predefined location, use its name
    if (minDistance < 0.01) { // Within ~1km
        return closestLocation.name;
    }
    
    // Otherwise, generate a generic name based on coordinates
    return `Location (${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)})`;
}

function calculateDistance(point1, point2) {
    const R = 6371; // Earth's radius in km
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLng = (point2.lng - point1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function updateLocationName(index) {
    const input = document.querySelector('.location-name-input');
    if (input && routeMarkers[index]) {
        routeMarkers[index].name = input.value;
        routeMarkers[index].marker.closePopup();
    }
}

function updateRoutePath() {
    const points = routeMarkers.map(marker => marker.latlng);
    routePath.setLatLngs(points);
    const saveBtn = document.getElementById('saveRouteBtn');
    if (saveBtn) {
        saveBtn.disabled = points.length < 2;
    }
}

function clearRoute() {
    if (routeMarkers.length > 0) {
        routeMarkers.forEach(marker => marker.marker.remove());
        routeMarkers = [];
    }
    if (routePath) {
        routePath.setLatLngs([]);
    }
    const saveBtn = document.getElementById('saveRouteBtn');
    if (saveBtn) {
        saveBtn.disabled = true;
    }
}

function showRouteSaveModal() {
    // Remove any existing modal
    const existingModal = document.querySelector('.modal');
    if (existingModal) {
        existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Save Route</h3>
                <button class="close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>Route Name</label>
                    <input type="text" id="routeName" required placeholder="Enter route name">
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea id="routeDescription" placeholder="Enter route description"></textarea>
                </div>
                <div class="form-group">
                    <label>Assign to Bus</label>
                    <select id="busSelect">
                        <option value="">Select Bus (Optional)</option>
                    </select>
                </div>
            </div>
            <div class="modal-actions">
                <button class="btn btn-primary" onclick="saveRoute()">Save Route</button>
                <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    loadBusesForSelect();
}

async function loadBusesForSelect() {
    const select = document.getElementById('busSelect');
    if (!select) return;

    try {
        const snapshot = await database.ref('busDetails').once('value');
        const buses = snapshot.val() || {};
        
        Object.entries(buses).forEach(([id, bus]) => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = `${bus.busNumber || id} - ${bus.busName || 'Unnamed Bus'}`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading buses:', error);
    }
}

async function saveRoute() {
    const nameInput = document.getElementById('routeName');
    const descriptionInput = document.getElementById('routeDescription');
    const busSelect = document.getElementById('busSelect');

    if (!nameInput || !nameInput.value.trim()) {
        showNotification('Please enter a route name', 'error');
        return;
    }

    if (routeMarkers.length < 2) {
        showNotification('Please add at least 2 points to create a route', 'error');
        return;
    }

    try {
        const routeData = {
            name: nameInput.value.trim(),
            description: descriptionInput ? descriptionInput.value.trim() : '',
            points: routeMarkers.map(m => ({
                lat: m.latlng.lat,
                lng: m.latlng.lng,
                name: m.name
            })),
            createdAt: Date.now(),
            createdBy: 'admin'
        };

        // Save route to Firebase
        const routeRef = await database.ref('routes').push(routeData);
        const routeId = routeRef.key;

        // If a bus is selected, assign the route to it
        if (busSelect && busSelect.value) {
            await database.ref(`busDetails/${busSelect.value}`).update({
                route: routeId,
                routeName: routeData.name,
                updatedAt: Date.now()
            });
        }

        showNotification('Route saved successfully!', 'success');
        closeModal();
        clearRoute();
        loadExistingRoutes(); // Refresh the routes list
    } catch (error) {
        console.error('Error saving route:', error);
        showNotification('Error saving route: ' + error.message, 'error');
    }
}

function loadExistingRoutes() {
    const routesList = document.getElementById('routesList');
    if (!routesList) return;

    database.ref('routes').on('value', snapshot => {
        routesList.innerHTML = '';
        const routes = snapshot.val() || {};
        
        if (Object.keys(routes).length === 0) {
            routesList.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 20px;">No routes created yet</p>';
            return;
        }
        
        Object.entries(routes).forEach(([id, route]) => {
            const routeItem = document.createElement('div');
            routeItem.className = 'route-item';
            routeItem.innerHTML = `
                <div class="route-info">
                    <h4>${route.name}</h4>
                    <p>${route.description || 'No description'}</p>
                    <small>Created: ${new Date(route.createdAt).toLocaleDateString()}</small>
                    <small>Points: ${route.points ? route.points.length : 0}</small>
                </div>
                <div class="route-actions">
                    <button class="btn btn-primary" onclick="viewRoute('${id}')">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="btn btn-secondary" onclick="editRoute('${id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-danger" onclick="deleteRoute('${id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            `;
            routesList.appendChild(routeItem);
        });
    });
}

function viewRoute(routeId) {
    database.ref(`routes/${routeId}`).once('value', snapshot => {
        const route = snapshot.val();
        if (!route || !route.points) {
            showNotification('Route not found or has no points', 'error');
            return;
        }

        // Clear existing view
        if (window.viewLayer) {
            routeMap.removeLayer(window.viewLayer);
        }
        if (window.viewMarkers) {
            window.viewMarkers.forEach(marker => marker.remove());
        }

        const points = route.points.map(p => [p.lat, p.lng]);
        routeMap.fitBounds(points);
        
        // Draw route line
        window.viewLayer = L.polyline(points, { 
            color: '#28a745', 
            weight: 4,
            opacity: 0.8 
        }).addTo(routeMap);
        
        // Add markers for each point
        window.viewMarkers = [];
        route.points.forEach((point, index) => {
            const marker = L.marker([point.lat, point.lng])
                .bindPopup(`
                    <div class="route-point-popup">
                        <strong>${index + 1}. ${point.name}</strong><br>
                        <small>${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}</small>
                    </div>
                `)
                .addTo(routeMap);
            window.viewMarkers.push(marker);
        });

        showNotification(`Viewing route: ${route.name}`, 'success');
    });
}

async function deleteRoute(routeId) {
    if (!confirm('Are you sure you want to delete this route? This action cannot be undone.')) {
        return;
    }

    try {
        // Remove route from any buses using it
        const busSnapshot = await database.ref('busDetails')
            .orderByChild('route')
            .equalTo(routeId)
            .once('value');
        
        const updates = {};
        busSnapshot.forEach(child => {
            updates[`busDetails/${child.key}/route`] = null;
            updates[`busDetails/${child.key}/routeName`] = null;
        });
        
        // Delete the route
        updates[`routes/${routeId}`] = null;
        
        await database.ref().update(updates);
        showNotification('Route deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting route:', error);
        showNotification('Error deleting route: ' + error.message, 'error');
    }
}

function showNotification(message, type = 'success') {
    // Remove any existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideInRight 0.3s ease reverse';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }, 3000);
}

function closeModal() {
    const modal = document.querySelector('.modal');
    if (modal) {
        modal.remove();
    }
}

async function editRoute(routeId) {
    try {
        const routeSnapshot = await database.ref(`routes/${routeId}`).once('value');
        const routeData = routeSnapshot.val();
        
        if (!routeData) {
            showNotification('Route not found', 'error');
            return;
        }

        // Clear existing route
        clearRoute();

        // Load route points
        if (routeData.points && routeData.points.length > 0) {
            routeData.points.forEach((point, index) => {
                const marker = L.marker([point.lat, point.lng]).addTo(routeMap);
                routeMarkers.push({
                    marker: marker,
                    name: point.name,
                    latlng: { lat: point.lat, lng: point.lng }
                });
                marker.bindPopup(`
                    <div class="location-edit">
                        <input type="text" value="${point.name}" class="location-name-input">
                        <button onclick="updateLocationName(${index})">Save</button>
                    </div>
                `);
            });
            updateRoutePath();
        }

        // Show edit modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Edit Route</h3>
                    <button class="close" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Route Name</label>
                        <input type="text" id="routeName" value="${routeData.name}" required>
                    </div>
                    <div class="form-group">
                        <label>Description</label>
                        <textarea id="routeDescription">${routeData.description || ''}</textarea>
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-primary" onclick="updateRoute('${routeId}')">Save Changes</button>
                    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    } catch (error) {
        console.error('Error loading route for editing:', error);
        showNotification('Error loading route: ' + error.message, 'error');
    }
}

async function updateRoute(routeId) {
    try {
        const nameInput = document.getElementById('routeName');
        const descriptionInput = document.getElementById('routeDescription');

        if (!nameInput || !nameInput.value.trim()) {
            showNotification('Route name is required', 'error');
            return;
        }

        if (routeMarkers.length < 2) {
            showNotification('Please add at least 2 points to update the route', 'error');
            return;
        }

        await database.ref(`routes/${routeId}`).update({
            name: nameInput.value.trim(),
            description: descriptionInput ? descriptionInput.value.trim() : '',
            points: routeMarkers.map(m => ({
                lat: m.latlng.lat,
                lng: m.latlng.lng,
                name: m.name
            })),
            updatedAt: Date.now()
        });

        showNotification('Route updated successfully', 'success');
        closeModal();
        clearRoute();
        loadExistingRoutes(); // Refresh the routes list
    } catch (error) {
        console.error('Error updating route:', error);
        showNotification('Error updating route: ' + error.message, 'error');
    }
}

// Make functions globally available
window.clearRoute = clearRoute;
window.viewRoute = viewRoute;
window.editRoute = editRoute;
window.deleteRoute = deleteRoute;
window.showNotification = showNotification;
window.updateLocationName = updateLocationName;
window.saveRoute = saveRoute;
window.closeModal = closeModal;
window.updateRoute = updateRoute; 