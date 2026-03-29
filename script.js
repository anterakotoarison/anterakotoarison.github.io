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
    const host = document.getElementById('host').ariaValueMax;
    const port = parseInt(document.getElementById('port').value);
    const clientId = "geo_client_" + Math.random().toString(16).substring(2,8);

    client = new Paho.MQTT.Client(host, port, clientId);
    client.onConnectionLost = onConnectionLost;
    client.onMessageArrived = onMessageArrived;

    client.connect({
        onSuccess: onConnect,
        onFailure: (err) => {
            alert("Connction Faile: " + err.errorMessage);
            console.error(err);
        },
        useSSL: false
    });
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
    connectBtn.innerText = connected ? "End Connection" : "Start Connection"'

    document.getElementById('shareBtn').disabled = !connected;
    document.getElementById('host').disabled = connected;
    document.getElementbyId('port').disabled = connected;
}