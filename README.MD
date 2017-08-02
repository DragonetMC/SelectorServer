Selector Server
===============

A very light-weight server selection server software working under BungeeCord. 
It will automatically fetch the server list from BungeeCord. 

## How Light-Weight?
It: 
- have *NO* server ticks: NO more CPU eatting
- *NO* map caching: even blank chunks do cost RAM usage in Spigot/Bukkit servers
- *LESS* networking: won't process packets except for joining and inventory packets
- configure only *ONCE*: just edit BungeeCord settings and reload BungeeCord

Standby RAM usage around 60MB, almost no CPU usage. 
It can also *fight against* some join bots! 

## Installation
To use it, install NodeJS and run:
```
cd path/to/this/repo
npm install minecraft-protocol
node server.js
```
## Configuration
To configure it, simply open `server.js`, and edit stuffs: 
```javascript
/* ==== SETTINGS AREA ==== */
// port binding
const listen_host = "127.0.0.1";
const listen_port = "25570";
// translation replacement
const replacements = {
  "survival": "SOME TRANSLATION"
};
// messages
const message_loading = '\u00a7aLoading... ';
const menu_title = "\u00a70Choose a server";
const message_fetching = "\u00a7bFetching information... ";
const message_error_exit = "You didn't select a server to join! ";
/* == END OF SETTINGS AREA == */
```
