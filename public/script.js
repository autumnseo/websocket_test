const socket = io();

const loginScreen = document.getElementById('login-screen');
const chatScreen = document.getElementById('chat-screen');
const usernameInput = document.getElementById('username-input');
const joinBtn = document.getElementById('join-btn');
const chatBody = document.getElementById('chat-body');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const userDisplay = document.getElementById('user-display');
const emojiBtn = document.getElementById('emoji-btn');
const emojiPicker = document.getElementById('emoji-picker');
const emojis = document.querySelectorAll('.emoji-list span');

let myUsername = '';

// Join Room
joinBtn.addEventListener('click', joinRoom);
usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') joinRoom();
});

function joinRoom() {
    const username = usernameInput.value.trim();
    if (username) {
        myUsername = username;
        socket.emit('join', username);
        loginScreen.classList.add('hidden');
        chatScreen.classList.remove('hidden');
        userDisplay.textContent = `Logged in as: ${username}`;
        messageInput.focus();

        // Request notification permission
        if ('Notification' in window) {
            Notification.requestPermission();
        }
    }
}


// Send Message
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

function sendMessage() {
    const message = messageInput.value.trim();
    if (message) {
        socket.emit('chat-message', { message });
        messageInput.value = '';
    }
}

// Emoji Picker Logic
emojiBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    emojiPicker.classList.toggle('hidden');
});

// Close picker when clicking outside
document.addEventListener('click', (e) => {
    if (!emojiPicker.contains(e.target) && e.target !== emojiBtn) {
        emojiPicker.classList.add('hidden');
    }
});

// Emoji selection
emojis.forEach(emoji => {
    emoji.addEventListener('click', () => {
        messageInput.value += emoji.textContent;
        messageInput.focus();
        emojiPicker.classList.add('hidden');
    });
});

// Receive Message
socket.on('chat-message', (data) => {
    const isMe = data.username === myUsername;
    appendMessage(data, isMe);

    // Show notification if window is not focused
    if (!isMe && document.hidden && Notification.permission === 'granted') {
        new Notification(`새 메시지: ${data.username}`, {
            body: data.message,
            icon: 'https://upload.wikimedia.org/wikipedia/commons/e/e3/KakaoTalk_logo.svg' // Using Kakao icon for consistency
        });
    }
});


socket.on('chat-history', (history) => {
    history.forEach(data => {
        const isMe = data.username === myUsername;
        appendMessage(data, isMe);
    });
});

socket.on('message-deleted', (messageId) => {
    const messageElement = document.querySelector(`.message[data-id="${messageId}"]`);
    if (messageElement) {
        const textElement = messageElement.querySelector('.text');
        textElement.textContent = '(해당 메세지는 삭제되었습니다)';
        messageElement.classList.add('deleted');
    }
});

socket.on('error-msg', (msg) => {
    alert(msg);
});

socket.on('user-joined', (data) => {
    appendSystemMessage(`${data.username} warped into the room`);
});

socket.on('user-left', (data) => {
    appendSystemMessage(`${data.username} left the nebula`);
});

function appendMessage(data, isMe) {
    const div = document.createElement('div');
    div.classList.add('message');
    div.classList.add(isMe ? 'sent' : 'received');
    div.dataset.id = data.id;

    if (data.message === null) {
        div.classList.add('deleted');
    }

    const messageContent = data.message === null ? '(해당 메세지는 삭제되었습니다)' : data.message;

    div.innerHTML = `
        ${!isMe ? `<div class="sender">${data.username}</div>` : ''}
        <div class="text">${messageContent}</div>
        <div class="time">${data.timestamp}</div>
    `;

    // Long press logic
    let pressTimer;
    div.addEventListener('mousedown', (e) => {
        if (!isMe || data.message === null) return;
        pressTimer = window.setTimeout(() => {
            showDeleteOption(e, data.id);
        }, 600);
    });

    div.addEventListener('mouseup', () => {
        clearTimeout(pressTimer);
    });

    div.addEventListener('touchstart', (e) => {
        if (!isMe || data.message === null) return;
        pressTimer = window.setTimeout(() => {
            showDeleteOption(e.touches[0], data.id);
        }, 600);
    });

    div.addEventListener('touchend', () => {
        clearTimeout(pressTimer);
    });

    chatBody.appendChild(div);
    chatBody.scrollTop = chatBody.scrollHeight;
}

function showDeleteOption(e, messageId) {
    const existing = document.getElementById('delete-popup');
    if (existing) existing.remove();

    const popup = document.createElement('div');
    popup.id = 'delete-popup';
    popup.textContent = '삭제';
    popup.style.left = `${e.clientX}px`;
    popup.style.top = `${e.clientY}px`;

    popup.addEventListener('click', () => {
        socket.emit('delete-message', messageId);
        popup.remove();
    });

    document.body.appendChild(popup);

    // Close when clicking elsewhere
    setTimeout(() => {
        document.addEventListener('click', function closePopup() {
            popup.remove();
            document.removeEventListener('click', closePopup);
        }, { once: true });
    }, 10);
}

function appendSystemMessage(text) {
    const div = document.createElement('div');
    div.classList.add('system-msg');
    div.textContent = text;
    chatBody.appendChild(div);
    chatBody.scrollTop = chatBody.scrollHeight;
}

// Kakao-style Intro Popup
window.addEventListener('load', () => {
    setTimeout(() => {
        const popup = document.createElement('div');
        popup.id = 'intro-popup-overlay';
        popup.innerHTML = `
            <div class="intro-popup">
                <div class="intro-header">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/e/e3/KakaoTalk_logo.svg" alt="Kakao">
                    <span>New Update</span>
                </div>
                <div class="intro-body">
                    <h3>루비 챗을 좀 더<br>즐겁게 사용하는 방법 🎁</h3>
                    
                    <div class="feature-card">
                        <div class="card-icon">💬</div>
                        <div class="card-content">
                            <h4>메시지 지우기</h4>
                            <p>실수하셨나요? 내 메시지를 <strong>꾸욱~</strong> 누르면 5분 안에 삭제할 수 있어요.</p>
                        </div>
                    </div>

                    <div class="feature-card">
                        <div class="card-icon">🔔</div>
                        <div class="card-content">
                            <h4>실시간 알림 받기</h4>
                            <p>앱처럼 설치하면 친구의 메시지를 놓치지 않고 푸시로 받을 수 있어요!</p>
                        </div>
                    </div>

                    <div class="step-guide">
                        <div class="step-item">
                            <span class="step-badge">iOS</span>
                            <p>공유 버튼 > <strong>홈 화면에 추가</strong></p>
                        </div>
                        <div class="step-item">
                            <span class="step-badge">Android</span>
                            <p>메뉴(⋮) > <strong>홈 화면에 추가</strong></p>
                        </div>
                    </div>
                </div>
                <div class="intro-footer">
                    <button id="close-intro">시작하기</button>
                </div>
            </div>
        `;
        document.body.appendChild(popup);

        document.getElementById('close-intro').addEventListener('click', () => {
            popup.classList.add('fade-out');
            setTimeout(() => popup.remove(), 400);
        });
    }, 1000);
});


