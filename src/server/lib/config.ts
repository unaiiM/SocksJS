import methods, { Method, Methods } from "./methods.js";
import Utils from "./utils.js";
import * as os from "os";

interface Address {
    address : string;
    family : 6 | 4;
};

interface Socks4Config {
    enabled? : boolean;
    identd? : boolean;
    users? : string[];
    connect? : boolean;
    bind? : boolean;
    laddress? : Address; // ipv4 only
}

interface Socks4aConfig {
    enabled? : boolean;
}

interface Socks5Config {
    enabled? : boolean;
    methods? : Methods;
    ruleset? : Ruleset;
    connect? : boolean;
    bind? : boolean;
    associate? : boolean;
    laddress? : Address; // ipv4, ipv6
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
        users : [],
        connect : true,
        bind : true,
        laddress :  {
            address : "0.0.0.0",
            family : 4
        }
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
        },
        connect : true,
        bind : true,
        associate : true,
        laddress : {
            address : "0.0.0.0",
            family : 4
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

            if(socks4.laddress){

                let laddress : Address = {
                    address : this.utils.ipv4ArrayToString(this.utils.parseIpv4(socks4.laddress.address)),
                    family : 4
                };

                if(!this.utils.isValidIpv4(laddress.address)) throw new Error("Not valid ipv4");
                if(this.isAnyAddress(laddress.address)){
                    laddress = this.getIPAddress(0);
                    if(this.isAnyAddress(laddress.address)) throw new Error("Can't find any ip address to use!");
                };

                this.socks4.laddress = laddress;

            }else {

                let laddress : Address = this.getIPAddress(4);
                if(this.isAnyAddress(laddress.address)) throw new Error("Can't find any ip address to use!");
                
                this.socks4.laddress = laddress;
            
            };
                
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

            if(socks5.laddress){

                let laddress : Address;

                if(socks5.laddress.family === 4){
                
                    laddress = {
                        address : this.utils.ipv4ArrayToString(this.utils.parseIpv4(socks5.laddress.address)),
                        family : 4
                    };
                    if(!this.utils.isValidIpv4(laddress.address)) throw new Error("Not valid ipv4!");

                }else if(socks5.laddress.family === 6){
                    
                    laddress = {
                        address : this.utils.ipv6ArrayToMin(this.utils.parseIpv6(socks5.laddress.address)),
                        family : 6
                    };
                    if(!this.utils.isValidIpv6(laddress.address)) throw new Error("Not valid ipv6!");
                
                };

                if(this.isAnyAddress(laddress.address)){
                
                    laddress = this.getIPAddress(0);
                    if(this.isAnyAddress(laddress.address)) throw new Error("Can't find any ip address to use!");
                
                };

                this.socks5.laddress = laddress;
                
            }else {

                let laddress : Address = this.getIPAddress(0);
                if(this.isAnyAddress(laddress.address)) throw new Error("Can't find any ip address to use!");
                
                this.socks5.laddress = laddress;
            
            };

        };

        if(config.log){

            let log : Partial<LogConfig> = config.log;

            if(log.file) this.log.file = log.file;

        };

    };


    public getIPAddress(family : 0 | 4 | 6) : Address {

        let address : Address = {
            address : "0.0.0.0",
            family : 4
        }
        
        let interfaces : object = os.networkInterfaces();

        for(let iface in interfaces){

            let addresses : os.NetworkInterfaceInfo[] = interfaces[iface];

            for(let info of addresses){

                if(family === 0){
                    address.address = info.address;
                    address.family = (info.family === 'IPv6') ? 6 : 4;
                    break;
                }else if(family === 4 && info.family === 'IPv4'){
                    address.address = info.address;
                    address.family = 4;
                    break;
                }else if(family === 6 && info.family === 'IPv6'){
                    address.address = info.address;
                    address.family = 6;
                    break;
                };
            
            };

        };
        
        return address;
    
    };

    public isAnyAddress(addr : string) : boolean {

        switch(addr) {
            case "0.0.0.0":
                return true;
            case "::":
                return true;
            default:
                return false;
        };

    };

    public isValidLocalAddress(addr : string) : boolean {

        let interfaces : object = os.networkInterfaces();

        for(let iface in interfaces){

            let info : os.NetworkInterfaceInfo = interfaces[iface];

            if(info.address === addr) return true;
            else continue;

        };

        return false;

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