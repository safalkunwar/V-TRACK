class DriverProfileViewer {
    constructor() {
        this.database = firebase.database();
    }

    async loadDriverProfile(busId) {
        try {
            const busSnapshot = await this.database.ref(`busDetails/${busId}`).once('value');
            const busData = busSnapshot.val();
            
            if (!busData) throw new Error('Bus not found');

            const driverSnapshot = await this.database.ref(`driverInfo/${busData.driverId}`).once('value');
            const driverData = driverSnapshot.val() || {};

            return {
                busDetails: busData,
                driverDetails: driverData
            };
        } catch (error) {
            console.error('Error loading driver profile:', error);
            throw error;
        }
    }

    render(container, profileData) {
        const { busDetails, driverDetails } = profileData;
        
        const html = `
            <div class="driver-profile-card">
                <div class="profile-header">
                    <img src="${driverDetails.photoUrl || '../img/default-driver.jpg'}" 
                         alt="Driver Photo" class="driver-photo">
                    <div class="driver-info">
                        <h2>${busDetails.driverName}</h2>
                        <div class="rating">
                            <span class="stars">${this.generateStars(driverDetails.rating || 0)}</span>
                            <span class="rating-value">${(driverDetails.rating || 0).toFixed(1)}</span>
                        </div>
                    </div>
                </div>
                
                <div class="bus-details">
                    <h3>Bus Information</h3>
                    <p><strong>Bus Number:</strong> ${busDetails.busNumber}</p>
                    <p><strong>Route:</strong> ${busDetails.busRoute}</p>
                    <p><strong>Contact:</strong> ${busDetails.driverNum}</p>
                </div>

                <div class="driver-stats">
                    <div class="stat-item">
                        <span class="stat-value">${driverDetails.totalTrips || 0}</span>
                        <span class="stat-label">Total Trips</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${driverDetails.experience || 'N/A'}</span>
                        <span class="stat-label">Years Experience</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${driverDetails.completionRate || '0'}%</span>
                        <span class="stat-label">Completion Rate</span>
                    </div>
                </div>

                <div class="recent-reviews">
                    <h3>Recent Reviews</h3>
                    ${this.renderRecentReviews(driverDetails.reviews || [])}
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    generateStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        let stars = '';
        
        for (let i = 0; i < 5; i++) {
            if (i < fullStars) {
                stars += '<i class="fas fa-star"></i>';
            } else if (i === fullStars && hasHalfStar) {
                stars += '<i class="fas fa-star-half-alt"></i>';
            } else {
                stars += '<i class="far fa-star"></i>';
            }
        }
        
        return stars;
    }

    renderRecentReviews(reviews) {
        if (reviews.length === 0) {
            return '<p class="no-reviews">No reviews yet</p>';
        }

        return reviews
            .slice(0, 3)
            .map(review => `
                <div class="review-item">
                    <div class="review-header">
                        <span class="review-stars">${this.generateStars(review.rating)}</span>
                        <span class="review-date">${new Date(review.timestamp).toLocaleDateString()}</span>
                    </div>
                    <p class="review-comment">${review.comment || 'No comment'}</p>
                </div>
            `)
            .join('');
    }
}

window.DriverProfileViewer = DriverProfileViewer; 