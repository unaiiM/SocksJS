import * as net from "net";
import * as dns from "dns";
import { EventEmitter } from "events";
import { 
    Socks4Options, 
    Socks4aOptions, 
    Ruleset 
} from "./types.js";
import Utils, { Target as RulesetTarget } from "./utils.js";
import Identd, { Config as IdentdConfig, Response as IdentdResponse } from "./identd.js";

type ResponseStatus = 0x5a | 0x5b | 0x5c | 0x5d;

interface Target {
    address : string;
    port : number;
}

interface Request {
    version : number;
    command : number;
    port : number;
    address : string;
    identd : string;
    domain? : string;
}


class Socks4 extends EventEmitter {

    private server : net.Server;
    private options : {
        socks4 : Socks4Options;
        socks4a : Socks4aOptions;
    };
    private ruleset : Ruleset;

    constructor(server : net.Server, options4 : Socks4Options, options4a : Socks4aOptions, ruleset : Ruleset){
        super();
        this.server = server;
        this.options = {
            socks4 : options4,
            socks4a : options4a,
        };
        this.ruleset = ruleset;
    };

    public async handleConnection(conn : net.Socket, buff : Buffer) : Promise<void> {

        let request : Request = this.digestRequest(buff);
        let valid : boolean = this.isValidRequest(request); 

        if(valid){

            let target : Target = {
                address : request.address,
                port : request.port
            };

            let isDomainRequired : boolean = this.isDomainRequired(request.address);

            if(isDomainRequired && !this.options.socks4a.enabled){

                conn.write(this.generateResponse(0x5b, target));
                conn.destroy();
                return;

            }else if(isDomainRequired){

                let address : undefined | string = await new Promise((resolv, reject) => {
                   
                    dns.resolve4(request.domain, (err : Error, addresses : string[]) => {

                        if(err) {
                            this.emit("error", err);
                            resolv(undefined);
                        } else resolv(addresses[0])

                    });
                        
                });

                if(!address){

                    conn.write(this.generateResponse(0x5b, target));
                    conn.destroy();
                    return;
                
                }else { 
                
                    request.address = address; 
                    target.address = address;
                
                };

            };

            if(this.options.socks4.identd){
                
                let serverAddress : net.AddressInfo = <net.AddressInfo> this.server.address();

                let config : IdentdConfig = {
                    address : target.address,
                    lport : serverAddress.port,
                    rport : conn.remotePort
                };

                let identd : Identd = new Identd(config);
                let user : string = await new Promise((resolv, reject) => {
                    
                    identd.getUser((err : Error | undefined, info : IdentdResponse | undefined) => {

                        if(err){
                            
                            conn.write(this.generateResponse(0x5c, target));
                            conn.destroy();

                        }else {

                            resolv(info.user);

                        };

                    });

                });

                if(!this.isValidUser(user)){

                    this.emit("error", new Error("Invalid identd user for " + user + "!"));

                    conn.write(this.generateResponse(0x5d, target));
                    conn.destroy();                            

                };

            };

            valid = this.utils.checkRuleset(<net.AddressInfo> conn.address(), <RulesetTarget> target, this.ruleset);
            console.log(valid, conn.address(), target);

            if(!valid){
    
                conn.write(this.generateResponse(0x5b, target));
                conn.destroy();
                return;
    
            }else this.execCommand(request, conn);

        }else {

            this.emit("error", new Error("Invalid request " + JSON.stringify(request)));
            conn.destroy();
        
        };

    };

    public digestRequest(buff : Buffer) : Request {

        //const MIN_LEN = 8;
        let index : number;
        let digest : Request = {
            version : Number(buff[0]),
            command : Number(buff[1]),
            port : parseInt(buff[2].toString(16) + buff[3].toString(16), 16),
            address : (buff.slice(4, 8)).join("."),
            identd : (buff.slice(8, index = buff.slice(8, buff.length).indexOf(0))).toString(),
            domain : (buff.slice(++index), buff.slice(index, buff.slice(index, buff.length).indexOf(0))).toString()
        };

        return digest;

    };

    private isValidVersion(version : number) : boolean {

        return (version === 0x04) ? true : false;

    }

    private isValidCommand(command : number) : boolean {

        return ((command === 0x01 && this.options.socks4.connect) || (command === 0x02 && this.options.socks4.bind)) ? true : false;

    }

    private isValidRequest(request : Request) : boolean {

        if(!this.isValidVersion(request.version)) return false;
        else if(!this.isValidCommand(request.command)) return false;
        else if(!this.utils.isValidPort(request.port)) return false;
        else if(!this.utils.isValidIpv4(request.address)) return false;
        else return true;

    };

    private isDomainRequired(ip : string) : boolean {

        let nIp : number[] = (ip.split(".")).map((n) => Number(ip));

        return (nIp[0] === 0x00 && nIp[1] === 0x00 && nIp[2] === 0x00 && nIp[3] !== 0x00) ? true : false;

    };

    private generateResponse(status : ResponseStatus, target : Target) : Buffer {

        return Buffer.from([0x00, status].concat(Array.from(Buffer.from(this.utils.toFixedHexLen(target.port.toString(16), 4), "hex")), target.address.split(".").map(n => Number(n))));    
    
       // return Buffer.concat("00" + status.toString(16) + this.utils.toFixedHexLen(target.port.toString(16), 4) + this.utils.ipv4ToHex(target.ip), "hex");

    };

    private isValidUser(user : string) : boolean {

        return (this.options.socks4.users.indexOf(user) === -1) ? false : true;

    };

    private execCommand(request : Request, conn : net.Socket) : void {

        //console.log(request.command);

        let target : Target = {
            address : request.address,
            port : request.port
        };

        switch (request.command){

            case 0x01:

                this.connect(target, conn);
                break;

            case 0x02:
                
                this.bind(target, conn);
                break;

        };

    };

    private connect(dest : Target, conn : net.Socket) : void {

        const sock : net.Socket = net.createConnection(dest.port, dest.address);

        sock.on("connect", () => { 
            this.emit("connected");
            console.log(this.generateResponse(0x5a, <Target> {
                address : dest.address,
                port : dest.port
            }));
            conn.write(this.generateResponse(0x5a, <Target> {
                address : dest.address,
                port : dest.port
            }));
            
        });

        sock.on("data", (buff : Buffer) => {
            conn.write(buff)
        });
        conn.on("data", (buff : Buffer) => {
            sock.write(buff)
        });

        sock.on("end", () => conn.end());
        conn.on("end", () => sock.end());

        sock.on("error", (err : Error) => {
            this.emit("error", err);
        });
        conn.on("error", (err : Error) => {
            this.emit("error", err);
        });

        sock.on("close", () : void => { 
            if(!conn.destroyed) conn.destroy() 
        });
        conn.on("close", () : void => { 
            if(!sock.destroyed) sock.destroy() 
        });

    };

    private bind(dest : Target, conn : net.Socket) : void {

        /* 
            target ip to identify the incomming connection and target port idk for what is used the target port
        */

        const server : net.Server = new net.Server();
        const timeout = setTimeout(() => {
            server.close();
            conn.destroy();
        }, 120_000); // 2min
        let sock : net.Socket;

        server.on("connection", (c : net.Socket) => {

            let address : net.AddressInfo = <net.AddressInfo> c.address();

            if((address.address === dest.address || dest.address === "0.0.0.0") && (address.port === dest.port || dest.port === 0)){

                clearTimeout(timeout);
                sock = c;

                sock.on("data", (buff : Buffer) => conn.write(buff));
                sock.on("end", () => conn.end());
                sock.on("error", (err : Error) => {
                    this.emit("error", err);
                });
                sock.on("close", () => { 
                    
                    if(!conn.destroyed) conn.destroy(); 
                    server.close();
                    
                });

                this.emit("connected");
                conn.write(this.generateResponse(0x5a, <Target> {
                    address : address.address,
                    port : address.port
                }));

            }else {
              
                this.emit("error", new Error("Bad connection recived on boud server from " + address.address + ":" + address.port));

                conn.write(this.generateResponse(0x5b, <Target> {
                    address : dest.address,
                    port : dest.port
                }));

                conn.destroy();
                c.destroy(); 
                server.close();

            };

        });

        server.on("data", (buff : Buffer) => conn.write(buff));
        server.on("end", () => conn.end());
        server.on("close", () => { 

            if(!sock.destroyed) sock.destroy(); 
            server.close();

        });

        server.listen(0, this.options.socks4.laddress.address, () => { 

            let address : net.AddressInfo = <net.AddressInfo> server.address();
            console.log(address);
            
            this.emit("bound");
            console.log(this.generateResponse(0x5a, <Target> {
                address : address.address,
                port : address.port
            }));
            conn.write(this.generateResponse(0x5a, <Target> {
                address : address.address,
                port : address.port
            }));        

        });

    };

};

export default Socks4;
