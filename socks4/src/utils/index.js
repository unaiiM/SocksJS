"use strict";
exports.__esModule = true;
exports.Utils = void 0;
var Utils = (function () {
    function Utils() {
    }
    ;
    Utils.prototype.intToHex = function (arr, size) {
        size = (!size) ? arr.length : size;
        var strHex = "";
        for (var i = 0; (strHex.length / 2) < size; i++) {
            if (i < arr.length) {
                var hex = arr[i].toString(16);
                if (((hex.length / 2).toString()).indexOf(".") !== -1) {
                    hex = "0" + hex;
                }
                ;
                strHex += hex;
            }
            else
                strHex = "00" + strHex;
        }
        ;
        return strHex;
    };
    ;
    Utils.prototype.parseHexIp = function (ip) {
        var str = "";
        for (var i = 0; i < ip.length; i += 2) {
            var hex = ip.slice(i, i + 2);
            var int = Number.parseInt(hex, 16);
            if (i === ip.length - 2)
                str += int.toString();
            else
                str += int.toString() + ".";
        }
        ;
        return str;
    };
    ;
    return Utils;
}());
exports.Utils = Utils;
;
//# sourceMappingURL=index.js.map