// ⚠️ PASTE YOUR FIREBASE CONFIGURATION HERE ⚠️
const firebaseConfig = {
  apiKey: "AIzaSyBkKZHomt-1eKhATVLjkgOrjLGmw-EpwWI",
  authDomain: "advisor-meeting.firebaseapp.com",
  databaseURL: "https://advisor-meeting-default-rtdb.firebaseio.com",
  projectId: "advisor-meeting",
  storageBucket: "advisor-meeting.firebasestorage.app",
  messagingSenderId: "198832931796",
  appId: "1:198832931796:web:ae205e1eddf4a4c2764c41"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const queueRef = database.ref('queue');

// --- Get HTML Elements ---
const studentNameInput = document.getElementById('studentName');
const joinQueueBtn = document.getElementById('joinQueueBtn');
const callNextBtn = document.getElementById('callNextBtn');
const queueDisplay = document.getElementById('queue-display');
const advisorControls = document.querySelector('.advisor-controls');
const advisorStatus = document.getElementById('advisor-status');
const loader = document.getElementById('loader');

let isFirstLoad = true;

// --- Request Notification Permission on Load ---
document.addEventListener('DOMContentLoaded', () => {
    if (Notification.permission !== "granted") {
        Notification.requestPermission();
    }
});

// --- Advisor Password Protection ---
advisorControls.style.display = 'none';
const params = new URLSearchParams(window.location.search);
const isAdvisor = params.get('advisor') === 'true';

if (isAdvisor) {
    const password = prompt("Please enter the advisor password:");
    // ⚠️ CHANGE THIS PASSWORD ⚠️
    if (password === "eichenfield") {
        advisorControls.style.display = 'block';
    } else {
        alert("Incorrect password. Advisor controls are hidden.");
    }
}

// --- Event Listeners ---
joinQueueBtn.addEventListener('click', () => {
    const name = studentNameInput.value.trim();
    if (name) {
        // --- NEW: Button Feedback ---
        const btnText = joinQueueBtn.querySelector('.btn-text');
        const btnLoader = joinQueueBtn.querySelector('.btn-loader');
        
        btnText.style.display = 'none';
        btnLoader.style.display = 'inline-block';
        joinQueueBtn.disabled = true;

        sessionStorage.setItem('currentUserName', name);
        queueRef.push({
            name: name,
            status: 'waiting',
            timestamp: firebase.database.ServerValue.TIMESTAMP
        }).then(() => {
            studentNameInput.value = '';
            // Visual confirmation after joining
            joinQueueBtn.style.background = 'var(--success-color)';
            btnLoader.style.display = 'none';
            btnText.innerHTML = '<i class="fa-solid fa-check"></i> You are in the queue!';
            btnText.style.display = 'inline';
        });
    } else {
        alert('Please enter your name.');
    }
});

callNextBtn.addEventListener('click', () => {
    queueRef.orderByChild('status').equalTo('waiting').limitToFirst(1).once('value', snapshot => {
        if (snapshot.exists()) {
            const studentKey = Object.keys(snapshot.val())[0];
            database.ref(`queue/${studentKey}`).update({ status: 'called' });
        } else {
            alert('The queue is empty!');
        }
    });
});

// --- Main Real-time Update Function ---
queueRef.orderByChild('timestamp').on('value', (snapshot) => {
    if (isFirstLoad) {
        loader.style.display = 'none';
        isFirstLoad = false;
    }
    
    queueDisplay.innerHTML = '';
    const currentUserName = sessionStorage.getItem('currentUserName');
    let userPosition = 0;
    let positionFound = false;
    let waitingCount = 0;

    if (snapshot.exists()) {
        const queueData = snapshot.val();
        Object.keys(queueData).forEach(key => {
            const student = queueData[key];
            if (student.status === 'waiting') {
                waitingCount++;
                if (student.name === currentUserName && !positionFound) {
                    userPosition = waitingCount;
                    positionFound = true;
                }
            }
            if (student.name === currentUserName && student.status === 'called' && !document.hasFocus()) {
                showNotification('It\'s your turn!', 'The advisor is ready for you.');
                playNotificationSound();
            }

            const itemDiv = document.createElement('div');
            itemDiv.classList.add('queue-item');
            if (student.status === 'called') itemDiv.classList.add('active-call');

            itemDiv.innerHTML = `
                <div class="queue-item-info">
                    <span>${student.name}</span>
                    <span class="timestamp">Joined: ${formatTimestamp(student.timestamp)}</span>
                </div>
                <span class="status status-${student.status}">${student.status}</span>`;
            
            queueDisplay.appendChild(itemDiv);
        });
    } else {
        queueDisplay.innerHTML = '<p style="text-align: center; color: var(--text-light);">The queue is currently empty.</p>';
    }

    // --- Update Advisor Status and Page Title ---
    if (isAdvisor) {
        if (waitingCount > 0) {
            advisorStatus.textContent = `${waitingCount} student(s) are waiting.`;
            document.title = `(${waitingCount}) Waiting - Queue`;
        } else {
            advisorStatus.textContent = `The queue is empty.`;
            document.title = 'Meeting Queue';
        }
    } else { // It's a student
        if (userPosition > 0) {
            document.title = `(#${userPosition}) - Meeting Queue`;
        } else if (positionFound) {
            document.title = 'Your Turn! - Meeting Queue';
        } else {
            document.title = 'Meeting Queue';
        }
    }
});

// --- Helper Functions ---
function showNotification(title, body) {
    if (Notification.permission === "granted") {
        new Notification(title, { body: body });
    }
}
function playNotificationSound() {
    const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-correct-answer-tone-2870.mp3');
    audio.play();
}
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
