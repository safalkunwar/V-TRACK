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
        const app = firebase.initializeApp(firebaseConfig);
        const db = firebase.database();
function submitNotice() {
    var noticeContent = document.getElementById('noticeContent').value;
    if (noticeContent.trim() === '') {
        alert('Please write some notice content.');
        return;
    }
    var notice = {
        content: noticeContent
    };
    firebase.database().ref('notices').push(notice)
        .then(function () {
            alert('Notice submitted successfully!');
            document.getElementById('noticeContent').value = '';
        })
        .catch(function (error) {
            console.error('Error submitting notice: ', error);
        });
}

function addBusDetails() {
    var busName = document.getElementById('busName').value;
    var driverName = document.getElementById('driverName').value;
    var busNumber = document.getElementById('busNumber').value;
    var driverNum = document.getElementById('driverNum').value;
    var busRoute = document.getElementById('busRoute').value;
    var additionalDetails = document.getElementById('additionalDetails').value;

    if (busName.trim() === '' || driverName.trim() === '' || busNumber.trim() === '' || driverNum.trim() === '' || busRoute.trim() === '') {
        alert('Please fill out all required fields.');
        return;
    }

    var busDetails = {
        busName: busName,
        driverName: driverName,
        busNumber: busNumber,
        driverNum: driverNum,
        busRoute: busRoute,
        additionalDetails: additionalDetails
    };

    firebase.database().ref('busDetails').push(busDetails)
        .then(function () {
            alert('Bus details added successfully!');
            document.getElementById('busName').value = '';
            document.getElementById('driverName').value = '';
            document.getElementById('busNumber').value = '';
            document.getElementById('driverNum').value = '';
            document.getElementById('busRoute').value = '';
            document.getElementById('additionalDetails').value = '';
        })
        .catch(function (error) {
            console.error('Error adding bus details: ', error);
        });
}

function editBusDetails() {
    var prevBusName = document.getElementById('prevBusName').value;
    var newBusName = document.getElementById('newBusName').value;
    var newDriverName = document.getElementById('newDriverName').value;
    var changeBusNumber = document.getElementById('changeBusNumber').value;
    var changeDriverNum = document.getElementById('changeDriverNum').value;
    var changeBusRoute = document.getElementById('changeBusRoute').value;
    var changeAdditionalDetails = document.getElementById('changeAdditionalDetails').value;

    if (prevBusName.trim() === '') {
        alert('Please enter the previous bus name.');
        return;
    }

    var busDetailsRef = firebase.database().ref('busDetails');
    busDetailsRef.orderByChild('busName').equalTo(prevBusName).once('value')
        .then(function (snapshot) {
            if (snapshot.exists()) {
                var busDetailsKey = Object.keys(snapshot.val())[0];
                var updatedBusDetails = {};

                if (newBusName.trim() !== '') {
                    updatedBusDetails['busName'] = newBusName;
                }
                if (newDriverName.trim() !== '') {
                    updatedBusDetails['driverName'] = newDriverName;
                }
                if (changeBusNumber.trim() !== '') {
                    updatedBusDetails['busNumber'] = changeBusNumber;
                }
                if (changeDriverNum.trim() !== '') {
                    updatedBusDetails['driverNum'] = changeDriverNum;
                }
                if (changeBusRoute.trim() !== '') {
                    updatedBusDetails['busRoute'] = changeBusRoute;
                }
                if (changeAdditionalDetails.trim() !== '') {
                    updatedBusDetails['additionalDetails'] = changeAdditionalDetails;
                }

                busDetailsRef.child(busDetailsKey).update(updatedBusDetails)
                    .then(function () {
                        alert('Bus details updated successfully!');
                        document.getElementById('prevBusName').value = '';
                        document.getElementById('newBusName').value = '';
                        document.getElementById('newDriverName').value = '';
                        document.getElementById('changeBusNumber').value = '';
                        document.getElementById('changeDriverNum').value = '';
                        document.getElementById('changeBusRoute').value = '';
                        document.getElementById('changeAdditionalDetails').value = '';
                    })
                    .catch(function (error) {
                        console.error('Error updating bus details: ', error);
                    });
            } else {
                alert('Bus not found.');
            }
        })
        .catch(function (error) {
            console.error('Error finding bus details: ', error);
        });
}
