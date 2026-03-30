// --- CONFIGURATION ---
const courseCode = "ENGO_551";
const myName = "Ante_R";
const topic = `${courseCode}/${myName}/my_temperature`;

let client;
let isConnected = false;
let map, marker;

// Initialize Map on Load
document.addEventListener('DOMContentLoaded', () => {
    map = L.map('map').setView([51.0447, -114.0719], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(map);
});

function toggleConnection() {
    if (!isConnected) {
        startConnect();
    } else {
        endConnect();
    }
}

function startConnect() {
    const host = document.getElementById('host').value;
    const port = parseInt(document.getElementById('port').value);
    const clientId = "geo_client_" + Math.random().toString(16).substr(2, 8);

    client = new Paho.MQTT.Client(host, port, clientId);

    client.onConnectionLost = onConnectionLost;
    client.onMessageArrived = onMessageArrived;

    const options = {
        useSSL: true, // Required for GitHub Pages (HTTPS)
        timeout: 3,
        onSuccess: onConnect,
        onFailure: (err) => {
            alert("Connection Failed: " + err.errorMessage + "\nTry Port 8081 and check your internet.");
            updateUI(false);
        }
    };

    client.connect(options);
}

function onConnect() {
    isConnected = true;
    updateUI(true);
    client.subscribe(topic);
    console.log(`Subscribed to ${topic}`);
}

function onConnectionLost(responseObject) {
    isConnected = false;
    updateUI(false);
    if (responseObject.errorCode !== 0) {
        document.getElementById('statusMsg').innerText = "Status: Connection Lost. Reconnecting...";
        setTimeout(startConnect, 3000);
    }
}

function endConnect() {
    if (client) {
        try { client.disconnect(); } catch (e) {}
    }
    isConnected = false;
    updateUI(false);
}

function publishAny() {
    const customTopic = document.getElementById('customTopic').value;
    const customMsg = document.getElementById('customMsg').value;

    if (!customTopic || !customMsg) {
        alert("Please enter both a topic and a message!");
        return;
    }

    // Check if client exists and is actually connected
    if (client && client.isConnected()) {
        const message = new Paho.MQTT.Message(customMsg);
        message.destinationName = customTopic.trim(); // remove accidental spaces
        client.send(message);
        
        console.log(`Published "${customMsg}" to "${customTopic}"`);
        
        // Visual feedback so you know it worked
        const pubBtn = document.getElementById('pubBtn');
        const originalText = pubBtn.innerText;
        pubBtn.innerText = "Sent!";
        setTimeout(() => pubBtn.innerText = originalText, 2000);
        
        // Clear the message box for the next test
        document.getElementById('customMsg').value = "";
    } else {
        alert("Client is not connected. Please click 'Start Connection' first.");
    }
}

function updateUI(connected) {
    document.getElementById('host').disabled = connected;
    document.getElementById('port').disabled = connected;
    document.getElementById('shareBtn').disabled = !connected;
    
    // This line MUST match the ID in your HTML
    const pubBtn = document.getElementById('pubBtn');
    if (pubBtn) {
        pubBtn.disabled = !connected;
    }
    
    const statusMsg = document.getElementById('statusMsg');
    const connectBtn = document.getElementById('connectBtn');

    if (connected) {
        statusMsg.innerText = "Status: Connected";
        statusMsg.className = "status-connected";
        connectBtn.innerText = "End Connection";
    } else {
        statusMsg.innerText = "Status: Disconnected";
        statusMsg.className = "status-disconnected";
        connectBtn.innerText = "Start Connection";
    }
}

function shareStatus() {
    if (!navigator.geolocation) return alert("Geolocation not supported");

    navigator.geolocation.getCurrentPosition((pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        // Generate random temp [-40, 60]
        const temp = (Math.random() * 100 - 40).toFixed(1);

        const geojson = {
            "type": "Feature",
            "geometry": { "type": "Point", "coordinates": [lon, lat] },
            "properties": { "temperature": parseFloat(temp) }
        };

        const message = new Paho.MQTT.Message(JSON.stringify(geojson));
        message.destinationName = topic;
        client.send(message);

    }, (err) => alert("Allow location access in settings: " + err.message));
}

function onMessageArrived(message) {
    try {
        const data = JSON.parse(message.payloadString);
        const [lon, lat] = data.geometry.coordinates;
        const temp = data.properties.temperature;
        updateMap(lat, lon, temp);
    } catch (e) {
        console.error("Error parsing MQTT message", e);
    }
}

function updateMap(lat, lng, temp) {
    // Requirements: Blue [-40, 10), Green [10, 30), Red [30, 60]
    let color = "green";
    if (temp < 10) color = "blue";
    else if (temp >= 30) color = "red";

    const icon = L.divIcon({
        html: `<svg width="30" height="30"><circle cx="15" cy="15" r="10" fill="${color}" stroke="white" stroke-width="2"/></svg>`,
        className: '',
        iconSize: [30, 30]
    });

    if (marker) {
        marker.setLatLng([lat, lng]).setIcon(icon);
    } else {
        marker = L.marker([lat, lng], { icon: icon }).addTo(map);
    }

    marker.bindPopup(`<b>Current Temperature:</b> ${temp} °C`).openPopup();
    map.flyTo([lat, lng], 15);
}