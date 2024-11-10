
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

        // Reference your database
        var contactFormDB = firebase.database().ref("contactForm");

        document.getElementById("contactForm").addEventListener("submit", submitForm);

        function submitForm(e) {
            e.preventDefault();

            var name = getElementVal("name");
            var emailid = getElementVal("emailid");
            var msgContent = getElementVal("msgContent");

            saveMessages(name, emailid, msgContent);

            // Enable alert
            document.querySelector(".alert").style.display = "block";

            // Remove the alert
            setTimeout(() => {
                document.querySelector(".alert").style.display = "none";
            }, 3000);

            // Reset the form
            document.getElementById("contactForm").reset();
        }

        const saveMessages = (name, emailid, msgContent) => {
            var newContactForm = contactFormDB.push();

            newContactForm.set({
                name: name,
                emailid: emailid,
                msgContent: msgContent,
            });
        };

        const getElementVal = (id) => {
            return document.getElementById(id).value;
        };
 

        document.getElementById("go-back").addEventListener("click", function() {
            history.back();
        });