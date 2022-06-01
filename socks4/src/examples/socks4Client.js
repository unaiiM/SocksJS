"use strict";
exports.__esModule = true;
var client_1 = require("../socks4/client");
var options = {
    proxy: {
        host: "127.0.0.1",
        port: 1080
    },
    destination: {
        host: "127.0.0.1",
        port: 8080,
        id: "unai"
    },
    bind: {
        address: "0.0.0.0",
        port: 0
    }
};
var client = new client_1.Client(options);
var connSocket;
client.eventEmitter.on("connect", function (socket, info) {
    if (info.error)
        throw info.error;
    connSocket = socket;
});
client.eventEmitter.on("bound", function (info) {
    if (info.error)
        throw info.error;
    connSocket.write("Connect to " + options.destination.host + " on port " + info.port);
});
client.eventEmitter.on("established", function (socket, info) {
    if (info.error)
        throw info.error;
    socket.write("Hello, from the binded server.");
    socket.on("data", function (data) { return console.log(data.toString()); });
});
client.bind();
//# sourceMappingURL=socks4Client.js.map