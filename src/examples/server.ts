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
};                                          // will explain custom methods and ruleset later

const log : config.LogConfig = {
    file : __dirname + "/log.txt"           // by default is __dirname + "/log.txt"
};

const options : config.ServerConfig = {     // all can be omited, this will cause the omited one will be set to all options as default ones.
    socks4 : socks4,                        
    socks4a : socks4a,
    socks5 : socks5,
    log : log
};

const PORT : number = 8080;

const server : Server = new Server(options);
server.listen(PORT, "0.0.0.0", () => {

    console.log("Server started on port : " + PORT);

});
