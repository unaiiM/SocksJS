"use strict";
exports.__esModule = true;
exports.IdentdClient = void 0;
var net = require("net");
;
;
;
var IdentdClient = (function () {
    function IdentdClient(options) {
        this.destination = {};
        var target = this.destination;
        target.host = options.host;
        target.port = (!options.port) ? 113 : options.port;
        target.lport = (!options.lport) ? 0 : options.lport;
        target.rport = options.rport;
    }
    ;
    IdentdClient.prototype.connect = function (callback) {
        var target = this.destination;
        var info = {};
        var socket = net.createConnection({
            host: target.host,
            port: target.port
        });
        socket.on("connect", function () {
            console.log("[Identd] Sucessfully connected to " + target.host + " on " + target.port);
            var request = target.lport + "," + target.rport + "\n";
            socket.write(Buffer.from(request));
        });
        socket.on("data", function (data) {
            var arr = (data.toString()).split(":");
            info.lport = Number(arr[0].split(",")[0]);
            info.rport = Number(arr[0].split(",")[1]);
            switch (arr[1]) {
                case "USERID":
                    info.so = arr[2];
                    info.userid = arr[3];
                    info.userid = info.userid.slice(0, info.userid.length - 2);
                    break;
                case "ERROR":
                    info.error = arr[2];
                    break;
                default:
                    info.error = "Some unexpected error.";
                    break;
            }
            ;
            callback(info);
        });
        socket.on("error", function (err) {
            info.error = "Target don't have identd service up.";
            callback(info);
            socket.destroy();
        });
        socket.on("close", function () {
            console.log("[Identd] Client disconnected.");
            socket.destroy();
        });
    };
    ;
    return IdentdClient;
}());
exports.IdentdClient = IdentdClient;
;
//# sourceMappingURL=index.js.map