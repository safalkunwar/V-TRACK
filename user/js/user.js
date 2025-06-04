function submitRating() {
    let rating = document.getElementById('userRating').value;
    if (rating >= 1 && rating <= 5) {
        alert('Rating submitted: ' + rating);
    } else {
        alert('Please enter a rating between 1 and 5.');
    }
}

function addMarker() {
    alert('Feature to add a marker on the map coming soon!');
}

function sendMessage() {
    let chatBox = document.getElementById('chatBox');
    let chatInput = document.getElementById('chatInput');
    let msg = chatInput.value.trim();
    if (msg) {
        let messageElement = document.createElement('p');
        messageElement.innerHTML = '<strong>You:</strong> ' + msg;
        chatBox.appendChild(messageElement);
        chatInput.value = '';
        chatBox.scrollTop = chatBox.scrollHeight;
    }
}

function initMap() {
    let map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 27.7172, lng: 85.3240 },
        zoom: 12
    });
}
var modal = document.getElementById("myProfilePopup");

// Get the button that opens the modal
var btn = document.getElementById("myProfileBtn");

// Get the <span> element that closes the modal
var span = document.getElementsByClassName("close-btn")[0];

// When the user clicks the button, open the modal 
btn.onclick = function() {
    modal.style.display = "block";
}

// When the user clicks on <span> (x), close the modal
span.onclick = function() {
    modal.style.display = "none";
}

// When the user clicks anywhere outside of the modal, close it
window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
}