import { EventEmitter } from "events";
import * as fs from "fs";

class Log extends EventEmitter {

    private file : string;

    constructor(file : string){

        super();

        try {
 
            fs.writeFileSync(file, Buffer.from(""));
 
        } catch(err) {

            this.emit("error", <Error> err);

        };

        this.file = file;

    };

    public event(type : string, msg : string) : void {

        fs.appendFileSync(this.file, "[" + type + "]\n\n" + msg + "\n---------------\n");
        this.emit("event", type, msg);

    };

};

export default Log;