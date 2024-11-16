// Firebase Configuration - Replace with your actual Firebase credentials

const firebaseConfig = {
  apiKey: 'AIzaSyBZpFhPq1pFpvTmyndOnA6SRs9_ftb4jfI',
  authDomain: 'v-track-gu999.firebaseapp.com',
  databaseURL: 'https://v-track-gu999-default-rtdb.firebaseio.com',
  projectId: 'v-track-gu999',
  storageBucket: 'v-track-gu999.appspot.com',
  messagingSenderId: '1046512747961',
  appId: '1:1046512747961:web:80df40c48bca3159296268',
  measurementId: 'G-38X29VT1YT',
};

firebase.initializeApp (firebaseConfig);
const dbRef = firebase.database ().ref ();
const auth = firebase.auth ();
const database = firebase.database ();

// Initialize Firebase only if it hasn't been initialized already
if (!firebase.apps.length) {
  firebase.initializeApp (firebaseConfig);
} else {
  firebase.app (); // Use the default app
}
firebase.auth ().onAuthStateChanged (function (user) {
  if (!user) {
    // If no user is logged in, redirect to the login page
    window.location.href = '/V-TRACK/index.html';
  }
});

// Map, marker cluster, and marker management
let map;
let userMarker;
const busMarkers = {};
let markerCluster;

// Initialize the map, cluster, and event listeners
function initMap () {
  map = L.map ('map').setView ([28.2096, 83.9856], 13);

  // Add OpenStreetMap tile layer
  L.tileLayer ('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap',
  }).addTo (map);

  // Ensure that markerCluster is properly initialized
  if (!markerCluster) {
    markerCluster = L.markerClusterGroup ({
      iconCreateFunction: cluster => {
        return L.divIcon ({
          html: '<h1>🚌</h1>',
          className: 'custom-cluster-icon',
        });
      },
    });
    map.addLayer (markerCluster);
  }

  // Fetch and display bus locations from Firebase
  dbRef.child ('BusLocation').on ('value', snapshot => {
    if (markerCluster) markerCluster.clearLayers (); // Clear previous markers on data update
    snapshot.forEach (childSnapshot => {
      const bus = childSnapshot.val ();
      const busId = childSnapshot.key;
      updateBusMarker (bus, busId);
    });
    displayAvailableBuses (); // Show available buses by default
  });

  updateNotice (); // Load the latest notice

  // Search button event listener for location search
  document
    .querySelector ('.search-button')
    .addEventListener ('click', searchLocation);
}

// Function to update or create a bus marker
function updateBusMarker (bus, busId) {
  const {latitude, longitude, timestamp} = bus;

  if (latitude === undefined || longitude === undefined) {
    console.warn ('Incomplete bus data:', bus);
    return;
  }

  if (busMarkers[busId]) {
    // Update marker position if it already exists
    busMarkers[busId].setLatLng ([latitude, longitude]);
  } else {
    // Create a new marker if it doesn't exist
    const marker = L.marker ([latitude, longitude], {
      title: `Bus ${busId.toUpperCase ()} 🚌`,
    });

    marker.busData = {id: busId, timestamp};
    busMarkers[busId] = marker;

    // Show bus info when marker is clicked
    marker.on ('click', () => showBusInfo (busId)); // Pass bus ID to fetch details
    if (markerCluster) markerCluster.addLayer (marker);
  }
}

// Display only available bus names in `bus-details` div by default
function displayAvailableBuses () {
  dbRef.child ('busDetails').once ('value').then (snapshot => {
    const busDetailsElement = document.getElementById ('bus-details');
    busDetailsElement.innerHTML = '<h3>🚌 Available Buses</h3>';
    snapshot.forEach (childSnapshot => {
      const bus = childSnapshot.val ();
      busDetailsElement.innerHTML += `<p style="margin:9px">➥🚍 ${bus.busName.toUpperCase () || 'No data'}</p>`;
    });
  });
}

// Function to display full bus info in `bus-info` div when a marker is clicked
function showBusInfo (busName) {
  const busInfo = document.getElementById ('bus-info');
  busInfo.innerHTML = `<h3>Bus ${busName} Details</h3>`;

  console.log ('Fetching details for Bus Name:', busName); // Log the busName to verify it's being passed correctly

  dbRef
    .child ('busDetails')
    .orderByChild ('busName')
    .equalTo (busName)
    .once ('value')
    .then (snapshot => {
      if (snapshot.exists ()) {
        const details = snapshot.val ();
        console.log ('Bus details found:', details); // Log the details fetched from Firebase

        const busData = Object.values (details)[0]; // Extract the bus data (should be a single entry)
        const busNumber = busData.busNumber || 'Unavailable';
        const busRoute = busData.busRoute || 'Unavailable';
        const driverName = busData.driverName || 'Unavailable';
        const driverNum = busData.driverNum || 'Unavailable';
        const additionalDetails =
          busData.additionalDetails || 'No additional details available';

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
        console.warn ('No details available for this bus Name:', busName);
        busInfo.innerHTML +=
          '<p>No additional info available for this bus.</p>';
      }
    })
    .catch (error => {
      console.error ('Error fetching bus details:', error);
      busInfo.innerHTML += '<p>Failed to load bus details.</p>';
    });
}

// Function to redirect to the additional info page
function redirectToAdditionalInfo () {
  window.location.href = '../html/businfo.html';
}
window.redirectToAdditionalInfo = redirectToAdditionalInfo;
// Function to find and show distances to buses from the user's location
// Find and show distances to buses from user's location
function findBusNearMe () {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition (position => {
      const userLat = position.coords.latitude;
      const userLng = position.coords.longitude;

      // Create or update the user's location marker
      if (userMarker) userMarker.remove ();
      userMarker = L.marker ([userLat, userLng], {
        title: 'Your Location',
        icon: L.icon ({
          iconUrl: 'https://img.icons8.com/emoji/48/000000/blue-circle-emoji.png',
          iconSize: [30, 30],
        }),
      }).addTo (map);

      // Center the map on user's location
      map.setView ([userLat, userLng], 15);

      // Calculate distances and find nearby buses (within 30 meters)
      const nearbyBuses = Object.values (busMarkers).filter (marker => {
        const distance = map.distance (
          userMarker.getLatLng (),
          marker.getLatLng ()
        );
        return distance <= 30; // Buses within 30 meters
      });

      displayNearbyBuses (nearbyBuses); // Display nearby buses
      showBusDistances (); // Show distances in bus details section
    });
  } else {
    alert ('Geolocation is not supported by this browser.');
  }
}
window.findBusNearMe = findBusNearMe;
// Function to display nearby buses in the alert box
function displayNearbyBuses (nearbyBuses) {
  const alertBox = document.getElementById ('alert-box');
  if (!alertBox) {
    console.error ('Alert box element not found!');
    return;
  }

  if (nearbyBuses.length > 0) {
    const busIds = nearbyBuses.map (marker => marker.busData.id).join (', ');
    alertBox.innerHTML = `
        <h1 style="color:red">Alert!!</h1>
            <h2 style="font-weight: bold">Buses are nearby you</h2>
            <p>${nearbyBuses.length} bus(es) near you: ${busIds}</p>
            <h3 style="color:red">Click on additional info for more details.</h3><h1>↘</h1>
            <span class="close-btn" onclick="closeAlertBox()">❌</span>
        `;
    alertBox.style.display = 'block';
  } else {
    alertBox.style.display = 'none'; // Hide if no buses are nearby
  }
}

// Function to close the alert box
function closeAlertBox () {
  const alertBox = document.getElementById ('alert-box');
  if (alertBox) {
    alertBox.style.display = 'none';
  }
}

// Function to display bus distances in `bus-details` div
function showBusDistances () {
  const busDetailsElement = document.getElementById ('bus-details');
  busDetailsElement.innerHTML = '<h3>Distance to Buses</h3>';
  Object.values (busMarkers).forEach (marker => {
    const distance = map
      .distance (userMarker.getLatLng (), marker.getLatLng ())
      .toFixed (2);
    const timestamp = new Date (marker.busData.timestamp).toLocaleTimeString ();
    busDetailsElement.innerHTML += `<p>Bus ${marker.busData.id}: ${distance} meters away at ${timestamp}</p>`;
  });
}
// Updated Search location on the map based on input
function searchLocation () {
  const searchInput = document.querySelector ('.search-bar input').value;
  if (!searchInput) return alert ('Please enter a location to search.');

  // Ensure Geocoder is loaded
  if (!L.Control.Geocoder) {
    alert ('Geocoder library is not loaded.');
    return;
  }

  L.Control.Geocoder.nominatim ().geocode (searchInput, results => {
    if (results.length > 0) {
      const {lat, lng} = results[0].center; // Updated property name to `center`
      map.setView ([lat, lng], 15);
    } else {
      alert ('Location not found.');
    }
  });
}

// Function to load and display notice from Firebase
function updateNotice () {
  dbRef
    .child ('notices')
    .once ('value')
    .then (snapshot => {
      const noticeContainer = document.getElementById ('notice');
      if (snapshot.exists ()) {
        const noticeData = snapshot.val ();
        const latestNotice = Object.values (noticeData).pop ();
        noticeContainer.innerHTML = `<p>${latestNotice.content}</p>`;
      } else {
        noticeContainer.innerHTML = '<p>No notices available.</p>';
      }
    })
    .catch (error => console.error ('Error loading notices:', error));
}

// Initialize the map and Firebase data loading on page load
window.addEventListener ('load', initMap);
