// Navbar Component Loader
class NavbarLoader {
    constructor() {
        this.navbarContainer = null;
        this.currentPage = this.getCurrentPage();
        this.database = null;
    }

    // Initialize Firebase if not already initialized
    initializeFirebase() {
        if (typeof firebase !== 'undefined' && !firebase.apps.length) {
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
            this.database = firebase.database();
        } else if (typeof firebase !== 'undefined') {
            this.database = firebase.database();
        }
    }

    // Get current page name from URL
    getCurrentPage() {
        const path = window.location.pathname;
        const filename = path.split('/').pop();
        return filename.replace('.html', '');
    }

    // Load navbar into specified container
    async loadNavbar(containerId, pageTitle = 'Admin Dashboard') {
        try {
            // Initialize Firebase first
            this.initializeFirebase();
            
            const response = await fetch('navbar.html');
            const navbarHTML = await response.text();
            
            this.navbarContainer = document.getElementById(containerId);
            if (this.navbarContainer) {
                this.navbarContainer.innerHTML = navbarHTML;
                this.setActiveNavItem();
                this.setPageTitle(pageTitle);
            }
        } catch (error) {
            console.error('Error loading navbar:', error);
            // Fallback navbar
            this.createFallbackNavbar(containerId, pageTitle);
        }
    }

    // Set active navigation item based on current page
    setActiveNavItem() {
        const navLinks = document.querySelectorAll('.admin-nav-links a');
        navLinks.forEach(link => {
            link.classList.remove('active');
            const href = link.getAttribute('href');
            if (href && href.includes(this.currentPage)) {
                link.classList.add('active');
            }
        });
    }

    // Set page title
    setPageTitle(title) {
        const titleElement = document.getElementById('page-title');
        if (titleElement) {
            titleElement.textContent = title;
        }
    }

    // Create fallback navbar if loading fails
    createFallbackNavbar(containerId, pageTitle) {
        const fallbackHTML = `
            <nav class="admin-nav">
                <h1>${pageTitle}</h1>
                <div class="admin-nav-links">
                    <a href="dashboard.html"><span><i class="fas fa-tachometer-alt"></i> Dashboard</span></a>
                    <a href="adminpanel.html"><span><i class="fas fa-bus"></i> Buses</span></a>
                    <a href="routes.html"><span><i class="fas fa-route"></i> Routes</span></a>
                    <a href="bushistory.html"><span><i class="fas fa-history"></i> History</span></a>
                    <a href="triphistory.html"><span><i class="fas fa-route"></i> Trips</span></a>
                    <a href="drivers.html"><span><i class="fas fa-user-tie"></i> Drivers</span></a>
                    <a href="users.html"><span><i class="fas fa-users"></i> Users</span></a>
                    <a href="backendfeedback.html"><span><i class="fas fa-comments"></i> Feedback</span></a>
                    <button onclick="logout()" class="logout-btn"><i class="fas fa-sign-out-alt"></i> Logout</button>
                </div>
            </nav>
        `;
        
        this.navbarContainer = document.getElementById(containerId);
        if (this.navbarContainer) {
            this.navbarContainer.innerHTML = fallbackHTML;
            this.setActiveNavItem();
        }
    }

    // Get database reference
    getDatabase() {
        if (!this.database) {
            this.initializeFirebase();
        }
        return this.database;
    }
}

// Global logout function
function logout() {
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().signOut().then(() => {
            window.location.href = '/index.html';
        }).catch((error) => {
            console.error('Error logging out:', error);
            window.location.href = '/index.html';
        });
    } else {
        window.location.href = '/index.html';
    }
}

// Initialize navbar loader
const navbarLoader = new NavbarLoader(); 