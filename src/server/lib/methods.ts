import { Socket } from "net";

interface Method {
    storage? : object;
    auth : (socket : Socket) => boolean | Promise<boolean>;
    decrypt : (buff : Buffer) => Buffer;
    encrypt : (buff : Buffer) => Buffer;
}; // valid or not
interface Methods { [key: number]: Method; };

const methods : Methods = {

    0x00 : {
        auth : function (socket : Socket) : boolean | Promise<boolean> {
            return true;
        },
        decrypt : function (buff : Buffer) : Buffer {
            return buff;
        },
        encrypt  : function (buff : Buffer) : Buffer {
            return buff;
        }
    }

};

export default methods;
export { Methods, Method };