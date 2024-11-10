// Firebase Configuration - Replace with your actual Firebase credentials
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
firebase.initializeApp(firebaseConfig);
const dbRef = firebase.database().ref(); 


// Elements
const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");
const forgotPasswordForm = document.getElementById("forgot-password-form");
const otpSection = document.getElementById("otp-section");

// Show/hide forms
function showLogin() {
    loginForm.classList.remove("hidden");
    signupForm.classList.add("hidden");
    forgotPasswordForm.classList.add("hidden");
    otpSection.classList.add("hidden");
}

function showSignUp() {
    signupForm.classList.remove("hidden");
    loginForm.classList.add("hidden");
    forgotPasswordForm.classList.add("hidden");
}

function showForgotPassword() {
    forgotPasswordForm.classList.remove("hidden");
    loginForm.classList.add("hidden");
    otpSection.classList.add("hidden");
}

// Login Function with Hashing// Login Function using Firebase Auth
async function login() {
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    if (!email.endsWith("@gandakiuniversity.edu.np")) {
        alert("Please use your university email.");
        return;
    }
    
    if (email === "nirajan.60222@gandakiuniversity.edu.np") {
        alert("Please use your university email.");
        return;
    }

    try {
        // Authenticate user
        await firebase.auth().signInWithEmailAndPassword(email, password);
        window.location.href = "../html/miniindex.html";
    } catch (error) {
        console.error("Login error:", error);
        alert("Login failed. Check your credentials.");
    }
}

// Sign Up and Store User Info in Firebase
async function signUp() {
    const email = document.getElementById("signup-email").value;
    const password = document.getElementById("signup-password").value;

    if (!email.endsWith("@gandakiuniversity.edu.np")) {
        alert("Please use your university email.");
        return;
    }

    try {
        // Attempt to create user with Firebase Auth
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);

        // Store user info in Realtime Database under `studentinfo`
        const uid = userCredential.user.uid;
        await firebase.database().ref(`studentinfo/${uid}`).set({
            email: email,
            password: btoa(password),  // Hash password for security
            createdAt: new Date().toISOString()
        });

        alert("Account created successfully!");
        showLogin();
    } catch (error) {
        console.error("Error during signup:", error);  // Log error for debugging

        // Display a user-friendly error message based on the error code
        switch (error.code) {
            case "auth/email-already-in-use":
                alert("This email is already in use. Please try logging in.");
                break;
            case "auth/invalid-email":
                alert("Invalid email format. Please enter a valid university email.");
                break;
            case "auth/weak-password":
                alert("Password should be at least 6 characters long.");
                break;
            default:
                alert("Signup failed. Please try again later.");
        }
    }
}


// OTP Password Reset// Send OTP via Firebase Password Reset Email
async function sendOTP() {
    const email = document.getElementById("forgot-email").value;

    // Check if email belongs to the university domain
    if (!email.endsWith("@gandakiuniversity.edu.np")) {
        alert("Please use your university email.");
        return;
    }

    try {
        // Send password reset email to user's email address
        await firebase.auth().sendPasswordResetEmail(email);
        alert(`A reset link has been sent to ${email}. Please check your email to reset your password.`);
        
        // Show OTP input and password reset fields on the frontend
        otpSection.classList.remove("hidden");
    } catch (error) {
        console.error("Error sending reset email:", error);
        alert("Failed to send OTP. Please try again.");
    }
}

// Reset Password Function After OTP Verification
async function resetPassword() {
    const newPassword = document.getElementById("new-password").value;

    if (newPassword) {
        try {
            const user = firebase.auth().currentUser;
            await user.updatePassword(newPassword);
            alert("Password reset successfully!");
            showLogin();
        } catch (error) {
            console.error("Error:", error);
            alert("Could not reset password. Please try again.");
        }
    } else {
        alert("Please enter a valid new password.");
    }
}


async function resetPassword() {
    const enteredOtp = document.getElementById("otp-input").value;
    const newPassword = document.getElementById("new-password").value;

    if (enteredOtp == localStorage.getItem("otp") && newPassword) {
        const email = localStorage.getItem("otpEmail");

        try {
            const hashedPassword = btoa(newPassword);

            // Update Firebase Authentication password
            await firebase.auth().sendPasswordResetEmail(email);
            // Update the database with new hashed password
            const userRef = await firebase.database().ref("studentinfo").orderByChild("email").equalTo(email).once("value");
            if (userRef.exists()) {
                const userKey = Object.keys(userRef.val())[0];
                await firebase.database().ref(`studentinfo/${userKey}`).update({
                    password: hashedPassword
                });
                alert("Password has been reset successfully!");
                showLogin();
            } else {
                alert("User not found.");
            }
        } catch (error) {
            console.error("Password reset failed:", error);
        }
    } else {
        alert("Invalid OTP or password.");
    }
}
