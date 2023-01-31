import { RulesetAddresses, RulesetList, ServerConfig } from "../server/lib/config.js";
import Server from "./../server/index.js";

const whitelist : RulesetList = {
    enabled : true,
    destinations : <RulesetAddresses> {
        "000.000.000.000" : [0]
    },
    clients : <RulesetAddresses> {
        "0.0.0.0" : [0]
    }
};

const options : ServerConfig = {
    socks4 : {
        enabled: true,
        identd : false
    },
    socks4a : {
        enabled : true,
    },
    socks5 : {
        enabled : true,
        ruleset : {
            whitelist : whitelist
        }
    }
};

const PORT : number = 8080;

const server : Server = new Server(options);
server.listen(PORT, "0.0.0.0", () => {

    console.log("Server started on port : " + PORT);

});