"use strict";
exports.__esModule = true;
var server_1 = require("../socks4/server");
var options = {
    address: "127.0.0.1",
    port: 1080,
    identd: true
};
var server = new server_1.Server(options);
server.listen();
//# sourceMappingURL=socks4Server.js.map