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

    div.innerHTML = `
        ${!isMe ? `<div class="sender">${data.username}</div>` : ''}
        <div class="text">${data.message}</div>
        <div class="time">${data.timestamp}</div>
    `;

    chatBody.appendChild(div);
    chatBody.scrollTop = chatBody.scrollHeight;
}

function appendSystemMessage(text) {
    const div = document.createElement('div');
    div.classList.add('system-msg');
    div.textContent = text;
    chatBody.appendChild(div);
    chatBody.scrollTop = chatBody.scrollHeight;
}
