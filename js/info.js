// fetch firbaseConfig from .env file

import FirebaseConfig from './env-config';

firebase.initializeApp (firebaseConfig);
const database = firebase.database ();

function getBusAndDriverInfo (busId) {
  database.ref ('buses/' + busId).once ('value', snapshot => {
    const bus = snapshot.val ();
    if (bus) {
      displayBusAndDriverInfo (bus);
    } else {
      document.getElementById ('additional-info').innerHTML =
        '<h3>No data found for the specified bus ID.</h3>';
    }
  });
}

function displayBusAndDriverInfo (bus) {
  const additionalInfoDiv = document.getElementById ('additional-info');
  additionalInfoDiv.innerHTML = `
        <h3>Additional Information for Bus ${bus.id.toUpperCase ()}</h3>
        <p><strong>Driver Name:</strong> ${bus.driver}</p>
        <p><strong>Driver Phone:</strong> ${bus.phone}</p>
        <p><strong>Bus Number:</strong> ${bus.number}</p>
        <p><strong>Staff Number:</strong> ${bus.staff}</p>
        <p><strong>Bus Route:</strong> ${bus.route}</p>
        <img src="${bus.driverPhoto}" alt="Driver Photo">
        <img src="${bus.busPhoto}" alt="Bus Photo">
    `;
}

// Extract bus ID from the URL
const urlParams = new URLSearchParams (window.location.search);
const busId = urlParams.get ('busId');

if (busId) {
  getBusAndDriverInfo (busId);
} else {
  document.getElementById ('additional-info').innerHTML =
    '<h3>Invalid bus ID.</h3>';
}
