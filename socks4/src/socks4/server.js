"use strict";
exports.__esModule = true;
exports.Server = void 0;
var net = require("net");
var index_1 = require("../utils/index");
var index_2 = require("../identd/index");
;
;
;
;
var Server = (function () {
    function Server(options) {
        this.server = {};
        this.utils = new index_1.Utils();
        var server = this.server;
        server.address = options.address;
        server.port = options.port;
        server.identd = (!options.identd) ? false : options.identd;
        return;
    }
    ;
    Server.prototype.listen = function () {
        var _this = this;
        var serverOptions = this.server;
        var ADDR = serverOptions.address;
        var PORT = serverOptions.port;
        var serverSocket = net.createServer(function (c) {
            var destSocket;
            var bindSocket;
            var bind = {};
            var target = {};
            c.on("data", function (data) {
                if (data[0] === 4) {
                    console.log("Client request recived: ", data);
                    var request = {};
                    request.version = _this.utils.intToHex([data[0]], 1);
                    request.command = _this.utils.intToHex([data[1]], 1);
                    request.port = data.slice(2, 4).toString('hex');
                    request.host = data.slice(4, 8).toString('hex');
                    request.id = data.slice(8, data.length).toString('hex');
                    request.id = Buffer.from(request.id.slice(0, request.id.indexOf("00")), 'hex').toString();
                    if (request.command === "02" && !destSocket === false) {
                        console.log("Bind commenad recived.");
                        bind.address = _this.utils.parseHexIp(request.host);
                        bind.port = Number.parseInt(request.port, 16);
                        bind.target = target;
                        bindSocket = _this.bind(bind, c);
                    }
                    else if (request.command === "01") {
                        target.host = _this.utils.parseHexIp(request.host);
                        target.port = Number.parseInt(request.port, 16);
                        target.id = request.id;
                        console.log("Connect command recived.");
                        destSocket = _this.connect(target, c);
                    }
                    ;
                }
                else if (!destSocket === false) {
                    var request = data;
                    destSocket.write(request);
                }
                ;
            });
            c.on("error", function () {
                console.log("Client connection error.");
                c.destroy();
            });
            c.on("close", function () {
                console.log("Client connection closed.");
                (!destSocket) ? undefined : destSocket.destroy();
                (!bindSocket) ? undefined : bind;
                c.destroy();
            });
        });
        serverSocket.listen(PORT, ADDR, function () {
            console.log("Server sucessfully running in address " + ADDR + " on port " + PORT);
        });
        return;
    };
    ;
    Server.prototype.bind = function (options, socket) {
        var _this = this;
        var clientConnection;
        var remoteConnection;
        var bindServer = net.createServer(function (c) {
            var info = c.address();
            if (info.address === options.target.host && !remoteConnection && !clientConnection === false) {
                console.log("Target connection obtained.");
                var response = _this.generateResponse("5a", info.address, info.port);
                socket.write(Buffer.from(response, 'hex'));
                remoteConnection = c;
                remoteConnection.on("data", function (data) { return clientConnection.write(data); });
                remoteConnection.on("error", function () {
                    console.log("Remote client error.");
                    clientConnection.destroy();
                    remoteConnection.destroy();
                });
                remoteConnection.on("close", function () {
                    console.log("Remote client closed.", !clientConnection);
                    (!clientConnection) ? undefined : clientConnection.destroy();
                    remoteConnection = undefined;
                });
            }
            else if (info.address !== options.target.host && !clientConnection === false && !remoteConnection) {
                console.log("Uknown target connected, colsing connections.", !clientConnection);
                var response = _this.generateResponse("5b", info.address, info.port);
                socket.write(Buffer.from(response, 'hex'));
                clientConnection.destroy();
                c.destroy();
            }
            else if (!clientConnection) {
                console.log("Client connection obtained.");
                clientConnection = c;
                clientConnection.on("data", function (data) { return remoteConnection.write(data); });
                clientConnection.on("error", function () {
                    console.log("Client connection error.");
                    clientConnection.destroy();
                });
                clientConnection.on("close", function () {
                    console.log("Client connection closed.");
                    (!remoteConnection) ? undefined : remoteConnection.destroy();
                    clientConnection = undefined;
                    remoteConnection = undefined;
                });
            }
            else {
                c.destroy();
            }
            ;
        });
        bindServer.on("error", function () {
            console.log("Error bouding socket to address " + options.address + " on " + options.port);
            bindServer.destory();
            var response = _this.generateResponse("5b", options.address, options.port);
            socket.write(Buffer.from(response, 'hex'));
        });
        bindServer.listen(options.port, options.address, function () {
            var info = bindServer.address();
            var address = info.address;
            var port = info.port;
            var response = _this.generateResponse("5a", address, port);
            socket.write(Buffer.from(response, 'hex'));
            console.log("Socket sucessfully bound to address " + address + " on " + port);
        });
        return bindServer;
    };
    ;
    Server.prototype.connect = function (target, socket) {
        var _this = this;
        var c = socket;
        var destinationSocket;
        var destinationSocketInfo;
        destinationSocket = net.createConnection({
            host: target.host,
            port: target.port
        });
        destinationSocket.on("connect", function () {
            console.log("Server sucessfully created a connection to " + target.host + " on " + target.port);
            destinationSocketInfo = destinationSocket.address();
            if (_this.server.identd === true) {
                var identdOptions = {
                    host: target.host,
                    port: 113,
                    lport: target.port,
                    rport: destinationSocketInfo.port
                };
                var identd = new index_2.IdentdClient(identdOptions).connect(function (info) {
                    if (info.error) {
                        console.log("[Identd] Error " + info.error);
                        var response = _this.generateResponse("5c", target.host, target.port);
                        socket.write(Buffer.from(response, 'hex'));
                    }
                    else {
                        if (info.userid === target.id) {
                            var response = _this.generateResponse("5a", target.host, target.port);
                            socket.write(Buffer.from(response, 'hex'));
                        }
                        else {
                            var response = _this.generateResponse("5d", target.host, target.port);
                            socket.write(Buffer.from(response, 'hex'));
                            socket.destroy();
                            destinationSocket.destroy();
                        }
                        ;
                    }
                    ;
                });
            }
            else {
                var response = _this.generateResponse("5a", target.host, target.port);
                c.write(Buffer.from(response, 'hex'));
            }
            ;
        });
        destinationSocket.on("error", function () {
            console.log("Server error, creating a connection to " + target.host + " on " + target.port);
            var response = _this.generateResponse("5b", target.host, target.port);
            c.write(Buffer.from(response, 'hex'));
            destinationSocket.destroy();
        });
        destinationSocket.on("data", function (data) { return c.write(data); });
        destinationSocket.on("close", function () {
            console.log("Connection to " + target.host + " on " + target.port + " closed.");
            destinationSocket.destroy();
            c.destroy();
        });
        return destinationSocket;
    };
    ;
    Server.prototype.generateResponse = function (status, ip, port) {
        var strHex = "";
        strHex += "00";
        switch (status) {
            case "5a":
                strHex += "5a";
                break;
            case "5b":
                strHex += "5b";
                break;
            case "5c":
                strHex += "5c";
                break;
            case "5d":
                strHex += "5d";
                break;
            default:
                strHex += "5b";
                break;
        }
        var hexPort = this.utils.intToHex([port], 2);
        strHex += hexPort;
        var hexIp = this.utils.intToHex((ip.split(".")).map(function (item) { return Number(item); }), 4);
        strHex += hexIp;
        return strHex;
    };
    ;
    return Server;
}());
exports.Server = Server;
;
//# sourceMappingURL=server.js.map