import * as net from "net";

export interface Options {
    address : string;
    port? : number; // identd port 113 defualt
    lport : number;
    rport : number;
};

export interface Response {
    ports : string; // x, y
    status : string; // ERROR / USERID
    os? : string;
    user? : string;
    error? : string;
}

export default class Identd {

    constructor(private options : Options){
        if(!options.address) throw new Error("Undefined ip!");
        if(!options.port) options.port = 113;
        if(!options.lport) throw new Error("Undefined local prot!");
        if(!options.rport) throw new Error("Undefined remote port!");
    };

    private digestResponse(response : string) : Response {
        let foo : string[] = response.split(":").map((s) => s.trim());
        let obj : Response = {
            ports : foo[0],
            status : foo[1]
        };

        if(obj.status === "ERROR") obj.error = foo[2];
        else if(obj.status === "USERID"){
            obj.os = foo[2];
            obj.user = foo[3];
        };

        return obj;
    };

    /**
     * maybe check if the query ports correspond with requested ports ?
     */
    public async getUser(cb : (err? : Error, info? : Response) => void) : Promise<void> {
        let response : Response = await new Promise((resolv, reject) => {
            let data : string;
            const sock = net.createConnection({
                host : this.options.address,
                port : this.options.port
            });

            sock.on("connect", () => {
                sock.write(this.generateRequest(this.options.rport, this.options.lport));
            });

            sock.on("error", (err : Error) => {
                reject(err);
            });

            sock.on("data", (buff : Buffer) => {
                data = buff.toString();                
                sock.end();
            });

            sock.on("end", () => {
                resolv(this.digestResponse(data));
            });
        });

        if(error){
            cb(error, undefined);
        }else if(response.status === "ERROR"){
            cb(new Error(response.error), undefined);
        }else if(response.status === "USERID"){
            cb(undefined, response);
        }else{  
            cb(new Error("Bad response query!"), undefined);
        };

    };

    private generateRequest(rport : number, lport : number) : string {
        return rport + ", " + lport;
    };

};