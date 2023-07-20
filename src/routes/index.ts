// routes/collectRoutes.ts
import logger from '../middleware/logger'
import express, { Router } from 'express'
import fs from 'fs'
import path from 'path'

import getScriptRoutes from './api/get-script.routes'

const router = Router()

logger.info('Loading routes...')
router.use('/api/v1', [getScriptRoutes])

export default router
