// Emergency Monitor - Premium Emergency Alert System
// Monitors Firebase for emergency alerts from bus drivers

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

// Initialize Firebase if not already initialized
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const database = firebase?.database();
let emergencyListener = null;
let shownEmergencies = new Set(); // Track shown emergencies to prevent duplicates

// Emergency Popup Component
class EmergencyPopup {
    constructor(emergencyData) {
        this.emergencyData = emergencyData;
        this.popup = null;
        this.createPopup();
    }

    createPopup() {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'emergency-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.85);
            backdrop-filter: blur(10px);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.3s ease;
        `;

        // Create popup container
        const popup = document.createElement('div');
        popup.className = 'emergency-popup';
        popup.style.cssText = `
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            color: white;
            padding: 0;
            border-radius: 20px;
            max-width: 600px;
            width: 90%;
            box-shadow: 0 20px 60px rgba(239, 68, 68, 0.5);
            animation: slideDown 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            overflow: hidden;
            position: relative;
        `;

        // Add pulsing border animation
        popup.style.border = '3px solid #fff';
        popup.style.boxShadow = '0 0 0 4px rgba(239, 68, 68, 0.3), 0 20px 60px rgba(239, 68, 68, 0.5)';
        
        // Animated border
        const borderAnimation = document.createElement('div');
        borderAnimation.style.cssText = `
            position: absolute;
            top: -3px;
            left: -3px;
            right: -3px;
            bottom: -3px;
            border-radius: 20px;
            background: linear-gradient(45deg, #ef4444, #dc2626, #ef4444);
            background-size: 200% 200%;
            animation: borderPulse 2s linear infinite;
            z-index: -1;
        `;
        popup.appendChild(borderAnimation);

        // Header
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 30px;
            text-align: center;
            background: rgba(0, 0, 0, 0.2);
            border-bottom: 2px solid rgba(255, 255, 255, 0.3);
        `;
        
        const icon = document.createElement('div');
        icon.innerHTML = '🚨';
        icon.style.cssText = `
            font-size: 64px;
            margin-bottom: 15px;
            animation: pulse 1.5s ease-in-out infinite;
        `;
        
        const title = document.createElement('h2');
        title.textContent = 'EMERGENCY ALERT';
        title.style.cssText = `
            margin: 0;
            font-size: 32px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 3px;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        `;
        
        const subtitle = document.createElement('p');
        subtitle.textContent = 'Driver Emergency Request';
        subtitle.style.cssText = `
            margin: 10px 0 0 0;
            font-size: 16px;
            opacity: 0.9;
            font-weight: 500;
        `;
        
        header.appendChild(icon);
        header.appendChild(title);
        header.appendChild(subtitle);

        // Body
        const body = document.createElement('div');
        body.style.cssText = `
            padding: 30px;
            background: rgba(255, 255, 255, 0.1);
        `;

        const details = [
            { label: 'Bus ID', value: this.emergencyData.busId || 'Unknown', icon: '🚌' },
            { label: 'Driver ID', value: this.emergencyData.driverId || 'Unknown', icon: '👤' },
            { label: 'Type', value: this.emergencyData.type || 'panic_button', icon: '⚠️' },
            { label: 'Time', value: new Date(this.emergencyData.timestamp || Date.now()).toLocaleString(), icon: '🕐' },
            { label: 'Location', value: this.emergencyData.location ? 
                `${(this.emergencyData.location.latitude || this.emergencyData.location.lat || 0).toFixed(6)}, ${(this.emergencyData.location.longitude || this.emergencyData.location.lng || 0).toFixed(6)}` : 
                'Not available', icon: '📍' },
            { label: 'Description', value: this.emergencyData.description || 'No description provided', icon: '📝' }
        ];

        details.forEach(detail => {
            const detailRow = document.createElement('div');
            detailRow.style.cssText = `
                display: flex;
                align-items: center;
                gap: 15px;
                padding: 15px;
                margin-bottom: 10px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 10px;
                border-left: 4px solid rgba(255, 255, 255, 0.5);
            `;
            
            const iconSpan = document.createElement('span');
            iconSpan.textContent = detail.icon;
            iconSpan.style.fontSize = '24px';
            
            const label = document.createElement('strong');
            label.textContent = `${detail.label}: `;
            label.style.cssText = `
                min-width: 120px;
                font-size: 14px;
                text-transform: uppercase;
                letter-spacing: 1px;
            `;
            
            const value = document.createElement('span');
            value.textContent = detail.value;
            value.style.cssText = `
                flex: 1;
                font-size: 15px;
                font-weight: 600;
            `;
            
            detailRow.appendChild(iconSpan);
            detailRow.appendChild(label);
            detailRow.appendChild(value);
            body.appendChild(detailRow);
        });

        // Actions
        const actions = document.createElement('div');
        actions.style.cssText = `
            padding: 25px 30px;
            display: flex;
            gap: 15px;
            justify-content: center;
            background: rgba(0, 0, 0, 0.2);
            border-top: 2px solid rgba(255, 255, 255, 0.3);
        `;

        const acknowledgeBtn = document.createElement('button');
        acknowledgeBtn.textContent = '✓ Acknowledge';
        acknowledgeBtn.style.cssText = `
            padding: 15px 30px;
            background: rgba(255, 255, 255, 0.2);
            border: 2px solid white;
            color: white;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s ease;
            text-transform: uppercase;
            letter-spacing: 1px;
        `;
        acknowledgeBtn.onmouseover = () => {
            acknowledgeBtn.style.background = 'rgba(255, 255, 255, 0.3)';
            acknowledgeBtn.style.transform = 'scale(1.05)';
        };
        acknowledgeBtn.onmouseout = () => {
            acknowledgeBtn.style.background = 'rgba(255, 255, 255, 0.2)';
            acknowledgeBtn.style.transform = 'scale(1)';
        };
        acknowledgeBtn.onclick = () => {
            this.acknowledge();
        };

        const viewLocationBtn = document.createElement('button');
        viewLocationBtn.textContent = '📍 View Location';
        viewLocationBtn.style.cssText = `
            padding: 15px 30px;
            background: rgba(255, 255, 255, 0.2);
            border: 2px solid white;
            color: white;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s ease;
            text-transform: uppercase;
            letter-spacing: 1px;
        `;
        viewLocationBtn.onmouseover = () => {
            viewLocationBtn.style.background = 'rgba(255, 255, 255, 0.3)';
            viewLocationBtn.style.transform = 'scale(1.05)';
        };
        viewLocationBtn.onmouseout = () => {
            viewLocationBtn.style.background = 'rgba(255, 255, 255, 0.2)';
            viewLocationBtn.style.transform = 'scale(1)';
        };
        viewLocationBtn.onclick = () => {
            this.viewLocation();
        };

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕ Close';
        closeBtn.style.cssText = `
            padding: 15px 30px;
            background: rgba(0, 0, 0, 0.3);
            border: 2px solid rgba(255, 255, 255, 0.5);
            color: white;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s ease;
            text-transform: uppercase;
            letter-spacing: 1px;
        `;
        closeBtn.onmouseover = () => {
            closeBtn.style.background = 'rgba(0, 0, 0, 0.5)';
            closeBtn.style.transform = 'scale(1.05)';
        };
        closeBtn.onmouseout = () => {
            closeBtn.style.background = 'rgba(0, 0, 0, 0.3)';
            closeBtn.style.transform = 'scale(1)';
        };
        closeBtn.onclick = () => {
            this.close();
        };

        actions.appendChild(acknowledgeBtn);
        if (this.emergencyData.location) {
            actions.appendChild(viewLocationBtn);
        }
        actions.appendChild(closeBtn);

        // Assemble popup
        popup.appendChild(header);
        popup.appendChild(body);
        popup.appendChild(actions);
        overlay.appendChild(popup);
        
        // Add to document
        document.body.appendChild(overlay);
        this.popup = overlay;
        this.overlay = overlay;

        // Play sound (if browser allows)
        this.playAlertSound();

        // Auto-close after 30 seconds (optional)
        // setTimeout(() => this.close(), 30000);
    }

    playAlertSound() {
        // Play beep sound - multiple beeps for attention
        try {
            // Try to get or create audio context (may need user interaction first)
            let audioContext = window.emergencyAudioContext;
            if (!audioContext) {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                window.emergencyAudioContext = audioContext;
            }
            
            // Resume audio context if suspended (required by some browsers)
            if (audioContext.state === 'suspended') {
                audioContext.resume().catch(() => {
                    console.log('Audio context resume failed');
                });
            }
            
            // Play 3 beeps with increasing urgency
            for (let i = 0; i < 3; i++) {
                setTimeout(() => {
                    try {
                        const oscillator = audioContext.createOscillator();
                        const gainNode = audioContext.createGain();
                        
                        oscillator.connect(gainNode);
                        gainNode.connect(audioContext.destination);
                        
                        // Higher frequency for more urgent sound (1000Hz, 1200Hz, 1500Hz)
                        oscillator.frequency.value = 1000 + (i * 200);
                        oscillator.type = 'sine';
                        
                        // Volume envelope for better sound
                        const now = audioContext.currentTime;
                        gainNode.gain.setValueAtTime(0, now);
                        gainNode.gain.linearRampToValueAtTime(0.6, now + 0.05);
                        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
                        
                        oscillator.start(now);
                        oscillator.stop(now + 0.4);
                    } catch (e) {
                        console.log('Error playing beep:', e);
                    }
                }, i * 500); // 500ms between beeps
            }
        } catch (e) {
            console.log('AudioContext not supported, trying fallback');
            // Fallback: Try to play a simple beep
            try {
                // Create multiple beep sounds using Web Audio API
                this.playFallbackBeep();
            } catch (e2) {
                console.log('All audio methods failed');
            }
        }
    }
    
    playFallbackBeep() {
        // Simple fallback beep using multiple short tones
        const beepCount = 3;
        let currentBeep = 0;
        
        const playBeep = () => {
            if (currentBeep >= beepCount) return;
            
            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.value = 1000 + (currentBeep * 200);
                oscillator.type = 'sine';
                
                const now = audioContext.currentTime;
                gainNode.gain.setValueAtTime(0.5, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                
                oscillator.start(now);
                oscillator.stop(now + 0.3);
                
                currentBeep++;
                setTimeout(playBeep, 500);
            } catch (e) {
                console.log('Fallback beep failed');
            }
        };
        
        playBeep();
    }

    acknowledge() {
        if (database && this.emergencyData.id) {
            database.ref(`emergencies/${this.emergencyData.id}/status`).set('acknowledged');
        }
        this.close();
    }

    viewLocation() {
        if (this.emergencyData.location) {
            const lat = this.emergencyData.location.latitude || this.emergencyData.location.lat;
            const lng = this.emergencyData.location.longitude || this.emergencyData.location.lng;
            if (lat && lng) {
                const url = `https://www.google.com/maps?q=${lat},${lng}`;
                window.open(url, '_blank');
            } else {
                alert('Location coordinates not available');
            }
        } else {
            alert('Location information not available');
        }
    }

    close() {
        if (this.overlay) {
            this.overlay.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => {
                if (this.overlay.parentNode) {
                    this.overlay.parentNode.removeChild(this.overlay);
                }
            }, 300);
        }
    }
}

// Initialize Emergency Monitor
function initEmergencyMonitor() {
    if (!database) {
        console.error('Firebase database not available');
        // Retry after a short delay
        setTimeout(initEmergencyMonitor, 1000);
        return;
    }

    console.log('🚨 Initializing Emergency Monitor...');

    // Listen for new emergencies from the emergencies node
    const emergenciesRef = database.ref('emergencies');
    
    emergencyListener = emergenciesRef.on('child_added', (snapshot) => {
        const emergency = snapshot.val();
        const emergencyId = snapshot.key;

        // Only show active emergencies that haven't been shown
        if (emergency && emergency.status === 'active' && !shownEmergencies.has(emergencyId)) {
            shownEmergencies.add(emergencyId);
            
            // Add emergency ID to the data
            emergency.id = emergencyId;
            
            console.log('🚨 New emergency detected:', emergency);
            
            // Show popup immediately
            new EmergencyPopup(emergency);
        }
    });

    // Also listen for changes to existing emergencies (in case status changes)
    emergenciesRef.on('child_changed', (snapshot) => {
        const emergency = snapshot.val();
        const emergencyId = snapshot.key;
        
        // If a new active emergency appears that we haven't shown
        if (emergency && emergency.status === 'active' && !shownEmergencies.has(emergencyId)) {
            shownEmergencies.add(emergencyId);
            emergency.id = emergencyId;
            console.log('🚨 Emergency status changed to active:', emergency);
            new EmergencyPopup(emergency);
        }
    });

    // Also listen for bus-specific emergencies (backup)
    const busesRef = database.ref('buses');
    busesRef.on('child_changed', (snapshot) => {
        const busData = snapshot.val();
        if (busData && busData.emergency && busData.emergency.status === 'active') {
            const emergencyId = `bus_${snapshot.key}_${busData.emergency.timestamp}`;
            if (!shownEmergencies.has(emergencyId)) {
                shownEmergencies.add(emergencyId);
                busData.emergency.id = emergencyId;
                busData.emergency.busId = snapshot.key;
                console.log('🚨 Bus emergency detected:', busData.emergency);
                new EmergencyPopup(busData.emergency);
            }
        }
    });

    console.log('🚨 Emergency Monitor initialized and listening');
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
    
    @keyframes slideDown {
        from {
            transform: translateY(-100px) scale(0.8);
            opacity: 0;
        }
        to {
            transform: translateY(0) scale(1);
            opacity: 1;
        }
    }
    
    @keyframes pulse {
        0%, 100% {
            transform: scale(1);
        }
        50% {
            transform: scale(1.1);
        }
    }
    
    @keyframes borderPulse {
        0% {
            background-position: 0% 50%;
        }
        50% {
            background-position: 100% 50%;
        }
        100% {
            background-position: 0% 50%;
        }
    }
`;
document.head.appendChild(style);

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEmergencyMonitor);
} else {
    initEmergencyMonitor();
}

