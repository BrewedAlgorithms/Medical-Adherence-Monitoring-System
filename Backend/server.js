console.log('\x1bc');
require('dotenv').config();
const moment = require('moment-timezone');
moment.tz.setDefault('Asia/Kolkata');
const { broadcastMessage, registerMessageHandler } = require('./socket.js');

const express = require("express");
const mysql = require("mysql2");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const connection = require("./db.js");
const http = require('http');
const socketFeatures = require('./socket');
require('./cronJobs/medicineIntakeNotifier.js');
require('./cronJobs/quoteRefresher.js');

const app = express();
const port = 3001;

// Create HTTP server instance from Express app
const server = http.createServer(app);

// Initialize WebSocket server using our socketFeatures module
const wss = socketFeatures.initializeWebSocketServer(server);

// Make broadcastMessage available globally if needed
global.broadcastMessage = socketFeatures.broadcastMessage;

app.use(morgan("dev"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static("public"));
app.use(express.json());

// images are in uploads folder
// serve images
app.use('/uploads', express.static('uploads'));

app.use('/auth', require('./routes/authRoutes'));
app.use('/course', require('./routes/courseRoutes'));
app.use('/general', require('./routes/generalRoutes'));
app.use('/media', require('./routes/mediaRoutes'));
app.use('/special', require('./routes/specialRoutes'));
app.use('/user-feature', require('./routes/userFeaturesRoutes'));

app.post('/broadcast', (req, res) => {
    const { message } = req.body;
    broadcastMessage(message);
    res.send({ message: 'Broadcasted message' });
});

app.get('/', (req, res) => {
    res.send({ message: 'Welcome to the healthmobi!' });
});
//error handling middleware
app.use((req, res, next) => {
    res.status(404).send({ error: 'Not Found' });
});
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send({ error: 'Something went wrong!' });
});

// Start server on the specified port
server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    console.log(`WebSocket server is running on ws://localhost:${port}`);
});
