const needle = document.querySelector('.needle');
const speedValue = document.querySelector('.speed-value');

// Simulate real-time speed data (replace with actual sensor data)
let currentSpeed = 0;

function updateSpeed() {
    // Simulate speed increase
    currentSpeed += 5;

    // Update needle rotation
    const rotation = currentSpeed * 1.8; // Adjust rotation factor as needed
    needle.style.transform = `rotate(${rotation}deg)`;

    // Update speed value display
    speedValue.textContent = currentSpeed;

    // Simulate real-time updates
    setTimeout(updateSpeed, 100); // Adjust interval as needed
}

updateSpeed();