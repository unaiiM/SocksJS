import * as net from "net";

export interface Config {
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

    constructor(private config : Partial<Config>){

        if(!config.address) throw new Error("Undefined ip!");
        if(!config.port) config.port = 113;
        if(!config.lport) throw new Error("Undefined local prot!");
        if(!config.rport) throw new Error("Undefined remote port!");

    };

    private digestResponse(response : string) : Response {

        let foo : string[] = response.split(":").map((s) => s.trim());
        let obj : Response = {
            ports : foo[0],
            status : foo[1]
        };

        if(obj.status === "ERROR"){

            obj.error = foo[2];

        }else if(obj.status === "USERID"){

            obj.os = foo[2];
            obj.user = foo[3];

        };


        return obj;

    };

    public async getUser(callback : (err : Error | undefined, info : Response | undefined) => void) : Promise<void> {

        /*
            maybe check if the query ports correspond with requested ports ?
        */

        let error : Error | undefined = undefined; 
        let response : Response = await new Promise((resolv, reject) => {

            let data : string;

            const sock = net.createConnection({
                host : this.config.address,
                port : this.config.port
            });

            sock.on("connect", () => {

                sock.write(this.generateRequest(this.config.rport, this.config.lport));

            });

            sock.on("error", (err : Error) => {
                
                error = err;
                sock.end();

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
            callback(error, undefined);
        }else if(response.status === "ERROR"){
            callback(new Error(response.error), undefined);
        }else if(response.status === "USERID"){
            callback(undefined, response);
        }else{  
            callback(new Error("Bad response query!"), undefined);
        };

    };

    private generateRequest(rport : number, lport : number) : string {
        return rport + ", " + lport;
    };

};