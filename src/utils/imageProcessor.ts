import fetch from 'node-fetch'
import { PNG } from 'pngjs'
import fs from 'fs'

type PixelData = { x: number; y: number; color: string }

const KNOWN_COLOURS = [
    '#FFD635', // No label provided
    '#00A368', // Dark Green
    '#7EED56', // Green
    '#2450A4', // Dark Blue
    '#3690EA', // Blue
    '#51E9F4', // Turquoise
    '#811E9F', // Dark Purple
    '#B44AC0', // Purple
    '#FF99AA', // Pink
    '#9C6926', // Brown
    '#000000', // Black
    '#898D90', // Gray
    '#D4D7D9', // Light Gray
    '#FFFFFF', // White
]

async function fetchImage(url: string): Promise<PNG> {
    const response = await fetch(url)
    if (!response.ok) throw new Error('Failed to fetch image.')
    const buffer = await response.buffer()
    return PNG.sync.read(buffer)
}

function checkCanvasSize(png: PNG, width: number, height: number): boolean {
    return png.width === width && png.height === height
}

function hexToRgb(hex: string): [number, number, number] {
    const bigint = parseInt(hex.slice(1), 16)
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255]
}

function findClosestColor(hex: string): string {
    const [r, g, b] = hexToRgb(hex)

    let closestColor = KNOWN_COLOURS[0]
    let closestDistance = Infinity

    for (const knownColor of KNOWN_COLOURS) {
        const [kr, kg, kb] = hexToRgb(knownColor)
        const distance = Math.sqrt((kr - r) ** 2 + (kg - g) ** 2 + (kb - b) ** 2)

        if (distance < closestDistance) {
            closestDistance = distance
            closestColor = knownColor
        }
    }

    return closestColor
}

function applyDithering(png: PNG) {
    for (let y = 0; y < png.height; y++) {
        for (let x = 0; x < png.width; x++) {
            const idx = (png.width * y + x) << 2
            const oldColors = [png.data[idx], png.data[idx + 1], png.data[idx + 2]]

            const hex = rgbToHex(oldColors[0], oldColors[1], oldColors[2])
            const closestColorHex = findClosestColor(hex)
            const newColors = hexToRgb(closestColorHex)

            // Set new colors
            png.data[idx] = newColors[0]
            png.data[idx + 1] = newColors[1]
            png.data[idx + 2] = newColors[2]

            // Diffuse the error
            for (let i = 0; i < 3; i++) {
                const quantError = oldColors[i] - newColors[i]
                if (x + 1 < png.width) {
                    png.data[idx + 4 + i] += (quantError * 7) / 16
                }
                if (x - 1 >= 0 && y + 1 < png.height) {
                    png.data[idx + png.width * 4 - 4 + i] += (quantError * 3) / 16
                }
                if (y + 1 < png.height) {
                    png.data[idx + png.width * 4 + i] += (quantError * 5) / 16
                }
                if (x + 1 < png.width && y + 1 < png.height) {
                    png.data[idx + png.width * 4 + 4 + i] += (quantError * 1) / 16
                }
            }
        }
    }
}

function processPNG(png: PNG): PixelData[] {
    applyDithering(png) // Apply dithering before processing
    const data: PixelData[] = []

    for (let y = 0; y < png.height; y++) {
        for (let x = 0; x < png.width; x++) {
            const idx = (png.width * y + x) << 2

            const alpha = png.data[idx + 3]
            if (alpha !== 0) {
                const hex = rgbToHex(png.data[idx], png.data[idx + 1], png.data[idx + 2])
                const closestColor = findClosestColor(hex)
                data.push({ x, y, color: closestColor })
            }
        }
    }
    return data
}

function saveToJSON(data: PixelData[]) {
    try {
        const json = JSON.stringify(data)
        fs.writeFileSync('data.json', json)
    } catch (error) {
        throw new Error('Failed to save data to JSON file.')
    }
}

function rgbToHex(r: number, g: number, b: number): string {
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

function processLocalPNG(filePath: string): any[] {
    const data = fs.readFileSync(filePath)
    const png = PNG.sync.read(data)

    return processPNG(png)
}

function savePixelsAsPNG(
    pixelArray: PixelData[],
    width: number,
    height: number,
    outputPath: string
) {
    const png = new PNG({ width, height })

    for (const pixel of pixelArray) {
        const [r, g, b] = hexToRgb(pixel.color)
        const idx = (png.width * pixel.y + pixel.x) << 2

        png.data[idx] = r
        png.data[idx + 1] = g
        png.data[idx + 2] = b
        png.data[idx + 3] = 255 // 255 means opaque, change this if you have alpha values
    }

    const buffer = PNG.sync.write(png)
    fs.writeFileSync(outputPath, buffer)
}

// The main one to use

async function processImageFromURL(
    url: string,
    expectedWidth: number,
    expectedHeight: number
): Promise<PixelData[]> {
    const png = await fetchImage(url)
    // if (!checkCanvasSize(png, expectedWidth, expectedHeight)) {
    //     throw new Error("Image size doesn't match the expected canvas size")
    // }

    const pixelMatrix = processPNG(png)
    saveToJSON(pixelMatrix)

    return pixelMatrix
}

export { processImageFromURL, savePixelsAsPNG, processLocalPNG }
