import { Client as Socks4Client, ClientOptions as Socks4ClientOptions } from "../socks4/client";

const options : Socks4ClientOptions = {
	proxy : {
		host : "127.0.0.1",
		port : 1080
	},
	
	destination : {
		host : "127.0.0.1",
		port : 8080,
		id : "unai"
	},
	
	bind : {
		address : "0.0.0.0",
		port : 0
	}	
};

const client : any = new Socks4Client(options);

let connSocket : any;

client.eventEmitter.on("connect", (socket, info) => {

	if(info.error) throw info.error;
	
	connSocket = socket;

});

client.eventEmitter.on("bound", (info) => {
	
	if(info.error) throw info.error;

	connSocket.write("Connect to " + options.destination.host + " on port " + info.port);

});

client.eventEmitter.on("established", (socket, info) => {
	
	if(info.error) throw info.error;

	socket.write("Hello, from the binded server.");

	socket.on("data", (data) => console.log(data.toString()));

});

client.bind();
