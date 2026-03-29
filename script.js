const courseCode="ENGO_551";
const myName="Ante_R";
const topic=`${courseCode}/${myName}/my_temperature`;

let client;
let isConnected = false;

function toggleConnection() {
    if (!isConnected) {
        startConnect();
    } else {
        endConnect();
    }
}

function startConnect() {
    const host = "test.mosquitto.org"; // Hardcode for a quick test
    const port = 8081;                // The WSS (Secure) port
    const clientId = "uofc_client_" + Math.random().toString(16).substr(2, 8);

    client = new Paho.MQTT.Client(host, port, clientId);

    client.onConnectionLost = onConnectionLost;
    client.onMessageArrived = onMessageArrived;

    const options = {
        useSSL: true,                 // CRITICAL: GitHub Pages requires this
        timeout: 3,
        onSuccess: onConnect,
        onFailure: (err) => {
            console.error("Connection Failed:", err);
            alert("Error: " + err.errorMessage + ". Try using Cellular Data.");
        }
    };

    client.connect(options);
}

function onConnect() {
    isConnected = true;
    updateUI(true);
    client.subscribe(topic);
    console.log(`Subscribed to ${topic}`)
}

function endConnect(){
    if (client) client.disconnect();
    isConnected = false;
    updateUI(false);
}

function onConnectionLost(responseObject) {
    updateUI(false)
    if (responseObject.errorCode != 0) {
        document.getElementById('statusMsg').innerText = "Status: Connection Lost. Reconnecting..."
        setTimeout(startConnect, 3000)
    }
}

function updateUI(connected) {
    const status = document.getElementById('statusMsg');
    const connectBtn = document.getElementbyId('connectBtn');

    status.innerText = connected ? "Status: Connected" : "Status: Disconnected";
    status.className = connected ? "status-connected" : "status-disconnected";
    connectBtn.innerText = connected ? "End Connection" : "Start Connection";

    document.getElementById('shareBtn').disabled = !connected;
    document.getElementById('host').disabled = connected;
    document.getElementbyId('port').disabled = connected;
}

function shareStatus() {
    if (!navigator.geolocation) return alert("Geolocation not supported");

    navigator.geolocation.getCurrentPosition((pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        const temp = (Math.random() * 100 - 40).toFixed(1); //random temp

        const geojson = {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [lon, lat]},
            "properties": {"temperature" : parseFloat(temp)}
        };

        const message = new Paho.MQTT.Message(JSON.stringify(geojson));
        message.destinationName = topic;
        client.send(message);

    }, (err) => alert("Error getting location: " + err.message));
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
    let color = "green";
    if (temp < 10) color = "blue";
    else if (temp >= 30) color = "red";

    const icon = L.divIcon({
        html: `<svg width="30" height="30"<circle cx="15" cy="15" r="10" fill="${color}" strong="white" stroke-width="2"/></svg>`,
        className: '',
        iconSize: [30, 30]
    })

    if (marker) {
        marker.setLatLng([lat, lng]).setIcon(icon);
    } else {
        marker = L.marker([lat, lng], { icon: icon }).addTo(map);
    }

    marker.bindPopup(`<b>Temp:</b> ${temp} C`).openPopup();
    map.flyTo([lat, lng], 15);
}