let map;
let userMarker;
let nearestBusMarker;
let directionsService;
let directionsRenderer;
const busData = [
    { id: 'a', lat: 28.2116, lng: 83.9756, distance: 5, driver: 'Raju Yadav', number: 'GAA 00 26', phone: '9800000001' },
    { id: 'b', lat: 28.2216, lng: 83.9856, distance: 2, driver: 'Sandesh Dahal', number: 'GAA 00 27', phone: '9800000002' },
    { id: 'c', lat: 28.2016, lng: 83.9956, distance: 3, driver: 'Nirajan Dhakal', number: 'GAA 00 28', phone: '9800000003' }
];

function initMap() {
    const centerCoords = { lat: 28.2096, lng: 83.9856 };
    map = new google.maps.Map(document.getElementById("map"), {
        center: centerCoords,
        zoom: 13
    });
    
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer();
    directionsRenderer.setMap(map);
    
    busData.forEach(bus => {
        const marker = new google.maps.Marker({
            position: { lat: bus.lat, lng: bus.lng },
            map: map,
            title: `Bus ${bus.id.toUpperCase()} 🚌`,
            icon: 'https://img.icons8.com/emoji/48/000000/bus-emoji.png'
        });

        marker.addListener('click', () => {
            showBusInfo(bus);
        });
    });

    updateBusDetails();
    updateNotice();
}

function updateBusDetails() {
    const busDetails = document.getElementById('bus-details');
    busDetails.innerHTML = '<h3>🚌 BUS DETAILS</h3>';
    busData.forEach(bus => {
        const detail = document.createElement('p');
        detail.textContent = `Bus ${bus.id.toUpperCase()} is ${bus.distance} km far from you 🚌`;
        busDetails.appendChild(detail);
    });
}

function showBusInfo(bus) {
    const busInfo = document.getElementById('bus-info');
    busInfo.innerHTML = `
        <h3>Bus ${bus.id.toUpperCase()}</h3>
        <p>Driver name: ${bus.driver}</p>
        <p>Bus number: ${bus.number}</p>
        <p>Phone number: ${bus.phone}</p>
        <button class="additional-info-button" onclick="showAdditionalInfo()">Additional Info</button>
    `;
}

function feedback() {
    window.location.href = "./feedback.html";
}

function findBusNearMe() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;
            const userLocation = new google.maps.LatLng(userLat, userLng);

            if (userMarker) userMarker.setMap(null);
            userMarker = new google.maps.Marker({
                position: userLocation,
                map: map,
                title: "Your Location",
                icon: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
            });

            let nearestBus = null;
            let minDistance = Number.MAX_VALUE;

            busData.forEach(bus => {
                const busLocation = new google.maps.LatLng(bus.lat, bus.lng);
                const distance = google.maps.geometry.spherical.computeDistanceBetween(userLocation, busLocation);

                if (distance < minDistance) {
                    minDistance = distance;
                    nearestBus = bus;
                }
            });

            if (nearestBus) {
                showBusInfo(nearestBus);
                displayRoute(userLocation, nearestBus);

                if (nearestBusMarker) nearestBusMarker.setMap(null);
                nearestBusMarker = new google.maps.Marker({
                    position: { lat: nearestBus.lat, lng: nearestBus.lng },
                    map: map,
                    title: `Nearest Bus ${nearestBus.id.toUpperCase()} 🚌`,
                    icon: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
                });

                const bounds = new google.maps.LatLngBounds();
                bounds.extend(userLocation);
                bounds.extend(new google.maps.LatLng(nearestBus.lat, nearestBus.lng));
                map.fitBounds(bounds);
            }
        });
    } else {
        alert("Geolocation is not supported by this browser.");
    }
}

function displayRoute(origin, destination) {
    const request = {
        origin: origin,
        destination: new google.maps.LatLng(destination.lat, destination.lng),
        travelMode: google.maps.TravelMode.DRIVING
    };

    directionsService.route(request, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK) {
            directionsRenderer.setDirections(result);
        } else {
            alert("Could not display directions due to: " + status);
        }
    });
}

function nearBusStop() {
    alert("Near bus stop function triggered");
    // Implement the function to find nearby bus stops
}


// Firebase configuration
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
firebase.initializeApp(firebaseConfig);
const dbRef = firebase.database().ref();

// Function to fetch the latest notice from Firebase
function fetchNotices() {
    return dbRef.child("notices").orderByKey().limitToLast(1).once("value");
}

// Function to update the notice section on the page
function updateNotice() {
    fetchNotices().then((snapshot) => {
        if (snapshot.exists()) {
            const noticeData = snapshot.val();
            const noticeId = Object.keys(noticeData)[0];
            const noticeContent = noticeData[noticeId].content;
            
            const noticeElement = document.getElementById('notice');
            noticeElement.innerHTML = `
                <h3>Notice</h3>
                <p>${noticeContent}</p>
            `;
        } else {
            const noticeElement = document.getElementById('notice');
            noticeElement.innerHTML = `
                <h3>Notice</h3>
                <p>No notices available.</p>
            `;
        }
    }).catch((error) => {
        console.error("Error fetching notices:", error);
        const noticeElement = document.getElementById('notice');
        noticeElement.innerHTML = `
            <h3>Notice</h3>
            <p>Failed to load notices.</p>
        `;
    });
}

// Call updateNotice to initially load notice on page load
updateNotice();

