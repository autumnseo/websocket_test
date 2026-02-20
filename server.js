const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Database setup
const db = new sqlite3.Database(path.join(__dirname, 'chat.db'));
db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, message TEXT, timestamp TEXT)");
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

        // Send chat history to the new user
        db.all("SELECT id, username, message, timestamp FROM (SELECT * FROM messages ORDER BY id DESC LIMIT 50) ORDER BY id ASC", (err, rows) => {
            if (err) {
                console.error("Error fetching history:", err);
                return;
            }
            const history = rows.map(row => ({
                id: row.id,
                username: row.username,
                message: row.message,
                timestamp: new Date(row.timestamp).toLocaleTimeString()
            }));
            socket.emit('chat-history', history);
        });

    });

    socket.on('chat-message', (data) => {
        const username = users.get(socket.id) || 'Anonymous';
        const timestamp = new Date().toLocaleTimeString();
        const fullTimestamp = new Date().toISOString(); // Precision for deletion check

        // Save message to database
        db.run("INSERT INTO messages (username, message, timestamp) VALUES (?, ?, ?)",
            [username, data.message, fullTimestamp],
            function (err) {
                if (err) {
                    console.error("Error saving message:", err);
                    return;
                }

                const messageData = {
                    id: this.lastID,
                    username,
                    message: data.message,
                    timestamp: new Date(fullTimestamp).toLocaleTimeString(),
                    id_socket: socket.id
                };
                io.emit('chat-message', messageData);
            }
        );
    });

    socket.on('delete-message', (messageId) => {
        const username = users.get(socket.id);
        if (!username) return;

        db.get("SELECT username, timestamp FROM messages WHERE id = ?", [messageId], (err, row) => {
            if (err || !row) return;

            // Check ownership
            if (row.username !== username) {
                socket.emit('error-msg', '본인이 작성한 메시지만 삭제할 수 있습니다.');
                return;
            }

            // Check 5-minute limit
            const messageTime = new Date(row.timestamp).getTime();
            const now = new Date().getTime();
            const fiveMinutes = 5 * 60 * 1000;

            if (now - messageTime > fiveMinutes) {
                socket.emit('error-msg', '5분 이내의 메시지만 삭제할 수 있습니다.');
                return;
            }

            // Mark as deleted in DB (keep the record but change content)
            db.run("UPDATE messages SET message = NULL WHERE id = ?", [messageId], (err) => {
                if (err) return;
                io.emit('message-deleted', messageId);
            });
        });
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

