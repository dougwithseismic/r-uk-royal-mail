# Ahoy, Pixel Corsairs! *(Hello, WebSocket Pixel Server Users!)*

Avast ye! Welcome aboard the grand vessel of the WebSocket Pixel Server. This be the very heart of a canvas venture *(This is a canvas-based application)*, where every mate can tinker with pixels on a collaborative chart *(canvas)*, turning it into a splendid piece of art.

## A Brief Gander *(Overview)*

- Our ship be steering by the WebSocket compass *(The server uses the WebSocket protocol)*, ensuring swift and secure parley *(communication)* between you brave sea dogs *(users)* and the server.
- Any mate boarding our ship *(connecting to the server)* receives a unique name tag *(unique ID)*, marked by time of boarding and other essential jots *(connection details)*.
- The server, being the hospitable captain it is, shares the map *(configuration data)* with every newcomer, showing the lay of the land *(canvas dimensions)* and our current position (`VERSION`).
- Those feeling spry can send messages in bottles (`requestPixel`) *(request pixel data)*, seek treasure maps (`receiveAccessToken`) *(send access tokens)*, or validate their finds (`checkPixel`) *(check pixel data)*.
- And do mind! The captain ensures everyone's awake by ringing the bell *(server sends pings)*. If ye don't respond, ye might find yerself overboard *(inactive clients are terminated)*!

## Navigating the Waters *(Key Concepts)*

### The Crew (Client) *(Connected Users)*

Every sailor joining the crew gets a distinct name tag *(unique ID)*. We keep a lookout on all aboard using the `activeClients` ledger *(map)*. This ledger tells tales of when ye boarded, yer last shanty *(keepalive timestamp)*, and some secret scrolls ye might have *(subscription and capabilities info)*.

### The Chart (ConfigData) *(Configuration Data)*

Every fresh face gets a glimpse of the treasure map *(is sent configuration data)*:

- Our ship's log (`VERSION`) *(Server version)*
- The vast expanse of the sea (`CANVAS_WIDTH` & `CANVAS_HEIGHT`) *(Canvas dimensions)*
- And the hidden treasures (`IMAGE_X` & `IMAGE_Y`) *(Image coordinates)*

### Messages in Bottles *(Client-Server Communication)*

When ye wish to converse with the captain, send a message in a bottle *(send a JSON message)*. But mind the code, mate:

- `requestPixel`: Callin' for a piece of eight, eh? *(Requesting a pixel)* The server might pass one along, or tell ye the chest be empty *(Server responds with pixel data or a "no pixels left" message)*.
- `receiveAccessToken`: Share a secret cipher *(Send an access token)*. Could be the key to Davey Jones' locker *(Might be used for authentication)*!
- `checkPixel`: Now, this be a mystery yet to be unravelled *(Action not fully defined)*, hinting at the value of the gem you've got.

### Keepin' Vigil *(Keepalive System)*

Lest ye be caught napping, the ship's bell tolls every ten counts *(server sends a ping every 10 seconds)*. Fail to respond thrice, and ye might be joining the fish! *(If a client doesn't respond in 30 seconds, they are disconnected)*

## Settin' Sail *(Example Usage)*

To join this grand voyage:

```javascript
import http from 'http';
import { setupWebSocket } from './path-to-this-map';

const vessel = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('WebSocket Pixel Ship Ahoy!');
});

setupWebSocket(vessel);

vessel.listen(8080, () => {
  console.log('Anchored at port 8080, ready for plunder!');
});
```

# British Tea Pirate Userscript 🍵

Ahoy there! Ready to help defend the honour of Her Majesty's Royal r/Place? Well, you're in the right place, matey! This here be the userscript to help the UK gain control over r/Place, one pixel at a time. Shiver me timbers!

## Features

1. **Automatic Pixel Placement** - Aye, leave the hard work to the machine! The userscript automatically fetches pixels and places them on r/Place.
2. **Connection Status** - Keep a keen eye on the WebSocket connection with Toast notifications.
3. **API Integration** - Uses the Reddit API to authenticate and interact with r/Place.
4. **Automatic Version Checks** - Our ship sails with the wind, and so does our userscript! It checks for new versions and prompts you to refresh.
5. **Dynamic Reconnection** - If the WebSocket connection drops, we won't abandon ship! We'll try reconnecting with increasing delays.

## Configuration

| Parameter       | Description                                                                   |
|-----------------|-------------------------------------------------------------------------------|
| `wsEndpoint`    | WebSocket endpoint for real-time communication. Defaults to `ws://localhost:5678`.|

## Usage

To set sail with this script:

1. Install the script using a userscript manager of your choice.
2. Navigate to r/Place.
3. Watch as the British Empire once again sails the digital seas and conquers the canvas!

## Components

### Session

- **expires**: Session expiry date
- **token**: Authentication token for the current session

### Client

- **ws**: WebSocket for real-time communication
- **orderOffset**: Offset values (x, y) for the current order
- **orderReference**: Reference canvas for the order
- **orderPriority**: Priority canvas for the order
- **placeReference**: Reference canvas for placement
- **session**: Current user session details
- **api**: API integration with r/Place
- **version**: Current userscript version
- **initialized**: Initialization status of the client

### MessageData

- **action**: Action to be executed (e.g., 'sendPixel')
- **data**: Additional data for the action
- **pixel**: Information about the pixel (x, y, color)

### ToastifyOptions

Customizable toast options for displaying notifications.

### Toast

Custom toast object with methods to show and hide toasts.

## Methods

- **loadStyles(href)**: Loads additional styles from a given href.
- **loadScript(src)**: Loads additional scripts from a given source.
- **createCanvas(id, width, height)**: Create a new canvas of specified dimensions.
- **initWebSocket()**: Initializes WebSocket communication.
- **generateApi()**: Generate API client for r/Place interactions.
- **reconnectWebSocket()**: Attempts to reconnect to the WebSocket.
- ... and many more utility methods.

## Updates and Changes

When we release updates, we'll inform ye with a toast notification. If there's a major update, the script prompts ye to refresh the page.

## Warning

Remember, tampering with the Queen's digital property can be a risky affair. Use this userscript responsibly!

## Join the Crew

If ye have suggestions or wish to report issues, contact our jolly crew on [https://discord.gg/ukplace](https://discord.gg/ukplace) Let's sail towards glory, one pixel at a time!

**Happy Sailing!** 🏴‍☠️🍵

## Heed the Call to Adventure! *(Contribution)*

Come aboard with your tales and tricks *(Contributions)*. Share your knowledge, but remember the Pirate's Code: mark your tales well, and test your innovations before hoisting them high.

## The Pirate's Oath *(License)*

This ship sails under the flag of the MIT License *(The project is licensed under the MIT License)*.

---

May your codes be ever bug-free, and the winds ever in your favour! 🏴‍☠️ *(Good luck coding!)*
