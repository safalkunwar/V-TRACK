// fetch firbaseConfig from .env file

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

// Function to fetch bus additional details and populate the table
function fetchBusDetails () {
  dbRef
    .child ('busDetails')
    .once ('value')
    .then (snapshot => {
      const tableBody = document.getElementById ('tableBody');
      tableBody.innerHTML = ''; // Clear existing rows

      snapshot.forEach (childSnapshot => {
        const busId = childSnapshot.key;
        const busData = childSnapshot.val ();

        // Create a new row for each bus detail entry
        const row = document.createElement ('tr');
        row.innerHTML = `
                <td>${busData.busName || 'N/A'}</td>
                <td>${busData.busNumber || 'N/A'}</td>
                <td>${busData.busRoute || 'N/A'}</td>
                <td>${busData.driverName || 'N/A'}</td>
                <td>${busData.driverNum || 'N/A'}</td>
                <td>${busData.additionalDetails || 'N/A'}</td>
            `;

        // Append the row to the table body
        tableBody.appendChild (row);
      });
    })
    .catch (error => {
      console.error ('Error fetching bus details:', error);
      alert ('Failed to load bus details. Please try again.');
    });
}

// Call fetchBusDetails when the page loads
document.addEventListener ('DOMContentLoaded', fetchBusDetails);
//jah bata aaies tei bata jah bhanni!
document.getElementById ('go-back').addEventListener ('click', function () {
  history.back ();
});
