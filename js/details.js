const busData = [
    { id: 'a', lat: 28.2116, lng: 83.9756, distance: 5, driver: 'Raju Yadav', number: 'GAA 00 26', phone: '9800000001', image: 'driver_a.jpg', busImage: 'bus_a.jpg' },
    { id: 'b', lat: 28.2216, lng: 83.9856, distance: 2, driver: 'Sandesh Dahal', number: 'GAA 00 27', phone: '9800000002', image: 'driver_b.jpg', busImage: 'bus_b.jpg' },
    { id: 'c', lat: 28.2016, lng: 83.9956, distance: 3, driver: 'Nirajan Dhakal', number: 'GAA 00 28', phone: '9800000003', image: 'driver_c.jpg', busImage: 'bus_c.jpg' }
];

window.onload = function() {
    const urlParams = new URLSearchParams(window.location.search);
    const busId = urlParams.get('busId');
    const bus = busData.find(b => b.id === busId);

    if (bus) {
        const busInfo = document.getElementById('bus-info');
        busInfo.innerHTML = `
            <h3>Bus ${bus.id.toUpperCase()}</h3>
            <p>Driver name: ${bus.driver}</p>
            <p>Bus number: ${bus.number}</p>
            <p>Phone number: ${bus.phone}</p>
            <img src="./images/${bus.image}" alt="Driver Image" style="width:200px;">
            <img src="./images/${bus.busImage}" alt="Bus Image" style="width:200px;">
        `;
    } else {
        busInfo.innerHTML = `<h3>Bus not found</h3>`;
    }
};
