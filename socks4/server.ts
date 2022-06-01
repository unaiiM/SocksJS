import * as net from "net";
import { Utils } from "../utils/index";
import { IdentdClient, Options as IdentdOptions } from "../identd/index";

export interface ServerOptions {
	address : string;
	port : number;
	identd? : boolean;
};

interface Socks4ServerOptions {
	address? : string;
	port? : number;
	identd? : boolean;	
	// identd : boolean;	
};

interface Socks4Request { // hex
	version? : string;
	command? : string;		
	port? : string;
	host? : string;
	id? : string;
};

interface TargetOptions {
	host? : string;
	port? : number;
	id? : string;
};

interface BindOptions {
	address? : string;
	port? : number;
	target? : TargetOptions;
}

export class Server {
	private server : Socks4ServerOptions = {};
	private utils : any = new Utils();
	
	public constructor(options : ServerOptions) {
			let server : Socks4ServerOptions = this.server;
			server.address = options.address;
			server.port = options.port;
			server.identd = (!options.identd) ? false : options.identd; 
			return;
	};
	
	public listen() : void {

		let serverOptions : Socks4ServerOptions = this.server;
		const ADDR : string = serverOptions.address;
		const PORT : number = serverOptions.port;   

		const serverSocket = net.createServer((c) => {
			let destSocket : any;	
			let bindSocket : any;
		
			let bind : BindOptions = {};
			let target : TargetOptions = {};

			c.on("data", (data) => {
				
				if(data[0] === 4){ // 0x04 version socks
					console.log("Client request recived: ", data);
							
					let request : Socks4Request = {};
				
					request.version = this.utils.intToHex([data[0]], 1); // 0x04
					request.command = this.utils.intToHex([data[1]], 1); // 0x01 or 0x02
					request.port = data.slice(2, 4).toString('hex');
					request.host = data.slice(4, 8).toString('hex');
					request.id = data.slice(8, data.length).toString('hex');
					request.id = Buffer.from(request.id.slice(0, request.id.indexOf("00")), 'hex').toString();	
					
					if(request.command === "02" && !destSocket === false){
					
						console.log("Bind commenad recived.");
						
						bind.address = this.utils.parseHexIp(request.host);
						bind.port = Number.parseInt(request.port, 16);
						bind.target = target;
						bindSocket = this.bind(bind, c);

						
					}else if(request.command === "01"){
					
						target.host = this.utils.parseHexIp(request.host);
						target.port = Number.parseInt(request.port, 16);
						target.id = request.id;
						console.log("Connect command recived.");					
						destSocket = this.connect(target, c);
					};
					
	
				}else if(!destSocket === false){
					let request : Buffer = data;
					destSocket.write(request);		
	
				};
			});

			c.on("error", () => {
				console.log("Client connection error.");
				
				c.destroy();
			});		
			
			c.on("close", () => {
				console.log("Client connection closed.");

				(!destSocket) ? undefined : destSocket.destroy();
				(!bindSocket) ? undefined : bind

				c.destroy();	
			});
		});


		serverSocket.listen(PORT, ADDR, () => {
			console.log("Server sucessfully running in address " + ADDR + " on port " + PORT);
		});

		return;

	};
	
	private bind(options : BindOptions, socket : any) : any {
		
		let clientConnection : any;
		let remoteConnection : any;
		
		let bindServer : any = net.createServer((c) => {
		
			let info : any = c.address();
			
			//console.log(info.address === options.target.host, !remoteConnection, !clientConnection === false)
			
			if(info.address === options.target.host && !remoteConnection && !clientConnection === false){
			
				console.log("Target connection obtained.");
			
				let response : string =  this.generateResponse("5a", info.address, info.port);
				socket.write(Buffer.from(response, 'hex'));
				
				// remoteConnection socket events
				
				remoteConnection = c;
				remoteConnection.on("data", (data) => clientConnection.write(data));
				remoteConnection.on("error", () => {
					console.log("Remote client error.");
					clientConnection.destroy();
					remoteConnection.destroy();
					//clientConnection = undefined;
					//remoteConnection = undefined;
					// maybe turn *Connection undefined, to handle new connections.					
				});
				remoteConnection.on("close", () => {
					console.log("Remote client closed.", !clientConnection);
					(!clientConnection) ? undefined : clientConnection.destroy();
					//clientConnection = undefined;
					remoteConnection = undefined;	
					// maybe turn *Connection undefined, to handle new connections.					
				});
				
			}else if(info.address !== options.target.host && !clientConnection === false && !remoteConnection){
				
				console.log("Uknown target connected, colsing connections.", !clientConnection);
		
				let response : string =  this.generateResponse("5b", info.address, info.port);
				socket.write(Buffer.from(response, 'hex'));
				
				clientConnection.destroy();	
				//clientConnection = undefined;
				c.destroy();
	
			}else if(!clientConnection){
			
				console.log("Client connection obtained.");
			
				// clientConnection socket events
				clientConnection = c;
				clientConnection.on("data", (data) => remoteConnection.write(data));
				clientConnection.on("error", () => {
					console.log("Client connection error.");
					//(!remoteConnection) ? undefined : remoteConnection.destroy();
					clientConnection.destroy();	
				});
				clientConnection.on("close", () => {
					console.log("Client connection closed.");
					(!remoteConnection) ? undefined : remoteConnection.destroy();
					clientConnection = undefined;
					remoteConnection = undefined;
					// maybe turn *Connection undefined, to handle new connections.	
				});
			}else {
				c.destroy();
			};	
					
		});
		
		bindServer.on("error", () => {
		
			console.log("Error bouding socket to address " + options.address + " on " + options.port);
			
			bindServer.destory();

			let response : string = this.generateResponse("5b", options.address, options.port);
			socket.write(Buffer.from(response, 'hex'));		
		
		});
		
		bindServer.listen(options.port, options.address, () => {
		
			let info : any = bindServer.address();
			let address : string = info.address;
			let port : number = info.port;
			
			let response : string = this.generateResponse("5a", address, port);
			
			socket.write(Buffer.from(response, 'hex'));

			console.log("Socket sucessfully bound to address " + address + " on " + port);


		});
		
		return bindServer;
	};
	
	private connect(target : TargetOptions, socket : any) : any {
		let c : any = socket;
		let destinationSocket : any;
		let destinationSocketInfo : any;
			
		// socket creation
		
		destinationSocket = net.createConnection({ 
			host : target.host,
			port : target.port	
		});
					
		// socket events
		destinationSocket.on("connect", () => {
			
			console.log("Server sucessfully created a connection to " + target.host + " on " + target.port);
			
			destinationSocketInfo = destinationSocket.address();			
	
			//identd
			
			if(this.server.identd === true){
				
				let identdOptions : IdentdOptions = {
					host : target.host,
					port : 113,
					lport : target.port,
					rport : destinationSocketInfo.port 
				}; 

				let identd = new IdentdClient(identdOptions).connect((info) => {
					
					if(info.error){

						console.log("[Identd] Error " + info.error);
						let response : string = this.generateResponse("5c", target.host, target.port);
						socket.write(Buffer.from(response, 'hex'));

					}else {
					
						if(info.userid === target.id){
						
							let response = this.generateResponse("5a", target.host, target.port);
							socket.write(Buffer.from(response, 'hex'));

						}else {

							let response = this.generateResponse("5d", target.host, target.port);	
							socket.write(Buffer.from(response, 'hex'));
							socket.destroy();
							destinationSocket.destroy();							

						};

					};
				});				
				
			} else {
			
				let response : string = this.generateResponse("5a", target.host, target.port);
				c.write(Buffer.from(response, 'hex'));	
			
			};
		});
		
		destinationSocket.on("error", () => {
			console.log("Server error, creating a connection to " + target.host + " on " + target.port);
			let response : string = this.generateResponse("5b", target.host, target.port);
			c.write(Buffer.from(response, 'hex'));
			destinationSocket.destroy();
		});
		destinationSocket.on("data", (data) => c.write(data));
		destinationSocket.on("close", () => { 
			console.log("Connection to " + target.host + " on " + target.port + " closed.");
			//let response : string = this.generateResponse("5b", target.host, target.port);
			//c.write(Buffer.from(response, 'hex'))
			destinationSocket.destroy();
			c.destroy();
		});
		
		return destinationSocket;
			
	};

	private generateResponse(status : string, ip : string, port : number) : string {

		let strHex : string = "";
		
		// first byte, null
		strHex += "00"

		// second byte, status, 0x5a 0x5b 0x5c 0x5d
		switch(status){
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

		// two bytes, target port
		let hexPort : string = this.utils.intToHex([port], 2);
		strHex += hexPort;

		// four bytes, target ip
		let hexIp : string = this.utils.intToHex((ip.split(".")).map((item) => Number(item)), 4);
		strHex += hexIp;

		return strHex;
	};

};

/*
const serv = new Socks4Server({
	address : "127.0.0.1",
	port : 1080,
	identd: true
}).listen();

*/
