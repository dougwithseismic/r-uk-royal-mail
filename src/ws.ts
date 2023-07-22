import WebSocket, { WebSocketServer } from 'ws'
import http from 'http'
import crypto from 'crypto'
import { Pixel, PixelRequest, PixelCheck, PixelResponse, Message } from './types'
import logger from './middleware/logger'

type Client = {
    ws: WebSocket
    id: string
    connectedAt: Date
    lastKeepalive: Date
    subscriptions: Record<string, any>
    capabilities: Record<string, any>
    sentValidMessage: boolean
    accessToken?: string
}

type ConfigData = {
    version: string
    canvasWidth: number
    canvasHeight: number
    imageX: number
    imageY: number
}

// Config : Sent to client on connect.
const VERSION = '0.0.1'
const CANVAS_WIDTH = 1000
const CANVAS_HEIGHT = 1000
const IMAGE_X = 500
const IMAGE_Y = 500

const activeClients: Map<string, Client> = new Map()
const lastPong: Map<string, number> = new Map()

const configData: ConfigData = {
    version: VERSION,
    canvasWidth: CANVAS_WIDTH,
    canvasHeight: CANVAS_HEIGHT,
    imageX: IMAGE_X,
    imageY: IMAGE_Y,
}

export function setupWebSocket(server: http.Server) {
    const wss = new WebSocketServer({ server })
    logger.info('WebSocket server created')


    wss.on('connection', (ws) => {
        const client: Client = {
            ws,
            id: crypto.randomUUID(),
            connectedAt: new Date(),
            lastKeepalive: new Date(),
            subscriptions: {},
            capabilities: {},
            sentValidMessage: false,
        }
        activeClients.set(client.id, client)
        lastPong.set(client.id, Date.now())

        logger.info(`Client connected with ID: ${client.id}`)

        ws.send(
            JSON.stringify({
                action: 'config',
                data: configData,
            })
        )

        ws.on('pong', () => {
            lastPong.set(client.id, Date.now())
        })

        ws.on('close', () => {
            activeClients.delete(client.id)
            lastPong.delete(client.id)
            logger.info(`Client with ID: ${client.id} disconnected`)
        })

        ws.on('message', (message: string) => {
            const data: Message = JSON.parse(message)

            switch (data.action) {
                case 'requestPixel':
                    const pixel = getPixelFromMasterImage()
                    if (pixel) {
                        const response: PixelResponse = {
                            action: 'sendPixel',
                            pixel,
                        }
                        ws.send(JSON.stringify(response))
                    } else {
                        const response: PixelResponse = {
                            action: 'noPixelsLeft',
                        }
                        ws.send(JSON.stringify(response))
                    }
                    break

                case 'receiveAccessToken':
                    const accessToken = data.data.accessToken
                    client.accessToken = accessToken

                case 'checkPixel':
                    // Logic to handle pixel checking (e.g., update the master image)
                    break

                // Additional actions can be added here
            }
        })
    })

    setInterval(() => {
        const currentTime = Date.now()

        activeClients.forEach((client, clientId) => {
            if (client.ws.readyState === WebSocket.OPEN) {
                client.ws.ping()

                if (currentTime - (lastPong.get(clientId) || 0) > 30000) {
                    activeClients.delete(clientId)
                    client.ws.terminate() // Close the WebSocket connection
                    logger.warn(`Terminating inactive client with ID: ${clientId}`)
                }
            } else {
                activeClients.delete(clientId) // Clean up any clients that are no longer open
            }
        })
    }, 10000) // Every 10 seconds
}

function getPixelFromMasterImage(): Pixel | null {
    // Here, you would interact with your master image logic
    // For this example, we're returning a static pixel
    return {
        x: 10,
        y: 15,
        color: '#FF5733',
    }
}
