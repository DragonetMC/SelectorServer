/* ==== SETTINGS AREA ==== */
// port binding
const listen_host = "127.0.0.1";
const listen_port = "25570";
// translation replacement
const replacements = {
  "survival": "SOME TRANSLATION",
  "creative": "SOME TRANSLATION",
};
// messages
const message_loading = '\u00a7aLoading... ';
const menu_title = "\u00a70Choose a server";
const message_fetching = "\u00a7bFetching information... ";
const message_error_exit = "You didn't select a server to join! ";

/* == END OF SETTINGS AREA == */

const mc = require('minecraft-protocol');
const console = require('console');
const server = mc.createServer({
  'online-mode': false,   // optional
  encryption: true,      // optional
  host: listen_host,       // optional
  port: listen_port,           // optional
});
const buff_getservers = new Buffer(12);
buff_getservers.writeUInt16BE(10, 0);
buff_getservers.write("GetServers", 2, 10, "utf8");
const buff_currentserver = new Buffer(11);
buff_currentserver.writeUInt16BE(9, 0);
buff_currentserver.write("GetServer", 2, 9, "utf8");

console.log("Server is now started! ");

server.on('login', function(client) {
  modifyClient(client);
  client.on("custom_payload", function(packet) {
      if (packet.channel != "BungeeCord") return;
      var buff = packet.data;
      var offset = 0;
      var len = buff.readUInt16BE(offset); 
      offset += 2;
      var subchannel = buff.toString("utf-8", offset, offset+len);
      offset += len;
      if (subchannel == "GetServer") {
        len = buff.readUInt16BE(offset); 
        offset += 2;
        var current_server = buff.toString("utf-8", offset, offset+len);
        client.current_server = current_server;
        client.sendChat(' -- ' + message_fetching + ' (2)... ');
        client.write("custom_payload", {
          channel: "BungeeCord",
          data: buff_getservers
        });
      } else if(subchannel == "GetServers") {
        len = buff.readUInt16BE(offset); 
        offset += 2;
        var servers = buff.toString("utf-8", offset, offset+len).split(", ").filter(function(compare) {
          return compare != client.current_server;
        });
        client.servers = servers;
        updateClient(client);
      }
  });
  client.write('login', {
    entityId: 0,
    levelType: 'default',
    gameMode: 3,
    dimension: 0,
    difficulty: 2,
    maxPlayers: server.maxPlayers,
    reducedDebugInfo: false
  });
  client.write('position', {
    x: 0,
    y: 128.0+1.62,
    z: 0,
    yaw: 0,
    pitch: 0,
    flags: 0x00
  });
  client.sendChat(message_loading);
  client.on("close_window", function(){
      client.end(message_error_exit);
  });
  setTimeout(function(){
    client.sendChat(' -- \u00a7b' + message_fetching + ' (1)... ');
    client.write("custom_payload", {
      channel: "BungeeCord",
      data: buff_currentserver
    });
  }, 500);
});

function updateClient(client){ 
  var servers = client.servers;
  var current_server_index = servers.indexOf(client.current_server);
  var slots_desired = ((servers.length / 9) + 1) * 9;
  client.write("open_window", {
      windowId: 10,
      inventoryType: "minecraft:chest", 
      windowTitle: JSON.stringify(menu_title),
      slotCount: slots_desired,
      entityId: 0
  });
  var items = [];
  for(var i = 0; i < servers.length; i++) {
    var translated_server_name = servers[i];
    for(var key in replacements) {
      translated_server_name = translated_server_name.replace(key, replacements[key]);
    }
    items.push({
      blockId: 1,
      itemCount: 1,
      itemDamage: 0,
      nbtData: {
        name: "",
        type: "compound",
        value: {
          "display": {
            type: "compound",
            value: {
              "Name": {
                type: "string",
                value: "\u00a7f" + translated_server_name
              },
            }
          }
        }
      }
    });
  }
  
  client.write("window_items", {
      windowId: 10,
      items: items
  });
  
  client.on("window_click", function(packet){
      var slot = packet.slot;
      var target = client.servers[slot];
      if(target == null) return;
      console.log("Transfering player [" + client.username + "] to server <" + target + ">... ");
      var buff_connect = new Buffer(2+7+2+target.length);
      var offset = 0;
      buff_connect.writeUInt16BE(7, offset);
      offset += 2;
      buff_connect.write("Connect", offset, encoding="utf8");
      offset += 7;
      buff_connect.writeUInt16BE(target.length, offset);
      offset += 2;
      buff_connect.write(target, offset, target.length, "utf8");
      // offset += target.length;
      client.write("custom_payload", {
        channel: "BungeeCord",
        data: buff_connect
      });
  });
}

function modifyClient(client) {
  client.sendChat = function(message){
    var msg = {
    translate: 'chat.type.announcement',
    "with": [
      message
    ]
    };
    client.write("chat", { message: JSON.stringify(msg), position: 0 });
  };
}
