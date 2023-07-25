import { WebSocket } from 'ws'
import { createCanvas, loadImage, CanvasRenderingContext2D } from 'canvas'
import fetch from 'node-fetch'
import logger from '../middleware/logger'

// 1. Configuration & Globals
const CONFIG = {
    CANVAS_DIMENSIONS: { width: 3000, height: 2000 },
    REDDIT_URL: 'https://reddit.com/r/place',
    REDDIT_WS_URL: 'wss://gql-realtime-2.reddit.com/query',
    USER_AGENT:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/116.0',
    ORIGIN: 'https://www.reddit.com',
    trackedCanvases: [0, 1, 2, 3, 4, 5],
    canvasPositions: [
        [0, 0],
        [1000, 0],
        [2000, 0],
        [0, 1000],
        [1000, 1000],
        [2000, 1000],
    ],
}

let accessToken: string | null = null
let canvasTimestamps: any[] = []
let canvas: CanvasRenderingContext2D = createCanvas(
    CONFIG.CANVAS_DIMENSIONS.width,
    CONFIG.CANVAS_DIMENSIONS.height
).getContext('2d')
let orderCanvas: CanvasRenderingContext2D = createCanvas(
    CONFIG.CANVAS_DIMENSIONS.width,
    CONFIG.CANVAS_DIMENSIONS.height
).getContext('2d')
let connected: boolean = false
let queue: any[] = []

// 2. Utility Functions
const extractAccessToken = (body: string): string | null => {
    const match = body.match(/<script id="data">window.___r = ([^<]+);<\/script>/)
    if (!match) return null
    const config = JSON.parse(match[1])
    return config.user.session.accessToken
}

const setupWebSocket = (accessToken: string): WebSocket => {
    return new WebSocket(CONFIG.REDDIT_WS_URL, {
        headers: {
            'User-Agent': CONFIG.USER_AGENT,
            Origin: CONFIG.ORIGIN,
        },
    })
}

const connect = async (): Promise<void> => {
    try {
        accessToken = await getAccessToken()
        if (!accessToken) return

        const ws = setupWebSocket(accessToken)
        handleWebSocketEvents(ws, accessToken)
    } catch (error) {
        console.error('Error in connect:', error)
    }
}

const handleWebSocketEvents = (ws: WebSocket, accessToken: string): void => {
    ws.on('open', () => onWebSocketOpen(ws, accessToken))
    ws.on('message', onWebSocketMessage)
    ws.on('close', onWebSocketClose)
    ws.on('error', () => ws.close())
}

const subscribeCanvas = (ws: WebSocket, id: number): void => {
    ws.send(
        JSON.stringify({
            id: '2',
            type: 'start',
            payload: {
                variables: {
                    input: {
                        channel: {
                            teamOwner: 'GARLICBREAD',
                            category: 'CANVAS',
                            tag: String(id),
                        },
                    },
                },
                extension: {},
                operationName: 'replace',
                query: 'subscription replace($input: SubscribeInput!) {  subscribe(input: $input) {    id    ... on BasicMessage {      data {        __typename        ... on FullFrameMessageData {          __typename          name          timestamp        }        ... on DiffFrameMessageData {          __typename          name          currentTimestamp          previousTimestamp        }      }      __typename    }    __typename  }}',
            },
        })
    )
}

/**
 * Handles the WebSocket connection and the logic associated with canvas updates.
 *
 * @param ws The active WebSocket instance.
 * @param accessToken The token used for authorization.
 */
const onWebSocketOpen = async (ws: WebSocket, accessToken: string): Promise<void> => {
    // Inform that connection to r/place is successful.
    logger.info('Connected to r/place!')

    // Set the connection state to true (assuming `connected` is defined elsewhere).
    connected = true

    // Initialize connection with access token.
    ws.send(
        JSON.stringify({
            type: 'connection_init',
            payload: {
                Authorization: `Bearer ${accessToken}`,
            },
        })
    )

    // Subscribe to each tracked canvas and initialize their timestamps.
    CONFIG.trackedCanvases.forEach((canvasId: number) => {
        subscribeCanvas(ws, canvasId)
        canvasTimestamps[canvasId] = 0
    })

    // Process the queue and canvas updates as long as the WebSocket is active.
    while (ws.readyState !== WebSocket.CLOSED) {
        if (!queue.length) {
            // Pause for a moment if the queue is empty.
            await pause(1000)
        }

        // Process the next message in the queue.
        await processQueueMessage(ws)
    }
}

/**
 * Pause the execution for a specified duration.
 *
 * @param duration Duration in milliseconds to pause.
 */
const pause = (duration: number): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, duration))
}

/**
 * Process and act on the message from the queue.
 *
 * @param ws The active WebSocket instance.
 */
const processQueueMessage = async (ws: WebSocket): Promise<void> => {
    const message = queue.shift()
    let payload

    // Safely parse the JSON message.
    try {
        payload = JSON.parse(message)?.payload
    } catch (error) {
        logger.error('Failed to parse the message:', error)
        return
    }

    if (!payload?.data?.subscribe?.data) return

    const { __typename, name, previousTimestamp, currentTimestamp, timestamp } =
        payload.data.subscribe.data

    if (__typename !== 'FullFrameMessageData' && __typename !== 'DiffFrameMessageData') return

    // Extract the canvas ID from the name.
    const canvasIDMatch = name.match(/-frame\/(\d)\//)
    const canvasID = canvasIDMatch?.[1]
    if (!canvasID) {
        logger.error('Failed to extract canvas ID from name:', name)
        return
    }

    if (previousTimestamp && previousTimestamp !== canvasTimestamps[canvasID]) {
        logger.error('Missing diff frame, reconnecting...')
        connect()
        return
    }

    canvasTimestamps[canvasID] = currentTimestamp ?? timestamp
    const canvasPosition = CONFIG.canvasPositions[canvasID]

    if (__typename === 'FullFrameMessageData') {
        canvas.clearRect(canvasPosition[0], canvasPosition[1], 1000, 1000)
    }

    try {
        const image = await fetch(name)
        const parsedImage = await loadImage(Buffer.from(await image.arrayBuffer()))
        canvas.drawImage(parsedImage, canvasPosition[0], canvasPosition[1])
    } catch (error) {
        logger.error('Failed to fetch image:', error)
    }
}

const onWebSocketMessage = async (message: any): Promise<void> => {
    queue.push(message)
}

const onWebSocketClose = (): void => {
    logger.info('Disconnected from place, reconnecting...')
    connected = false
    setTimeout(connect, 1000)
}

const getAccessToken = async (): Promise<string | null> => {
    try {
        const response = await fetch(CONFIG.REDDIT_URL, {
            headers: {
                Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'User-Agent': CONFIG.USER_AGENT,
            },
        })

        const token = extractAccessToken(await response.text())
        if (!token) {
            logger.info('Failed to get access token from reddit, retrying...')
            await new Promise((resolve) => setTimeout(resolve, 1000))
            return getAccessToken()
        }

        return token
    } catch (error) {
        console.error('Error in getAccessToken:', error)
        return null
    }
}

const updateOrders = async (orderpath: string, offset: [number, number]): Promise<void> => {
    const parsedImage = await loadImage(orderpath)
    orderCanvas.drawImage(
        parsedImage,
        offset[0] + CONFIG.CANVAS_DIMENSIONS.width / 2,
        offset[1] + CONFIG.CANVAS_DIMENSIONS.height / 2
    )
}

const getOrderDifference = (): { right: number; wrong: number; total: number } => {
    let right = 0
    let wrong = 0

    const orderData = orderCanvas.getImageData(
        0,
        0,
        CONFIG.CANVAS_DIMENSIONS.width,
        CONFIG.CANVAS_DIMENSIONS.height
    )
    const canvasData = canvas.getImageData(
        0,
        0,
        CONFIG.CANVAS_DIMENSIONS.width,
        CONFIG.CANVAS_DIMENSIONS.height
    )

    for (let x = 0; x < CONFIG.CANVAS_DIMENSIONS.width; x++) {
        for (let y = 0; y < CONFIG.CANVAS_DIMENSIONS.height; y++) {
            const i = (y * CONFIG.CANVAS_DIMENSIONS.width + x) * 4
            if (orderData.data[i + 3] === 0) continue

            if (
                orderData.data[i] === canvasData.data[i] &&
                orderData.data[i + 1] === canvasData.data[i + 1] &&
                orderData.data[i + 2] === canvasData.data[i + 2]
            ) {
                right++
            } else {
                wrong++
            }
        }
    }

    return { right, wrong, total: right + wrong }
}

export default {
    connect,
    updateOrders,
    getOrderDifference,
    canvas: { main: orderCanvas, reddit: canvas },
}

/*

Ahoy there, dear reader! Grab your monocle, put on your pirate hat, and steep a pot of Earl Grey, because we are embarking on an adventure to understand a rather sophisticated piece of JavaScript code! 🏴‍☠️🍵

# Tea & Tales of the r/place Canvas 🎨

## In A Glimpse

This splendid piece of workmanship connects to the grand Reddit's r/place canvas using WebSockets, fetches various canvas frames, and even compares the grandeur of two canvases!

## Ingredients

Here's what we've mustered:

1. **Configuration & Globals**: Essential details and settings, including dimensions, URLs, and canvas positions. Jolly good.
2. **Utility Functions**: Ah, the backbone of our adventure. Methods that assist with everything from getting access tokens to handling canvas updates!

## Highlights of Our Quest:

- **getAccessToken()**: Navigates the treacherous waters of Reddit to acquire a precious access token.
- **connect()**: Ah, the call to adventure! Attempts a rendezvous with r/place via WebSockets.
- **onWebSocketOpen()**: A triumphant celebration of a successful connection.
- **onWebSocketMessage()**: Engages with incoming messages and adds them to the queue for decoding.
- **onWebSocketClose()**: Alas, all good things come to an end. But fear not! It reconnects posthaste.
- **updateOrders()**: Updates our pirate map, ahem, I mean order canvas.
- **getOrderDifference()**: Our spyglass! Compares two canvases and reports on discrepancies.

## Treasures 🎨

At the end of our adventure, we have access to a fine collection:

- **connect**: For establishing a dashing connection.
- **updateOrders**: Updates the order canvas with new, thrilling tales.
- **getOrderDifference**: Compares the order and Reddit canvases.
- **canvas**: Our treasures - the main order canvas and the Reddit canvas.

---

So, my dear shipmate, are you ready to embark on this grand journey through the r/place seas with your favourite British Tea Pirate? Hoist the sails, and off we go! 🏴‍☠️🍵🎨
*/
