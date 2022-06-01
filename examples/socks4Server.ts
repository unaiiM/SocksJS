import { Server as Socks4Server, ServerOptions as Socks4ServerOptions } from "../socks4/server";

const options : Socks4ServerOptions = {
	address : "127.0.0.1",
	port : 1080,
	identd : true 	
};

const server : any = new Socks4Server(options); 

server.listen();
