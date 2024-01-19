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