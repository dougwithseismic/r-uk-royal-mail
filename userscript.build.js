
// ==UserScript==
// @name       r/place UK-O-Matic
// @namespace  r/place UK Nerds
// @version    0.1
// @description  Connects to a WebSocket server on localhost
// @match      https://www.reddit.com/r/place/*
// @match      https://new.reddit.com/r/place/*
// @grant      GM_addStyle
// @grant      GM_xmlhttpRequest
// @run-at     document-end
// ==/UserScript==
(() => {
  // src/reddit/get-pixel-history.ts
  var PIXEL_HISTORY_QUERY = (
    /* GraphQL */
    `
    mutation pixelHistory($input: ActInput!) {
        act(input: $input) {
            data {
                ... on BasicMessage {
                    id
                    data {
                        ... on GetTileHistoryResponseMessageData {
                            lastModifiedTimestamp
                            userInfo {
                                userID
                                username
                                __typename
                            }
                            __typename
                        }
                        __typename
                    }
                    __typename
                }
                __typename
            }
            __typename
        }
    }
`
  );

  // src/reddit/set-pixel.ts
  var SET_PIXEL_QUERY = (
    /* GraphQL */
    `
    mutation setPixel($input: ActInput!) {
        act(input: $input) {
            data {
                ... on BasicMessage {
                    id
                    data {
                        ... on GetUserCooldownResponseMessageData {
                            nextAvailablePixelTimestamp
                            __typename
                        }
                        ... on SetPixelResponseMessageData {
                            timestamp
                            __typename
                        }
                        __typename
                    }
                    __typename
                }
                __typename
            }
            __typename
        }
    }
`
  );

  // src/reddit/api.ts
  var BASE_URL = "https://gql-realtime-2.reddit.com";
  var createHeaders = (token) => ({
    accept: "*/*",
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
    Referer: "https://garlic-bread.reddit.com/"
  });
  var makeFetchRequest = async (url, body, headers, fetcher) => {
    const response = await fetcher(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      throw new Error(`Reddit API responded with ${response.status}`);
    }
    return await response.json();
  };
  var createRedditAPI = (token, fetcher = fetch) => {
    const HEADERS = createHeaders(token);
    const getPixelHistory = async (options = {}) => {
      const { coordinate = { x: 0, y: 720 }, colorIndex = 0, canvasIndex = 1 } = options;
      const body = {
        operationName: "pixelHistory",
        variables: {
          input: {
            actionName: "r/replace:get_tile_history",
            PixelMessageData: { coordinate, colorIndex, canvasIndex }
          }
        },
        query: PIXEL_HISTORY_QUERY
      };
      return await makeFetchRequest(`${BASE_URL}/query`, body, HEADERS, fetcher);
    };
    const setPixel = async (x, y, colorIndex, canvasIndex = 1) => {
      const requestBody = {
        operationName: "setPixel",
        variables: {
          input: {
            actionName: "r/replace:set_pixel",
            PixelMessageData: {
              coordinate: { x, y },
              colorIndex,
              canvasIndex
            }
          }
        },
        query: SET_PIXEL_QUERY
      };
      const response = await makeFetchRequest(`${BASE_URL}/query`, requestBody, HEADERS, fetcher);
      if (response.errors) {
        const errMessage = response.errors[0].message;
        switch (errMessage) {
          case "Ratelimited":
            const nextAvailablePixelTimestamp = response.errors[0].extensions.nextAvailablePixelTs;
            return {
              error: "rate_limited",
              data: {
                nextAvailablePixelTimestamp,
                message: `Looks like we tried to set a pixel whilst on cooldown. No problem! We'll try again.`
              }
            };
          default:
            throw new Error(response.errors);
        }
      }
      return response;
    };
    return { getPixelHistory, setPixel };
  };

  // src/userscripts/main.ts
  (() => {
    const config = {
      wsEndpoint: "ws://localhost:5678"
    };
    let connectionToast = null;
    let reconnectionAttempts = 0;
    const EXPIRY_MARGIN = 15e3;
    const client = {
      ws: null,
      // Placeholder for WebSocket
      orderOffset: { x: 0, y: 0 },
      orderReference: null,
      orderPriority: null,
      placeReference: null,
      session: null,
      api: null,
      version: null,
      initialized: false,
      isConnected: false,
      actions: {
        isCooldown: false
      }
    };
    loadStyles("https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css");
    loadScript("https://cdn.jsdelivr.net/npm/toastify-js").then(() => {
      initWebSocket();
    });
    function updateConnectionStatusToast(message, color) {
      if (connectionToast) {
        connectionToast.hideToast();
      }
      connectionToast = Toastify({
        text: message,
        duration: -1,
        gravity: "bottom",
        position: "right",
        backgroundColor: color
      });
      connectionToast.showToast();
    }
    async function getAccessToken() {
      if (client.session && client.session.expires.getTime() - EXPIRY_MARGIN < Date.now()) {
        return client.session.token;
      }
      const response = await fetch("/r/place");
      const body = await response.text();
      const configRaw = body.split('<script id="data">window.___r = ')[1].split(";<\/script>")[0];
      const localConfig = JSON.parse(configRaw);
      if (localConfig.user.session.unsafeLoggedOut) {
        return localConfig.user.session.accessToken;
      }
      client.session = {
        expires: new Date(localConfig.user.session.expires),
        token: localConfig.user.session.accessToken
      };
      return client.session.token;
    }
    function loadStyles(href) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
    }
    function loadScript(src) {
      return new Promise((resolve) => {
        const script = document.createElement("script");
        script.onload = (event) => resolve();
        script.src = src;
        document.body.appendChild(script);
      });
    }
    function createCanvas(id, width, height) {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      canvas.style.display = "none";
      canvas.id = id;
      document.body.appendChild(canvas);
      return ctx;
    }
    function initWebSocket() {
      client.ws = new WebSocket(config.wsEndpoint);
      setupEventListeners(client.ws);
      client.initialized = true;
    }
    async function generateApi() {
      try {
        const accessToken = await getAccessToken();
        if (!accessToken) {
          throw new Error("Failed to get access token");
        }
        client.ws.send(
          JSON.stringify({
            action: "receiveAccessToken",
            data: {
              accessToken
            }
          })
        );
        client.api = createRedditAPI(accessToken);
        return client.api;
      } catch (error) {
        console.error("Failed to get access token:", error);
        Toastify({
          text: "Failed to get access token. Refresh the page and try again.",
          duration: 3e3,
          close: true,
          gravity: "top",
          position: "right",
          backgroundColor: "linear-gradient(to right, #ff0000, #ff9999)"
        }).showToast();
        return null;
      }
    }
    async function requestPixel() {
      if (getConnectionStatus(client.ws) !== "Open") {
        return;
      }
      client.ws.send(JSON.stringify({ action: "requestPixel" }));
    }
    function setupEventListeners(ws) {
      ws.onopen = onOpen;
      ws.onmessage = onMessage;
      ws.onclose = onClose;
      ws.onerror = onError;
    }
    async function onOpen() {
      console.log("Connected to the WebSocket server");
      client.isConnected = true;
      Toastify({
        text: "Connected to r/place UK Bot! \u2615",
        duration: 3e3,
        close: true,
        gravity: "top",
        position: "right",
        backgroundColor: "linear-gradient(to right, #00b09b, #96c93d)"
      }).showToast();
      updateConnectionStatusToast(
        "Connected to r/place UK Bot! \u2615",
        "linear-gradient(to right, #00b09b, #96c93d)"
      );
      try {
        await generateApi();
      } catch (error) {
        console.error("Failed to get access token:", error);
        return;
      }
      await requestPixel();
    }
    function onMessage(event) {
      const data = JSON.parse(event.data);
      switch (data.action) {
        case "config":
          handleConfig(data.data);
          break;
        case "sendPixel":
          console.log(`Received pixel data`, data);
          break;
        case "noPixelsLeft":
          console.log("No pixels left to process");
          break;
      }
    }
    function generateClientCanvases(configData) {
      client.orderReference = createCanvas(
        "placeuk-userscript-order-reference",
        configData.canvasWidth,
        configData.canvasHeight
      );
      client.orderPriority = createCanvas(
        "placeuk-userscript-order-priority",
        configData.canvasWidth,
        configData.canvasHeight
      );
      client.placeReference = createCanvas(
        "placeuk-userscript-place-reference",
        configData.canvasWidth,
        configData.canvasHeight
      );
    }
    function handleConfig(configData) {
      if (client.version && client.version !== configData.version) {
        showWarningToastWithCountdown(10);
      }
      client.version = configData.version;
      generateClientCanvases(configData);
    }
    function showWarningToastWithCountdown(seconds) {
      const WARNING_TEXT_TEMPLATE = `New version detected! Refreshing in {seconds} seconds...`;
      const PAUSED_TEXT = `Refresh paused. Refresh manually to get the new version.`;
      let countdownInterval = null;
      let remainingSeconds = seconds;
      const toast = Toastify({
        text: WARNING_TEXT_TEMPLATE.replace("{seconds}", String(remainingSeconds)),
        close: true,
        gravity: "top",
        position: "center",
        backgroundColor: "linear-gradient(to right, #ff0000, #ff9999)",
        onClick: function() {
          if (countdownInterval) {
            clearInterval(countdownInterval);
            toast.hideToast();
            Toastify({
              text: PAUSED_TEXT,
              close: true,
              gravity: "top",
              position: "center",
              backgroundColor: "linear-gradient(to right, #ff9933, #ffcc99)"
            }).showToast();
          }
        }
      }).showToast();
      countdownInterval = setInterval(() => {
        remainingSeconds--;
        if (remainingSeconds <= 0) {
          clearInterval(countdownInterval);
          location.reload();
        } else {
          toast.options.text = WARNING_TEXT_TEMPLATE.replace(
            "{seconds}",
            String(remainingSeconds)
          );
          toast.showToast();
        }
      }, 1e3);
    }
    function reconnectWebSocket() {
      if (reconnectionAttempts < 5) {
        reconnectionAttempts++;
      }
      let delay;
      switch (reconnectionAttempts) {
        case 1:
          delay = 1e3;
          break;
        case 2:
          delay = 2e3;
          break;
        case 3:
          delay = 2500;
          break;
        case 4:
          delay = 5e3;
          break;
        default:
          delay = 1e4;
          break;
      }
      setTimeout(() => {
        initWebSocket();
      }, delay);
    }
    function onClose() {
      client.isConnected = false;
      const DISCONNECT_MESSAGE = `Hold on a sec, we're reconnecting...`;
      console.log("Disconnected from the WebSocket server");
      updateConnectionStatusToast(
        DISCONNECT_MESSAGE,
        "linear-gradient(to right, #ff0000, #ff9999)"
      );
      reconnectWebSocket();
    }
    function onError(error) {
      console.error("WebSocket Error:", error);
    }
    function getConnectionStatus(ws) {
      switch (ws.readyState) {
        case WebSocket.CONNECTING:
          return "Connecting";
        case WebSocket.OPEN:
          return "Open";
        case WebSocket.CLOSING:
          return "Closing";
        case WebSocket.CLOSED:
          return "Closed";
        default:
          return "Unknown";
      }
    }
  })();
})();
