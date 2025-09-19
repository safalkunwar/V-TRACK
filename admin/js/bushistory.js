// Firebase Configuration
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

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

// Global variables
let historyMap = null;
let currentBusId = null;
let availableDates = [];
let currentPathLayer = null;
let routingControl = null;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait for navbar to load first
    setTimeout(() => {
        navbarLoader.loadNavbar('navbar-container', 'Bus History');
        
        // Initialize components after navbar is loaded
        setTimeout(() => {
            testFirebaseConnection();
            initializeMap();
            loadBusList();
        }, 500);
    }, 100);
});

// Test Firebase connection and data structure
function testFirebaseConnection() {
    console.log('Testing Firebase connection...');
    addDebugOutput('Testing Firebase connection...');
    
    // Test basic connection
    database.ref('.info/connected').on('value', (snapshot) => {
        const connected = snapshot.val();
        console.log('Firebase connected:', connected);
        addDebugOutput(`Firebase connected: ${connected}`);
    });
    
    // Test BusLocation structure
    database.ref('BusLocation').once('value')
        .then(snapshot => {
            const data = snapshot.val();
            console.log('BusLocation structure:', data);
            addDebugOutput('BusLocation structure loaded');
            
            if (data) {
                Object.keys(data).forEach(busId => {
                    const recordCount = Object.keys(data[busId]).length;
                    console.log(`Bus ${busId} has ${recordCount} location records`);
                    addDebugOutput(`Bus ${busId} has ${recordCount} location records`);
                });
            } else {
                console.warn('No BusLocation data found');
                addDebugOutput('WARNING: No BusLocation data found');
            }
        })
        .catch(error => {
            console.error('Error testing Firebase connection:', error);
            addDebugOutput(`ERROR: ${error.message}`);
        });
}

// Add debug output to the page
function addDebugOutput(message) {
    const debugOutput = document.getElementById('debug-output');
    if (debugOutput) {
        const timestamp = new Date().toLocaleTimeString();
        debugOutput.innerHTML += `<div>[${timestamp}] ${message}</div>`;
        debugOutput.scrollTop = debugOutput.scrollHeight;
    }
}

// Initialize Leaflet map with enhanced features
function initializeMap() {
    try {
        // Check if Leaflet is loaded
        if (typeof L === 'undefined') {
            console.warn('Leaflet not loaded yet, retrying in 1 second...');
            setTimeout(initializeMap, 1000);
            return;
        }

        const mapContainer = document.getElementById('history-map');
        if (!mapContainer) {
            console.warn('History map container not found');
            return;
        }

        // Initialize map with better default view
        historyMap = L.map('history-map').setView([28.2096, 83.9856], 13);
        
        // Add multiple tile layers for better road visualization
        const osmTiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
        });
        
        const satelliteTiles = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 19,
            attribution: '© Esri'
        });
        
        const roadTiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png?layers=transport', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
        });

        // Add base layers control
        const baseLayers = {
            "OpenStreetMap": osmTiles,
            "Satellite": satelliteTiles,
            "Roads": roadTiles
        };
        
        L.control.layers(baseLayers).addTo(historyMap);
        osmTiles.addTo(historyMap);

        console.log('Enhanced map initialized successfully');
        addDebugOutput('Enhanced map initialized with multiple tile layers');
    } catch (error) {
        console.error("Error initializing map:", error);
        const mapContainer = document.getElementById('history-map');
        if (mapContainer) {
            mapContainer.innerHTML = '<p class="error-message">Error loading map. Please refresh the page.</p>';
        }
    }
}

// Enhanced GPS data parser to handle inconsistent Firebase formats
function parseGPSData(data, timestamp) {
    try {
        // Format 1: "latitude,longitude,timestamp" or "latitude,longitude"
        if (typeof data === 'string' && data.includes(',')) {
            const parts = data.split(',');
            if (parts.length >= 2) {
                const lat = parseFloat(parts[0]);
                const lng = parseFloat(parts[1]);
                const dataTimestamp = parts.length >= 3 ? parseFloat(parts[2]) : timestamp;
                
                if (!isNaN(lat) && !isNaN(lng)) {
                    return {
                        lat: lat,
                        lng: lng,
                        timestamp: dataTimestamp || timestamp
                    };
                }
            }
        }
        
        // Format 2: Object with latitude, longitude properties
        if (typeof data === 'object' && data !== null) {
            const lat = parseFloat(data.latitude || data.lat);
            const lng = parseFloat(data.longitude || data.lng);
            const dataTimestamp = parseFloat(data.timestamp) || timestamp;
            
            if (!isNaN(lat) && !isNaN(lng)) {
                return {
                    lat: lat,
                    lng: lng,
                    timestamp: dataTimestamp
                };
            }
        }
        
        console.warn('Unable to parse GPS data:', data);
        return null;
    } catch (error) {
        console.error('Error parsing GPS data:', error, data);
        return null;
    }
}

// Load bus list from Firebase
function loadBusList() {
    const busSelect = document.getElementById('busSelect');
    if (!busSelect) {
        console.warn('busSelect element not found');
        return;
    }

    console.log('Loading bus list from Firebase...');

    // Load buses from BusLocation structure
    database.ref('BusLocation').once('value')
        .then(snapshot => {
            console.log('BusLocation snapshot:', snapshot.val());
            busSelect.innerHTML = '<option value="">Select Bus</option>';
            
            let busCount = 0;
            snapshot.forEach(child => {
                const busId = child.key; // bus1, bus2, bus3, bus4
                console.log('Found bus:', busId);
                const option = document.createElement('option');
                option.value = busId;
                option.textContent = `Bus ${busId.toUpperCase()}`;
                busSelect.appendChild(option);
                busCount++;
            });
            
            console.log(`Loaded ${busCount} buses`);
            addDebugOutput(`Loaded ${busCount} buses`);
            
            if (busCount === 0) {
                showError('No buses found in database. Please check Firebase connection.');
            } else {
                // Update statistics after loading bus list
                updateStatistics();
            }
        })
        .catch(error => {
            console.error("Error loading bus list:", error);
            showError('Error loading bus list. Please refresh the page.');
        });
}

// Handle bus selection
function onBusSelect() {
    const busId = document.getElementById('busSelect').value;
    if (!busId) {
        hideDateFilter();
        clearMap();
        return;
    }

    currentBusId = busId;
    showDateFilter();
    loadAvailableDates(busId);
    clearMap();
}

// Show date filter section
function showDateFilter() {
    const dateFilter = document.getElementById('dateFilter');
    if (dateFilter) {
        dateFilter.classList.remove('hidden');
    }
}

// Hide date filter section
function hideDateFilter() {
    const dateFilter = document.getElementById('dateFilter');
    if (dateFilter) {
        dateFilter.classList.add('hidden');
    }
}

// Enhanced load available dates with better data parsing and UI feedback
function loadAvailableDates(busId) {
    const availableDatesDiv = document.getElementById('availableDates');
    if (!availableDatesDiv) return;

    availableDatesDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading available dates...';

    console.log(`Loading available dates for bus: ${busId}`);
    addDebugOutput(`Loading available dates for bus: ${busId}`);

    // Load from BusLocation structure
    database.ref('BusLocation').child(busId).once('value')
        .then(snapshot => {
            console.log(`Bus ${busId} data:`, snapshot.val());
            const dates = new Set();
            let validRecords = 0;
            let totalRecords = 0;
            
            // Extract dates from timestamp keys and validate data
            snapshot.forEach(child => {
                totalRecords++;
                const timestamp = parseInt(child.key);
                const data = child.val();
                
                console.log('Processing record:', child.key, 'Data:', data);
                
                if (!isNaN(timestamp)) {
                    // Try to parse the GPS data
                    const parsedData = parseGPSData(data, timestamp);
                    if (parsedData) {
                        validRecords++;
                        const date = new Date(parsedData.timestamp);
                        const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD format
                        dates.add(dateString);
                        console.log('Added valid date:', dateString);
                    } else {
                        console.warn('Invalid GPS data for timestamp:', timestamp, data);
                        addDebugOutput(`Invalid GPS data for timestamp: ${timestamp}`);
                    }
                } else {
                    console.warn('Invalid timestamp key:', child.key);
                    addDebugOutput(`Invalid timestamp key: ${child.key}`);
                }
            });

            availableDates = Array.from(dates).sort();
            console.log('Available dates:', availableDates);
            addDebugOutput(`Found ${validRecords}/${totalRecords} valid records across ${availableDates.length} dates`);
            
            if (availableDates.length > 0) {
                availableDatesDiv.innerHTML = `
                    <strong>Available dates (${availableDates.length}):</strong><br>
                    <strong>Valid records:</strong> ${validRecords}/${totalRecords}<br>
                    ${availableDates.slice(0, 5).join(', ')}${availableDates.length > 5 ? '...' : ''}
                `;
                
                // Set default date range
                const startDate = document.getElementById('startDate');
                const endDate = document.getElementById('endDate');
                if (startDate && endDate) {
                    startDate.value = availableDates[0];
                    endDate.value = availableDates[availableDates.length - 1];
                    
                    // Disable dates with no data
                    disableInvalidDates(startDate, endDate, availableDates);
                }
            } else {
                availableDatesDiv.innerHTML = '<strong>No valid tracking data available for this bus.</strong>';
            }
        })
        .catch(error => {
            console.error('Error loading available dates:', error);
            availableDatesDiv.innerHTML = '<strong>Error loading dates. Please try again.</strong>';
        });
}

// Disable invalid dates in date inputs
function disableInvalidDates(startDateInput, endDateInput, validDates) {
    // Create a list of valid dates for comparison
    const validDatesSet = new Set(validDates);
    
    // Add event listeners to validate date selection
    startDateInput.addEventListener('change', function() {
        const selectedDate = this.value;
        if (!validDatesSet.has(selectedDate)) {
            showError('Selected start date has no tracking data. Please choose a valid date.');
            this.value = '';
        }
    });
    
    endDateInput.addEventListener('change', function() {
        const selectedDate = this.value;
        if (!validDatesSet.has(selectedDate)) {
            showError('Selected end date has no tracking data. Please choose a valid date.');
            this.value = '';
        }
    });
}

// Handle date change
function onDateChange() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    // Validate date range
    if (startDate && endDate && startDate > endDate) {
        showError('Start date cannot be after end date');
        return;
    }
}

// Enhanced show path for specific date range with better loading states
async function showPathByDate() {
    const busId = document.getElementById('busSelect').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (!busId || !startDate || !endDate) {
        showError('Please select bus and date range');
        return;
    }

    const startTimestamp = new Date(startDate + 'T00:00:00').getTime();
    const endTimestamp = new Date(endDate + 'T23:59:59').getTime();

    clearMap();
    showLoading('Loading and processing path data...');

    // Fetch location data for the date range
    database.ref('BusLocation').child(busId)
        .orderByKey()
        .startAt(startTimestamp.toString())
        .endAt(endTimestamp.toString())
        .once('value')
        .then(snapshot => {
            const locations = [];
            let validRecords = 0;
            let totalRecords = 0;
            
            snapshot.forEach(child => {
                totalRecords++;
                const data = child.val();
                const timestamp = parseInt(child.key);
                
                // Use enhanced GPS data parser
                const parsedData = parseGPSData(data, timestamp);
                if (parsedData) {
                    validRecords++;
                    locations.push(parsedData);
                } else {
                    console.warn('Skipping invalid GPS data:', data);
                    addDebugOutput(`Skipped invalid GPS data for timestamp: ${timestamp}`);
                }
            });

            addDebugOutput(`Processed ${validRecords}/${totalRecords} valid records`);

            if (locations.length > 0) {
                displayBusPath(locations, `Path History (${startDate} to ${endDate})`);
                displayTimelineList(locations);
            } else {
                showError('No valid tracking data found for selected date range');
            }
        })
        .catch(error => {
            console.error('Error fetching path data:', error);
            showError('Error loading path data. Please try again.');
        });
}

// Enhanced show overall path history with loading states
async function showOverallPath() {
    const busId = document.getElementById('busSelect').value;
    if (!busId) {
        showError('Please select a bus first');
        return;
    }

    clearMap();
    showLoading('Loading and processing overall path history...');

    database.ref('BusLocation').child(busId).once('value')
        .then(snapshot => {
            const locations = [];
            let validRecords = 0;
            let totalRecords = 0;
            
            snapshot.forEach(child => {
                totalRecords++;
                const data = child.val();
                const timestamp = parseInt(child.key);
                
                // Use enhanced GPS data parser
                const parsedData = parseGPSData(data, timestamp);
                if (parsedData) {
                    validRecords++;
                    locations.push(parsedData);
                } else {
                    console.warn('Skipping invalid GPS data:', data);
                    addDebugOutput(`Skipped invalid GPS data for timestamp: ${timestamp}`);
                }
            });

            addDebugOutput(`Processed ${validRecords}/${totalRecords} valid records for overall path`);

            if (locations.length > 0) {
                displayBusPath(locations, 'Overall Path History');
                displayTimelineList(locations);
            } else {
                showError('No valid path history found for this bus');
            }
        })
        .catch(error => {
            console.error('Error fetching overall path:', error);
            showError('Error loading path history. Please try again.');
        });
}

// Get filtering parameters from UI
function getFilteringParameters() {
    const enableFiltering = document.getElementById('enableFiltering')?.checked ?? true;
    
    if (!enableFiltering) {
        return {
            enabled: false,
            maxDistance: Infinity,
            maxTimeGap: Infinity,
            maxSpeed: Infinity,
            segmentDistance: Infinity
        };
    }
    
    return {
        enabled: true,
        maxDistance: parseInt(document.getElementById('maxDistance')?.value ?? '500'), // Reduced default
        maxTimeGap: parseInt(document.getElementById('maxTimeGap')?.value ?? '30') * 60 * 1000, // Convert to milliseconds
        maxSpeed: parseInt(document.getElementById('maxSpeed')?.value ?? '120'),
        segmentDistance: parseInt(document.getElementById('segmentDistance')?.value ?? '500')
    };
}

// Add visual feedback for filtering process
function showFilteringStats(originalCount, filteredCount, segmentsCount) {
    const historyList = document.getElementById('history-list');
    if (historyList) {
        const removedCount = originalCount - filteredCount;
        const statsHtml = `
            <div style="background: #e9ecef; padding: 10px; border-radius: 5px; margin-bottom: 15px;">
                <h4><i class="fas fa-chart-bar"></i> Filtering Statistics</h4>
                <p><strong>Original points:</strong> ${originalCount}</p>
                <p><strong>After filtering:</strong> ${filteredCount}</p>
                <p><strong>Removed points:</strong> ${removedCount} (${((removedCount/originalCount)*100).toFixed(1)}%)</p>
                <p><strong>Path segments:</strong> ${segmentsCount}</p>
                <p><strong>Filtering enabled:</strong> ${getFilteringParameters().enabled ? 'Yes' : 'No'}</p>
            </div>
        `;
        
        // Insert stats at the beginning of the history list
        const existingContent = historyList.innerHTML;
        historyList.innerHTML = statsHtml + existingContent;
    }
}

// Enhanced road proximity checking with OSRM integration
async function checkRoadProximity(lat, lng) {
    // Enhanced bounds checking for Nepal/Pokhara area
    const validBounds = {
        lat: { min: 27.0, max: 30.0 }, // Nepal latitude bounds
        lng: { min: 80.0, max: 88.0 }  // Nepal longitude bounds
    };
    
    // Check if coordinates are within reasonable bounds
    if (lat < validBounds.lat.min || lat > validBounds.lat.max ||
        lng < validBounds.lng.min || lng > validBounds.lng.max) {
        return { isValid: false, reason: 'out_of_bounds' };
    }
    
    // Additional check for extreme values (likely GPS errors)
    if (lat === 0 || lng === 0 || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
        return { isValid: false, reason: 'invalid_coordinates' };
    }
    
    // Try to check road proximity using OSRM (OpenStreetMap Routing Machine)
    try {
        const response = await fetch(`https://router.project-osrm.org/nearest/v1/driving/${lng},${lat}?number=1`);
        if (response.ok) {
            const data = await response.json();
            if (data.code === 'Ok' && data.waypoints && data.waypoints.length > 0) {
                const distance = data.waypoints[0].distance; // Distance in meters
                const maxRoadDistance = 100; // Maximum distance from road (100 meters)
                
                if (distance <= maxRoadDistance) {
                    return { 
                        isValid: true, 
                        distance: distance,
                        roadCoordinates: data.waypoints[0].location 
                    };
                } else {
                    return { 
                        isValid: false, 
                        reason: 'too_far_from_road',
                        distance: distance 
                    };
                }
            }
        }
    } catch (error) {
        console.warn('OSRM check failed, using fallback validation:', error);
    }
    
    // Fallback: basic validation passed
    return { isValid: true, distance: 0 };
}

// Enhanced filtering with road alignment and gap detection
async function filterUnrealisticJumps(locations) {
    const params = getFilteringParameters();
    const filtered = [];
    
    if (!params.enabled) {
        return locations;
    }

    showLoading('Filtering and validating GPS coordinates...');
    addDebugOutput(`Starting coordinate filtering for ${locations.length} points...`);

    for (let i = 0; i < locations.length; i++) {
        const current = locations[i];
        
        // Show progress
        if (i % 10 === 0) {
            const progress = Math.round((i / locations.length) * 100);
            updateLoadingProgress(progress);
        }
        
        if (i === 0) {
            // Check if first point is reasonable
            const roadCheck = await checkRoadProximity(current.lat, current.lng);
            if (roadCheck.isValid) {
                filtered.push({
                    ...current,
                    roadAligned: roadCheck.roadCoordinates ? roadCheck.roadCoordinates : [current.lat, current.lng]
                });
            } else {
                console.log(`Filtered out first point: ${roadCheck.reason}`);
                addDebugOutput(`Filtered first point: ${roadCheck.reason}`);
            }
            continue;
        }

        const previous = filtered[filtered.length - 1];
        const distance = calculateDistance(current, previous);
        const timeDiff = (current.timestamp - previous.timestamp) / 1000; // seconds
        const speed = timeDiff > 0 ? (distance / 1000) / (timeDiff / 3600) : 0; // km/h

        // Check road proximity for current point
        const roadCheck = await checkRoadProximity(current.lat, current.lng);
        
        // Enhanced unrealistic jump detection
        const isUnrealisticJump = 
            distance > params.maxDistance || // Too far apart
            timeDiff > (params.maxTimeGap / 1000) || // Too much time gap
            speed > params.maxSpeed || // Too fast
            !roadCheck.isValid || // Off-road or invalid
            distance < 1; // Too close (GPS noise)

        if (!isUnrealisticJump) {
            // Check if we can connect to previous point via road routing
            if (distance > 300) { // Large gap detected
                try {
                    const routeResponse = await fetch(
                        `https://router.project-osrm.org/route/v1/driving/${previous.lng},${previous.lat};${current.lng},${current.lat}?overview=full&geometries=geojson`
                    );
                    
                    if (routeResponse.ok) {
                        const routeData = await routeResponse.json();
                        if (routeData.code === 'Ok' && routeData.routes && routeData.routes.length > 0) {
                            const routeDistance = routeData.routes[0].distance;
                            const routeDuration = routeData.routes[0].duration;
                            
                            // If route distance is reasonable (not too much longer than direct distance)
                            if (routeDistance <= distance * 1.5) {
                                filtered.push({
                                    ...current,
                                    roadAligned: roadCheck.roadCoordinates ? roadCheck.roadCoordinates : [current.lat, current.lng],
                                    isGapConnection: true,
                                    routeDistance: routeDistance,
                                    routeDuration: routeDuration
                                });
                                addDebugOutput(`Connected gap via road routing: ${distance.toFixed(0)}m direct, ${routeDistance.toFixed(0)}m via road`);
                                continue;
                            }
                        }
                    }
                } catch (error) {
                    console.warn('Road routing check failed:', error);
                }
            }
            
            // Normal point addition
            filtered.push({
                ...current,
                roadAligned: roadCheck.roadCoordinates ? roadCheck.roadCoordinates : [current.lat, current.lng]
            });
        } else {
            const reason = [];
            if (distance > params.maxDistance) reason.push(`distance=${distance.toFixed(0)}m`);
            if (timeDiff > (params.maxTimeGap / 1000)) reason.push(`time=${timeDiff.toFixed(0)}s`);
            if (speed > params.maxSpeed) reason.push(`speed=${speed.toFixed(0)}km/h`);
            if (!roadCheck.isValid) reason.push(`off-road (${roadCheck.reason})`);
            if (distance < 1) reason.push('too close');
            
            console.log(`Filtered out jump: ${reason.join(', ')}`);
            addDebugOutput(`Filtered jump: ${reason.join(', ')}`);
        }
    }

    addDebugOutput(`Filtering complete: ${filtered.length}/${locations.length} points retained`);
    return filtered;
}

// Enhanced comprehensive path filtering and smoothing with road alignment
async function filterAndSmoothPath(locations) {
    if (locations.length < 2) return locations;

    console.log(`Filtering ${locations.length} location points...`);
    addDebugOutput(`Filtering ${locations.length} location points...`);

    // Step 1: Sort by timestamp
    locations.sort((a, b) => a.timestamp - b.timestamp);

    // Step 2: Filter out unrealistic jumps and gaps with road alignment
    const filteredLocations = await filterUnrealisticJumps(locations);
    console.log(`After jump filtering: ${filteredLocations.length} points`);
    addDebugOutput(`After jump filtering: ${filteredLocations.length} points`);

    // Step 3: Group into continuous segments
    const segments = groupIntoSegments(filteredLocations);
    console.log(`Created ${segments.length} continuous segments`);
    addDebugOutput(`Created ${segments.length} continuous segments`);

    // Step 4: Apply smoothing to each segment
    const smoothedSegments = segments.map(segment => smoothPathSegment(segment));
    
    // Step 5: Combine segments back into a single path
    const finalPath = [];
    smoothedSegments.forEach((segment, index) => {
        if (index > 0) {
            // Add a gap indicator between segments
            finalPath.push({
                lat: null,
                lng: null,
                timestamp: null,
                isGap: true
            });
        }
        finalPath.push(...segment);
    });

    console.log(`Final path has ${finalPath.length} points`);
    addDebugOutput(`Final path has ${finalPath.length} points`);

    return finalPath;
}

// Enhanced grouping with better segment detection
function groupIntoSegments(locations) {
    const params = getFilteringParameters();
    const segments = [];
    let currentSegment = [];

    for (let i = 0; i < locations.length; i++) {
        const current = locations[i];
        
        if (currentSegment.length === 0) {
            currentSegment.push(current);
            continue;
        }

        const lastInSegment = currentSegment[currentSegment.length - 1];
        const distance = calculateDistance(current, lastInSegment);
        const timeDiff = (current.timestamp - lastInSegment.timestamp) / 1000; // seconds

        // Enhanced continuous segment detection
        const isContinuous = 
            distance <= params.segmentDistance && // Within segment distance
            timeDiff <= 10 * 60; // Within 10 minutes

        if (isContinuous) {
            currentSegment.push(current);
        } else {
            // Start a new segment
            if (currentSegment.length > 0) {
                segments.push([...currentSegment]);
            }
            currentSegment = [current];
        }
    }

    // Add the last segment
    if (currentSegment.length > 0) {
        segments.push(currentSegment);
    }

    return segments;
}

// Enhanced smoothing with better algorithms
function smoothPathSegment(locations) {
    if (locations.length < 3) return locations;

    const smoothed = [];
    const windowSize = 5; // Increased window size for better smoothing

    for (let i = 0; i < locations.length; i++) {
        const start = Math.max(0, i - Math.floor(windowSize / 2));
        const end = Math.min(locations.length, i + Math.floor(windowSize / 2) + 1);
        
        let sumLat = 0, sumLng = 0, count = 0;
        
        for (let j = start; j < end; j++) {
            // Use road-aligned coordinates if available
            const coords = locations[j].roadAligned || [locations[j].lat, locations[j].lng];
            sumLat += coords[0];
            sumLng += coords[1];
            count++;
        }

        smoothed.push({
            lat: sumLat / count,
            lng: sumLng / count,
            timestamp: locations[i].timestamp,
            roadAligned: locations[i].roadAligned,
            isGapConnection: locations[i].isGapConnection
        });
    }

    return smoothed;
}

// Calculate distance between two points using Haversine formula
function calculateDistance(point1, point2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = point1.lat * Math.PI/180;
    const φ2 = point2.lat * Math.PI/180;
    const Δφ = (point2.lat - point1.lat) * Math.PI/180;
    const Δλ = (point2.lng - point1.lng) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
}

// Enhanced display bus path with road alignment and smooth rendering
async function displayBusPath(locations, title) {
    try {
        if (!historyMap) {
            throw new Error('Map not initialized');
        }

        if (locations.length < 2) {
            throw new Error('Not enough points to display path');
        }

        const originalCount = locations.length;
        
        // Show map loading overlay
        showMapLoading();
        
        // Apply comprehensive filtering and smoothing with road alignment
        showLoading('Processing and filtering GPS coordinates...');
        const processedLocations = await filterAndSmoothPath(locations);
        
        // Hide map loading overlay
        hideMapLoading();
        
        // Count segments
        const segments = [];
        let currentSegment = [];
        processedLocations.forEach(location => {
            if (location.isGap) {
                if (currentSegment.length > 0) {
                    segments.push(currentSegment);
                    currentSegment = [];
                }
            } else {
                currentSegment.push([location.lat, location.lng]);
            }
        });
        if (currentSegment.length > 0) {
            segments.push(currentSegment);
        }

        // Show filtering statistics
        const filteredCount = processedLocations.filter(loc => !loc.isGap).length;
        showFilteringStats(originalCount, filteredCount, segments.length);
        
        // Show path statistics
        showPathStatistics(locations, processedLocations);

        // Create path segments (skip gaps)
        const pathSegments = [];
        currentSegment = [];

        processedLocations.forEach(location => {
            if (location.isGap) {
                // End current segment and start new one
                if (currentSegment.length > 0) {
                    pathSegments.push(currentSegment);
                    currentSegment = [];
                }
            } else {
                // Use road-aligned coordinates if available
                const coords = location.roadAligned || [location.lat, location.lng];
                currentSegment.push(coords);
            }
        });

        // Add the last segment
        if (currentSegment.length > 0) {
            pathSegments.push(currentSegment);
        }

        // Remove previous path layer
        if (currentPathLayer) {
            if (Array.isArray(currentPathLayer)) {
                currentPathLayer.forEach(layer => {
                    if (historyMap && historyMap.hasLayer(layer)) {
                        historyMap.removeLayer(layer);
                    }
                });
                // Remove animated paths
                if (currentPathLayer.animatedPaths) {
                    currentPathLayer.animatedPaths.forEach(layer => {
                        if (historyMap && historyMap.hasLayer(layer)) {
                            historyMap.removeLayer(layer);
                        }
                    });
                }
            } else if (historyMap && historyMap.hasLayer(currentPathLayer)) {
                historyMap.removeLayer(currentPathLayer);
            }
        }

        // Create enhanced polylines for each segment with smooth rendering
        const pathLayers = [];
        pathSegments.forEach((segment, index) => {
            if (segment.length >= 2) {
                // Create smooth polyline with enhanced styling
                const pathLine = L.polyline(segment, {
                    color: '#007bff',
                    weight: 6,
                    opacity: 0.8,
                    smoothFactor: 1,
                    lineCap: 'round',
                    lineJoin: 'round'
                }).addTo(historyMap);
                
                // Add hover effects
                pathLine.on('mouseover', function() {
                    this.setStyle({ weight: 8, opacity: 1 });
                });
                
                pathLine.on('mouseout', function() {
                    this.setStyle({ weight: 6, opacity: 0.8 });
                });
                
                // Add click popup with segment info
                const segmentInfo = `Segment ${index + 1}<br>Points: ${segment.length}<br>Distance: ${calculateSegmentDistance(segment).toFixed(0)}m`;
                pathLine.bindPopup(segmentInfo);
                
                pathLayers.push(pathLine);
                
                // Add animated direction arrows to the path
                addDirectionArrows(pathLine);
                
                // Add animated path effect if available
                addAnimatedPathEffect(pathLine);
            }
        });

        // Store all path layers for later removal
        currentPathLayer = pathLayers;

        // Add enhanced start and end markers with better icons
        if (processedLocations.length > 0) {
            const firstValidLocation = processedLocations.find(loc => !loc.isGap);
            const lastValidLocation = processedLocations.slice().reverse().find(loc => !loc.isGap);
            
            if (firstValidLocation && lastValidLocation) {
                const startMarker = L.marker([firstValidLocation.lat, firstValidLocation.lng], {
                    icon: L.divIcon({
                        className: 'start-marker',
                        html: '<div style="background: #28a745; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">🟢</div>',
                        iconSize: [24, 24],
                        iconAnchor: [12, 12]
                    })
                }).addTo(historyMap);

                const endMarker = L.marker([lastValidLocation.lat, lastValidLocation.lng], {
                    icon: L.divIcon({
                        className: 'end-marker',
                        html: '<div style="background: #dc3545; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">🔴</div>',
                        iconSize: [24, 24],
                        iconAnchor: [12, 12]
                    })
                }).addTo(historyMap);

                // Enhanced popups with more information
                const startTime = new Date(firstValidLocation.timestamp).toLocaleString();
                const endTime = new Date(lastValidLocation.timestamp).toLocaleString();
                const totalDistance = calculateTotalDistance(processedLocations.filter(loc => !loc.isGap));
                const duration = (lastValidLocation.timestamp - firstValidLocation.timestamp) / 1000 / 60; // minutes
                
                startMarker.bindPopup(`
                    <b>🚌 Start Point</b><br>
                    <b>Time:</b> ${startTime}<br>
                    <b>Coordinates:</b> ${firstValidLocation.lat.toFixed(6)}, ${firstValidLocation.lng.toFixed(6)}<br>
                    <b>Total Distance:</b> ${totalDistance.toFixed(0)}m<br>
                    <b>Duration:</b> ${duration.toFixed(1)} minutes
                `);
                
                endMarker.bindPopup(`
                    <b>🏁 End Point</b><br>
                    <b>Time:</b> ${endTime}<br>
                    <b>Coordinates:</b> ${lastValidLocation.lat.toFixed(6)}, ${lastValidLocation.lng.toFixed(6)}<br>
                    <b>Total Distance:</b> ${totalDistance.toFixed(0)}m<br>
                    <b>Duration:</b> ${duration.toFixed(1)} minutes
                `);
            }
        }

        // Fit map to show all path segments with padding
        if (pathLayers.length > 0) {
            const bounds = L.latLngBounds([]);
            pathLayers.forEach(layer => {
                bounds.extend(layer.getBounds());
            });
            historyMap.fitBounds(bounds, { padding: [50, 50] });
        }

        // Update history list title
        const historyList = document.getElementById('history-list');
        if (historyList) {
            const titleElement = historyList.querySelector('h3');
            if (titleElement) {
                titleElement.textContent = title;
            } else {
                historyList.innerHTML = `<h3>${title}</h3>` + historyList.innerHTML;
            }
        }

        console.log(`Enhanced path displayed with ${pathSegments.length} segments`);
        addDebugOutput(`Enhanced path displayed with ${pathSegments.length} segments`);
        
        showSuccess(`Path displayed successfully! ${pathSegments.length} segments, ${filteredCount} filtered points`);
    } catch (error) {
        console.error('Error displaying bus path:', error);
        hideMapLoading();
        showError('Error displaying path. Please try again.');
    }
}

// Calculate segment distance
function calculateSegmentDistance(segment) {
    let distance = 0;
    for (let i = 1; i < segment.length; i++) {
        distance += calculateDistance(
            { lat: segment[i-1][0], lng: segment[i-1][1] },
            { lat: segment[i][0], lng: segment[i][1] }
        );
    }
    return distance;
}

// Calculate total distance of all segments
function calculateTotalDistance(locations) {
    let distance = 0;
    for (let i = 1; i < locations.length; i++) {
        distance += calculateDistance(locations[i-1], locations[i]);
    }
    return distance;
}

// Enhanced direction arrows with better styling
function addDirectionArrows(pathLine) {
    if (typeof L.polylineDecorator !== 'undefined') {
        L.polylineDecorator(pathLine, {
            patterns: [
                {
                    offset: '10%',
                    repeat: '20%',
                    symbol: L.Symbol.arrowHead({
                        pixelSize: 15,
                        polygon: false,
                        pathOptions: {
                            color: '#007bff',
                            fillOpacity: 1,
                            weight: 3,
                            stroke: true
                        }
                    })
                }
            ]
        }).addTo(historyMap);
    }
}

// Add animated path effect
function addAnimatedPathEffect(pathLine) {
    // Create a dashed overlay for animation effect
    const animatedPath = L.polyline(pathLine.getLatLngs(), {
        color: '#ffffff',
        weight: 8,
        opacity: 0.6,
        dashArray: '10, 10',
        lineCap: 'round',
        lineJoin: 'round'
    }).addTo(historyMap);
    
    // Animate the dash offset
    let offset = 0;
    const animate = () => {
        offset = (offset + 1) % 20;
        animatedPath.setStyle({ dashOffset: offset });
        requestAnimationFrame(animate);
    };
    animate();
    
    // Store reference for cleanup
    if (!currentPathLayer.animatedPaths) {
        currentPathLayer.animatedPaths = [];
    }
    currentPathLayer.animatedPaths.push(animatedPath);
}

// Enhanced timeline list with better formatting
function displayTimelineList(locations) {
    const historyList = document.getElementById('history-list');
    if (!historyList) return;

    // Sort by timestamp
    locations.sort((a, b) => a.timestamp - b.timestamp);

    // Group by date for better organization
    const groupedByDate = {};
    locations.forEach(loc => {
        const date = new Date(loc.timestamp).toLocaleDateString();
        if (!groupedByDate[date]) {
            groupedByDate[date] = [];
        }
        groupedByDate[date].push(loc);
    });

    let html = '<h3><i class="fas fa-clock"></i> Timeline</h3>';
    
    Object.keys(groupedByDate).forEach(date => {
        html += `<h4><i class="fas fa-calendar-day"></i> ${date}</h4>`;
        groupedByDate[date].forEach((loc, index) => {
            const time = new Date(loc.timestamp).toLocaleTimeString();
            const speed = index > 0 ? calculateSpeed(loc, groupedByDate[date][index-1]) : 0;
            html += `
                <div class="track-point">
                    <div>
                        <span class="timestamp">${time}</span>
                        ${speed > 0 ? `<br><small style="color: #666;">Speed: ${speed.toFixed(1)} km/h</small>` : ''}
                    </div>
                    <span class="coordinates">${loc.lat.toFixed(6)}, ${loc.lng.toFixed(6)}</span>
                </div>
            `;
        });
    });

    historyList.innerHTML = html;
}

// Calculate speed between two points
function calculateSpeed(point1, point2) {
    const distance = calculateDistance(point1, point2);
    const timeDiff = (point2.timestamp - point1.timestamp) / 1000; // seconds
    return timeDiff > 0 ? (distance / 1000) / (timeDiff / 3600) : 0; // km/h
}

// Delete records for selected date range
function deleteRecords() {
    const busId = document.getElementById('busSelect').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (!busId || !startDate || !endDate) {
        showError('Please select bus and date range');
        return;
    }

    if (!confirm('Are you sure you want to delete tracking records for this date range? This action cannot be undone.')) {
        return;
    }

    const startTimestamp = new Date(startDate + 'T00:00:00').getTime();
    const endTimestamp = new Date(endDate + 'T23:59:59').getTime();

    database.ref('BusLocation').child(busId)
        .orderByKey()
        .startAt(startTimestamp.toString())
        .endAt(endTimestamp.toString())
        .once('value')
        .then(snapshot => {
            const updates = {};
            snapshot.forEach(child => {
                updates[child.key] = null;
            });

            return database.ref('BusLocation').child(busId).update(updates);
        })
        .then(() => {
            showSuccess('Records deleted successfully');
            loadAvailableDates(busId); // Refresh available dates
            clearMap();
        })
        .catch(error => {
            console.error('Error deleting records:', error);
            showError('Error deleting records. Please try again.');
        });
}

// Clear map with enhanced cleanup
function clearMap() {
    if (historyMap) {
        historyMap.eachLayer((layer) => {
            if (!(layer instanceof L.TileLayer) && !(layer instanceof L.Control)) {
                historyMap.removeLayer(layer);
            }
        });
    }
    
    if (currentPathLayer) {
        // Handle both single layer and array of layers
        if (Array.isArray(currentPathLayer)) {
            currentPathLayer.forEach(layer => {
                if (historyMap && historyMap.hasLayer(layer)) {
                    historyMap.removeLayer(layer);
                }
            });
        } else if (historyMap && historyMap.hasLayer(currentPathLayer)) {
            historyMap.removeLayer(currentPathLayer);
        }
        currentPathLayer = null;
    }
}

// Enhanced loading message with progress
function showLoading(message) {
    const historyList = document.getElementById('history-list');
    if (historyList) {
        historyList.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i> ${message}
                <div class="progress-bar">
                    <div class="progress-fill" style="width: 0%"></div>
                </div>
            </div>
        `;
    }
}

// Update loading progress
function updateLoadingProgress(percent) {
    const progressFill = document.querySelector('.progress-fill');
    if (progressFill) {
        progressFill.style.width = `${percent}%`;
    }
}

// Enhanced success message with better styling
function showSuccess(message) {
    // Create a temporary success notification
    const notification = document.createElement('div');
    notification.className = 'enhanced-notification success';
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-check-circle" style="font-size: 18px;"></i>
            <div>
                <strong>Success!</strong><br>
                <span style="font-size: 14px;">${message}</span>
            </div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideInEnhanced 0.4s ease reverse';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 400);
        }
    }, 4000);
}

// Enhanced error message
function showError(message) {
    const historyList = document.getElementById('history-list');
    if (historyList) {
        historyList.innerHTML = `
            <div class="enhanced-notification error" style="position: static; margin: 20px 0;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 18px;"></i>
                    <div>
                        <strong>Error!</strong><br>
                        <span style="font-size: 14px;">${message}</span>
                    </div>
                </div>
            </div>
        `;
    }
}

// Make functions globally available
window.onBusSelect = onBusSelect;
window.onDateChange = onDateChange;
window.showPathByDate = showPathByDate;
window.showOverallPath = showOverallPath;
window.deleteRecords = deleteRecords;
window.testFirebaseConnection = testFirebaseConnection;

// Export path data to CSV/JSON
window.exportPathData = function() {
    const busId = document.getElementById('busSelect').value;
    if (!busId) {
        showError('Please select a bus first');
        return;
    }

    showLoading('Preparing data for export...');

    // Get current displayed path data
    const historyList = document.getElementById('history-list');
    const pathTitle = historyList.querySelector('h3')?.textContent || 'Bus Path Data';
    
    // If no current path is displayed, fetch all data
    if (!currentPathLayer) {
        showError('No path data to export. Please display a path first.');
        return;
    }

    // Create export data
    const exportData = {
        busId: busId,
        title: pathTitle,
        timestamp: new Date().toISOString(),
        coordinates: []
    };

    // Extract coordinates from current path layers
    if (Array.isArray(currentPathLayer)) {
        currentPathLayer.forEach(layer => {
            const latlngs = layer.getLatLngs();
            latlngs.forEach(latlng => {
                exportData.coordinates.push({
                    lat: latlng.lat,
                    lng: latlng.lng
                });
            });
        });
    }

    // Create CSV content
    const csvContent = [
        'Latitude,Longitude,Timestamp',
        ...exportData.coordinates.map(coord => `${coord.lat},${coord.lng},${new Date().toISOString()}`)
    ].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bus_${busId}_path_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    showSuccess('Path data exported successfully!');
};

// Optimize path using road alignment
window.optimizePath = function() {
    const busId = document.getElementById('busSelect').value;
    if (!busId) {
        showError('Please select a bus first');
        return;
    }

    const enableRoadAlignment = document.getElementById('enableRoadAlignment')?.checked ?? false;
    
    if (!enableRoadAlignment) {
        showError('Please enable road alignment first');
        return;
    }

    showLoading('Optimizing path with road alignment...');

    // This would integrate with OpenStreetMap routing API for road alignment
    // For now, we'll show a placeholder implementation
    setTimeout(() => {
        showSuccess('Path optimization completed! (Road alignment feature requires additional API integration)');
        addDebugOutput('Path optimization: Road alignment would snap coordinates to nearest roads');
    }, 2000);
};

// Map control functions
window.resetMapView = function() {
    if (historyMap) {
        historyMap.setView([28.2096, 83.9856], 13);
        showSuccess('Map view reset');
    }
};

window.toggleFullscreen = function() {
    const mapContainer = document.getElementById('history-map');
    if (mapContainer) {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            mapContainer.requestFullscreen();
        }
    }
};

window.togglePathLabels = function() {
    // Toggle path labels on/off
    showSuccess('Path labels toggled (feature to be implemented)');
    addDebugOutput('Path labels toggle: Would show/hide distance and time labels on path segments');
};

window.togglePathArrows = function() {
    // Toggle direction arrows on/off
    showSuccess('Direction arrows toggled (feature to be implemented)');
    addDebugOutput('Direction arrows toggle: Would show/hide direction indicators on path segments');
};

// Test GPS parsing with sample data
window.testGPSParsing = function() {
    console.log('Testing GPS data parsing...');
    addDebugOutput('Testing GPS data parsing...');
    
    // Test different GPS data formats
    const testCases = [
        // Format 1: "latitude,longitude,timestamp"
        { data: "28.2096,83.9856,1703123456789", timestamp: 1703123456789 },
        // Format 2: Object with properties
        { data: { latitude: 28.2096, longitude: 83.9856, timestamp: 1703123456789 }, timestamp: 1703123456789 },
        // Format 3: Object with lat/lng
        { data: { lat: 28.2096, lng: 83.9856 }, timestamp: 1703123456789 },
        // Format 4: Invalid data
        { data: "invalid,data", timestamp: 1703123456789 },
        // Format 5: Single coordinate
        { data: 28.2096, timestamp: 1703123456789 }
    ];
    
    testCases.forEach((testCase, index) => {
        const result = parseGPSData(testCase.data, testCase.timestamp);
        console.log(`Test case ${index + 1}:`, testCase.data, '→', result);
        addDebugOutput(`Test ${index + 1}: ${JSON.stringify(testCase.data)} → ${result ? 'VALID' : 'INVALID'}`);
    });
    
    showSuccess('GPS parsing test completed! Check debug output for details.');
};

// Update statistics display
function updateStatistics() {
    const busId = document.getElementById('busSelect').value;
    if (!busId) return;

    database.ref('BusLocation').once('value')
        .then(snapshot => {
            const data = snapshot.val();
            if (!data) return;

            let totalBuses = Object.keys(data).length;
            let totalRecords = 0;
            let allDates = new Set();
            let allSpeeds = [];

            Object.keys(data).forEach(bus => {
                const busData = data[bus];
                const timestamps = Object.keys(busData).filter(key => !isNaN(parseInt(key)));
                totalRecords += timestamps.length;

                // Calculate dates and speeds for this bus
                timestamps.forEach(timestamp => {
                    const parsedData = parseGPSData(busData[timestamp], parseInt(timestamp));
                    if (parsedData) {
                        const date = new Date(parsedData.timestamp).toISOString().split('T')[0];
                        allDates.add(date);
                    }
                });

                // Calculate speeds between consecutive points
                const sortedTimestamps = timestamps.sort((a, b) => parseInt(a) - parseInt(b));
                for (let i = 1; i < sortedTimestamps.length; i++) {
                    const prevData = parseGPSData(busData[sortedTimestamps[i-1]], parseInt(sortedTimestamps[i-1]));
                    const currData = parseGPSData(busData[sortedTimestamps[i]], parseInt(sortedTimestamps[i]));
                    
                    if (prevData && currData) {
                        const speed = calculateSpeed(prevData, currData);
                        if (speed > 0 && speed < 200) { // Filter out unrealistic speeds
                            allSpeeds.push(speed);
                        }
                    }
                }
            });

            // Update statistics display
            document.getElementById('totalBuses').textContent = totalBuses;
            document.getElementById('totalRecords').textContent = totalRecords.toLocaleString();
            document.getElementById('activeDays').textContent = allDates.size;
            
            const avgSpeed = allSpeeds.length > 0 ? 
                (allSpeeds.reduce((sum, speed) => sum + speed, 0) / allSpeeds.length).toFixed(1) : 
                '0.0';
            document.getElementById('avgSpeed').textContent = avgSpeed + ' km/h';
        })
        .catch(error => {
            console.error('Error updating statistics:', error);
        });
}

// Manual test function for debugging
window.testBusData = function(busId = 'bus1') {
    console.log(`Testing bus data for ${busId}...`);
    addDebugOutput(`Testing bus data for ${busId}...`);
    
    database.ref('BusLocation').child(busId).once('value')
        .then(snapshot => {
            const data = snapshot.val();
            console.log(`Bus ${busId} data:`, data);
            addDebugOutput(`Bus ${busId} data loaded`);
            
            if (data) {
                const timestamps = Object.keys(data).filter(key => !isNaN(parseInt(key)));
                console.log(`Found ${timestamps.length} timestamp records`);
                addDebugOutput(`Found ${timestamps.length} timestamp records`);
                
                if (timestamps.length > 0) {
                    const firstRecord = data[timestamps[0]];
                    console.log('First record:', firstRecord);
                    addDebugOutput(`First record: ${JSON.stringify(firstRecord)}`);
                    
                    // Test GPS data parsing
                    const parsedData = parseGPSData(firstRecord, parseInt(timestamps[0]));
                    console.log('Parsed GPS data:', parsedData);
                    addDebugOutput(`Parsed GPS data: ${JSON.stringify(parsedData)}`);
                    
                    // Test date extraction
                    const firstTimestamp = parseInt(timestamps[0]);
                    const firstDate = new Date(firstTimestamp);
                    console.log('First timestamp:', firstTimestamp, 'Date:', firstDate.toISOString());
                    addDebugOutput(`First timestamp: ${firstTimestamp}, Date: ${firstDate.toISOString()}`);
                }
            } else {
                console.log(`No data found for bus ${busId}`);
                addDebugOutput(`No data found for bus ${busId}`);
            }
        })
        .catch(error => {
            console.error(`Error testing bus ${busId}:`, error);
            addDebugOutput(`ERROR testing bus ${busId}: ${error.message}`);
        });
};

// Enhanced map control functions
window.toggleAnimatedPaths = function() {
    const animatedPaths = currentPathLayer?.animatedPaths || [];
    if (animatedPaths.length > 0) {
        const isVisible = animatedPaths[0].options.opacity > 0;
        animatedPaths.forEach(path => {
            path.setStyle({ opacity: isVisible ? 0 : 0.6 });
        });
        showSuccess(`Animated paths ${isVisible ? 'hidden' : 'shown'}`);
    } else {
        showError('No animated paths available');
    }
};

window.centerOnPath = function() {
    if (currentPathLayer && Array.isArray(currentPathLayer) && currentPathLayer.length > 0) {
        const bounds = L.latLngBounds([]);
        currentPathLayer.forEach(layer => {
            bounds.extend(layer.getBounds());
        });
        historyMap.fitBounds(bounds, { padding: [50, 50] });
        showSuccess('Map centered on path');
    } else {
        showError('No path to center on');
    }
};
// Show map loading overlay
function showMapLoading() {
    const overlay = document.getElementById('map-loading-overlay');
    if (overlay) {
        overlay.style.display = 'flex';
    }
}

// Hide map loading overlay
function hideMapLoading() {
    const overlay = document.getElementById('map-loading-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// Enhanced path statistics display
function showPathStatistics(locations, processedLocations) {
    const historyList = document.getElementById('history-list');
    if (!historyList) return;

    const totalDistance = calculateTotalDistance(processedLocations.filter(loc => !loc.isGap));
    const duration = processedLocations.length > 1 ? 
        (processedLocations[processedLocations.length - 1].timestamp - processedLocations[0].timestamp) / 1000 / 60 : 0;
    const avgSpeed = duration > 0 ? (totalDistance / 1000) / (duration / 60) : 0;
    const segments = processedLocations.filter(loc => loc.isGap).length + 1;

    const statsHtml = `
        <div class="path-stats">
            <h4><i class="fas fa-chart-line"></i> Path Statistics</h4>
            <div class="path-stats-grid">
                <div class="path-stat-item">
                    <div class="path-stat-value">${totalDistance.toFixed(0)}m</div>
                    <div class="path-stat-label">Total Distance</div>
                </div>
                <div class="path-stat-item">
                    <div class="path-stat-value">${duration.toFixed(1)}m</div>
                    <div class="path-stat-label">Duration</div>
                </div>
                <div class="path-stat-item">
                    <div class="path-stat-value">${avgSpeed.toFixed(1)} km/h</div>
                    <div class="path-stat-label">Avg Speed</div>
                </div>
                <div class="path-stat-item">
                    <div class="path-stat-value">${segments}</div>
                    <div class="path-stat-label">Segments</div>
                </div>
            </div>
        </div>
    `;
    
    // Insert stats at the beginning of the history list
    const existingContent = historyList.innerHTML;
    historyList.innerHTML = statsHtml + existingContent;
}
