// Firebase configuration
const firebaseConfig = {
    databaseURL: "https://v-track-gu999-default-rtdb.firebaseio.com",
    // Add other Firebase config options here
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
