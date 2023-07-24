// routes/collectRoutes.ts
import logger from '../middleware/logger'
import express, { Router } from 'express'
import fs from 'fs'
import path from 'path'

import getCanvasRoutes from './api/get-canvas.routes'
import getScriptRoutes from './api/get-script.routes'
import getCurrentCanvas from './api/get-current-canvas'

const router = Router()

logger.info('Loading routes...')
router.use('/api/v1', [getScriptRoutes, getCanvasRoutes, getCurrentCanvas])

export default router
