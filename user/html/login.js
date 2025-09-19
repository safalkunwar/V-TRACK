document.getElementById("loginForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  if (email && password) {
    // Hide login box
    document.getElementById("loginBox").style.opacity = "0";

    // Show Ben 10 effect
    const effect = document.getElementById("ben10-effect");
    effect.style.display = "block";

    // After a short delay, redirect
    setTimeout(() => {
      window.location.href = "dashboard.html"; // change to your dashboard
    }, 3000);
  } else {
    alert("Please fill in all fields");
  }
});

document.getElementById("resetBtn").addEventListener("click", () => {
  const email = document.getElementById("email").value;
  if (!email) {
    alert("Enter your email first");
    return;
  }
  alert(`Password reset link sent to ${email}`);
});
const loginBtn = document.getElementById('loginBtn');
const pulseContainer = document.getElementById('pulse-container');

// Get the Earth’s approximate position (center-right of screen)
function getEarthCenter() {
  const earthX = window.innerWidth * 0.75; // adjust if Earth shifts
  const earthY = window.innerHeight * 0.5;
  return { x: earthX, y: earthY };
}

function createAttackPulse() {
  const rect = loginBtn.getBoundingClientRect();
  const startX = rect.left + rect.width / 2;
  const startY = rect.top + rect.height / 2;

  const { x: earthX, y: earthY } = getEarthCenter();

  const dx = earthX - startX;
  const dy = earthY - startY;

  const pulse = document.createElement('div');
  pulse.classList.add('attack-wave');
  pulse.style.left = `${startX}px`;
  pulse.style.top = `${startY}px`;
  pulse.style.setProperty('--dx', `${dx}px`);
  pulse.style.setProperty('--dy', `${dy}px`);

  pulseContainer.appendChild(pulse);
  setTimeout(() => pulse.remove(), 3000);
}

// Fire attack waves every 500ms
setInterval(createAttackPulse, 500);
let chargeLevel = 0; // percentage

function createImpact(x, y) {
  const impact = document.createElement('div');
  impact.className = 'impact';
  impact.style.left = x + 'px';
  impact.style.top  = y + 'px';
  impactLayer.appendChild(impact);

  // Trigger charging effect on box
  loginContainer.classList.add('charging');
  setTimeout(() => loginContainer.classList.remove('charging'), 800);

  // Charge the button
  chargeLevel = Math.min(100, chargeLevel + 5); // each hit +5%
  loginBtn.style.setProperty('--charge', chargeLevel + '%');
  loginBtn.style.setProperty('--chargeColor', '#00ff80');
  loginBtn.style.setProperty('--chargeGlow', '0 0 25px rgba(0,255,120,0.8)');

  loginBtn.querySelector('::before'); // force re-render
  loginBtn.style.setProperty('--chargeWidth', chargeLevel + '%');
  loginBtn.style.setProperty('--chargeGlow', '0 0 20px rgba(0,255,120,0.8)');

  // Update button fill (using CSS pseudo-element)
  loginBtn.style.setProperty("--charge-width", chargeLevel + "%");
  loginBtn.style.setProperty("--charge-color", "#00ff80");

  // Add glow when full
  if (chargeLevel >= 100) {
    loginBtn.classList.add("charged");
  }

  setTimeout(() => impact.remove(), 1200);
}
if (chargeLevel >= 100) {
  loginBtn.classList.add("charged");

  // Delay before box glow up
  setTimeout(() => {
    loginContainer.classList.add("glowUp");
  }, 1500); // wait 1.5s after button glow
}
