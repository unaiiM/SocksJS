import Config, { ServerConfig, Socks4Config, Socks5Config, Socks4aConfig, LogConfig, Ruleset, RulesetList } from "./lib/config.js";
import methods, { Method, Methods } from "./lib/methods.js";
import Log from "./lib/log.js";
import * as net from "net";
import Socks4 from "./lib/socks4.js";
import Socks5 from "./lib/socks5.js";

class Server {

    private config : Config;
    private server : net.Server;
    private log : Log;
    private socks4 : Socks4;
    private socks5 : Socks5; 

    public constructor(config : ServerConfig){

        this.config = new Config(config);
        
        this.log = new Log(this.config.log.file);
        this.log.on("error", (err : Error) => {
            throw err;
        });

        this.socks4 = new Socks4(this.server, this.config.getConfig());
        this.socks4.on("error", (err : Error) => this.log.event("Socks4 Error", err.toString()));
        this.socks4.on("connected", () => this.log.event("Socks4 Msg", "Connected sucessfully!"));
        this.socks4.on("bound", () => this.log.event("Socks4 Msg", "Server bound sucessfully!"));

        this.socks5 = new Socks5(this.server, this.config.getConfig());
        this.socks4.on("error", (err : Error) => this.log.event("Socks5 Error", err.toString()));
        this.socks4.on("connected", () => this.log.event("Socks5 Msg", "Connected sucessfully!"));
        this.socks4.on("bound", () => this.log.event("Socks5 Msg", "Server bound sucessfully!"));

    };  

    public handleConnection(conn : net.Socket) : void {

        let address : net.SocketAddress = <net.SocketAddress> conn.address();

        this.log.event("Connection", "New connection from " + address.address + ":" + address.port);

        conn.once("data", (buff : Buffer) => {
            
            let version : number = buff[0];

            if(version === 0x04 && this.config.socks4.enabled) this.socks4.handleConnection(conn, buff);
            else if(version === 0x05 && this.config.socks5.enabled) this.socks5.handleAuth(conn, buff);
            else conn.destroy();
        
        });

        conn.on("end", () => {

            this.log.event("end", "Connection ended from " + address.port + ":" + address.port);

        });

        conn.on("error", (err : Error) => {

            this.log.event("Error", err.toString());

        });

        conn.on("close", () => {

            this.log.event("Closed", "Connection closed from " + address.address + ":" + address.port);

        });

    };

    public listen(port : number = 0, ip : string = "0.0.0.0", cb : () => void) : void {

        this.server = new net.Server();

        this.server.on("connection", (conn : net.Socket) => {
            this.handleConnection(conn);
        });

        this.server.on("error", (err : Error) => {

            this.log.event("Error", err.toString());            
            throw err;

        });

        this.server.on("close", () => {

            this.log.event("Closed", "Server closed!");

        });

        this.server.listen(port, ip, () => {

            this.log.event("Listen", "Server started on " + ip + ":" + port);
            cb();

        });

    };

};

process.on('uncaughtException', function (err : Error) {
  console.log('Caught exception: ', err);
});

export default Server;