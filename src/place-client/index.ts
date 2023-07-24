import { WebSocket } from 'ws'
import { createCanvas, loadImage, CanvasRenderingContext2D } from 'canvas'
import fetch from 'node-fetch'
import logger from '../middleware/logger'

const CONFIG = {
    CANVAS_DIMENSIONS: { width: 3000, height: 2000 },
    REDDIT_URL: 'https://reddit.com/r/place',
    REDDIT_WS_URL: 'wss://gql-realtime-2.reddit.com/query',
    USER_AGENT:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/116.0',
    ORIGIN: 'https://www.reddit.com',
}

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

const connect = async (): Promise<void> => {
    try {
        const accessToken = await getAccessToken()
        const ws = setupWebSocket(accessToken)
        handleWebSocketEvents(ws, accessToken)
    } catch (error) {
        console.error('Error in connect:', error)
    }
}

const setupWebSocket = (accessToken: string): WebSocket => {
    return new WebSocket(CONFIG.REDDIT_WS_URL, {
        headers: {
            'User-Agent': CONFIG.USER_AGENT,
            Origin: CONFIG.ORIGIN,
        },
    })
}

const handleWebSocketEvents = (ws: WebSocket, accessToken: string): void => {
    ws.on('open', () => onWebSocketOpen(ws, accessToken))
    ws.on('message', onWebSocketMessage)
    ws.on('close', onWebSocketClose)
    ws.on('error', () => ws.close())
}

const onWebSocketOpen = (ws: WebSocket, accessToken: string): void => {
    logger.info('Connected to r/place!')
    connected = true
    ws.send(
        JSON.stringify({
            type: 'connection_init',
            payload: {
                Authorization: `Bearer ${accessToken}`,
            },
        })
    )
}

const onWebSocketMessage = (message: any): void => {
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

const extractAccessToken = (body: string): string | null => {
    const match = body.match(/<script id="data">window.___r = ([^<]+);<\/script>/)
    if (!match) return null
    const config = JSON.parse(match[1])
    return config.user.session.accessToken
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

export default { connect, updateOrders, getOrderDifference }
