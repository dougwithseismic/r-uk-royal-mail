// server.ts
import express, { Request, Response, NextFunction } from 'express'
import swaggerUi from 'swagger-ui-express'

import dotenv from 'dotenv'
dotenv.config()

import middleware from './middleware'
import routes from './routes'
import swaggerDocs from './swagger'

import queues from './jobs' // Start Jobs

const app = express()
const port = 3000

app.use(middleware)
app.use(routes)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs))

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack)
    res.status(500).send({ error: 'Something went wrong.' })
})

app.get('/', (req: Request, res: Response) => {
    res.send('Hello from Express with Winston logging and Swagger documentation!')
})

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    res.status(500).send('Internal Server Error')
})

app.listen(port, async () => {
    console.log(`Express server listening on port ${port}`)

    Object.values(queues).forEach((queue) => {
        queue.on('progress', (job) => {
            console.log(`Job with id ${job.id} is in progress`)
        })
    })

    try {
    } catch (error) {
        console.error('Failed to fetch apartments:', error)
    }
})
