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
const messaging = firebase.messaging();
const queueRef = database.ref('queue');

// --- Get HTML Elements ---
const studentNameInput = document.getElementById('studentName');
const joinQueueBtn = document.getElementById('joinQueueBtn');
const callNextBtn = document.getElementById('callNextBtn');
const queueDisplay = document.getElementById('queue-display');
const advisorControls = document.querySelector('.advisor-controls');
const advisorStatus = document.getElementById('advisor-status');
const loader = document.getElementById('loader');

let isAdvisor = false;
let currentlyCalledKey = null; // Track the student who is currently called

// --- Notification Setup ---
function setupNotifications() {
    messaging.requestPermission().then(() => {
        console.log('Notification permission granted.');
        return messaging.getToken({ vapidKey: '⚠️ PASTE YOUR VAPID KEY FROM FIREBASE HERE ⚠️' });
    }).then(token => {
        console.log('FCM Token:', token);
        // Here you would typically save the token to the database against the user's name
        // For simplicity, we'll rely on the frontend to trigger notifications for now.
    }).catch((err) => {
        console.log('Unable to get permission to notify.', err);
    });
}

// --- Advisor Password Protection & Initial Setup ---
document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('advisor') === 'true') {
        const password = prompt("Please enter the advisor password:");
        if (password === "eichenfield") { // ⚠️ CHANGE THIS PASSWORD ⚠️
            isAdvisor = true;
            advisorControls.style.display = 'block';
        } else {
            alert("Incorrect password.");
        }
    }
});

// --- Event Listeners ---
joinQueueBtn.addEventListener('click', () => {
    const name = studentNameInput.value.trim();
    if (name) {
        setupNotifications(); // Ask for notification permission when joining
        sessionStorage.setItem('currentUserName', name);
        queueRef.push({
            name: name,
            status: 'waiting',
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
        studentNameInput.value = '';
    } else {
        alert('Please enter your name.');
    }
});

callNextBtn.addEventListener('click', () => {
    // 1. Atomically remove the previously called student (if any)
    if (currentlyCalledKey) {
        queueRef.child(currentlyCalledKey).remove();
    }
    
    // 2. Call the next student in the queue
    queueRef.orderByChild('status').equalTo('waiting').limitToFirst(1).once('value', snapshot => {
        if (snapshot.exists()) {
            const studentKey = Object.keys(snapshot.val())[0];
            database.ref(`queue/${studentKey}`).update({ status: 'called' });
        } else {
            // This case is hit if we just cleared the last person.
            currentlyCalledKey = null; 
        }
    });
});

// --- Real-time Update Function ---
queueRef.orderByChild('timestamp').on('value', (snapshot) => {
    loader.style.display = 'none';
    queueDisplay.innerHTML = '';
    const currentUserName = sessionStorage.getItem('currentUserName');
    let waitingCount = 0;
    currentlyCalledKey = null; // Reset on each update

    if (snapshot.exists()) {
        snapshot.forEach(childSnapshot => {
            const key = childSnapshot.key;
            const student = childSnapshot.val();

            if (student.status === 'waiting') {
                waitingCount++;
            } else if (student.status === 'called') {
                currentlyCalledKey = key; // Found the student being called
                // Check if this is the user who needs a notification
                if (student.name === currentUserName) {
                    // Send a personalized notification
                    new Notification("It's your turn!", { body: `Hi ${student.name}, the advisor is ready for you.` });
                }
            }
            
            // Render the student item in the queue
            const itemDiv = document.createElement('div');
            itemDiv.classList.add('queue-item');
            
            let removeBtnHTML = isAdvisor ? `<button class="remove-btn" data-key="${key}"><i class="fa-solid fa-xmark"></i></button>` : '';

            itemDiv.innerHTML = `
                <div class="queue-item-info">
                    <span>${student.name}</span>
                    <span class="timer">Joined at: ${new Date(student.timestamp).toLocaleTimeString()}</span>
                </div>
                <div style="display: flex; align-items: center;">
                    <span class="status status-${student.status}">${student.status}</span>
                    ${removeBtnHTML}
                </div>`;
            queueDisplay.appendChild(itemDiv);
        });
    }

    if(isAdvisor) {
        advisorStatus.textContent = waitingCount > 0 ? `${waitingCount} student(s) waiting.` : 'The queue is empty.';
        callNextBtn.disabled = (waitingCount === 0 && currentlyCalledKey === null);
    }
});

// --- Event Delegation for Manual Remove Buttons ---
queueDisplay.addEventListener('click', e => {
    const removeBtn = e.target.closest('.remove-btn');
    if (isAdvisor && removeBtn) {
        const key = removeBtn.dataset.key;
        queueRef.child(key).remove();
    }
});
