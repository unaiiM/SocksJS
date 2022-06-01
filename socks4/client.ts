import * as net from "net"
import * as events from "events"
import { Utils } from "../utils/index"

interface DestinationOptions {
	connection? : string;
	port : number;
	host : string;
	id? : string;
}

interface ProxyOptions {
	host : string;
	port : number; 	
}

interface BindOptions {
	address : string;
	port : number;
	id? : string;
}

export interface ClientOptions {
	destination : DestinationOptions;
	proxy : ProxyOptions;
	bind? : BindOptions;
}  

interface Socks4Proxy {
	host? : string;
	port? : number;
}

interface Socks4Destination {
	version : string;
	connection? : string;
	host? : { int? : string, hex? : string };
	port? : { int? : number, hex? : string; };
	id? : string;
}

interface Socks4Bind {
	version : string;
	command : string;
	address? : string;
	port? : number;
	id? : string;
}

interface ServerResponse {
	status? : string;
	error? : string;
	host? : string;
	port? : number;
}

export class Client {

	private eventEmitter : any = new events.EventEmitter();	
	private proxy : Socks4Proxy = {};
	
	private destination : Socks4Destination = {
		version : "04"
	};
	private bindOptions : Socks4Bind = {
		version : "04",
		command : "02"
	};
	
	private utils : any = new Utils();
	
	public constructor(options : ClientOptions){

			// proxy
			let proxyOptions : ProxyOptions = options.proxy;
			this.proxy.host = proxyOptions.host;
			this.proxy.port =  proxyOptions.port;

			// destination
			let destinationOptions : DestinationOptions = options.destination;
			this.destination.connection = (!destinationOptions.connection) ? "01" : destinationOptions.connection;
			this.destination.port = { 
				int : destinationOptions.port,
				hex : this.utils.intToHex([destinationOptions.port], 2) 
			};
			this.destination.host = { 
				int : destinationOptions.host,
				hex : this.utils.intToHex((destinationOptions.host.split(".")).map((item) => Number(item)), 4)
			};
			this.destination.id = (!destinationOptions.id) ? "01" : Buffer.from(destinationOptions.id).toString('hex'); 
			
			// bind options
			
			if(options.bind){
			
				let bindOptions : BindOptions = options.bind;
				this.bindOptions.address = bindOptions.address;
				this.bindOptions.port = bindOptions.port;
				this.bindOptions.id = (!bindOptions.id) ? this.destination.id : bindOptions.id;
			
			}; 
	};

	public checkResponse(data : Buffer) : ServerResponse {
		
		let obj : ServerResponse = {}; 

		// first null byte
		
		// second byte, status 0xXX
		switch(data[1]){
			case 90:
				obj.status = "garanted";
				// nothing
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
		};
		
		// two bytes, port
		obj.port = Number.parseInt((data.slice(2, 4)).toString('hex'), 16);	
		
		// four bytes, ip
		obj.host = (data.slice(4, 8).join("."));	

		return obj;				
	};

	public connect() : void {
		
		let target : Socks4Destination = this.destination;
		let proxy : Socks4Proxy = this.proxy;
		let Socks4 : any = this;
		
		let req : string = target.version + target.connection + target.port.hex + target.host.hex + target.id + "00";
		let buff : Buffer = Buffer.from(req, 'hex');
		
		// socket
		let socket = net.createConnection({
			host: proxy.host,
			port: proxy.port
		}, () => {

			console.log("Sending buffer: ", buff);
			socket.write(buff);			

		});	

		socket.on("data", function dataHandler(data : Buffer){
			console.log(data);	
			if(data[0] === 0){
				console.log("Server response recived: ", data);
				console.log("Sucessfully connected to " + target.host.int + " on " + target.port.int);
			
				let info : ServerResponse = Socks4.checkResponse(data);	
				Socks4.eventEmitter.emit("connect", socket, info);
				socket.removeListener("data", dataHandler);
			};

		}); 	
		
		socket.on("close", () => console.log("Connection command closed."));	
		return;
	};
	
	bind() : void {		
				
		let bindOptions : Socks4Bind = this.bindOptions; 
		let proxyOptions : Socks4Proxy = this.proxy;
		let rootClass : any = this;
		
		this.connect();
		this.eventEmitter.on("connect", (connSocket, connInfo) => {
		
			if(connInfo.error) {
				throw connInfo.error;
				connSocket.destory();
			};
			
			let bindSocket : any;
			let bindSocketInfo : { host? : string, port? : number } = {};			

			let request : string = bindOptions.version + bindOptions.command + rootClass.utils.intToHex([bindOptions.port], 2) + rootClass.utils.intToHex((bindOptions.address.split(".")).map((item) => Number(item)), 4) + "00";  
				
			connSocket.write(Buffer.from(request, 'hex'));
	
			connSocket.on("data", function dataHandler (data : Buffer) : void {
				if(data[0] === 0){
					console.log("Bind response recived: ", data);
					// first check status
					// then check the ip, if is the same as the des port
					// that will means the remote host sucessfully conected
					// to the socks server
					// else if the ip is the same as the bind address
					// will mean the binding is done, but waiting for
					// remote host connection, in this moment the client
					// will create another socket to the socket binding	
					
					let bindInfo : ServerResponse = rootClass.checkResponse(data);
					
					if(bindInfo.error){
					
						console.log("Bind server send a error:");
						if(bindInfo.host === bindOptions.address){
							console.log("Server bound process failed");	
							connSocket.destroy();
						}else if(bindInfo.host !== connInfo.host){
							console.log("Server target connection failed, trying another time.");
							
							bindSocket.destroy();
							bindSocket = undefined;							

							let host = bindSocketInfo.host;
							let port = bindSocketInfo.port;
							
							bindSocket = net.createConnection({
								host : host,
								port : port
							});

							rootClass.eventEmitter.emit("bound", bindInfo);			
						};
					
					}else {					

						// check if the bind server is created 
						if(bindInfo.host === bindOptions.address){
							let host : string = (bindInfo.host === "0.0.0.0") ? proxyOptions.host : bindInfo.host;
							let port : number = bindInfo.port;
							bindSocketInfo.host = host;
							bindSocketInfo.port = port;							
	
							bindSocket = net.createConnection({
								host : host,
								port : port
							});
							
							rootClass.eventEmitter.emit("bound", bindInfo);	
						}
						// check if remote host is connected to the bind server with the ip
						else if(bindInfo.host === connInfo.host){
							rootClass.eventEmitter.emit("established", bindSocket, bindInfo);	
						};
					};

					
				};	
			});
			
		});

		return;	
	};
};

/*
const options : ClientOptions = {

	proxy : {
		host : "127.0.0.1",
		port : 1080
	},

	destination : {
		host : "127.0.0.1",
		port : 8080,	
		id : "unaia"
	},
	
	bind : {
		address : "0.0.0.0",
		port : 0
	}
};


const sock : any = new Socks4(options);
*/
/*
// connect

sock.connect();

sock.eventEmitter.on("connect", (connSocket, info) => {
	console.log("xd");
	connSocket.on("data", (data) => console.log(data.toString()));
	connSocket.write("GET / HTTP/1.1\r\nHost: example.com\r\n\r\n");
	console.log(info);
});
*/
/*
// bind
sock.bind();
sock.eventEmitter.on("connect", (socket, info) => {
	console.log("Info connect: ", info);
});

sock.eventEmitter.on("bound", (info) => {
	console.log("Info bind: ", info);
});

sock.eventEmitter.on("established", (socket, info) => {
	console.log("Info established: ", info);
	socket.write("Hello");
});
*/
