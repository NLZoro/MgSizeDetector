const videoElement = document.getElementById('input_video');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');
const statusText = document.getElementById('status');

// --- CONFIGURATION ---
// We assume the Green Box is 200 pixels wide.
// A standard credit card is 8.56 cm.
// So, Scale = 8.56 / 200
const PIXELS_TO_CM = 8.56 / 200; 

function calculateDistance(point1, point2) {
    const x1 = point1.x * canvasElement.width;
    const y1 = point1.y * canvasElement.height;
    const x2 = point2.x * canvasElement.width;
    const y2 = point2.y * canvasElement.height;
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

function onResults(results) {
    statusText.innerText = "1. Fit Card in Box   |   2. Turn Sideways & Touch Chest";

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    // 1. FLIP IMAGE
    canvasCtx.translate(canvasElement.width, 0);
    canvasCtx.scale(-1, 1);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.setTransform(1, 0, 0, 1, 0, 0); // Reset flip for text

    // 2. DRAW CALIBRATION BOX (Top Left)
    canvasCtx.beginPath();
    canvasCtx.rect(20, 20, 200, 120);
    canvasCtx.lineWidth = 3;
    canvasCtx.strokeStyle = "#00FF00";
    canvasCtx.stroke();
    
    canvasCtx.fillStyle = "#00FF00";
    canvasCtx.font = "16px Arial";
    canvasCtx.fillText("FIT CARD HERE", 30, 85);

    if (results.poseLandmarks) {
        // Draw Skeleton
        drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {color: 'rgba(0,255,0,0.5)', lineWidth: 2});
        drawLandmarks(canvasCtx, results.poseLandmarks, {color: '#FF0000', lineWidth: 1});

        const leftShoulder = results.poseLandmarks[11];
        const rightShoulder = results.poseLandmarks[12];
        const leftIndex = results.poseLandmarks[19]; 

        // --- THE FIX: STRICTER SIDE VIEW DETECTION ---
        // I changed the threshold from 80 to 40. 
        // You now have to be COMPLETELY sideways for it to trigger.
        const shoulderGap = Math.abs((leftShoulder.x * canvasElement.width) - (rightShoulder.x * canvasElement.width));
        
        if (shoulderGap < 40) { 
            // === MODE: SIDE VIEW (MEASURING) ===
            
            // Measure Depth
            const depthPixels = calculateDistance(leftShoulder, leftIndex);
            const depthCm = (depthPixels * PIXELS_TO_CM).toFixed(1);

            // Draw the Yellow Line
            canvasCtx.beginPath();
            canvasCtx.moveTo(leftShoulder.x * canvasElement.width, leftShoulder.y * canvasElement.height);
            canvasCtx.lineTo(leftIndex.x * canvasElement.width, leftIndex.y * canvasElement.height);
            canvasCtx.strokeStyle = "yellow";
            canvasCtx.lineWidth = 5;
            canvasCtx.stroke();

            // SHOW TEXT (Moved to Top Right so it doesn't block the box)
            canvasCtx.fillStyle = "yellow";
            canvasCtx.font = "bold 40px Arial";
            canvasCtx.fillText(`Depth: ${depthCm} cm`, 350, 80); 
            
        } else {
            // === MODE: FRONT VIEW (WAITING) ===
            canvasCtx.fillStyle = "white";
            canvasCtx.font = "20px Arial";
            canvasCtx.fillText("Turn 90° Sideways to Measure", 350, 50);
        }
    }
    canvasCtx.restore();
}

const pose = new Pose({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
}});

pose.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

pose.onResults(onResults);

const camera = new Camera(videoElement, {
    onFrame: async () => {
        await pose.send({image: videoElement});
    },
    width: 640,
    height: 480
});

camera.start();