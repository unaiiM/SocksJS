import methods, { 
    Method, 
    Methods 
} from "./methods.js";
import Utils, { Address } from "./utils.js";

interface Socks4Options {
    enabled? : boolean;
    identd? : boolean;
    users? : string[];
    connect? : boolean;
    bind? : boolean;
    laddress? : Address; // ipv4 only
}

interface Socks4aOptions {
    enabled? : boolean;
}

interface Socks5Options {
    enabled? : boolean;
    methods? : Methods;
    connect? : boolean;
    bind? : boolean;
    associate? : boolean;
    laddress? : Address; // ipv4, ipv6
}

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

interface SocksServerOptions {
    socks4? : Socks4Options;
    socks4a? : Socks4aOptions;
    socks5? : Socks5Options;
    ruleset? : Ruleset;
};

/*class Options {

    private utils : Utils = new Utils();

    public socks4 : Required<Socks4Options> = {
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
        connect : true,
        bind : true,
        associate : true,
        laddress : {
            address : "0.0.0.0",
            family : 4
        }
    };

    public ruleset : Required<Ruleset> = {
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
    };



    public getConfig() : ServerConfig {

        let config : Required<ServerConfig> = {
            socks4 : this.socks4,
            socks4a : this.socks4a,
            socks5 : this.socks5,
            ruleset : this.ruleset,
            log : this.log
        };

        return config;

    };

};*/

export { 
    SocksServerOptions, 
    Socks4Options, 
    Socks4aOptions, 
    Socks5Options, 
    Ruleset, 
    RulesetList, 
    RulesetAddresses, 
    Address, 
    Method, 
    Methods 
};