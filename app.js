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

// --- Initialize Firebase ---
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const queueRef = database.ref('queue');

// --- Get HTML Elements ---
const studentNameInput = document.getElementById('studentName');
const joinQueueBtn = document.getElementById('joinQueueBtn');
const callNextBtn = document.getElementById('callNextBtn');
const clearFinishedBtn = document.getElementById('clearFinishedBtn');
const queueDisplay = document.getElementById('queue-display');
const advisorControls = document.querySelector('.advisor-controls');
const advisorStatus = document.getElementById('advisor-status');
const loader = document.getElementById('loader');

let isAdvisor = false;
let previousQueueState = {}; // Used to detect changes for notifications

// --- Advisor Password & Initial Setup ---
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('advisor') === 'true') {
        const password = prompt("Please enter the advisor password:");
        if (password === "eichenfield") { // ⚠️ CHANGE THIS PASSWORD ⚠️
            isAdvisor = true;
            advisorControls.style.display = 'block'; // Show the controls
        } else {
            alert("Incorrect password.");
        }
    }
});

// --- Event Listeners ---
joinQueueBtn.addEventListener('click', () => {
    const name = studentNameInput.value.trim();
    if (name) {
        if (Notification.permission !== "granted") {
            Notification.requestPermission();
        }
        sessionStorage.setItem('currentUserName', name);
        // Push data to Firebase with error handling
        queueRef.push({
            name: name,
            status: 'waiting',
            timestamp: firebase.database.ServerValue.TIMESTAMP
        }).then(() => {
            studentNameInput.value = ''; // Clear input on success
        }).catch(error => {
            console.error("Firebase write error: ", error);
            alert("Error: Could not join the queue. The database may be locked or misconfigured. Please contact the administrator.");
        });
    } else {
        alert('Please enter your name.');
    }
});

callNextBtn.addEventListener('click', () => {
    queueRef.orderByChild('status').equalTo('waiting').limitToFirst(1).once('value', snapshot => {
        if (snapshot.exists()) {
            const studentKey = Object.keys(snapshot.val())[0];
            queueRef.child(studentKey).update({ status: 'called' })
                .catch(error => console.error("Error calling next student: ", error));
        } else {
            alert('There are no students waiting to be called.');
        }
    });
});

clearFinishedBtn.addEventListener('click', () => {
    queueRef.orderByChild('status').equalTo('called').once('value', snapshot => {
        if (snapshot.exists()) {
            const updates = {};
            snapshot.forEach(childSnapshot => {
                updates[childSnapshot.key] = null; // Mark for deletion
            });
            queueRef.update(updates)
                .catch(error => console.error("Error clearing finished students: ", error));
        } else {
            alert('There are no finished students to clear.');
        }
    });
});

// --- Main Real-time Update Function ---
queueRef.orderByChild('timestamp').on('value', snapshot => {
    loader.style.display = 'none';
    queueDisplay.innerHTML = '';
    const currentUserName = sessionStorage.getItem('currentUserName');
    let waitingCount = 0;
    let calledCount = 0;
    const currentQueueState = snapshot.val() || {};

    snapshot.forEach(childSnapshot => {
        const key = childSnapshot.key;
        const student = childSnapshot.val();

        if (student.status === 'waiting') waitingCount++;
        if (student.status === 'called') calledCount++;

        const previousStudentState = previousQueueState[key];
        // Send notification only when status changes to 'called'
        if (currentUserName === student.name && student.status === 'called' && (!previousStudentState || previousStudentState.status !== 'called')) {
            new Notification("It's your turn!", { body: `Hi ${student.name}, the advisor is ready for you.` });
        }
        
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('queue-item');
        itemDiv.setAttribute('data-timestamp', student.timestamp);
        
        itemDiv.innerHTML = `
            <div class="queue-item-info">
                <span>${student.name}</span>
                <span class="timer">Waiting for: 0s</span>
            </div>
            <span class="status status-${student.status}">${student.status}</span>`;
        queueDisplay.appendChild(itemDiv);
    });

    if(isAdvisor) {
        advisorStatus.textContent = waitingCount > 0 ? `${waitingCount} student(s) waiting.` : 'The queue is empty.';
        callNextBtn.disabled = waitingCount === 0;
        clearFinishedBtn.disabled = calledCount === 0;
    }
    previousQueueState = currentQueueState; // Update state for the next comparison
});

// --- Live Timers Update ---
setInterval(() => {
    document.querySelectorAll('.queue-item').forEach(item => {
        const timestamp = parseInt(item.dataset.timestamp);
        if (isNaN(timestamp)) return; // Prevents error before timestamp is loaded
        const waitingTime = Math.floor((Date.now() - timestamp) / 1000);
        const minutes = Math.floor(waitingTime / 60);
        const seconds = waitingTime % 60;
        item.querySelector('.timer').textContent = `Waiting for: ${minutes}m ${seconds}s`;
    });
}, 1000);
