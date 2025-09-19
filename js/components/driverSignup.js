class DriverSignup {
    constructor() {
        this.database = firebase.database();
        this.auth = firebase.auth();
    }

    async submitSignup(formData) {
        try {
            // Create auth account
            const userCredential = await this.auth.createUserWithEmailAndPassword(
                formData.email,
                formData.password
            );

            // Create driver profile
            const driverProfile = {
                name: formData.name,
                phone: formData.phone,
                licenseNumber: formData.licenseNumber,
                experience: formData.experience,
                email: formData.email,
                verified: false, // Pending admin approval
                status: 'pending', // pending, approved, rejected
                rank: 'Bronze', // Default rank
                timestamp: Date.now(),
                createdAt: Date.now(),
                updatedAt: Date.now(),
                userId: userCredential.user.uid
            };

            // Save to driverInfo for immediate login access
            await this.database.ref(`driverInfo/${userCredential.user.uid}`).set(driverProfile);

            // Also save to pendingDrivers for admin approval tracking
            await this.database.ref('pendingDrivers').push(driverProfile);

            return { success: true, message: 'Signup successful! You can now log in.' };
        } catch (error) {
            console.error('Driver signup error:', error);
            throw error;
        }
    }
}

window.DriverSignup = DriverSignup; 