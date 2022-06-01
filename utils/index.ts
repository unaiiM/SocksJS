
export class Utils {

	public constructor(){
			
	};
	
	public intToHex(arr : number[], size? : number) : string {
                size = (!size) ? arr.length : size;
                let strHex : string = "";
              
                for(let i = 0; (strHex.length / 2) < size; i++){
                        if(i < arr.length){
                                let hex = arr[i].toString(16);
                                if(((hex.length / 2).toString()).indexOf(".") !== -1){
                                        hex = "0" + hex;
                                };
                                strHex += hex;
                        }else strHex = "00" + strHex;
                };

                return strHex;
        };
        
        public parseHexIp(ip : string) : string {

		let str : string = "";

		for(let i = 0; i < ip.length; i += 2){
			let hex : string = ip.slice(i, i + 2);
			let int : number = Number.parseInt(hex, 16);
			
			if(i === ip.length - 2) str += int.toString();
			else str += int.toString() + ".";	
		};

		return str;
	};
};
