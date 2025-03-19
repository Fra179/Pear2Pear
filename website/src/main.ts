const  config = {
    iceServers: [
        {urls: "stun:stun.l.google.com:19302"},
        {urls: "stun:stun1.l.google.com:19302"},
        {urls: "stun:stun2.l.google.com:19302"},
        {urls: "stun:stun3.l.google.com:19302"},
    ]
};
const CHUNK_SIZE = 256 * 1024; // 256KB

let ws: WebSocket, peerConnection: RTCPeerConnection | null, dataChannel: RTCDataChannel;
let peerName: string;
let offset = 0;
let fileReader: FileReader;
let start = 0;
let dbref: IDBDatabase | null = null;


(async () => {
    indexedDB.deleteDatabase("chunks");
    login();
})();

function humanReadableFileSize(bytes: number) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function shareFile() {
    if (!selectedFile) {
        alert("Please select a file!");
        return;
    }
    if (!receiverIdInput.value) {
        alert("Please enter a receiver ID");
        return
    }

    offset = 0;

    startConnection();
}

function login() {
    resetTransfer()
    ws = new WebSocket(WS_URL);
    ws.onmessage = (msg) => handleSignalingMessage(JSON.parse(msg.data));
}

function startConnection() {
    updateConnectionStatus(TransferStatusConnecting);
    if (!selectedFile) {
        alert("Please select a file to share");
        updateConnectionStatus(TransferStatusFailed);
        return;
    }

    if (peerConnection) {
        console.log("Connection already active. Killing it");
        peerConnection.close();
        peerConnection = null;
    }

    console.log("Starting connection");
    peerName = receiverIdInput.value;
    peerConnection = new RTCPeerConnection(config);
    dataChannel = peerConnection.createDataChannel("file-transfer");

    dataChannel.onclose = () => {
        console.log("Datachannel closed");
    }

    peerConnection.oniceconnectionstatechange = () => {
        if (peerConnection!.iceConnectionState === "failed") {
            alert("WebRTC ICE connection failed! Please check your network or TURN server.");
            updateConnectionStatus(TransferStatusFailed);
            console.error("ICE failed: Add a TURN server or check network settings.");
            updateConnectionStatus(TransferStatusFailed);
            peerConnection = null;
            window.location.reload();
        }
    }

    setupSenderDataChannel();
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            ws.send(JSON.stringify({type: "candidate", data: event.candidate, to: peerName}));
        }
    };

    peerConnection.createOffer().then(offer => {
        peerConnection!.setLocalDescription(offer);
        ws.send(JSON.stringify({type: "offer", data: offer, to: peerName}));
    });
}

async function initDB() {
    if (dbref) {
        dbref.close();
        dbref = null;
    }

    return await new Promise((resolve, reject) => {
        const request = indexedDB.open("fileStorageDB", 1);
        request.onupgradeneeded = (event) => {
            const db = (event.target! as IDBOpenDBRequest).result;
            const store = db.createObjectStore("chunks", {autoIncrement: false});
        }
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject("Failed to open IndexedDB");
    }) as IDBDatabase;
}

function handleSignalingMessage(data: { type: any; data: string | RTCSessionDescriptionInit | RTCIceCandidateInit | undefined; from: any; }) {
    switch (data.type) {
        case "uuid":
            let id = data.data as string
            (document.getElementById("your-id") as HTMLInputElement).value = id;
            copyIdBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(id);
                // alert('ID copied to clipboard!');
            });

            copyIdReceiveBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(id);
                // alert('ID copied to clipboard!');
            });
            break;
        case "offer":
            updateConnectionStatus(TransferStatusConnecting);
            peerConnection = new RTCPeerConnection(config);
            peerConnection.ondatachannel = (event) => {
                dataChannel = event.channel;
                dataChannel.onclose = () => {console.log("Datachannel closed")};
                initDB().then(db => {
                    console.log("Receiver Data Channel configured with IndexedDB");
                    dbref = db;
                    setupReceiverDataChannel()
                });
            };
            peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    ws.send(JSON.stringify({type: "candidate", data: event.candidate, to: data.from}));
                }
            };
            peerConnection.setRemoteDescription(new RTCSessionDescription(data.data as RTCSessionDescriptionInit));
            peerConnection.createAnswer().then(answer => {
                peerConnection!.setLocalDescription(answer);
                ws.send(JSON.stringify({type: "answer", data: answer, to: data.from}));
            });
            break;

        case "answer":
            peerConnection!.setRemoteDescription(new RTCSessionDescription(data.data as RTCSessionDescriptionInit));
            break;

        case "candidate":
            peerConnection!.addIceCandidate(new RTCIceCandidate(data.data as RTCIceCandidateInit));
            break;
    }
}

async function sendPacket(data: Blob) {
    while (dataChannel.bufferedAmount > 256 * 1024) { // 64KB limit
        await new Promise((resolve) => dataChannel.onbufferedamountlow = resolve);
    }

    dataChannel.send(data)
}

async function sendPacketString(data: string) {
    while (dataChannel.bufferedAmount > 256 * 1024) { // 64KB limit
        await new Promise((resolve) => dataChannel.onbufferedamountlow = resolve);
    }

    dataChannel.send(data)
}

async function sendFile(file: File | null) {
    if (!file) {
        alert("Please select a file first");
        return;
    }
    updateConnectionStatus(TransferStatusTransferring);

    console.log("Sending file: " + file.name + ", size: " + file.size);
    fileReader = new FileReader();
    dataChannel.bufferedAmountLowThreshold = 16 * 1024;
    offset = 0;

    // let's wait .5s before sending the file
    await new Promise((resolve) => setTimeout(resolve, 500));

    while (true) {
        const slice = file.slice(offset, offset + CHUNK_SIZE);

        await sendPacket(slice);
        console.log("Sent")

        if (slice.size === 0) {
            break;
        }

        offset += slice.size;
        updateProgressBar((offset / file.size) * 100);
    }

    await new Promise((resolve) => setTimeout(resolve, 500));

    await sendPacketString("END_OF_FILE");
    updateConnectionStatus(TransferStatusCompleted);

    resetTransfer();

    // fileReader.onload = async (event) => {
    //     let result = event.target!.result;
    //     if (result) {
    //         while (dataChannel.bufferedAmount > 256 * 1024) { // 64KB limit
    //             await new Promise((resolve) => dataChannel.onbufferedamountlow = resolve);
    //         }
//
    //         dataChannel.send(result as ArrayBuffer); // Send chunk
    //         // progressBar.value = `${offset}`;
    //         updateProgressBar((offset / file.size) * 100);
    //         offset += (result as ArrayBuffer).byteLength; // || (result as unknown as Blob).size;
    //         if (offset < file.size) {
    //             readNextChunk(file); // Read next chunk
    //         } else {
    //             dataChannel.send("END_OF_FILE"); // Mark end of file
    //             fileReader.abort();
    //             updateConnectionStatus(TransferStatusCompleted);
    //             resetTransfer();
    //         }
    //     }
    // };

    // readNextChunk(file);
}

// function readNextChunk(file: File) {
//     const slice = file.slice(offset, offset + CHUNK_SIZE);
//     dataChannel.send(slice);
//     // console.log("Reading chunk: " + offset + " - " + (offset + CHUNK_SIZE));
//     fileReader.readAsArrayBuffer(slice);
// }

async function downloadFileFromIndexedDB() {
    const db: IDBDatabase = await new Promise((resolve, reject) => {
        const request = indexedDB.open("fileStorageDB", 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject("Failed to open IndexedDB");
    });

    const transaction = db.transaction("chunks", "readonly");
    const store = transaction.objectStore("chunks");

    const chunks: any[] = await new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject("Failed to retrieve chunks");
    });

    if (chunks.length === 0) {
        alert("No file data found!");
        return;
    }

    // Merge chunks into a Blob
    const blob = new Blob(chunks);
    const url = URL.createObjectURL(blob);

    // Create a download link
    const a = document.createElement("a");
    a.href = url;
    a.download = selectedFile!.name!; // Change name if needed
    document.body.appendChild(a);
    a.click();

    URL.revokeObjectURL(url); // Cleanup
}

function setupSenderDataChannel() {
    dataChannel.onopen = () => {
        console.log("Sender data channel open");
        let request = JSON.stringify({name: selectedFile!.name, size: selectedFile!.size, type: selectedFile!.type});
        // wait 1s
        setTimeout(() => {
            dataChannel.send(request);
        }, 2000);
    };

    dataChannel.onmessage = async (event) => {
        if (event.data === "accepted") {
            console.log("File accepted");
            await sendFile(selectedFile as File);
        } else if (event.data === "rejected") {
            alert("Receiver rejected the file");
            updateConnectionStatus(TransferStatusFailed);
        }
    };
}

function setupReceiverDataChannel() {
    dataChannel.onopen = () => console.log("Receiver channel open");

    dataChannel.onmessage = async (event) => {
        const id = counter++;
        if (typeof event.data === "string" && event.data !== "END_OF_FILE") {
            let data = JSON.parse(event.data);
            requestSharePermission(data);
            selectedFile = data;
        } else if (typeof event.data === "string" && event.data === "END_OF_FILE") {
            // sleep for .5s before downloading the file
            await new Promise((resolve) => setTimeout(resolve, 500));
            updateConnectionStatus(TransferStatusCompleted);
            console.log(`Received ${id} messages`);
            downloadFileFromIndexedDB().then(_ => {
                dbref!.transaction("chunks", "readwrite").objectStore("chunks").clear();
                dbref!.close();
                peerConnection!.close();
                peerConnection = null;
                resetTransfer();
            });
        } else {
            if (!start) {
                start = new Date().valueOf();
            }
            console.log("Received");
            const trans = dbref!.transaction("chunks", "readwrite").objectStore("chunks");
            trans.add(event.data, id);

            receivedSize += event.data.size || event.data.byteLength;

            updateProgressBar((receivedSize / selectedFile!.size) * 100);
        }
    };
}
