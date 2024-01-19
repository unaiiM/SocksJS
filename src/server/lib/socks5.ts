import * as net from "net";
import * as dns from "dns";
import * as dgram from "dgram";
import { EventEmitter } from "events";
import { 
    Ruleset, 
    RulesetAddresses, 
    RulesetList, 
    Socks5Options 
} from "./types.js";
import Utils, { Target as RulesetTarget } from "./utils.js";
import methods, { 
    Method, 
    Methods 
} from "./methods.js";


type ResponseStatus = 0x00 | 0x01 | 0x02 | 0x03 | 0x04 | 0x05 | 0x06 | 0x07 | 0x08;

interface Target {
    address : string;
    family : number;
    port : number;
    domain? : string;
}

interface Auth {
    version : number;
    number : number;
    methods : number[];
}

interface Request {
    version : number;
    command : number;
    reserved : number,
    type : number;
    address : string;
    port : number;
}

interface DigestAddress { 
    address : string;
    index : number;
}

interface Dgram {
    fragment : number;
    family : number;
    address : string;
    port : number;
    data : string;
}


class Socks5 extends EventEmitter {

    private server : net.Server;
    private options : Socks5Options;
    private ruleset : Ruleset;
    private utils : Utils = new Utils();

    public constructor(server : net.Server, options : Socks5Options, ruleset : Ruleset){
        super();
        this.server = server;
        this.options = options;
        this.ruleset = ruleset;
    };

    private getError(error) : ResponseStatus {

        switch(error.code){
            case "ECONNREFUSED":
                return 0x05;
            case "ETIMEDOUT":
                return 0x04;
            default:
                return 0x01;
        };

    };

    public async handleAuth(conn : net.Socket, buff : Buffer){

        let auth : Auth = this.digestAuth(buff);
        let method : number = this.selectMethod(auth.methods);

        if(method === -1){

            conn.write(Buffer.from([0x05, 0xFF]));
            conn.destroy();

        }else {

            conn.write(Buffer.from([0x05, method]));
            let forward : boolean = await this.options.methods[method].auth(conn);

            if(forward){

                conn.once("data", async (buff : Buffer) => {

                    buff = await this.options.methods[method].decrypt(buff);
                    this.handleRequest(conn, buff, method);

                });

            } else {

                if(!conn.destroyed) conn.destroy();

            };

        };  

    };

    public async handleRequest(conn : net.Socket, buff : Buffer, method : number) : Promise<void> {

        let request : Request = this.digestRequest(buff);
        let valid : boolean = this.isValidRequest(conn, request, method);

        conn.on("error", (err : Error) => {
            this.emit("error", err);
        });

        if(valid){

            let target : Target = {
                address : request.address,
                family : request.type,
                port : request.port,
                domain :  (request.type === 0x03) ? request.address : undefined
            };

            if(target.family === 0x04) target.address = this.utils.ipv6ArrayToMin(this.utils.parseIpv6(target.address));

            if(request.type === 0x03){

                await new Promise((resolv, reject) => {
                    
                    dns.lookup(request.address, (err : Error, address : string, family : number) => {

                        if(err){


                            this.emit("error", err)
                            conn.destroy();
                        
                        }else {

                            target.address = address;
                            target.family = (family === 6) ? 0x04 : 0x01;
                        
                        };

                        resolv(undefined);

                    });

                });

            };

            valid = this.utils.checkRuleset(<net.AddressInfo> conn.address(), <RulesetTarget> target, this.ruleset);
            console.log(valid, conn.address(), target);

            if(!valid){
    
                conn.write(this.generateResponse(0x02, target, method));
                conn.destroy();
                return;
    
            }else this.execCommand(request.command, target, conn, method);

        }else {

            this.emit("error", new Error("Invalid request " + JSON.stringify(request)));
            if(!conn.destroyed) conn.destroy();

        };

    };

    private digestAuth(buff : Buffer) : Auth {

        let auth : Auth = {
            version : buff[0],
            number : buff[1],
            methods : Array.from(buff.slice(2, 2 + buff[1]))
        };

        return auth;

    };

    private selectMethod(methods : number[]) : number {

        let keys : number[] = Object.keys(this.options.methods).map((k) => Number(k));

        for(let i : number = 0; i < methods.length; i++){

            let method : number = keys[i];

            if(keys.indexOf(method) !== -1) return method;
            else continue;

        };

        return -1;

    };

    private generateResponse(status : ResponseStatus, target : Target, method : number) : Buffer {

        /*
                    +----+-----+-------+------+----------+----------+
                    |VER | REP |  RSV  | ATYP | BND.ADDR | BND.PORT |
                    +----+-----+-------+------+----------+----------+
                    | 1  |  1  | X'00' |  1   | Variable |    2     |
                    +----+-----+-------+------+----------+----------+

                Where:

                    o  VER    protocol version: X'05'
                    o  REP    Reply field:
                        o  X'00' succeeded
                        o  X'01' general SOCKS server failure
                        o  X'02' connection not allowed by ruleset
                        o  X'03' Network unreachable
                        o  X'04' Host unreachable
                        o  X'05' Connection refused
                        o  X'06' TTL expired
                        o  X'07' Command not supported
                        o  X'08' Address type not supported
                        o  X'09' to X'FF' unassigned
                    o  RSV    RESERVED
                    o  ATYP   address type of following address
                        o  IP V4 address: X'01'
                        o  DOMAINNAME: X'03'
                        o  IP V6 address: X'04'
                    o  BND.ADDR       server bound address
                    o  BND.PORT       server bound port in network octet order

            Fields marked RESERVED (RSV) must be set to X'00'.

            If the chosen method includes encapsulation for purposes of
            authentication, integrity and/or confidentiality, the replies are
            encapsulated in the method-dependent encapsulation.

        */

        let buff : Buffer = Buffer.from([0x05, status, 0x00, (target.domain) ? 0x03 : target.family].concat(Array.from(this.addressToBuffer((target.domain) ? 0x03 : target.family, (target.domain) ? target.domain : target.address)), Array.from(Buffer.from(this.utils.toFixedHexLen(target.port.toString(16), 4), "hex"))));

        return methods[method].encrypt(buff);

    };

    private digestRequest(buff : Buffer) : Request {

        let digest : Request = {
            version : buff[0],
            command : buff[1],
            reserved : buff[2],
            type : buff[3],
            address : "",
            port : 0
        };

        let address : DigestAddress = this.getAddress(buff);
        digest.address = address.address;
        digest.port = parseInt(buff.slice(address.index, address.index + 2).toString("hex"), 16);

        return digest;

    };

    private isValidRequest(conn : net.Socket, request : Request, method : number) : boolean {

        let target : Target = {
            address : request.address,
            family : request.type,
            port : request.port,
            domain : (request.type === 0x03) ? request.address : undefined
        }

        if(request.version !== 0x05) return false;
        else if(!this.isValidCommand(request.command)){
            conn.write(this.generateResponse(0x07, target, method));
            return false;
        } else if(request.reserved !== 0x00) return false;
        else if(!this.isValidFamily(request.type)){
            conn.write(this.generateResponse(0x08, target, method));
            return false;
        } else if(!this.isValidAddress(request.type, request.address)){
            conn.write(this.generateResponse(0x08, target, method));
            return false;
        };

        return true;

    };

    private isValidFamily(type : number) : boolean {

        return (type === 0x01 || type === 0x03 || type === 0x04) ? true : false;

    };

    private isValidCommand(command : number) : boolean {
 
        return ((command === 0x01 && this.options.connect) || (command === 0x02 && this.options.bind) || (command === 0x03 && this.options.associate)) ? true : false;
 
    };

    private getAddress(buff : Buffer) : DigestAddress {

        let type : number = buff[3];
        let obj : Partial<DigestAddress> = {
            address : "",
            index : 0
        };

        switch(type){

            case 0x01:
                obj.address = buff.slice(4, 8).join(".");
                obj.index = 8;
                break;
            case 0x03:
                let len : number = buff[4];  
                obj.address = buff.slice(5, len).toString();
                obj.index = len;
                break;
            case 0x04:
                obj.address = this.utils.bufferToIpv6(buff.slice(4, 20));
                obj.index = 20;
                break;
        };

        return <DigestAddress> obj;

    };

    private isValidAddress(type : number, address : string) : boolean {
    
        switch(type){

            case 0x01:
                return this.utils.isValidIpv4(address);
            case 0x03:
                return this.utils.isValidDomain(address);
                break;
            case 0x04:
                return this.utils.isValidIpv6(address);
                break;

        };

        return false;

    };
    
    private addressToBuffer(family : number, address : string) : Buffer {

        switch(family){

            case 0x01:
                return Buffer.from(address.split(".").map((n) => Number(n)));
                break;
            case 0x03:
                return Buffer.from(address);
                break;
            case 0x04:
                return Buffer.from((this.utils.ipv6ArrayToFixed(this.utils.parseIpv6(address))).split(":").join(""), "hex");
                break;

        }

        return Buffer.from("");

    };

    private execCommand(command : number, target : Target, conn : net.Socket, method : number) : void {

        switch(command) {

            case 0x01:
                this.connect(target, conn, method);
                break;
            case 0x02:

                this.bind(target, conn, method);
                break;
            case 0x03:
                this.associate(target, conn, method);
                break;
            default:
                conn.destroy();

        }

    };

    private isAnyAdress(family : number, addr : string) : boolean {

        switch(family){
            case 0x01:
                if(addr === "0.0.0.0") return true;
                else return false;
                break;
            case 0x04:
                if(this.utils.ipv6ArrayToFixed(this.utils.parseIpv6(addr)) === "::") return true;
                else return false;
                break;
            default:
                return false;
        };

    };

    private connect(dest : Target, conn : net.Socket, method : number) : void {

        /*
            In the reply to a CONNECT, BND.PORT contains the port number that the
            server assigned to connect to the target host, while BND.ADDR
            contains the associated IP address.  The supplied BND.ADDR is often
            different from the IP address that the client uses to reach the SOCKS
            server, since such servers are often multi-homed.  It is expected
            that the SOCKS server will use DST.ADDR and DST.PORT, and the
            client-side source address and port in evaluating the CONNECT
            request.

            Ruleset = Socks5 Firewall ?

        */

        let sock : net.Socket = net.createConnection({ host : dest.address, port : dest.port, family : (dest.family === 0x04) ? 6 : 4 }); // server options custom prefered connect interface: { localAddress : ???, localPort : ??? }

        sock.on("connect", () => { 
            let target : Target = {
                address : sock.localAddress,
                port : sock.localPort,
                family : (sock.localFamily === 'IPv6') ? 0x04 : 0x01 // The string representation of the local IP family. 'IPv4' or 'IPv6'.
            };

            console.log(this.generateResponse(0x00, target, method));
            this.emit("connected");
            conn.write(this.generateResponse(0x00, target, method));
        });

        sock.on("data", (buff : Buffer) => {
            conn.write(buff)
        });
        conn.on("data", (buff : Buffer) => {
            sock.write(buff)
        });

        sock.on("end", () => conn.end());
        conn.on("end", () => sock.end());

        sock.on("error", (err : Error) => { // check error types
            this.emit("error", err);
            
            conn.write(this.generateResponse(this.getError(err), <Target> {
                address : dest.address,
                port : dest.port,
                family : dest.family,
                domain : dest.domain
            }, method));

        });

        sock.on("close", () : void => { 
            if(!conn.destroyed) conn.destroy() 
        });
        conn.on("close", () : void => { 
            if(!sock.destroyed) sock.destroy() 
        });

    };

    private bind(dest : Target, conn : net.Socket, method : number) : void {

        /* 
            target ip to identify the incomming connection and target port idk for what is used the target port

            
            The BIND request is used in protocols which require the client to
            accept connections from the server.  FTP is a well-known example,
            which uses the primary client-to-server connection for commands and
            status reports, but may use a server-to-client connection for
            transferring data on demand (e.g. LS, GET, PUT).

            It is expected that the client side of an application protocol will
            use the BIND request only to establish secondary connections after a
            primary connection is established using CONNECT.  In is expected that
            a SOCKS server will use DST.ADDR and DST.PORT in evaluating the BIND
            request.

            Two replies are sent from the SOCKS server to the client during a
            BIND operation.  The first is sent after the server creates and binds
            a new socket.  The BND.PORT field contains the port number that the
            SOCKS server assigned to listen for an incoming connection.  The
            BND.ADDR field contains the associated IP address.  The client will
            typically use these pieces of information to notify (via the primary
            or control connection) the application server of the rendezvous
            address.  The second reply occurs only after the anticipated incoming
            connection succeeds or fails.
            In the second reply, the BND.PORT and BND.ADDR fields contain the
            address and port number of the connecting host.

        */

        const server : net.Server = new net.Server();
        let sock : net.Socket;

        server.on("connection", (c : net.Socket) => {

            let address : net.AddressInfo = <net.AddressInfo> c.address();

            if((address.address === dest.address || this.isAnyAdress(dest.family, dest.address)) && (address.port === dest.port || dest.port === 0)){

                sock = c;

                sock.on("data", (buff : Buffer) => conn.write(buff));
                sock.on("end", () => conn.end());
                
                sock.on("error", (err : Error) => {
                    
                    this.emit("error", err);
                    conn.write(this.generateResponse(this.getError(<any> err), <Target> {
                        address : dest.address,
                        port : dest.port,
                        family : dest.family,
                        domain : dest.domain
                    }, method));

                });

                sock.on("close", () => { 
                    
                    if(!conn.destroyed) conn.destroy(); 
                    server.close();
                    
                });

                this.emit("connected");

                conn.write(this.generateResponse(0x00, <Target> {
                    address : address.address,
                    port : address.port,
                    family : (sock.localFamily === 'IPv6') ? 0x04 : 0x01
                }, method));

            }else {
              
                this.emit("error", new Error("Bad connection recived on boud server from " + address.address + ":" + address.port));

                conn.write(this.generateResponse(0x05, <Target> {
                    address : address.address,
                    port : address.port,
                    family : (sock.localFamily === 'IPv6') ? 0x04 : 0x01
                }, method));

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

        server.listen(0, this.options.laddress.address, () => { 

            let address : net.AddressInfo = <net.AddressInfo> server.address();

            this.emit("bound");

            console.log(address.address, this.generateResponse(0x00, <Target> {
                address : address.address,
                port : address.port,
                family : (address.family === 'IPv6') ? 0x04 : 0x01
            }, method));
            conn.write(this.generateResponse(0x00, <Target> {
                address : address.address,
                port : address.port,
                family : (address.family === 'IPv6') ? 0x04 : 0x01
            }, method));

        });

    };

    private associate(dest : Target, conn : net.Socket, method : number){ // udp

        const server : dgram.Socket = dgram.createSocket('udp4');
        // let fragment : number = 0;
        // let REASSEMBLY_QUEUE = ???;
        // let REASSEMBLY_TIMER = 5000; // 5s

        server.on('error', (err : Error) => {
            this.emit("error", err);
            server.close();
        });
        
        server.on('message', (buff : Buffer, rinfo : dgram.RemoteInfo) => {

            this.emit("connected");

            if((rinfo.address === dest.address || this.isAnyAdress(dest.family, dest.address)) && (rinfo.port === dest.port || dest.port === 0)){

                /*
                    The FRAG field indicates whether or not this datagram is one of a
                    number of fragments.  If implemented, the high-order bit indicates
                    end-of-fragment sequence, while a value of X'00' indicates that this
                    datagram is standalone.  Values between 1 and 127 indicate the
                    fragment position within a fragment sequence.  Each receiver will
                    have a REASSEMBLY QUEUE and a REASSEMBLY TIMER associated with these
                    fragments.  The reassembly queue must be reinitialized and the
                    associated fragments abandoned whenever the REASSEMBLY TIMER expires,
                    or a new datagram arrives carrying a FRAG field whose value is less
                    than the highest FRAG value processed for this fragment sequence.
                    The reassembly timer MUST be no less than 5 seconds.  It is
                    recommended that fragmentation be avoided by applications wherever
                    possible.
                */

                let valid : boolean = this.isValidDgram(buff);

                if(valid) {

                    let request : Dgram = this.digestDgram(buff);
                    let target : Target = {
                        address : request.address,
                        port : request.port,
                        family : request.family
                    };

                    if(request.family === 0x03){

                        dns.lookup(request.address, (err : Error, address : string, family : number) => {
        
                            if(err){
        
                                this.emit("error", err)
                                conn.destroy();
                            
                            }else {

                                target.domain = address;
                                target.address = address;
                                target.family = (family === 6) ? 0x04 : 0x01; 
                            
                            };
        
                        });
        
                    };

                    if(request.fragment === 0x00){ // || fragment < request.fragment
                       
                        const sock : dgram.Socket = dgram.createSocket((target.family === 0x04) ? 'udp6' : 'udp4');

                        sock.on("connect", () => {

                            sock.send(request.data, (err : Error) => {

                                if(err){
                                    this.emit("error", err);
                                    sock.close();
                                }else sock.close();

                            });

                        });

                        sock.on("error", (err : Error) => {

                            this.emit("error", err);
                            sock.close();

                        });

                        sock.connect(target.port, target.address);   
                    
                    }; // else fragment = request.fragment;                  

                }else conn.destroy() // indicates a failure, the SOCKS server MUST terminate the TCP connection shortly after sending the reply. This will emit "close" from conn and then will close the udp server.

            }; // else drop dgram

        });

        conn.on("close", () => {

            server.close(); // A UDP association terminates when the TCP connection that the UDP ASSOCIATE request arrived on terminates.

        });
        
        server.on("close", () => {

            if(!conn.destroyed) conn.destroy();

        });

        server.on('listening', () => {
            
            const address = server.address();
            this.emit("associated", "Associated server listening on " + address.address + ":" + address.port);

            let info : Target = {
                address : address.address,
                port : address.port,
                family : (address.family === 'IPv6') ? 0x04 : 0x01
            };

            conn.write(this.generateResponse(0x00, info, method));

        });
          
        server.bind(0, this.options.laddress.address);

    };

    private isValidDgram(buff : Buffer) : boolean {

        if(buff[0] !== 0x00 && buff[1] !== 0x00) return false; // reserved 2 bytes 0000
            // fragment is just number can not be validated
        if(!this.isValidFamily(buff[3])) return false;

        let address : DigestAddress = this.getAddress(buff);

        if(!this.isValidAddress(buff[3], address.address)) return false;
        if(!this.utils.isValidPort(parseInt(buff.slice(address.index, address.index + 2).toString("hex"), 16))) return false;

        return true;

    };

    private digestDgram(buff : Buffer) : Dgram {

        let address : DigestAddress = this.getAddress(buff);
        let obj : Dgram = {
            fragment: buff[2],
            family: buff[3],
            address: address.address,
            port: parseInt(buff.slice(address.index, address.index + 2).toString("hex"), 16),
            data: buff.slice(address.index + 2, buff.length).toString(),
        };

        return obj;

    };

};

export default Socks5;
export { Target };