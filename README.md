# SocksJS
This project is in construction, still need to program socks4a client / server and socks5 client / server. For any question you can contact me on my mail; unaimatopi@gmail.com.

## Socks 4
I created a socks4 client and server that will have all socks standart funcionalities:
	- bind command
	- connect command
	- identd

### Client
The client have a eventEmitter with three events:
  - connect --> when the server connects to the destination.
  - bound --> when the server binds a new server.
  - established --> when the destination connects to the new bind server.

### Client connect command
On a connect the client only will need to use the connect event, to know when the server established a connection with the destination. 
If we want to do a connect we only need to specify in the options the proxy and destination options.
If the server has activated the identd, you will need to specify the userid in the destination id.

Example code of a connect command:

```
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
	}	
};

const client : any = new Socks4Client(options);

client.eventEmitter.on("connect", (socket, info) => {

	if(info.error) throw info.error;
	
	socket.on("data", (data) => console.log(data.toString()));
	
	socket.write("Hello from the client!");
	
});

client.connect();
```
### Client bind command
On a bind the client will need to use all events, because a bind command first need to send a connect command to the server.

Example code of binding:

```
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
```

Example of bind process, in this case we will use:
	- The server socks
	- The client socks
	- A netcat to simulate destination server
	- A netcat connection from the target to the bind server
	
1. First lunch the server.
!["Server launch"](https://raw.githubusercontent.com/unaiiM/SocksJS/main/img/socks4server.png)
2. Then lunch the client, that client has the same code as the binding code example.
!["Client launch"](https://raw.githubusercontent.com/unaiiM/SocksJS/main/img/socks4client.png)
3. The simulated server destination will recive the text we send it with the bind server address and port.
!["Destination server"](https://raw.githubusercontent.com/unaiiM/SocksJS/main/img/socks4simulatedserver.png) 
4. And then we will create a simulated connection from the destination to the binding server, and when it connects will recive the text we send it to them when it connects to the binding server.
!["Connection binding"](https://raw.githubusercontent.com/unaiiM/SocksJS/main/img/socks4simulatedconnection.png) 
