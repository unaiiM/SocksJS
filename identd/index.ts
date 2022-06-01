import * as net from "net"

interface IdentdDestinationOptions {
	host? : string;
	port? : number;
	lport? : number;
	rport? : number;
};

export interface Options {
	host : string;
	port? : number;
	lport : number;
	rport : number;
};

interface IdentdResponse {
	lport? : number;
	rport? : number;
	so? : string;
	userid? : string;
	error? : string;
};

export class IdentdClient {
	private destination : IdentdDestinationOptions = {};

	public constructor(options : Options){
		let target : IdentdDestinationOptions = this.destination;
		target.host = options.host;
		target.port = (!options.port) ? 113 : options.port;
		target.lport = (!options.lport) ? 0 : options.lport;
		target.rport = options.rport;
	};

	public connect(callback : (info : IdentdResponse) => void) : void {
		let target : IdentdDestinationOptions = this.destination;
		let info : IdentdResponse = {};	
		// socket
		let socket = net.createConnection({
			host : target.host,
			port : target.port
		});	
		
		socket.on("connect", () => {
			console.log("[Identd] Sucessfully connected to " + target.host + " on " + target.port);
			let request : string = target.lport + "," + target.rport + "\n";
			socket.write(Buffer.from(request));
		});
		
		socket.on("data", (data) => {
			let arr : string[] = (data.toString()).split(":");

			info.lport = Number(arr[0].split(",")[0]);
			info.rport = Number(arr[0].split(",")[1]);
			switch(arr[1]){
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
			};
			
			callback(info);	
		});

		socket.on("error", (err) => {
			info.error = "Target don't have identd service up.";	
			callback(info);
			socket.destroy();
		});
		
		socket.on("close", () => {
			console.log("[Identd] Client disconnected.");
			socket.destroy();
		});

	};
};

/*const options : Options = {
	host : "127.0.0.1",
	lport : 2345,
	rport : 3000
};

const client = new IdentdClient(options).connect((info) => {
	if(info.error) throw info.error;
	console.log(info);
});*/
