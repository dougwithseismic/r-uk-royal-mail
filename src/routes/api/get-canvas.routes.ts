import { Router } from 'express'

const router = Router()

const CANVAS = {
    canvasWidth: 1000,
    canvasHeight: 1000,
    imageX: 500,
    imageY: 500,
}

router.get('/get-canvas', async (req, res) => {
    res.send(CANVAS)
})

export default router
