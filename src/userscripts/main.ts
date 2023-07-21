// ==UserScript==
// @name       WebSocket Connector
// @namespace  http://localhost/
// @version    0.1
// @description  Connects to a WebSocket server on localhost
// @match      https://www.reddit.com/r/place/*
// @match      https://new.reddit.com/r/place/*
// @grant      GM_addStyle
// @grant      GM_xmlhttpRequest
// @run-at     document-end
// ==/UserScript==

type Session = {
    expires: Date
    token: string
}

type Client = {
    ws: WebSocket | null
    orderOffset: { x: number; y: number }
    session?: Session
}

type ToastifyOptions = {
    text: string
    duration?: number
    close?: boolean
    gravity?: 'top' | 'bottom'
    position?: 'left' | 'center' | 'right'
    backgroundColor?: string
}

declare const Toastify: {
    (options: ToastifyOptions): {
        showToast: () => void
    }
}
;(() => {
    const config = {
        wsEndpoint: 'ws://localhost:5678',
    }

    const EXPIRY_MARGIN = 15_000 // Prevent the token expiring while making the request

    const client = {
        ws: null, // Placeholder for WebSocket
        orderOffset: { x: 0, y: 0 },
        orderReference: null,
        orderPriority: null,
        placeReference: null,
        session: null,
    }

    // Load Toastify styles and scripts
    loadStyles('https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css')
    loadScript('https://cdn.jsdelivr.net/npm/toastify-js').then(() => {
        // Once Toastify is loaded, initiate the main logic
        initWebSocket()
    })

    async function getAccessToken() {
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

    function loadStyles(href) {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = href
        document.head.appendChild(link)
    }

    function loadScript(src) {
        return new Promise((resolve) => {
            const script = document.createElement('script')
            script.onload = resolve
            script.src = src
            document.body.appendChild(script)
        })
    }

    function createCanvas(id, width, height) {
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        canvas.style.display = 'none'
        canvas.id = id
        document.body.appendChild(canvas)
        return ctx
    }

    function initWebSocket() {
        client.ws = new WebSocket(config.wsEndpoint)
        setupEventListeners(client.ws)

        // Notify user that the script is running using Toastify
        Toastify({
            text: 'WebSocket Connector Script is Running',
            duration: 3000,
            close: true,
            gravity: 'top',
            position: 'right',
            backgroundColor: 'linear-gradient(to right, #00b09b, #96c93d)',
        }).showToast()
    }

    function setupEventListeners(ws) {
        ws.onopen = onOpen
        ws.onmessage = onMessage
        ws.onclose = onClose
        ws.onerror = onError
        ws.onping = onPing
    }

    function onOpen() {
        console.log('Connected to the WebSocket server')

        Toastify({
            text: 'Connected to r/place UK Bot! ☕',
            duration: 3000,
            close: true,
            gravity: 'top',
            position: 'right',
            backgroundColor: 'linear-gradient(to right, #00b09b, #96c93d)',
        }).showToast()
    }

    function onMessage(event) {
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

    function handleConfig(configData) {
        // Use this function to adjust your setup according to the received configuration data
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

        // And any other necessary setup or changes
    }

    function onClose() {
        console.log('Disconnected from the WebSocket server')
    }

    function onError(error) {
        console.error('WebSocket Error:', error)
    }

    function onPing() {
        client.ws.pong()
    }
})()
