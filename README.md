# SocksTS

This is a socks server that suports:
  - Socks4, socks4a and socks5
  - User/password auth (in development)
  - Custom auth method
Don't support:
  - UDP fragmentation (I don't understand how it works)
  
# Usage

First import required types and interfaces for the server config, like:
  - ServerConfig --> for server config
  - RulesetAddresses --> 
  - RulesetList --> 

  (explanation of more interfaces and types in development)

```
import { RulesetAddresses, RulesetList, ServerConfig } from "../server/lib/config.js";
import Server from "./../server/index.js";
```

Server config, all can be optional, but will be set with default values:
