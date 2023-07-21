// server.ts
import express, { Request, Response, NextFunction } from 'express'
import swaggerUi from 'swagger-ui-express'
import http from 'http'
import dotenv from 'dotenv'

import middleware from './middleware'
import routes from './routes'
import swaggerDocs from './swagger'
import { setupWebSocket } from './ws'

dotenv.config()

const app = express()
const port = process.env.PORT || 5678

// Create an HTTP server
const server = http.createServer(app)

// Set up WebSocket using the function from the new module
setupWebSocket(server)

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

server.listen(port, () => {
    console.log(
        `Ahoy there, matey! 🏴‍☠️  The good ship 'Express Brigantine' with her trusty sidekick 'WebSocket' be anchored firmly in port ${port}. While we're ashore, fancy a cuppa tea? ☕️`
    )
})
