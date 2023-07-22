import { createRedditAPI } from '@/reddit/api'
import { RedditAPI } from '@/reddit/types'

interface Config {
    wsEndpoint: string
}

interface Session {
    expires: Date
    token: string
}

interface Client {
    ws: WebSocket | null
    orderOffset: { x: number; y: number }
    orderReference: CanvasRenderingContext2D | null
    orderPriority: CanvasRenderingContext2D | null
    placeReference: CanvasRenderingContext2D | null
    session: Session | null
    api: RedditAPI | null
    version: string | null
    initialized: boolean
    isConnected: boolean
    actions: {
        isCooldown: boolean
    }
}

interface MessageData {
    action: string
    data?: any
    pixel?: {
        x: number
        y: number
        color: number
    }
}

interface ToastifyOptions {
    text: string
    duration?: number
    close?: boolean
    gravity?: 'top' | 'bottom'
    position?: 'left' | 'center' | 'right'
    backgroundColor?: string
    onClick?: (toast: { hideToast: () => void }) => void
}

type Toast = {
    showToast: () => void
    hideToast?: () => void
    options?: {
        text: string
    }
}

declare const Toastify: {
    (options: ToastifyOptions): Toast
}
;(() => {
    const config: Config = {
        wsEndpoint: 'ws://localhost:5678',
    }

    let connectionToast: Toast | null = null // The toast object to display the connection status
    let reconnectionAttempts = 0

    const EXPIRY_MARGIN = 15e3
    const client: Client = {
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
            isCooldown: false,
        },
    }

    loadStyles('https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css')
    loadScript('https://cdn.jsdelivr.net/npm/toastify-js').then(() => {
        initWebSocket()
    })

    function updateConnectionStatusToast(message, color) {
        if (connectionToast) {
            connectionToast.hideToast() // hide the current toast if one exists
        }

        connectionToast = Toastify({
            text: message,
            duration: -1,
            gravity: 'bottom',
            position: 'right',
            backgroundColor: color,
        })

        connectionToast.showToast()
    }

    async function getAccessToken(): Promise<string> {
        if (client.session && client.session.expires.getTime() - EXPIRY_MARGIN < Date.now()) {
            return client.session.token
        }
        const response = await fetch('/r/place')
        const body = await response.text()
        const configRaw = body.split('<script id="data">window.___r = ')[1].split(';</script>')[0]
        const localConfig = JSON.parse(configRaw)
        if (localConfig.user.session.unsafeLoggedOut) {
            return localConfig.user.session.accessToken
        }
        client.session = {
            expires: new Date(localConfig.user.session.expires),
            token: localConfig.user.session.accessToken,
        }
        return client.session.token
    }
    function loadStyles(href: string): void {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = href
        document.head.appendChild(link)
    }
    function loadScript(src: string): Promise<void> {
        return new Promise((resolve) => {
            const script = document.createElement('script')
            script.onload = (event) => resolve()
            script.src = src
            document.body.appendChild(script)
        })
    }

    function createCanvas(id: string, width: number, height: number): CanvasRenderingContext2D {
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        canvas.style.display = 'none'
        canvas.id = id
        document.body.appendChild(canvas)
        return ctx
    }
    function initWebSocket(): void {
        client.ws = new WebSocket(config.wsEndpoint)
        setupEventListeners(client.ws)
        client.initialized = true
    }

    async function generateApi(): Promise<RedditAPI> {
        try {
            const accessToken = await getAccessToken()
            if (!accessToken) {
                throw new Error('Failed to get access token')
            }

            // Send the access token to the server for authentication.
            client.ws.send(
                JSON.stringify({
                    action: 'receiveAccessToken',
                    data: {
                        accessToken,
                    },
                })
            )

            client.api = createRedditAPI(accessToken)
            return client.api
        } catch (error) {
            console.error('Failed to get access token:', error)
            Toastify({
                text: 'Failed to get access token. Refresh the page and try again.',
                duration: 3e3,

                close: true,
                gravity: 'top',
                position: 'right',
                backgroundColor: 'linear-gradient(to right, #ff0000, #ff9999)',
            }).showToast()

            return null
        }
    }

    async function requestPixel(): Promise<any> {
        if (getConnectionStatus(client.ws) !== 'Open') {
            return
        }

        client.ws.send(JSON.stringify({ action: 'requestPixel' }))
    }

    function setupEventListeners(ws: WebSocket): void {
        ws.onopen = onOpen
        ws.onmessage = onMessage
        ws.onclose = onClose
        ws.onerror = onError
    }
    async function onOpen(): Promise<void> {
        console.log('Connected to the WebSocket server')
        client.isConnected = true
        Toastify({
            text: 'Connected to r/place UK Bot! \u2615',
            duration: 3e3,
            close: true,
            gravity: 'top',
            position: 'right',
            backgroundColor: 'linear-gradient(to right, #00b09b, #96c93d)',
        }).showToast()

        updateConnectionStatusToast(
            'Connected to r/place UK Bot! \u2615',
            'linear-gradient(to right, #00b09b, #96c93d)'
        )

        // Send the access token to the server for authentication.
        try {
            await generateApi()
        } catch (error) {
            console.error('Failed to get access token:', error)
            return
        }

        // HERE IS WHERE WE CAN START DOING OUR STUFF!
        await requestPixel()
        // const setPixel = await client.api.setPixel(282, 836, 1)

        // const pixelHistory = await client.api.getPixelHistory({
        //     coordinate: { x: 282, y: 836 },
        // })

        // Whilst the WebSocket is open, find out the latest status  request pixels from the server and draw them on the canvas.
    }

    function onMessage(event: MessageEvent): void {
        const data = JSON.parse(event.data)
        switch (data.action) {
            case 'config':
                handleConfig(data.data)
                break
            case 'sendPixel':
                console.log(
                    `Received pixel data: x=${data.pixel.x}, y=${data.pixel.y}, color=${data.pixel.color}`
                )
                break
            case 'noPixelsLeft':
                console.log('No pixels left to process')
                break
        }
    }

    function generateClientCanvases(configData: any): void {
        client.orderReference = createCanvas(
            'placeuk-userscript-order-reference',
            configData.canvasWidth,
            configData.canvasHeight
        )
        client.orderPriority = createCanvas(
            'placeuk-userscript-order-priority',
            configData.canvasWidth,
            configData.canvasHeight
        )
        client.placeReference = createCanvas(
            'placeuk-userscript-place-reference',
            configData.canvasWidth,
            configData.canvasHeight
        )
    }

    function handleConfig(configData: any): void {
        // Check if the versions mismatch
        if (client.version && client.version !== configData.version) {
            showWarningToastWithCountdown(10) // start countdown from 10 seconds
        }

        // Store the version
        client.version = configData.version

        // Generate the canvases
        generateClientCanvases(configData)
    }

    function showWarningToastWithCountdown(seconds) {
        const WARNING_TEXT_TEMPLATE = `New version detected! Refreshing in {seconds} seconds...`
        const PAUSED_TEXT = `Refresh paused. Refresh manually to get the new version.`

        let countdownInterval = null

        let remainingSeconds = seconds

        const toast: any = Toastify({
            text: WARNING_TEXT_TEMPLATE.replace('{seconds}', String(remainingSeconds)),
            close: true,
            gravity: 'top',
            position: 'center',
            backgroundColor: 'linear-gradient(to right, #ff0000, #ff9999)',
            onClick: function () {
                if (countdownInterval) {
                    clearInterval(countdownInterval)
                    toast.hideToast()
                    Toastify({
                        text: PAUSED_TEXT,
                        close: true,
                        gravity: 'top',
                        position: 'center',
                        backgroundColor: 'linear-gradient(to right, #ff9933, #ffcc99)',
                    }).showToast()
                }
            },
        }).showToast()

        countdownInterval = setInterval(() => {
            remainingSeconds--
            if (remainingSeconds <= 0) {
                clearInterval(countdownInterval)
                location.reload()
            } else {
                toast.options.text = WARNING_TEXT_TEMPLATE.replace(
                    '{seconds}',
                    String(remainingSeconds)
                )
                toast.showToast() // Update the toast message with the new countdown
            }
        }, 1000)
    }

    function reconnectWebSocket() {
        if (reconnectionAttempts < 5) {
            reconnectionAttempts++
        }

        let delay
        switch (reconnectionAttempts) {
            case 1:
                delay = 1000
                break
            case 2:
                delay = 2000
                break
            case 3:
                delay = 2500
                break
            case 4:
                delay = 5000
                break
            default:
                delay = 10000
                break
        }

        setTimeout(() => {
            initWebSocket()
        }, delay)
    }

    function onClose(): void {
        client.isConnected = false
        const DISCONNECT_MESSAGE = `Hold on a sec, we\'re reconnecting...`
        console.log('Disconnected from the WebSocket server')
        updateConnectionStatusToast(
            DISCONNECT_MESSAGE,
            'linear-gradient(to right, #ff0000, #ff9999)'
        )
        reconnectWebSocket()
    }
    function onError(error: Event): void {
        console.error('WebSocket Error:', error)
    }

    function getConnectionStatus(ws: WebSocket): string {
        switch (ws.readyState) {
            case WebSocket.CONNECTING:
                return 'Connecting'
            case WebSocket.OPEN:
                return 'Open'
            case WebSocket.CLOSING:
                return 'Closing'
            case WebSocket.CLOSED:
                return 'Closed'
            default:
                return 'Unknown'
        }
    }
})()
