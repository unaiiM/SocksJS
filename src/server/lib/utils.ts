
export interface Target {
    ip : string;
    port : string;
};

export default class Utils {

    /* Ipv6 */

    public parseIpv6(addr : string) : number[] {

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

    public ipv6ArrayToFixed(arr : number[]) : string {

        let addr : string = "";
    
        for(let i : number = 0; i < arr.length; i++){
    
            addr += this.toFixedHexLen(arr[i].toString(16), 4);
            if(i !== arr.length - 1) addr += ":";
    
        };
    
        return addr;
    
    };

    public ipv6ArrayToMin(arr : number[]) : string {

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

    public  isValidIpv6(addr : string){

        let arr : number[] = this.parseIpv6(addr);
    
        if(arr.length > 8 || arr.length < 8) return false;
        
        for(let n of arr){
    
            if(Number.isNaN(n)) return false;
            else if(n > 65536 || n < 0) return false;
            else continue;
        };
    
        return true;
    
    };

    public bufferToIpv6(buff : Buffer) : string {

        let arr : number[] = [];

        if(buff.length > 16 || buff.length < 16) return "";

        for(let i = 0; i < buff.length; i += 2){

            arr.push(parseInt(buff[i].toString(16) + buff[i + 1].toString(16), 16));

        };

        return this.ipv6ArrayToMin(arr);

    };

    /* IPV4 */

    public parseIpv4(addr : string) : number[] {

        return addr.split(".").map((n) => Number(n));

    };

    public ipv4ArrayToString(arr : number[]) : string {

        return arr.join(".");

    };

    public checkIpv4(addr : string) : string {

        return this.ipv4ArrayToString(this.parseIpv4(addr));

    };

    public isValidIpv4(addr : string) : boolean {

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

    /* Others */

    public isValidDomain(domain : string) : boolean {

        return (domain.length > 0) ? true : false;

    };

    public isValidPort(port : number) : boolean {

        if(Number.isNaN(port)) return false;
        else if(port < 0 || port > 65_535) return false;
        else return true;

    }

    public toFixedHexLen(hex : string, len : number) : string {

        while(hex.length < len){

            hex = "0" + hex;

        };

        return hex;

    };

};