let model, objectDetectionModel;
let webcam = document.getElementById('webcam');
let canvas = document.getElementById('output');
let ctx = canvas.getContext('2d');
let eventsList = document.getElementById('eventsList');
let startBtn = document.getElementById('startBtn');
let stopBtn = document.getElementById('stopBtn');
let generateReportBtn = document.getElementById('generateReport');
let statusDiv = document.getElementById('status');
let reportDiv = document.getElementById('report');
let candidateNameInput = document.getElementById('candidateName');

let events = [];
let interviewStartTime = null;
let lookingAwayStartTime = null;
let noFaceStartTime = null;
let isLookingAway = false;
let isNoFace = false;
let mediaRecorder = null;
let recordedChunks = [];
let interviewId = null;

async function loadModels() {
    try {
        model = await blazeface.load();
        objectDetectionModel = await cocoSsd.load();
        statusDiv.textContent = 'Models loaded successfully';
    } catch (err) {
        console.error('Error loading models:', err);
        statusDiv.textContent = 'Error loading models';
    }
}

async function setupWebcam() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 640, height: 480 } 
        });
        webcam.srcObject = stream;
        
        mediaRecorder = new MediaRecorder(stream);
        recordedChunks = [];
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };
        
        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            console.log('Recording available at:', url);
        };
        
        return new Promise((resolve) => {
            webcam.onloadedmetadata = () => {
                canvas.width = webcam.videoWidth;
                canvas.height = webcam.videoHeight;
                resolve();
            };
        });
    } catch (err) {
        console.error('Error accessing webcam:', err);
        statusDiv.textContent = 'Error accessing webcam';
    }
}

async function detectFocus() {
    if (!model) return;
    
    const predictions = await model.estimateFaces(webcam, false);
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (predictions.length > 0) {
        if (isNoFace) {
            isNoFace = false;
            noFaceStartTime = null;
            logEvent('Face detected again');
        }
        
        const face = predictions[0];
        const nose = face.landmarks[2];
        
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const thresholdX = canvas.width * 0.2;
        const thresholdY = canvas.height * 0.2;
        
        if (Math.abs(nose[0] - centerX) > thresholdX || Math.abs(nose[1] - centerY) > thresholdY) {
            if (!isLookingAway) {
                lookingAwayStartTime = Date.now();
                isLookingAway = true;
            } else if (Date.now() - lookingAwayStartTime > 5000) {
                logEvent('User looking away for more than 5 seconds');
                lookingAwayStartTime = Date.now();
            }
        } else {
            if (isLookingAway) {
                isLookingAway = false;
                lookingAwayStartTime = null;
                logEvent('User looking at screen again');
            }
        }
        
        ctx.fillStyle = 'blue';
        for (let i = 0; i < face.landmarks.length; i++) {
            const x = face.landmarks[i][0];
            const y = face.landmarks[i][1];
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, 2 * Math.PI);
            ctx.fill();
        }
        
        if (predictions.length > 1) {
            logEvent(`Multiple faces detected (${predictions.length})`);
        }
    } else {
        if (!isNoFace) {
            noFaceStartTime = Date.now();
            isNoFace = true;
        } else if (Date.now() - noFaceStartTime > 10000) {
            logEvent('No face detected for more than 10 seconds');
            noFaceStartTime = Date.now();
        }
    }
}

async function detectObjects() {
    if (!objectDetectionModel) return;
    
    const predictions = await objectDetectionModel.detect(webcam);
    const unauthorizedItems = ['cell phone', 'book', 'laptop', 'tv', 'monitor'];
    const detectedItems = [];
    
    predictions.forEach(prediction => {
        if (unauthorizedItems.includes(prediction.class)) {
            detectedItems.push(prediction.class);
            const [x, y, width, height] = prediction.bbox;
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, width, height);
            ctx.fillStyle = 'red';
            ctx.fillText(
                `${prediction.class} (${Math.round(prediction.score * 100)}%)`,
                x, y > 10 ? y - 5 : 10
            );
        }
    });
    
    if (detectedItems.length > 0) {
        logEvent(`Unauthorized items detected: ${detectedItems.join(', ')}`);
    }
}

function logEvent(message) {
    const timestamp = new Date().toISOString();
    const event = { timestamp, message };
    events.push(event);
    const li = document.createElement('li');
    li.textContent = `${timestamp.split('T')[1].split('.')[0]} - ${message}`;
    eventsList.appendChild(li);
    eventsList.scrollTop = eventsList.scrollHeight;
    if (window.backendUrl) {
        fetch(`${window.backendUrl}/api/events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                interviewId,
                timestamp,
                message
            })
        }).catch(err => console.error('Error sending event to backend:', err));
    }
}

async function startInterview() {
    const candidateName = candidateNameInput.value.trim();
    if (!candidateName) {
        alert('Please enter candidate name');
        return;
    }
    
    interviewId = Date.now().toString();
    interviewStartTime = Date.now();
    events = [];
    eventsList.innerHTML = '';
    reportDiv.innerHTML = '';
    
    await setupWebcam();
    statusDiv.textContent = 'Interview in progress';
    
    startBtn.disabled = true;
    stopBtn.disabled = false;
    candidateNameInput.disabled = true;
    
    if (mediaRecorder) {
        mediaRecorder.start(1000);
    }
    
    detectionInterval = setInterval(async () => {
        await detectFocus();
        await detectObjects();
    }, 1000);
    
    logEvent(`Interview started for candidate: ${candidateName}`);
}

function stopInterview() {
    clearInterval(detectionInterval);
    
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
    }
    
    statusDiv.textContent = 'Interview ended';
    startBtn.disabled = false;
    stopBtn.disabled = true;
    generateReportBtn.disabled = false;
    candidateNameInput.disabled = false;
    
    logEvent('Interview ended');
}

function generateReport() {
    const candidateName = candidateNameInput.value.trim();
    const interviewDuration = Math.round((Date.now() - interviewStartTime) / 1000);
    const focusLostEvents = events.filter(e => 
        e.message.includes('looking away') || e.message.includes('No face detected')
    ).length;
    
    const suspiciousEvents = events.filter(e => 
        e.message.includes('Multiple faces') || e.message.includes('Unauthorized items')
    ).length;

    const deductions = Math.min(focusLostEvents * 5 + suspiciousEvents * 10, 100);
    const integrityScore = 100 - deductions;
    
    let reportHTML = `
        <h3>Proctoring Report</h3>
        <p><strong>Candidate Name:</strong> ${candidateName}</p>
        <p><strong>Interview Duration:</strong> ${Math.floor(interviewDuration / 60)} minutes ${interviewDuration % 60} seconds</p>
        <p><strong>Focus Lost Events:</strong> ${focusLostEvents}</p>
        <p><strong>Suspicious Events:</strong> ${suspiciousEvents}</p>
        <p><strong>Final Integrity Score:</strong> ${integrityScore}/100</p>
        <h4>Event Log</h4>
        <ul>
    `;
    
    events.forEach(event => {
        reportHTML += `<li>${event.timestamp} - ${event.message}</li>`;
    });
    
    reportHTML += '</ul>';
    reportDiv.innerHTML = reportHTML;
}

loadModels();

startBtn.addEventListener('click', startInterview);
stopBtn.addEventListener('click', stopInterview);
generateReportBtn.addEventListener('click', generateReport);