// server.ts
import express, { Request, Response, NextFunction } from 'express'
import swaggerUi from 'swagger-ui-express'
import http from 'http'
import dotenv from 'dotenv'

import middleware from './middleware'
import routes from './routes'
import swaggerDocs from './swagger'
import { setupWebSocket } from './ws'

import { processImageFromURL, processLocalPNG, savePixelsAsPNG } from './utils/imageProcessor'
import placeClient from './place-client'
import logger from './middleware/logger'

dotenv.config()

const app = express()
const port = process.env.PORT || 5678

// Create an HTTP server
const server = http.createServer(app)

// Set up WebSocket using the function from the new module
setupWebSocket(server)

// Parse our PNG image into a 2D array of pixels
// const IMAGE_URL = 'https://media.discordapp.net/attachments/959908175488876615/1132363824847130694/test.png'
const IMAGE_URL =
    'https://media.discordapp.net/attachments/959908175488876615/1133008766284091392/image.png'
const IMAGE_X = 2000
const IMAGE_Y = 1000

async function handleImageProcessing() {
    // const pixels = await processImageFromURL(IMAGE_URL, IMAGE_X, IMAGE_Y)
    const pixels = processLocalPNG('input.png')
    console.log(pixels)
    savePixelsAsPNG(pixels, IMAGE_X, IMAGE_Y, 'output.png')
}

app.use(middleware)
app.use(routes)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs))

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack)
    res.status(500).send({ error: 'Something went wrong.' })
})

app.get('/', (req: Request, res: Response) => {
    res.send('Hello, from r/place UK')
})

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    res.status(500).send('Internal Server Error')
})

server.listen(port, async () => {
    const startConnect = process.hrtime()
    await placeClient.connect()
    const endConnect = process.hrtime(startConnect)
    logger.info(`placeClient.connect() took ${endConnect[0]}s ${endConnect[1] / 1000000}ms`)

    const startUpdateOrders = process.hrtime()
    await placeClient.updateOrders(IMAGE_URL, [0, 0])
    const endUpdateOrders = process.hrtime(startUpdateOrders)
    logger.info(
        `placeClient.updateOrders() took ${endUpdateOrders[0]}s ${endUpdateOrders[1] / 1000000}ms`
    )

    const startOrderDifference = process.hrtime()
    const difference = placeClient.getOrderDifference()
    const endOrderDifference = process.hrtime(startOrderDifference)
    logger.info(
        `placeClient.getOrderDifference() took ${endOrderDifference[0]}s ${
            endOrderDifference[1] / 1000000
        }ms`
    )

    console.log('difference :>> ', difference)
    // await processImageFromURL(IMAGE_URL, IMAGE_X, IMAGE_Y)

    console.log(
        `Ahoy there, matey! 🏴‍☠️  The good ship 'Express Brigantine' with her trusty sidekick 'WebSocket' be anchored firmly in port ${port}. While we're ashore, fancy a cuppa tea? ☕️`
    )
})
