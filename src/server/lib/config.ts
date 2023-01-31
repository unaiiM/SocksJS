import methods, { Method, Methods } from "./methods.js";
import Utils from "./utils.js";

interface Socks4Config {
    enabled? : boolean;
    identd? : boolean;
    users? : string[];
}

interface Socks4aConfig {
    enabled? : boolean;
}

interface Socks5Config {
    enabled? : boolean;
    methods? : Methods;
    ruleset? : Ruleset;
}

interface LogConfig {
    file? : string;
};

type RulesetAddresses = { [key: string]: number[]; };

interface RulesetList {
    enabled? : boolean;
    destinations? : RulesetAddresses;
    clients? : RulesetAddresses;
};

interface Ruleset {
    whitelist? : RulesetList;
    blacklist? : RulesetList;
};

interface ServerConfig {
    socks4? : Socks4Config;
    socks4a? : Socks4aConfig;
    socks5? : Socks5Config;
    log? : LogConfig;
};

class Config {

    private utils : Utils = new Utils();

    public socks4 : Required<Socks4Config> = {
        enabled : true,
        identd : false,
        users : []
    };
    
    public socks4a : Required<Socks4aConfig> = {
        enabled: true
    };
    
    public socks5 : Required<Socks5Config> = {
        enabled : true,
        methods : methods,
        ruleset : {
            whitelist : {
                enabled : false,
                destinations : {},
                clients : {}
            },
            blacklist : {
                enabled : false,
                destinations : {},
                clients : {}
            }
        }
    };

    public log : Required<LogConfig> = {
        file : "./log.txt"
    };

    constructor(config : ServerConfig | undefined) {

        /*
            check if any default config needs to be changed by any new config
        */

        const utils : Utils = this.utils;

        function checkAddresses(addresses : RulesetAddresses) : RulesetAddresses {

            let obj : RulesetAddresses = {};

            for(let key in addresses){
                    
                if(utils.isValidIpv4(key)) obj[utils.ipv4ArrayToString(utils.parseIpv4(key))] = addresses[key];
                else if(utils.isValidIpv6(key)) obj[utils.ipv6ArrayToMin(utils.parseIpv6(key))] = addresses[key];
                else continue;

            };
                
            return obj;

        };

        if(config.socks4){

            let socks4 : Partial<Socks4Config> = config.socks4;

            if(typeof socks4.enabled !== "undefined") this.socks4.enabled = socks4.enabled;
            if(typeof socks4.identd !== "undefined") this.socks4.identd = socks4.identd;
            if(socks4.users) this.socks4.users = socks4.users;

        };

        if(config.socks4a){

            let socks4a : Partial<Socks4aConfig> = config.socks4a;

            if(typeof socks4a.enabled !== "undefined") this.socks4a.enabled = socks4a.enabled;

        };
        
        if(config.socks5){

            let socks5 : Partial<Socks5Config> = config.socks5;

            if(typeof socks5.enabled !== "undefined") this.socks5.enabled = socks5.enabled;
            if(socks5.methods) this.socks5.methods = this.checkMethods(this.socks5.methods, socks5.methods);
            if(config.socks5.ruleset){

                let ruleset : Partial<Ruleset> = config.socks5.ruleset;
    
                if(ruleset.whitelist){
                    if(typeof ruleset.whitelist.enabled !== "undefined") this.socks5.ruleset.whitelist.enabled = ruleset.whitelist.enabled;
                    if(ruleset.whitelist.destinations) this.socks5.ruleset.whitelist.destinations = checkAddresses(ruleset.whitelist.destinations);
                    if(ruleset.whitelist.clients) this.socks5.ruleset.whitelist.clients = checkAddresses(ruleset.whitelist.clients);
                }else if(ruleset.blacklist){
                    if(typeof ruleset.blacklist.enabled !== "undefined") this.socks5.ruleset.blacklist.enabled = ruleset.blacklist.enabled;
                    if(ruleset.blacklist.destinations) this.socks5.ruleset.blacklist.destinations = checkAddresses(ruleset.blacklist.destinations);
                    if(ruleset.blacklist.clients) this.socks5.ruleset.blacklist.clients = checkAddresses(ruleset.blacklist.clients);
                };
    
            };

            console.log(this.socks5.ruleset.whitelist);

        };

        if(config.log){

            let log : Partial<LogConfig> = config.log;

            if(log.file) this.log.file = log.file;

        };

    };

    public checkMethods(x : Methods, y : Methods) : Methods {

        /*
            x will be the default methods and y the methods to me added
            this function will check if any default method needs to be changed by new method
        */

        return <Methods> Object.assign(x, y);

    };

    public getConfig() : ServerConfig {

        return <ServerConfig> {
            socks4 : this.socks4,
            socks4a : this.socks4a,
            socks5 : this.socks5
        };

    };

};

export default Config;
export { ServerConfig, Socks4Config, Socks4aConfig, Socks5Config, LogConfig, Ruleset, RulesetList, RulesetAddresses };