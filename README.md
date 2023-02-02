# SocksTS

This is a socks server that suports:
  - Socks4, socks4a and socks5
  - Custom auth method
Don't support:
  - UDP fragmentation (I don't understand how it works)
  - User/password auth (in development)
  
# Usage

Interface for server config:
  - ServerConfig --> principal server config struct we need to pass to the server constructor, all is optional.
In the server config there is more interfaces and types we can use to declare the config in diferent variables and have it more understandable, like:
  - Socks4Config --> socks 4 config struct.
  - Socks4aConfig --> socks 4a config struct.
  - Socks5Config --> socks 5 config struct.
  - LogConfig --> event log config struct.
  - Ruleset --> ruleset config strcut, used to define whitelist and blacklist destinations and clients.
  - RulesetList --> struct for whitelist and blacklist in ruleset struct, we can found the clients and destination we want to blacklist or whitelist.
  - RulesetAddresses --> type object of string as key, were we need to put the address, and array of number as value, where we need to put the ports. 
  - Address --> struct for laddress option in socks4 and socks5 struct.
  - Methods --> type of array of Method for methods option in socks5, used to declare custom methods.
  - Method --> struct for to declare one method.


Example:

```
import * as config from "../server/lib/config.js";
import Server from "./../server/index.js";

const laddress : config.Address = {
    address : "192.168.1.24",               // address that can remote host connect to it
    family : 4                              // address family
};

const socks4 : config.Socks4Config = {
    enabled : true,                         // by default is true
    identd : true,                          // by default is false
    users : ["unai"],                       // is the admited users from the idend, by default is void array; []
    connect : true,                         // by default is true
    bind : true,                            // by default is true
    laddress : laddress                     // by default ladress is set to 0.0.0.0 
                                            // laddress is used to specify where a bind server or associate server will listen
                                            // is recommended set the laddress where the remote host can connect to it
};

const socks4a : config.Socks4aConfig = {
    enabled : true                          // by default is true, to specify if we want domain resolution or not in socks4
};

const socks5 : config.Socks5Config = {
    enabled : true,                         // by default is true
    connect : true,                         // by default is true
    bind : true,                            // by default is true
    associate : true,                       // by default is true
    laddress : laddress                     // same option as socks4 version, but the only diference is that can hold ipv6 and ipv4
};                                          

const log : config.LogConfig = {
    file : __dirname + "/log.txt"           // by default is __dirname + "/log.txt"
};

const options : config.ServerConfig = {     // all can be omited, this will cause the omited one will be set to all options as default ones.
    socks4 : socks4,                        
    socks4a : socks4a,
    socks5 : socks5,
    log : log
                                            // will explain custom methods and ruleset later
};

const PORT : number = 8080;

const server : Server = new Server(options);
server.listen(PORT, "0.0.0.0", () => {

    console.log("Server started on port : " + PORT);

});
```

# References
- https://es.wikipedia.org/wiki/SOCKS (very basic info)
- https://www.openssh.com/txt/socks4.protocol (Socks4 full info)
- https://www.openssh.com/txt/socks4a.protocol (Socks4a full info)
- https://tools.ietf.org/html/rfc1928 (Socks5 full info)

