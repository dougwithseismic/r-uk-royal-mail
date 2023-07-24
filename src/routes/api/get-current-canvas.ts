import { Router } from 'express'
import placeClient from '../../place-client'

const router = Router()

router.get('/get-reddit-canvas', async (req, res) => {
    const pngStream = placeClient.canvas.reddit.canvas.createPNGStream()

    res.setHeader('Content-Type', 'image/png')
    pngStream.pipe(res)
})

router.get('/get-order-canvas', async (req, res) => {
    const pngStream = placeClient.canvas.main.canvas.createPNGStream()

    res.setHeader('Content-Type', 'image/png')
    pngStream.pipe(res)
})

export default router
