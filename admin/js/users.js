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

// Global variables
let allUsers = [];
let filteredUsers = [];

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        navbarLoader.loadNavbar('navbar-container', 'User Monitoring');
        
        setTimeout(() => {
            loadAllUsers();
        }, 500);
    }, 100);
});

// Load all users from Firebase
async function loadAllUsers() {
    try {
        const usersListContainer = document.getElementById('usersList');
        usersListContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner"></i><p>Loading users...</p></div>';

        // Fetch users from both studentinfo and users paths
        const [studentInfoSnapshot, usersSnapshot] = await Promise.all([
            database.ref('studentinfo').once('value'),
            database.ref('users').once('value')
        ]);

        allUsers = [];
        const userIds = new Set();

        // Process users from /studentinfo/{uid}
        if (studentInfoSnapshot.exists()) {
            studentInfoSnapshot.forEach(userSnapshot => {
                const userData = userSnapshot.val();
                const userId = userSnapshot.key;
                
                if (!userIds.has(userId)) {
                    userIds.add(userId);
                    allUsers.push({
                        uid: userId,
                        email: userData.email || 'No email',
                        name: userData.name || userData.email?.split('@')[0] || 'Unknown User',
                        createdAt: userData.createdAt ? new Date(userData.createdAt).getTime() : null,
                        source: 'studentinfo',
                        ...userData
                    });
                }
            });
        }

        // Process users from /users/{uid}
        if (usersSnapshot.exists()) {
            usersSnapshot.forEach(userSnapshot => {
                const userData = userSnapshot.val();
                const userId = userSnapshot.key;
                
                if (userIds.has(userId)) {
                    // Merge with existing user data
                    const existingIndex = allUsers.findIndex(u => u.uid === userId);
                    if (existingIndex >= 0) {
                        allUsers[existingIndex] = {
                            ...allUsers[existingIndex],
                            ...userData,
                            source: 'both'
                        };
                    }
                } else {
                    userIds.add(userId);
                    allUsers.push({
                        uid: userId,
                        email: userData.email || 'No email',
                        name: userData.name || userData.email?.split('@')[0] || 'Unknown User',
                        createdAt: userData.createdAt ? new Date(userData.createdAt).getTime() : null,
                        source: 'users',
                        ...userData
                    });
                }
            });
        }

        // Load reports count for each user
        await loadUserReports();

        // Sort by creation date (newest first)
        allUsers.sort((a, b) => {
            const timeA = a.createdAt || 0;
            const timeB = b.createdAt || 0;
            return timeB - timeA;
        });

        filteredUsers = [...allUsers];
        updateStatistics();
        displayUsers();
    } catch (error) {
        console.error('Error loading users:', error);
        document.getElementById('usersList').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error Loading Users</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

// Load reports count for each user
async function loadUserReports() {
    try {
        const reportsSnapshot = await database.ref('reports').once('value');
        const reportsByUser = {};

        if (reportsSnapshot.exists()) {
            reportsSnapshot.forEach(userSnapshot => {
                const userId = userSnapshot.key;
                let count = 0;
                userSnapshot.forEach(() => count++);
                reportsByUser[userId] = count;
            });
        }

        // Add reports count to users
        allUsers.forEach(user => {
            user.reportsCount = reportsByUser[user.uid] || 0;
        });
    } catch (error) {
        console.error('Error loading reports:', error);
    }
}

// Filter users based on selected filters
function filterUsers() {
    const searchFilter = document.getElementById('searchFilter').value.toLowerCase();
    const dateFilter = document.getElementById('dateFilter').value;
    const sortFilter = document.getElementById('sortFilter').value;

    filteredUsers = allUsers.filter(user => {
        // Search filter
        if (searchFilter) {
            const searchText = `${user.name} ${user.email}`.toLowerCase();
            if (!searchText.includes(searchFilter)) return false;
        }

        // Date filter
        if (dateFilter && user.createdAt) {
            const filterDate = new Date(dateFilter).getTime();
            if (user.createdAt < filterDate) return false;
        }

        return true;
    });

    // Sort users
    switch (sortFilter) {
        case 'newest':
            filteredUsers.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            break;
        case 'oldest':
            filteredUsers.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
            break;
        case 'name':
            filteredUsers.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'email':
            filteredUsers.sort((a, b) => a.email.localeCompare(b.email));
            break;
    }

    updateStatistics();
    displayUsers();
}

// Update statistics
function updateStatistics() {
    const totalUsers = filteredUsers.length;
    
    // Active users (registered in last 30 days or have recent activity)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const activeUsers = filteredUsers.filter(u => {
        if (u.createdAt && u.createdAt >= thirtyDaysAgo) return true;
        // Could add more criteria for active users
        return false;
    }).length;

    // New users this month
    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);
    const newUsers = filteredUsers.filter(u => 
        u.createdAt && u.createdAt >= thisMonthStart.getTime()
    ).length;

    // Total reports
    const totalReports = filteredUsers.reduce((sum, u) => sum + (u.reportsCount || 0), 0);

    document.getElementById('totalUsers').textContent = totalUsers;
    document.getElementById('activeUsers').textContent = activeUsers;
    document.getElementById('newUsers').textContent = newUsers;
    document.getElementById('totalReports').textContent = totalReports;
}

// Display users in the grid
function displayUsers() {
    const usersListContainer = document.getElementById('usersList');
    
    if (filteredUsers.length === 0) {
        usersListContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <h3>No Users Found</h3>
                <p>No users match the selected filters.</p>
            </div>
        `;
        return;
    }

    let html = '';
    filteredUsers.forEach(user => {
        const createdAt = user.createdAt ? new Date(user.createdAt).toLocaleString() : 'Unknown';
        const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) || 'U';
        const isActive = user.createdAt && user.createdAt >= (Date.now() - 30 * 24 * 60 * 60 * 1000);
        const reportsCount = user.reportsCount || 0;

        // Get saved places count if available
        const savedPlacesCount = user.savedPlaces ? Object.keys(user.savedPlaces).length : 0;

        html += `
            <div class="user-card">
                <div class="user-header">
                    <div style="display: flex; align-items: center;">
                        <div class="user-avatar">${initials}</div>
                        <div class="user-info">
                            <h3 class="user-name">${user.name}</h3>
                            <p class="user-email">${user.email}</p>
                        </div>
                    </div>
                    <span class="badge ${isActive ? 'badge-active' : 'badge-inactive'}">
                        ${isActive ? 'Active' : 'Inactive'}
                    </span>
                </div>
                <div class="user-details">
                    <div class="user-detail-item">
                        <i class="fas fa-calendar"></i>
                        <span><strong>Registered:</strong> ${createdAt}</span>
                    </div>
                    <div class="user-detail-item">
                        <i class="fas fa-flag"></i>
                        <span><strong>Reports:</strong> ${reportsCount}</span>
                    </div>
                    ${savedPlacesCount > 0 ? `
                    <div class="user-detail-item">
                        <i class="fas fa-map-marker-alt"></i>
                        <span><strong>Saved Places:</strong> ${savedPlacesCount}</span>
                    </div>
                    ` : ''}
                    <div class="user-detail-item">
                        <i class="fas fa-database"></i>
                        <span><strong>Source:</strong> ${user.source || 'Unknown'}</span>
                    </div>
                </div>
                <div class="user-activity">
                    <div class="activity-item">
                        <i class="fas fa-info-circle"></i>
                        <span>User ID: ${user.uid}</span>
                    </div>
                </div>
                <div class="user-actions">
                    <button class="btn btn-primary" onclick="viewUserDetails('${user.uid}')">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                    <button class="btn btn-secondary" onclick="viewUserReports('${user.uid}')">
                        <i class="fas fa-flag"></i> Reports
                    </button>
                </div>
            </div>
        `;
    });

    usersListContainer.innerHTML = html;
}

// View user details
function viewUserDetails(userId) {
    const user = filteredUsers.find(u => u.uid === userId);
    if (!user) return;

    const details = `
User Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: ${user.name}
Email: ${user.email}
User ID: ${user.uid}
Registered: ${user.createdAt ? new Date(user.createdAt).toLocaleString() : 'Unknown'}
Source: ${user.source || 'Unknown'}
Reports: ${user.reportsCount || 0}
Saved Places: ${user.savedPlaces ? Object.keys(user.savedPlaces).length : 0}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `;

    alert(details);
}

// View user reports
async function viewUserReports(userId) {
    try {
        const reportsSnapshot = await database.ref(`reports/${userId}`).once('value');
        
        if (!reportsSnapshot.exists()) {
            alert('No reports found for this user.');
            return;
        }

        let reportsHtml = '<h3>User Reports</h3><ul>';
        reportsSnapshot.forEach(reportSnapshot => {
            const report = reportSnapshot.val();
            reportsHtml += `
                <li>
                    <strong>Type:</strong> ${report.type || 'Unknown'}<br>
                    <strong>Description:</strong> ${report.description || 'No description'}<br>
                    <strong>Date:</strong> ${report.timestamp ? new Date(report.timestamp).toLocaleString() : 'Unknown'}<br>
                    <strong>Bus ID:</strong> ${report.busId || 'N/A'}<br>
                    ─────────────────────────────
                </li>
            `;
        });
        reportsHtml += '</ul>';

        // Create a modal or alert with reports
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        
        modal.innerHTML = `
            <div style="background: white; padding: 30px; border-radius: 12px; max-width: 600px; max-height: 80vh; overflow-y: auto;">
                ${reportsHtml}
                <button onclick="this.closest('div[style*=\"position: fixed\"]').remove()" 
                        style="margin-top: 20px; padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer;">
                    Close
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
    } catch (error) {
        console.error('Error loading user reports:', error);
        alert('Error loading reports: ' + error.message);
    }
}

