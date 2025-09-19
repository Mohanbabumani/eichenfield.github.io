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
const studentEmailInput = document.getElementById('studentEmail');
const joinQueueBtn = document.getElementById('joinQueueBtn');
const callNextBtn = document.getElementById('callNextBtn');
const queueDisplay = document.getElementById('queue-display');
const advisorControls = document.querySelector('.advisor-controls');

// --- NEW: Request Notification Permission on Load ---
document.addEventListener('DOMContentLoaded', () => {
    if (Notification.permission !== "granted") {
        Notification.requestPermission();
    }
});

// --- Advisor Password Protection ---
advisorControls.style.display = 'none';
const params = new URLSearchParams(window.location.search);
if (params.get('advisor') === 'true') {
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
    const email = studentEmailInput.value.trim();
    if (name && email) {
        // NEW: Save user's name to sessionStorage to identify them later
        sessionStorage.setItem('currentUserName', name);

        queueRef.push({
            name: name,
            email: email,
            status: 'waiting',
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
        studentNameInput.value = '';
        studentEmailInput.value = '';
        joinQueueBtn.disabled = true; // Prevent double clicks
        joinQueueBtn.textContent = 'You are in the queue!';
    } else {
        alert('Please enter both your name and email.');
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
    queueDisplay.innerHTML = '';
    const currentUserName = sessionStorage.getItem('currentUserName');
    let userPosition = 0;
    let positionFound = false;
    let waitingCount = 0;

    if (snapshot.exists()) {
        const queueData = snapshot.val();
        
        Object.keys(queueData).forEach(key => {
            const student = queueData[key];
            
            // Logic to find user's position
            if (student.status === 'waiting') {
                waitingCount++;
                if (student.name === currentUserName && !positionFound) {
                    userPosition = waitingCount;
                    positionFound = true;
                }
            }
            
            // --- NEW: Check if the current user is being called ---
            if (student.name === currentUserName && student.status === 'called' && !document.hasFocus()) {
                showNotification('It\'s your turn!', 'The advisor is ready for you. Please join the Zoom meeting.');
                playNotificationSound();
            }

            // Create and display the queue item
            const itemDiv = document.createElement('div');
            itemDiv.classList.add('queue-item');
            if (student.status === 'called') {
                itemDiv.classList.add('active-call');
            }
            itemDiv.innerHTML = `<span>${student.name}</span><span class="status status-${student.status}">${student.status}</span>`;
            queueDisplay.appendChild(itemDiv);
        });
    } else {
        queueDisplay.innerHTML = '<p>The queue is currently empty.</p>';
    }

    // --- NEW: Update Page Title ---
    if (userPosition > 0) {
        document.title = `(#${userPosition}) - Meeting Queue`;
    } else if (positionFound) { // User is next or being called
        document.title = 'Your Turn! - Meeting Queue';
    } else {
        document.title = 'Meeting Queue';
    }
});

// --- NEW: Helper Functions for Interactivity ---

// Function to show a browser notification
function showNotification(title, body) {
    if (Notification.permission === "granted") {
        new Notification(title, { body: body });
    }
}

// Function to play a sound
function playNotificationSound() {
    const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-correct-answer-tone-2870.mp3');
    audio.play();
}
