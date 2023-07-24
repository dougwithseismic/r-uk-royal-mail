import fs from 'fs'

type Pixel = {
    x: number
    y: number
    color: string
}

function getPixelsFromImage(numPixels: number = 20): Pixel[] | null {
    try {
        const data = fs.readFileSync('./data.json', 'utf-8')
        const pixelData: Pixel[] = JSON.parse(data)

        // Validate data
        if (!Array.isArray(pixelData) || pixelData.length === 0) {
            console.error('Invalid master image data.')
            return null
        }

        const randomPixels: Pixel[] = []
        const dataLength = pixelData.length

        for (let i = 0; i < numPixels; i++) {
            const randomIndex = Math.floor(Math.random() * dataLength)
            randomPixels.push(pixelData[randomIndex])
        }

        return randomPixels
    } catch (error) {
        console.error('Error fetching pixel from master image:', error)
        return null
    }
}

export default getPixelsFromImage
