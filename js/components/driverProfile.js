class DriverProfile {
    constructor(driverId) {
        this.driverId = driverId;
        this.profileData = null;
    }

    async loadProfile() {
        try {
            const snapshot = await database.ref(`driverInfo/${this.driverId}`).once('value');
            this.profileData = snapshot.val();
            return this.profileData;
        } catch (error) {
            console.error('Error loading driver profile:', error);
            throw error;
        }
    }

    render(container) {
        if (!this.profileData) return;

        const profileHtml = `
            <div class="driver-profile">
                <div class="profile-header">
                    <img src="${this.profileData.photoUrl || '../img/default-driver.jpg'}" alt="Driver Photo" class="driver-photo">
                    <div class="profile-info">
                        <h2>${this.profileData.name}</h2>
                        <p class="driver-id">ID: ${this.driverId}</p>
                        <p class="driver-status ${this.profileData.status === 'active' ? 'active' : 'inactive'}">
                            ${this.profileData.status || 'Inactive'}
                        </p>
                    </div>
                </div>
                <div class="profile-details">
                    <div class="detail-item">
                        <i class="fas fa-bus"></i>
                        <div>
                            <h4>Assigned Bus</h4>
                            <p>${this.profileData.assignedBus || 'Not assigned'}</p>
                        </div>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-phone"></i>
                        <div>
                            <h4>Contact</h4>
                            <p>${this.profileData.phone || 'N/A'}</p>
                        </div>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-star"></i>
                        <div>
                            <h4>Rating</h4>
                            <p>${this.profileData.rating?.toFixed(1) || 'No ratings'}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = profileHtml;
    }
}

// Export for use in other files
window.DriverProfile = DriverProfile; 