# SocksTS

This is a socks server that suports:
  - Socks4, socks4a and socks5
  - User/password auth (in development)
  - Custom auth method
Don't support:
  - UDP fragmentation (I don't understand how it works)
  
# Usage

Interface for server config:
  - ServerConfig --> principal server config struct we need to pass to the server constructor, all is optional.
In the server config there is more interfaces and types we can use to declare the config in diferent variables and have it more understandable, like:
  - Socks4Config --> socks 4 config struct.
  - Socks4aConfig --> socks 4a config struct.
  - Socks5Config --> socks 5 config struct.
  - LogConfig --> event log config struct.
  - Address --> struct for laddress option in socks4 and socks5 struct.
  - Methods --> type of array of Method for methods option in socks5, used to declare custom methods.
  - Method --> struct for to declare one method.
  - Ruleset --> struct for ruleset option in socks5 config; whitelist and blacklist.
  - RulesetList --> struct for whitelist and blacklist in ruleset struct, we can found the clients and destination we want to blacklist or whitelist.
  - RulesetAddresses --> type object of string as key, were we need to put the address, and array of number as value, where we need to put the ports. 

```
import * as config from "../server/lib/config.js";
import Server from "./../server/index.js";
```

Server config, all can be optional, but will be set with default values:
