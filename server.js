const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(express.static(path.join(__dirname, 'public')));

// Store active users
const users = new Map();

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('join', (username) => {
        users.set(socket.id, username);
        socket.broadcast.emit('user-joined', {
            username,
            id: socket.id,
            timestamp: new Date().toLocaleTimeString()
        });
        
        // Send current user list to the new user
        socket.emit('user-list', Array.from(users.values()));
    });

    socket.on('chat-message', (data) => {
        const username = users.get(socket.id) || 'Anonymous';
        const messageData = {
            username,
            message: data.message,
            timestamp: new Date().toLocaleTimeString(),
            id: socket.id
        };
        io.emit('chat-message', messageData);
    });

    socket.on('disconnect', () => {
        const username = users.get(socket.id);
        if (username) {
            socket.broadcast.emit('user-left', {
                username,
                timestamp: new Date().toLocaleTimeString()
            });
            users.delete(socket.id);
        }
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
});
