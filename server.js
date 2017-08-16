/* ==== SETTINGS AREA ==== */
// port binding
const listen_host = "127.0.0.1";
const listen_port = "25570";

// force player to join? 
// true: can't quit by pressing ESC or E
// false: disconnect when pressed ESC or E
const force_selection = true;

// server list and lore settings
// use "\u00a7" for color prefix
// format "Display Name": [ITEM_ID, [LORES], {sub-menu} or "server-name"]
const menu_map = {
   "Category 1": [1, ["LORE1", "LORE2"], {
       "Server 1": [1, ["LORE1", "LORE2"], "server-1"],
       "Server 2": [1, ["LORE1", "LORE2"], "server-2"],
       "Sub-Category": [2, ["LORE1", "LORE2"], {
           "Server BLAH": [2, ["LORE1", "LORE2"], "blah"]
       }]
   }],
   "Category 2": [2, ["LORE1", "LORE2"], {
       "Some Server": [2, ["LORE1", "LORE2"], "server-other"]
   }]
};
// item settings
const item_server = 3;
const item_category = 4;
const item_functional = 2;
// messages
const message_loading = '\u00a7aLoading... ';
const menu_title = "\u00a70Choose a server";
const message_error_exit = "You didn't select a server to join! ";
const message_bye = "Bye! ";

/* == END OF SETTINGS AREA == */

const type = require("type-detect");

const mc = require('minecraft-protocol');
const console = require('console');
const server = mc.createServer({
  'online-mode': false,   // optional
  encryption: true,      // optional
  host: listen_host,       // optional
  port: listen_port,           // optional
});

console.log("Server is now started! ");

server.on('login', function(client) {
  modifyClient(client);
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
    if (force_selection) {
      client.parentMenu == null;
      client.currentMenu = menu_map;
      updateClient(client);
    } else {
      client.end(message_error_exit);
    }
  });
  
  client.on("window_click", function(packet){
      var slot = packet.slot;
      if (slot == client.functionalSlots[0]) {
        if(client.parentMenu.length == 0) {
          return;
        }
        client.currentMenu = client.parentMenu.pop();
        updateClient(client);
        return;
      }
      if (slot == client.functionalSlots[1]) {
        client.end(message_bye);
        return;
      }
      var selected = client.currentMenu[Object.keys(client.currentMenu)[slot]];
      if (selected == undefined || selected == null) return; 
      var target = selected[2];
      if(target == null) return;
      if(type(target) == "string") {
        console.log("Transfering player [" + client.username + "] to server <" + target + ">... ");
        transferPlayer(client, target);
      } else {
        client.currentMenuLabel = Object.keys(client.currentMenu)[slot];
        client.parentMenu.push(client.currentMenu);
        client.currentMenu = target;
        updateClient(client);
      }
  });
  
  updateClient(client);
});

function updateClient(client){ 
  // close opened window first
  if(client.windowOpened) {
    client.write("close_window", {
      windowId: 10
    });
    // keep that set to true
  }
  
  client.windowOpened = true;
  var slots_desired = ((parseInt(Object.keys(client.currentMenu).length / 9)) + 1) * 9;
  client.write("open_window", {
      windowId: 10,
      inventoryType: "minecraft:chest", 
      windowTitle: JSON.stringify(menu_title + (client.parentMenu.length == 0 ? "" : (" - " + client.currentMenuLabel))),
      slotCount: slots_desired,
      entityId: 0
  });
  var items = [];
  var items_i = 0;
  for(var label in client.currentMenu) {
    items.push(generateItem(client.currentMenu[label][0], label, client.currentMenu[label][1]));
    items_i ++;
  }
  client.functionalSlots = [slots_desired - 2, slots_desired - 1];
  for(var i = items_i; i < slots_desired; i++) {
    if (i == client.functionalSlots[0]) {
      if(client.parentMenu.length != 0) {
        items[i] = generateItem(item_functional, "<< BACK", []);
      } else {
        items[i] = generateSpaceItem();
      }
      continue;
    }
    if (i == client.functionalSlots[1]) {
      items[i] = generateItem(item_functional, "X QUIT", []);
      continue;
    }
    items[i] = generateSpaceItem();
  } 
  
  client.write("window_items", {
      windowId: 10,
      items: items
  });
}

function modifyClient(client) {
  client.windowOpened = false;
  client.currentMenu = menu_map;
  client.currentMenuLabel = null;
  client.parentMenu = [];
  client.functionalSlots = []; // back, exit
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

function transferPlayer(client, target) {
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
}

function generateItem(id, label, lores) {
  var displayValue = {
              "Name": {
                type: "string",
                value: "\u00a7f" + label
              }
            };
  
  if (lores != undefined && lores != null && type(lores) == "Array") {
    displayValue["Lore"] = {
                type: "list",
                value: {
                  type: "string",
                  value: lores
                }};
  }
            
  return {
      blockId: id,
      itemCount: 1,
      itemDamage: 0,
      nbtData: {
        name: "",
        type: "compound",
        value: {
          "display": {
            type: "compound",
            value: displayValue
          }
        }
      }
    }
}

function generateSpaceItem() {
  return generateItem(0, "", []);
}
