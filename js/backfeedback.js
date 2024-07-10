        // Your web app's Firebase configuration
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

        // Reference to the contactForm node in the database
        const contactFormDB = firebase.database().ref("contactForm");

        // Function to fetch feedback from Firebase and display it in the table
        function fetchFeedback() {
            const feedbackList = document.getElementById('feedbackList');
            feedbackList.innerHTML = ''; // Clear existing feedback

            contactFormDB.once('value').then((snapshot) => {
                if (snapshot.exists()) {
                    let rank = 1;
                    snapshot.forEach((childSnapshot) => {
                        const feedback = childSnapshot.val();
                        console.log(feedback); // Log feedback for debugging
                        const feedbackRow = document.createElement('tr');
                        feedbackRow.innerHTML = `
                            <td>${rank++}</td>
                            <td>${feedback.name}</td>
                            <td>${feedback.emailid}</td>
                            <td>${feedback.msgContent}</td>
                        `;
                        feedbackList.appendChild(feedbackRow);
                    });
                } else {
                    const feedbackRow = document.createElement('tr');
                    feedbackRow.innerHTML = `
                        <td colspan="4">No feedback found.</td>
                    `;
                    feedbackList.appendChild(feedbackRow);
                }
            }).catch((error) => {
                console.error('Error fetching feedback: ', error); // Log error for debugging
                alert('Error fetching feedback: ' + error.message);
            });
        }

        // Fetch feedback when the page loads
        window.onload = fetchFeedback;
    