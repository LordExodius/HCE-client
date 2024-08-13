const WEBSERVER = "http://localhost:8502"
// const WEBSERVER = "https://hce-webserver-aab6e6335fe3.herokuapp.com"

// Camera input constraints
const constraints = {
    video: {
        width: {min: 640, ideal: 1280, max: 1920},
        height: {min: 480, ideal: 720, max: 1080}
    }
};

// Get video element and create canvases
const video = document.getElementById("videoStream")
const inputCanvas = document.createElement("canvas")
const inputContext = inputCanvas.getContext("2d")
const outputCanvas = document.createElement("canvas")
const outputContext = outputCanvas.getContext("2d")

document.getElementById("wrapper").appendChild(outputCanvas)

// Define constants
const detectionThreshold = 0.5
const inputWidth = 640

// Variables for object detection
let isPlaying = false
let gotMetadata = false

// Draw bounding boxes on output canvas
const drawBoxes = (objects) => {
    outputContext.clearRect(0, 0, outputCanvas.width, outputCanvas.height);
    if (objects.length === 0) { return }
    for (let object of objects) {
        let x1 = object["x1"] * outputCanvas.width
        let y1 = object["y1"] * outputCanvas.height
        let x2 = object["x2"] * outputCanvas.width
        let y2 = object["y2"] * outputCanvas.height

        outputContext.fillText(object["className"], x1, y1 - 5);
        outputContext.strokeRect(x1, y1, x2 - x1, y2 - y1);
    }
}

// Update latency display
counter = 0;
const latencyTable = document.getElementById("e2e")
const averageLatencyDisplay = document.getElementById("e2e-avg")
const updateLatency = (latency) => {
    counter += 1;
    let row = latencyTable.insertRow();
    let cell1 = row.insertCell(0);
    let cell2 = row.insertCell(1);
    cell1.innerHTML = counter;
    cell2.innerHTML = latency;
}

// Send POST request to inference server for object detection
const getInference = async (image) => {
    let startTime = performance.now();
    let formData = new FormData();
    formData.append("image", image);
    const response = await fetch(`${WEBSERVER}/image`, {
        method: "POST",
        body: formData
    });
    const data = await response.json();
    drawBoxes(data["objects"]);
    if (counter < 1000) { updateLatency(performance.now() - startTime); }
    // Send next frame for inference
    inputContext.drawImage(video, 
        0, 0, video.videoWidth, video.videoHeight, 
        0, 0, inputCanvas.width, inputCanvas.height);

    inputCanvas.toBlob(getInference, "image/jpeg");
}

const startObjectDetection = () => {
    console.log("Starting object detection");
    setCanvasMetadata();
    inputContext.drawImage(video, 
        0, 0, video.videoWidth, video.videoHeight, 
        0, 0, inputCanvas.width, inputCanvas.height);
    inputCanvas.toBlob(getInference, "image/jpeg");
}

// Set canvas sizes based on input video
const setCanvasMetadata = () => {
    // Set output canvas size to video size
    outputCanvas.width = video.videoWidth;
    outputCanvas.height = video.videoHeight;
    // Scale down input size to 640x480
    inputCanvas.width = inputWidth;
    inputCanvas.height = inputWidth * (video.videoHeight / video.videoWidth);

    // Set drawing styles
    outputContext.font = "16px roboto";
    outputContext.fillStyle = "white";
    outputContext.lineWidth = 2;
    outputContext.strokeStyle = "magenta";
}

// Check if video API is available
if (navigator.mediaDevices?.getUserMedia) {
    navigator.mediaDevices.getUserMedia(constraints)
        .then(stream => {
            // Set source for video object to the media input acquired
            video.srcObject = stream;
        })
} else {
    alert("This browser does not support navigator.mediaDevices.getUserMedia")
}

// Event listeners for video object
video.onloadedmetadata = () => {
    gotMetadata = true;
    if (isPlaying) { startObjectDetection() }
}

video.onplaying = () => {
    isPlaying = true;
    if (gotMetadata) { startObjectDetection() }
}



