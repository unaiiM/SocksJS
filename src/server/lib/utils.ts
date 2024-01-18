import * as os from "os";
import * as net from "net";
import {
    SocksServerOptions, 
    Socks4Options, 
    Socks4aOptions, 
    Socks5Options, 
    Ruleset, 
    RulesetList, 
    RulesetAddresses, 
    Method, 
    Methods 
} from "./types.js";
import methods from "./methods.js";

interface Target {
    address : string;
    port : number;
}

interface Address {
    address : string;
    family : 6 | 4;
};

export default class Utils {

    private static readonly DEFAULT_LOCAL_ADDRESS : Address = {
        address : "0.0.0.0",
        family : 4
    };

    private static readonly DEFUALT_SOCKS4_OPTIONS : Socks4Options = { 
        enabled: true, 
        connect: true,
    };

    /* Ipv6 */

    public static parseIpv6(addr : string) : number[] {

        let field : number[] = [];
        let i : number;
    
        if(addr.indexOf("::") !== -1){
    
            let arr : string[] = addr.split("::");
            let foo : string[] = arr[0].split(":"); 
            let oof : string[] = arr[1].split(":");
            let len : number = 8 - (((foo[0] === '') ? 0 : foo.length) + ((oof[0] === '') ? 0 : oof.length));
    
            if(foo[0] !== '')       
                for(i = 0; i < foo.length; i++)
                    field.push(parseInt(foo[i], 16));        
    
            for(i = 0; i < len; i++) 
                field.push(0);
            
            if(oof[0] !== '')
                for(let i = 0; i < oof.length; i++)
                    field.push(parseInt(oof[i], 16));
    
    
        }else {
    
            let foo : string[] = addr.split(":");
    
            for(i = 0; i < foo.length; i++)
                field.push(parseInt(foo[i], 16));
    
        };
    
        return field;
    
    };

    public static ipv6ArrayToFixed(arr : number[]) : string {

        let addr : string = "";
    
        for(let i : number = 0; i < arr.length; i++){
    
            addr += this.toFixedHexLen(arr[i].toString(16), 4);
            if(i !== arr.length - 1) addr += ":";
    
        };
    
        return addr;
    
    };

    public static ipv6ArrayToMin(arr : number[]) : string {

        let addr : string = "";
        let foo : number;
        let index : number;
        let len : number = 0;
        let found : boolean = false;
        let i : number;

        for(i = 0; i < arr.length; i++){
    
            if(arr[i] === 0){
    
                if(!found){
                    foo = i;
                    found = true;
                }else if(found && i === (arr.length - 1)){
                    len = arr.length;
                    index = foo;
                };
    
            }else if(found){
    
                let l : number = i - foo;                
                if(l > len){
                    len = i - foo;
                    index = foo;
                };
                found = false;
    
            };
    
        };
        
        for(i = 0; i < arr.length; i++){
    
            if(i === index){
                addr += "::";
                i = i + len;
            }
            else {
                if(i !== 0) addr += ':';
                addr += this.toFixedHexLen(arr[i].toString(16), 4);
            };
    
        };
    
        return addr;
    
    };

    public static  isValidIpv6(addr : string){

        let arr : number[] = this.parseIpv6(addr);
    
        if(arr.length > 8 || arr.length < 8) return false;
        
        for(let n of arr){
    
            if(Number.isNaN(n)) return false;
            else if(n > 65536 || n < 0) return false;
            else continue;
        };
    
        return true;
    
    };

    public static bufferToIpv6(buff : Buffer) : string {

        let arr : number[] = [];

        if(buff.length > 16 || buff.length < 16) return "";

        for(let i = 0; i < buff.length; i += 2){

            arr.push(parseInt(buff[i].toString(16) + buff[i + 1].toString(16), 16));

        };

        return this.ipv6ArrayToMin(arr);

    };

    /* IPV4 */

    public static parseIpv4(addr : string) : number[] {

        return addr.split(".").map((n) => Number(n));

    };

    public static ipv4ArrayToString(arr : number[]) : string {

        return arr.join(".");

    };

    public static checkIpv4(addr : string) : string {

        return this.ipv4ArrayToString(this.parseIpv4(addr));

    };

    public static isValidIpv4(addr : string) : boolean {
        let arr : number[] = this.parseIpv4(addr);

        if(arr.length !== 4) return false;
        else {
            for(let n of arr){

                if(Number.isNaN(n)) return false;
                else if(n > 255 || n < 0) return false;
                else continue;

            };

            return true;
        };
    };

    public static isValidDomain(domain : string) : boolean {
        return (domain.length > 0) ? true : false;
    };

    public static isValidPort(port : number) : boolean {

        if(Number.isNaN(port)) return false;
        else if(port < 0 || port > 65_535) return false;
        else return true;

    }

    public static toFixedHexLen(hex : string, len : number) : string {

        while(hex.length < len){

            hex = "0" + hex;

        };

        return hex;

    };

    public static getIPAddress(family : 0 | 4 | 6) : Address {

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

    public static isAnyAddress(addr : string) : boolean {

        switch(addr) {
            case "0.0.0.0":
                return true;
            case "::":
                return true;
            default:
                return false;
        };

    };

    public static isValidLocalAddress(addr : string) : boolean {

        let interfaces : object = os.networkInterfaces();

        for(let iface in interfaces){

            let info : os.NetworkInterfaceInfo = interfaces[iface];

            if(info.address === addr) return true;
            else continue;

        };

        return false;

    };

    public static checkRuleset(source : net.AddressInfo, target : Target, ruleset : Ruleset) : boolean {

        if(source.family === 'IPv6') source.address = this.ipv6ArrayToMin(this.parseIpv6(source.address));

        const whitelist : RulesetList = ruleset.whitelist;
        const blacklist : RulesetList = ruleset.blacklist;
        const utils : Utils = this;    

        function checkAny(port : number, obj : RulesetAddresses) : boolean {

            if(obj["0.0.0.0"]){
                if(obj["0.0.0.0"].indexOf(port) || obj["0.0.0.0"].indexOf(0)) return true;
                else return false;
            }else if(obj["::"]){
                if(obj["0.0.0.0"].indexOf(port) || obj["0.0.0.0"].indexOf(0)) return true;
                else return false;
            }else return false;

        };

        function check(address : string, port : number, obj : RulesetAddresses) : boolean {

            if(obj[address]){
                if(obj[address].indexOf(0) || obj[address].indexOf(port)) return true;
                else if(checkAny(port, obj)) return true;
                else return false;
            }else if(checkAny(port, obj)){
                return true;
            }else return false;

        };

        if(whitelist.enabled){

            if(!check(source.address, source.port, whitelist.clients)) return false;
            if(!check(target.address, target.port, whitelist.destinations)) return false;

        }else if(blacklist.enabled){

            if(check(source.address, source.port, blacklist.clients)) return false;
            if(check(target.address, target.port, blacklist.destinations)) return false;
       
        };

        return true;
    };

    public static checkAddresses(addresses : RulesetAddresses) : RulesetAddresses {
        let obj : RulesetAddresses = {};
        for(let key in addresses){
                
            if(this.isValidIpv4(key)) obj[this.ipv4ArrayToString(this.parseIpv4(key))] = addresses[key];
            else if(this.isValidIpv6(key)) obj[this.ipv6ArrayToMin(this.parseIpv6(key))] = addresses[key];
            else continue;

        }; 
        return obj;
    };

    public static checkOptions(options : SocksServerOptions) {
        if(options.socks4){
            let socks4 : Socks4Options = options.socks4;
            socks4.enabled = socks4.enabled ?? true;
            socks4.identd = socks4.identd ?? false;
            socks4.users = socks4.users ?? [];

            if(socks4.laddress){
                let laddress : Address = socks4.laddress;

                if(laddress.family !== 4) throw new Error("Invalid socks4 local address family versión.");
                if(!this.isValidIpv4(laddress.address)) throw new Error("Invalid ipv4!");
            }else socks4.laddress = this.DEFAULT_LOCAL_ADDRESS;
                
        } else options.socks4 = this.DEFUALT_SOCKS4_OPTIONS;

        if(options.socks4a){
            let socks4a : Socks4aOptions = options.socks4a;
            socks4a.enabled = socks4a.enabled ?? true;
        };
        
        if(options.socks5){
            let socks5 : Socks5Options = options.socks5;
            socks5.enabled = socks5.enabled ?? true;
            socks5.methods = (socks5.methods) ? methods : this.joinMethods(methods, socks5.methods);

            if(socks5.laddress){
                let laddress : Address = socks5.laddress;
                if(socks5.laddress.family === 4 && !this.isValidIpv4(laddress.address)) throw new Error("Not valid ipv4!");
                else if(socks5.laddress.family === 6 && !this.isValidIpv6(laddress.address)) throw new Error("Not valid ipv6!");
                else throw new Error("Not valid family!");

                if(!this.utils.isValidLocalAddress(laddress.address) && !this.utils.isAnyAddress(laddress.address)) throw new Error("Invalid local address!");
                else this.socks5.laddress = laddress;
                
            } else socks5.laddress = this.DEFAULT_LOCAL_ADDRESS;

        };

        if(config.ruleset){

            let ruleset : Partial<Ruleset> = config.ruleset;

            if(ruleset.whitelist){
                if(typeof ruleset.whitelist.enabled !== "undefined") this.ruleset.whitelist.enabled = ruleset.whitelist.enabled;
                if(ruleset.whitelist.destinations) this.ruleset.whitelist.destinations = checkAddresses(ruleset.whitelist.destinations);
                if(ruleset.whitelist.clients) this.ruleset.whitelist.clients = checkAddresses(ruleset.whitelist.clients);
            }else if(ruleset.blacklist){
                if(typeof ruleset.blacklist.enabled !== "undefined") this.ruleset.blacklist.enabled = ruleset.blacklist.enabled;
                if(ruleset.blacklist.destinations) this.ruleset.blacklist.destinations = checkAddresses(ruleset.blacklist.destinations);
                if(ruleset.blacklist.clients) this.ruleset.blacklist.clients = checkAddresses(ruleset.blacklist.clients);
            };

        };

        if(config.log){

            let log : Partial<LogConfig> = config.log;

            if(log.file) this.log.file = log.file;

        };

    };

    /**
     * x will be the default methods and y the methods to be added
     * this function will check if any default method needs to be changed by new method
     */
    public static joinMethods(x : Methods, y : Methods) : Methods {
        return Object.assign(x, y);
    };

};

export { Address, Target };