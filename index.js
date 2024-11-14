const http = require('http');
const WebSocket = require("ws");
const express = require('express');

const app = express();

app.get("/", (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.listen(9091, () => {
    console.log("HTTP server running on port 9091");
});

const clients = {};
const games = {};
const state = {};

function S3() {
    return Math.floor(Math.random() * 100000000).toString();
}

function UniqueId() {
    return S3() + S3() + "_" + S3();
}

function updateState() {
    const payload = {
        "method": "update",
        "state": state
    };
    Object.values(clients).forEach(client => {
        client.connection.send(JSON.stringify(payload));
    });

    setTimeout(updateState, 100);
}

const server = http.createServer(app);
server.listen(9090, () => {
    console.log("WebSocket server listening on port 9090");
});

updateState();

const wsServer = new WebSocket.Server({ server });

wsServer.on("connection", (connection) => {
    console.log("New WebSocket connection established");

    const newId = UniqueId();
    clients[newId] = { "connection": connection };

    const payload = {
        method: "connect",
        clientId: newId
    };
    connection.send(JSON.stringify(payload));

    connection.on("message", (message) => {
        const result = JSON.parse(message);

        if (result.method === "create") {
            const gameId = UniqueId();
            games[gameId] = {
                "gameId": gameId,
                "balls": 20,
                "clients": []
            };

            const payload = {
                "method": "create",
                "game": games[gameId]
            };
            clients[result.clientId].connection.send(JSON.stringify(payload));
        }

        if (result.method === "join") {
            const gameId = result.gameId;
            const clientId = result.clientId;

            let color;
            const colors = ["red", "green", "blue"];
            color = colors[games[gameId].clients.length % 3];

            games[gameId].clients.push({ clientId, color });

            const payload = {
                "method": "join",
                "game": games[gameId],
                "color": color
            };
            clients[clientId].connection.send(JSON.stringify(payload));
        }

        if (result.method === "play") {
            state[result.btnId] = result.color;
        }
    });
});
