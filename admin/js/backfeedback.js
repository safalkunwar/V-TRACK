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

// Function to fetch feedback from Firebase and display it in the table
function fetchFeedback() {
    const feedbackList = document.getElementById('feedbackList');
    if (!feedbackList) return;
    
    feedbackList.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Loading feedback...</td></tr>';

    // Reference to the contactForm node in the database
    const contactFormDB = database.ref("contactForm");

    contactFormDB.once('value').then((snapshot) => {
        feedbackList.innerHTML = ''; // Clear loading message
        
        if (snapshot.exists()) {
            let rank = 1;
            const feedbacks = [];
            
            snapshot.forEach((childSnapshot) => {
                const feedback = childSnapshot.val();
                feedbacks.push({
                    ...feedback,
                    id: childSnapshot.key
                });
            });

            // Sort by timestamp if available, otherwise by rank
            feedbacks.sort((a, b) => {
                const timeA = a.timestamp || a.date || 0;
                const timeB = b.timestamp || b.date || 0;
                return timeB - timeA;
            });

            feedbacks.forEach((feedback) => {
                const feedbackRow = document.createElement('tr');
                const date = feedback.timestamp || feedback.date ? 
                    new Date(feedback.timestamp || feedback.date).toLocaleString() : 
                    'Unknown';
                
                feedbackRow.innerHTML = `
                    <td>${rank++}</td>
                    <td>${feedback.name || 'Anonymous'}</td>
                    <td>${feedback.emailid || feedback.email || 'N/A'}</td>
                    <td>${feedback.msgContent || feedback.message || feedback.comment || 'No message'}</td>
                    <td>${date}</td>
                `;
                feedbackList.appendChild(feedbackRow);
            });
        } else {
            const feedbackRow = document.createElement('tr');
            feedbackRow.innerHTML = `
                <td colspan="5" style="text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-comments" style="font-size: 48px; margin-bottom: 10px; color: #ddd;"></i>
                    <p>No feedback found.</p>
                </td>
            `;
            feedbackList.appendChild(feedbackRow);
        }
    }).catch((error) => {
        console.error('Error fetching feedback: ', error);
        feedbackList.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 40px; color: #dc3545;">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error fetching feedback: ${error.message}</p>
                </td>
            </tr>
        `;
    });
}

// Fetch feedback when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Wait for navbar to load first
    setTimeout(() => {
        fetchFeedback();
        
        // Set up real-time listener for new feedback
        const contactFormDB = database.ref("contactForm");
        contactFormDB.on('child_added', () => {
            fetchFeedback();
        });
    }, 500);
});

