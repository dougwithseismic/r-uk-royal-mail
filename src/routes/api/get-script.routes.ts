import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import fetch from 'node-fetch' // Import node-fetch

const router = Router()
const SCRIPT_PATH = path.resolve(__dirname, '..', '..', 'userscripts', 'main.ts')
const SCRIPT_URL = `https://github.com/roshyrowe/UKplace/raw/main/userscript.user.js`

// router.get('/get-script', async (req, res) => {
//     try {
//         const scriptContent = fs.readFileSync(SCRIPT_PATH, 'utf8')

//         res.set('Content-Type', 'application/javascript')

//         res.send(scriptContent.blob.rawLines)
//     } catch (error) {
//         console.error(error)
//         res.status(500).send('An error occurred while reading the script.')
//     }
// })

router.get('/get-script', async (req, res) => {
    try {
        const response = await fetch(SCRIPT_URL) // Fetch the script from GitHub

        if (response.ok) {
            const scriptContent = await response.text()

            res.set('Content-Type', 'application/javascript')
            res.send(scriptContent)
        } else {
            res.status(response.status).send('Failed to fetch the script.')
        }
    } catch (error) {
        console.error(error)
        res.status(500).send('An error occurred while fetching the script.')
    }
})

export default router
