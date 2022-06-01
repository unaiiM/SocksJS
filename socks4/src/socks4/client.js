"use strict";
exports.__esModule = true;
exports.Client = void 0;
var net = require("net");
var events = require("events");
var index_1 = require("../utils/index");
var Client = (function () {
    function Client(options) {
        this.eventEmitter = new events.EventEmitter();
        this.proxy = {};
        this.destination = {
            version: "04"
        };
        this.bindOptions = {
            version: "04",
            command: "02"
        };
        this.utils = new index_1.Utils();
        var proxyOptions = options.proxy;
        this.proxy.host = proxyOptions.host;
        this.proxy.port = proxyOptions.port;
        var destinationOptions = options.destination;
        this.destination.connection = (!destinationOptions.connection) ? "01" : destinationOptions.connection;
        this.destination.port = {
            int: destinationOptions.port,
            hex: this.utils.intToHex([destinationOptions.port], 2)
        };
        this.destination.host = {
            int: destinationOptions.host,
            hex: this.utils.intToHex((destinationOptions.host.split(".")).map(function (item) { return Number(item); }), 4)
        };
        this.destination.id = (!destinationOptions.id) ? "01" : Buffer.from(destinationOptions.id).toString('hex');
        if (options.bind) {
            var bindOptions = options.bind;
            this.bindOptions.address = bindOptions.address;
            this.bindOptions.port = bindOptions.port;
            this.bindOptions.id = (!bindOptions.id) ? this.destination.id : bindOptions.id;
        }
        ;
    }
    ;
    Client.prototype.checkResponse = function (data) {
        var obj = {};
        switch (data[1]) {
            case 90:
                obj.status = "garanted";
                break;
            case 91:
                obj.status = "error";
                obj.error = "Rejected or failed";
                break;
            case 92:
                obj.status = "error";
                obj.error = "Client is not running identd";
                break;
            case 93:
                obj.status = "error";
                obj.error = "Client identd could not confirm the user identity string";
                break;
            default:
                obj.status = "error";
                obj.error = "Unexpected error ocurred.";
                break;
        }
        ;
        obj.port = Number.parseInt((data.slice(2, 4)).toString('hex'), 16);
        obj.host = (data.slice(4, 8).join("."));
        return obj;
    };
    ;
    Client.prototype.connect = function () {
        var target = this.destination;
        var proxy = this.proxy;
        var Socks4 = this;
        var req = target.version + target.connection + target.port.hex + target.host.hex + target.id + "00";
        var buff = Buffer.from(req, 'hex');
        var socket = net.createConnection({
            host: proxy.host,
            port: proxy.port
        }, function () {
            console.log("Sending buffer: ", buff);
            socket.write(buff);
        });
        socket.on("data", function dataHandler(data) {
            console.log(data);
            if (data[0] === 0) {
                console.log("Server response recived: ", data);
                console.log("Sucessfully connected to " + target.host.int + " on " + target.port.int);
                var info = Socks4.checkResponse(data);
                Socks4.eventEmitter.emit("connect", socket, info);
                socket.removeListener("data", dataHandler);
            }
            ;
        });
        socket.on("close", function () { return console.log("Connection command closed."); });
        return;
    };
    ;
    Client.prototype.bind = function () {
        var bindOptions = this.bindOptions;
        var proxyOptions = this.proxy;
        var rootClass = this;
        this.connect();
        this.eventEmitter.on("connect", function (connSocket, connInfo) {
            if (connInfo.error) {
                throw connInfo.error;
                connSocket.destory();
            }
            ;
            var bindSocket;
            var bindSocketInfo = {};
            var request = bindOptions.version + bindOptions.command + rootClass.utils.intToHex([bindOptions.port], 2) + rootClass.utils.intToHex((bindOptions.address.split(".")).map(function (item) { return Number(item); }), 4) + "00";
            connSocket.write(Buffer.from(request, 'hex'));
            connSocket.on("data", function dataHandler(data) {
                if (data[0] === 0) {
                    console.log("Bind response recived: ", data);
                    var bindInfo = rootClass.checkResponse(data);
                    if (bindInfo.error) {
                        console.log("Bind server send a error:");
                        if (bindInfo.host === bindOptions.address) {
                            console.log("Server bound process failed");
                            connSocket.destroy();
                        }
                        else if (bindInfo.host !== connInfo.host) {
                            console.log("Server target connection failed, trying another time.");
                            bindSocket.destroy();
                            bindSocket = undefined;
                            var host = bindSocketInfo.host;
                            var port = bindSocketInfo.port;
                            bindSocket = net.createConnection({
                                host: host,
                                port: port
                            });
                            rootClass.eventEmitter.emit("bound", bindInfo);
                        }
                        ;
                    }
                    else {
                        if (bindInfo.host === bindOptions.address) {
                            var host = (bindInfo.host === "0.0.0.0") ? proxyOptions.host : bindInfo.host;
                            var port = bindInfo.port;
                            bindSocketInfo.host = host;
                            bindSocketInfo.port = port;
                            bindSocket = net.createConnection({
                                host: host,
                                port: port
                            });
                            rootClass.eventEmitter.emit("bound", bindInfo);
                        }
                        else if (bindInfo.host === connInfo.host) {
                            rootClass.eventEmitter.emit("established", bindSocket, bindInfo);
                        }
                        ;
                    }
                    ;
                }
                ;
            });
        });
        return;
    };
    ;
    return Client;
}());
exports.Client = Client;
;
//# sourceMappingURL=client.js.map