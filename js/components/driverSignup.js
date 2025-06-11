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
                status: 'pending', // pending, approved, rejected
                timestamp: Date.now(),
                userId: userCredential.user.uid
            };

            // Save to pending drivers
            await this.database.ref('pendingDrivers').push(driverProfile);

            return { success: true, message: 'Signup request submitted successfully' };
        } catch (error) {
            console.error('Driver signup error:', error);
            throw error;
        }
    }
}

window.DriverSignup = DriverSignup; 