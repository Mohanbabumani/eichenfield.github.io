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

const studentNameInput = document.getElementById('studentName');
const studentEmailInput = document.getElementById('studentEmail');
const joinQueueBtn = document.getElementById('joinQueueBtn');
const callNextBtn = document.getElementById('callNextBtn');
const queueDisplay = document.getElementById('queue-display');
const advisorControls = document.querySelector('.advisor-controls');

advisorControls.style.display = 'none';
const params = new URLSearchParams(window.location.search);
if (params.get('advisor') === 'true') {
    const password = prompt("Please enter the advisor password:");
    // ⚠️ CHANGE THIS PASSWORD ⚠️
    if (password === "12345") {
        advisorControls.style.display = 'block';
    } else {
        alert("Incorrect password. Advisor controls are hidden.");
    }
}

joinQueueBtn.addEventListener('click', () => {
    const name = studentNameInput.value.trim();
    const email = studentEmailInput.value.trim();
    if (name && email) {
        queueRef.push({
            name: name,
            email: email,
            status: 'waiting',
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
        studentNameInput.value = '';
        studentEmailInput.value = '';
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

queueRef.orderByChild('timestamp').on('value', (snapshot) => {
    queueDisplay.innerHTML = '';
    if (snapshot.exists()) {
        const queueData = snapshot.val();
        Object.keys(queueData).forEach(key => {
            const student = queueData[key];
            const itemDiv = document.createElement('div');
            itemDiv.classList.add('queue-item');
            const nameSpan = document.createElement('span');
            nameSpan.textContent = student.name;
            const statusSpan = document.createElement('span');
            statusSpan.textContent = student.status;
            statusSpan.classList.add('status', `status-${student.status}`);
            itemDiv.appendChild(nameSpan);
            itemDiv.appendChild(statusSpan);
            queueDisplay.appendChild(itemDiv);
        });
    } else {
        queueDisplay.innerHTML = '<p>The queue is currently empty.</p>';
    }
});
