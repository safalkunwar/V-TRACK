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
const auth = firebase.auth();
const dbRef = firebase.database().ref();
const database = firebase.database();

// Firebase Authentication State Listener
firebase.auth().onAuthStateChanged(function(user) {
    if (!user) {
        // If no user is logged in, redirect to the login page
        window.location.href = '/index.html'; 
    }
});

// Map, marker cluster, and marker management
let map;
let userMarker;
const busMarkers = {};
let markerCluster;

// Initialize the map, cluster, and event listeners
function initMap() {
    map = L.map('map').setView([28.2096, 83.9856], 13);

    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
    }).addTo(map);

    // Initialize markerCluster
    markerCluster = L.markerClusterGroup({
        iconCreateFunction: cluster => {
            return L.divIcon({
                html: '<h1>🚌</h1>',
                className: 'custom-cluster-icon',
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            });
        }
    });
    map.addLayer(markerCluster);

    // Fetch and update bus locations
    dbRef.child("BusLocation").on("value", snapshot => {
        if (markerCluster) markerCluster.clearLayers(); // Clear old markers
        snapshot.forEach(childSnapshot => {
            const busData = childSnapshot.val();
            const busId = childSnapshot.key;

            // Pass full busData to the updateBusMarker function
            updateBusMarker(busData, busId);
        });
        displayAvailableBuses(); // Refresh the bus list
    });

    updateNotice(); // Load the latest notice


    // Attach event listeners for popups
    attachPopupEventListeners();

    // Attach event listeners for popup buttons
    const toggleAvailableBusesBtn = document.querySelector('.toggle-available-buses-button');
    if (toggleAvailableBusesBtn) {
        toggleAvailableBusesBtn.addEventListener('click', () => {
            showPopup('popup-available-buses');
        });
    }
    

    const toggleAdditionalInfoBtn = document.querySelector('.toggle-additional-info-button');
    if (toggleAdditionalInfoBtn) {
        toggleAdditionalInfoBtn.addEventListener('click', () => {
            showPopup('additional-info-popup');
        });
    }
    enableSearchWithSuggestions(); // Enable search with suggestions
}

function updateBusMarker(busData, busId) {
    // Extract the latest timestamp entry
    const latestEntryKey = Object.keys(busData).sort((a, b) => b - a)[0];
    const { latitude, longitude, timestamp } = busData[latestEntryKey];

    if (!latitude || !longitude) {
        console.warn(`Bus ${busId} has incomplete data:`, busData);
        return;
    }

    const newLatLng = L.latLng(latitude, longitude);

    if (busMarkers[busId]) {
        // Animate existing marker to the new position
        animateMarker(busMarkers[busId], newLatLng);

        // Update the polyline path dynamically without removing it
        if (busMarkers[busId].path) {
            busMarkers[busId].path.addLatLng(newLatLng);
        }
    } else {
        // Create a new marker with animation
        const marker = L.marker(newLatLng, {
            title: `Bus ${busId.toUpperCase()} 🚌`,
            icon: L.icon({
                iconUrl: 'https://img.icons8.com/color/48/000000/bus.png',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            })
        }).addTo(markerCluster);

        marker.busData = { id: busId, timestamp };
        busMarkers[busId] = marker;

        // Initialize path polyline for the new marker
        const path = L.polyline([newLatLng], {
            color: 'blue',
            weight: 3,
            opacity: 0.7
        }).addTo(map);

        busMarkers[busId].path = path;

        // Add click listener for displaying bus info
        marker.on('click', () => showBusInfo(busId));
    }
}

// Function to animate marker position smoothly
function animateMarker(marker, newLatLng) {
    const startLatLng = marker.getLatLng();
    const duration = 1000; // Animation duration in ms
    const frameRate = 60; // Frames per second
    const steps = duration / (1000 / frameRate);
    let currentStep = 0;

    function transition() {
        currentStep++;
        const lat = startLatLng.lat + (newLatLng.lat - startLatLng.lat) * (currentStep / steps);
        const lng = startLatLng.lng + (newLatLng.lng - startLatLng.lng) * (currentStep / steps);
        marker.setLatLng([lat, lng]);

        if (currentStep < steps) {
            requestAnimationFrame(transition);
        }
    }

    requestAnimationFrame(transition);
}

// Function to display bus distances in `bus-details` div
function showBusDistances() {
    const busDetailsElement = document.getElementById('bus-details');
    if (!busDetailsElement) return;

    busDetailsElement.innerHTML = "<h3>Distance to Buses</h3>";
    Object.values(busMarkers).forEach(marker => {
        if (userMarker) {
            const distance = map.distance(userMarker.getLatLng(), marker.getLatLng()).toFixed(2);
            const timestamp = marker.busData.timestamp
                ? new Date(marker.busData.timestamp).toLocaleTimeString()
                : "Unknown time"; // Handle missing timestamps gracefully
            busDetailsElement.innerHTML += `<p>Bus ${marker.busData.id}: ${distance} meters away at ${timestamp}</p>`;
        } else {
            busDetailsElement.innerHTML += `<p>Bus ${marker.busData.id}: Location unknown.</p>`;
        }
       
    });
      busDetailsElement.innerHTML += `                  <button class="close-btn" onclick="closePopup('popup-available-buses')">Close</button>`
}

// Display only available bus names in `bus-details` div by default
function displayAvailableBuses() {
    dbRef.child("busDetails").once("value").then(snapshot => {
        const busDetailsElement = document.getElementById('bus-details');
        if (!busDetailsElement) return;

        busDetailsElement.innerHTML = "<h3>🚌 Available Buses</h3>";
        snapshot.forEach(childSnapshot => {
            const bus = childSnapshot.val();
            busDetailsElement.innerHTML += `<p style="margin:4px">➥🚍 ${bus.busName.toUpperCase() || "No data"}</p>`;
           
        });
        busDetailsElement.innerHTML += ` <button class="close-btn" onclick="closePopup('popup-available-buses')">Close</button>`;
    });
}

// Function to display full bus info in `bus-info` div when a marker is clicked
function showBusInfo(busName) {
    const busInfo = document.getElementById('bus-info');
    if (!busInfo) return;

    busInfo.innerHTML = `<h3>Bus ${busName} Details</h3>`;

    console.log("Fetching details for Bus Name:", busName);  // Log the busName to verify it's being passed correctly

    dbRef.child("busDetails").orderByChild("busName").equalTo(busName).once("value").then(snapshot => {
        if (snapshot.exists()) {
            const details = snapshot.val();
            console.log("Bus details found:", details);  // Log the details fetched from Firebase

            const busData = Object.values(details)[0]; // Extract the bus data (should be a single entry)
            const busNumber = busData.busNumber || "Unavailable";
            const busRoute = busData.busRoute || "Unavailable";
            const driverName = busData.driverName || "Unavailable";
            const driverNum = busData.driverNum || "Unavailable";
            const additionalDetails = busData.additionalDetails || "No additional details available";

            busInfo.innerHTML += `
                <p><strong>Bus Name:</strong> ${busName}</p>
                <p><strong>Bus Number:</strong> ${busNumber}</p>
                <p><strong>Route:</strong> ${busRoute}</p>
                <p><strong>Driver's Name:</strong> ${driverName}</p>
                <p><strong>Driver's Phone:</strong> ${driverNum}</p>
                <p><strong>Additional Details:</strong> ${additionalDetails}</p>
                <button class="additional-info-button" onclick="redirectToAdditionalInfo()">Additional Info</button>
            `;
        } else {
            console.warn("No details available for this bus Name:", busName);
            busInfo.innerHTML += "<p>No additional info available for this bus.</p>";
        }
    }).catch(error => {
        console.error("Error fetching bus details:", error);
        busInfo.innerHTML += "<p>Failed to load bus details.</p>";
    });
}

// Function to redirect to the additional info page
function redirectToAdditionalInfo() {
    window.location.href = "../html/businfo.html";
}
window.redirectToAdditionalInfo = redirectToAdditionalInfo;

// Function to find and show distances to buses from the user's location
function findBusNearMe() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;

            // Create or update the user's location marker
            if (userMarker) userMarker.remove();
            userMarker = L.marker([userLat, userLng], {
                title: "Your Location",
                icon: L.icon({
                    iconUrl: 'https://img.icons8.com/emoji/48/000000/blue-circle-emoji.png',
                    iconSize: [30, 30]
                })
            }).addTo(map);

            // Center the map on user's location
            map.setView([userLat, userLng], 15);

            // Calculate distances and find nearby buses (within 30 meters)
            const nearbyBuses = Object.values(busMarkers).filter(marker => {
                const distance = map.distance(userMarker.getLatLng(), marker.getLatLng());
                return distance <= 50; // Buses within 30 meters
            });
            const popup = document.getElementById('popup-available-buses');
            if (popup) popup.classList.remove('hidden');
            displayNearbyBuses(nearbyBuses); // Display nearby buses
            showBusDistances(); // Show distances in bus details section
        }, error => {
            console.error("Geolocation error:", error);
            alert("Unable to retrieve your location.");
        });
    } else {
        alert("Geolocation is not supported by this browser.");
    }
}
window.findBusNearMe = findBusNearMe;

// Function to display nearby buses in the alert box
function displayNearbyBuses(nearbyBuses) {
    const alertBox = document.getElementById('alert-box');
    const alertMessage = document.getElementById('alert-message');
    if (!alertBox || !alertMessage) {
        console.error("Alert box elements not found!");
        return;
    }

    if (nearbyBuses.length > 0) {
        const busIds = nearbyBuses.map(marker => marker.busData.id).join(", ");
        alertMessage.innerHTML = `
            <p>${nearbyBuses.length} bus(es) near you: ${busIds}</p>
        `;
        alertBox.style.display = "block";
    } else {
        alertBox.style.display = "none"; // Hide if no buses are nearby
    }
}

// Function to close the alert box
function closeAlertBox() {
    const alertBox = document.getElementById('alert-box');
    if (alertBox) {
        alertBox.style.display = "none";
    }
}


// Function to load and display notice from Firebase
function updateNotice() {
    dbRef.child("notices").once("value").then(snapshot => {
        const noticeContainer = document.getElementById('notice');
        if (snapshot.exists()) {
            const noticeData = snapshot.val();
            const latestNotice = Object.values(noticeData).pop();
            if (latestNotice && latestNotice.content) {
                noticeContainer.innerHTML = `<p>${latestNotice.content}</p>`;
            } else {
                noticeContainer.innerHTML = "<p>No notices available.</p>";
            }
        } else {
            noticeContainer.innerHTML = "<p>No notices available.</p>";
        }
    }).catch(error => console.error("Error loading notices:", error));
}

// Function to attach event listeners to popups' close buttons
function attachPopupEventListeners() {
    // Close icons
    const closeIcons = document.querySelectorAll('.close-icon');
    closeIcons.forEach(icon => {
        icon.addEventListener('click', () => {
            const popup = icon.closest('.popup');
            if (popup) {
                popup.classList.add('hidden');
            }
        });
    });

    // Close buttons
    const closeButtons = document.querySelectorAll('.close-btn');
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const popup = button.closest('.popup');
            if (popup) {
                popup.classList.add('hidden');
            }
        });
    });
}

// Initialize the map and Firebase data loading on page load
window.addEventListener("load", initMap);

// Dynamically update the "Available Buses" section
function showAvailableBuses(buses) {
    const busDetailsDiv = document.getElementById('bus-details');
    if (!busDetailsDiv) return;
    busDetailsDiv.innerHTML = ''; // Clear previous details

    buses.forEach(bus => {
        const busDiv = document.createElement('div');
        busDiv.className = 'bus-card';
        busDiv.innerHTML = `
            <p><strong>Bus Name:</strong> ${bus.name}</p>
            <p><strong>Distance:</strong> ${bus.distance} meters</p>
            <p><strong>Status:</strong> ${bus.status}</p>
            <button class="close-btn" onclick="closePopup('popup-available-buses')">Close</button>
        `;
        busDetailsDiv.appendChild(busDiv);
    });
}

const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebar = document.querySelector('.sidebar');

if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('change', () => {
        if (sidebarToggle.checked) {
            sidebar.style.right = '0';
        } else {
            sidebar.style.right = '-100%';
        }
    });
}

// Function to show and hide popups
function showPopup(popupId) {
    const popup = document.getElementById(popupId);
    if (popup) {
        popup.classList.remove('hidden');
    }
}

function closePopup(popupId) {
    const popup = document.getElementById(popupId);
    if (popup) {
        popup.classList.add('hidden');
    }
}
// Close the popup when the close button inside the popup is clicked
document.querySelectorAll('.close-btn').forEach(button => {
    button.addEventListener('click', function() {
        const popupId = button.closest('.popup').id; // Get the ID of the popup
        closePopup(popupId);
    });
});
function showAdditionalInfo() {
    showPopup('additional-info-popup');
}
window.showPopup = showPopup;
window.closePopup = closePopup;
window.showAdditionalInfo = showAdditionalInfo;
function fetchSuggestions(query) {
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}`)
        .then(response => response.json())
        .then(results => {
            const suggestions = results.map(result => result.display_name);
            displaySuggestions(suggestions);
        })
        .catch(error => console.error("Error fetching suggestions:", error));
}

// Function to check if location is within Nepal or within 300 km radius
function isWithinRadius(lat, lng) {
    const nepalLat = 28.3949;  // Approximate latitude of Nepal
    const nepalLng = 84.1240;  // Approximate longitude of Nepal
    const radius = 300;  // 300 km radius

    const distance = getDistanceFromLatLonInKm(nepalLat, nepalLng, lat, lng);
    return distance <= radius;  // Return true if within 300 km radius of Nepal
}

// Haversine formula to calculate distance between two lat/lng points in km
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    const R = 6371;  // Radius of the Earth in km
    const dLat = degreesToRadians(lat2 - lat1);
    const dLon = degreesToRadians(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(degreesToRadians(lat1)) * Math.cos(degreesToRadians(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;  // Distance in km
}

// Convert degrees to radians
function degreesToRadians(degrees) {
    return degrees * (Math.PI / 180);
}

// Function to handle search with suggestions and Enter key functionality
function enableSearchWithSuggestions() {
    const searchInput = document.getElementById("search-input");
    const suggestionsContainer = document.getElementById("suggestions-container");

    // Clear suggestions container if exists
    if (suggestionsContainer) suggestionsContainer.innerHTML = '';

    // Listener for input typing to fetch suggestions
    searchInput.addEventListener("input", () => {
        const query = searchInput.value;

        if (query.length < 2) {
            if (suggestionsContainer) suggestionsContainer.innerHTML = ''; // Clear if query too short
            return;
        }

        // Fetch suggestions from Nominatim
        L.Control.Geocoder.nominatim().geocode(query, results => {
            suggestionsContainer.innerHTML = ''; // Clear previous results

            // Filter results by radius
            const filteredResults = results.filter(result => {
                return isWithinRadius(result.center.lat, result.center.lng);  // Only show results within 300 km radius
            });

            if (filteredResults.length > 0) {
                filteredResults.forEach(result => {
                    const suggestion = document.createElement("div");
                    suggestion.className = "suggestion-item";
                    suggestion.textContent = result.name;
                    suggestion.onclick = () => {
                        searchInput.value = result.name; // Update input value
                        map.setView(result.center, 15); // Center map on selected location
                        suggestionsContainer.innerHTML = ''; // Clear suggestions
                    };
                    suggestionsContainer.appendChild(suggestion);
                });
            } else {
                suggestionsContainer.innerHTML = "<div>there is no such palce in Nepal.</div>";
            }
        });
    });
    window.startDirections = startDirections;

    // Listener for Enter key to trigger a search
    searchInput.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            const query = searchInput.value;

            if (!query) {
                alert("Please enter a location to search.");
                return;
            }

            L.Control.Geocoder.nominatim().geocode(query, results => {
                if (results.length > 0) {
                    const firstResult = results[0];
                    if (isWithinRadius(firstResult.center.lat, firstResult.center.lng)) {
                        map.setView([firstResult.center.lat, firstResult.center.lng], 15); // Center map on first result
                    } else {
                        alert("No results within 300 km radius of Nepal.");
                    }
                } else {
                    alert("No results found for the specified location.");
                }
            });
        }
    });
}


// Function to fetch current user location
function getCurrentLocation(callback) {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                const { latitude, longitude } = position.coords;
                callback({ lat: latitude, lng: longitude });
            },
            error => {
                console.error("Error getting user location:", error);
                alert("Could not fetch current location.");
            }
        );
    } else {
        alert("Geolocation is not supported by your browser.");
    }
}

function searchSuggestions(inputType) {
    const query = document.getElementById(`search-${inputType}`).value;
    const suggestionsContainer = document.getElementById("suggestions-container");

    if (query.length < 2) {
        suggestionsContainer.innerHTML = ''; // Clear suggestions if query is too short
        return;
    }

    // Fetch suggestions from Nominatim (OpenStreetMap)
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}`)
        .then(response => response.json())
        .then(results => {
            suggestionsContainer.innerHTML = ''; // Clear previous suggestions
            results.forEach(result => {
                const suggestion = document.createElement("div");
                suggestion.className = "suggestion-item";
                suggestion.textContent = result.display_name;
                suggestion.onclick = () => {
                    document.getElementById(`search-${inputType}`).value = result.display_name; // Set input value
                    suggestionsContainer.innerHTML = ''; // Clear suggestions
                };
                suggestionsContainer.appendChild(suggestion);
            });
        })
        .catch(error => console.error("Error fetching suggestions:", error));
}
window.searchSuggestions = searchSuggestions; // Make it globally accessible

// Pre-fill the "from" field with the user's current location
document.getElementById("search-from").addEventListener("focus", () => {
    getCurrentLocation(location => {
        const input = document.getElementById("search-from");
        input.value = "Current Location"; // Placeholder text
        input.dataset.lat = location.lat;
        input.dataset.lng = location.lng;
    });
});

// Event listener to toggle direction popup
document.getElementById("getDirections").addEventListener("click", () => {
    togglePopup("direction-popup");
});

function togglePopup(popupId) {
    const popup = document.getElementById(popupId);
    if (popup) {
        popup.classList.toggle('hidden'); // Toggle the 'hidden' class to show/hide the popup
    } else {
        console.error(`Popup with ID ${popupId} not found.`);
    }
}

// Make the function globally accessible
window.togglePopup = togglePopup;

function startDirections() {
    const fromField = document.getElementById('search-from');
    const toField = document.getElementById('search-to');

    const fromLat = parseFloat(fromField.dataset.lat);
    const fromLng = parseFloat(fromField.dataset.lng);
    const toAddress = toField.value;

    // Validate starting location coordinates
    if (isNaN(fromLat) || isNaN(fromLng)) {
        alert("Invalid starting location coordinates.");
        return;
    }

    if (!toAddress || toAddress.trim() === "") {
        alert("Please enter a valid destination.");
        return;
    }

    // Geocode the destination address
    L.Control.Geocoder.nominatim().geocode(toAddress, function (results) {
        if (results.length === 0) {
            alert("Invalid destination location.");
            return;
        }

        const toLocation = results[0].center;

        // Display the route on the map
        const startLocation = { lat: fromLat, lng: fromLng };
        const endLocation = { lat: toLocation.lat, lng: toLocation.lng };
        showRoute(startLocation, endLocation);

        // Clear the input fields
        fromField.value = "";
        toField.value = "";

        // Close the popup box
        const popup = document.getElementById("direction-popup");
        if (popup) {
            popup.classList.add("hidden"); // Hide the popup
        }
    });
}
function showRoute(startLocation, endLocation) {
    const routingControl = L.Routing.control({
        waypoints: [
            L.latLng(startLocation.lat, startLocation.lng), // Start point
            L.latLng(endLocation.lat, endLocation.lng) // End point
        ],
        routeWhileDragging: true, // Allow route dragging
        geocoder: L.Control.Geocoder.nominatim(),
        createMarker: () => null, // Disable default markers
        lineOptions: {
            styles: [{ color: 'blue', weight: 4 }]
        },
        show: false, // Prevent default instruction popup
        addWaypoints: false, // Prevent dragging waypoints
        fitSelectedRoutes: true, // Adjust map view to fit the route
    }).addTo(map);

    // Add event listener when routes are found
    routingControl.on('routesfound', (e) => {
        const route = e.routes[0]; // Get the first route

        // Create and show a "View Route Details" button
        const detailsButton = document.createElement("button");
        detailsButton.textContent = "View Route Details";
        detailsButton.className = "details-button";
        document.body.appendChild(detailsButton);

        // When the button is clicked, show the route details
        detailsButton.onclick = () => {
            showDirectionDetails(route.instructions); // Display details on button click
            detailsButton.style.display = "none"; // Hide the button after it's clicked
        };
    });
}
// Function to display the route details in a custom popup
function showDirectionDetails(instructions) {
    // Create a container for the details
    const detailsContainer = document.createElement("div");
    detailsContainer.className = "route-details-container";

    // Add the instructions to the container
    instructions.forEach((step, index) => {
        const stepElement = document.createElement("p");
        stepElement.textContent = `${index + 1}. ${step.text}`;
        detailsContainer.appendChild(stepElement);
    });

    // Create a Close button for the details
    const closeButton = document.createElement("button");
    closeButton.textContent = "Close";
    closeButton.className = "close-details-button";
    detailsContainer.appendChild(closeButton);

    // Append the details container to the body
    document.body.appendChild(detailsContainer);

    // Hide the details when the close button is clicked
    closeButton.onclick = () => {
        detailsContainer.style.display = "none";
    };

    // Show the details container
    detailsContainer.style.display = "block";
}
