import { createCanvas, loadImage } from 'canvas'

interface Pixel {
    x: number
    y: number
    color: RGBA
}

type RGBA = [number, number, number, number]
type ImageDataFunction = (x: number, y: number) => RGBA

const loadImageData = async (imagePath: string): Promise<ImageDataFunction> => {
    const image = await loadImage(imagePath)
    const canvas = createCanvas(image.width, image.height)
    const ctx = canvas.getContext('2d')
    ctx.drawImage(image, 0, 0)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data

    return (x: number, y: number): RGBA => {
        const idx = (y * canvas.width + x) * 4
        return [imageData[idx], imageData[idx + 1], imageData[idx + 2], imageData[idx + 3]]
    }
}

const isTransparent = (pixelColor: RGBA): boolean => {
    return pixelColor[3] === 0 // Check the alpha channel for transparency
}

const getAdjacentCoords = (x: number, y: number): [number, number][] => {
    return [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
    ]
}

const extractBorderPixels = async (
    imageDataFn: ImageDataFunction,
    width: number,
    height: number
): Promise<Pixel[]> => {
    const borderPixels: Pixel[] = []

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const pixelColor = imageDataFn(x, y)
            if (isTransparent(pixelColor)) continue

            const isBorderPixel = getAdjacentCoords(x, y).some(([adjX, adjY]) => {
                if (adjX >= 0 && adjX < width && adjY >= 0 && adjY < height) {
                    return isTransparent(imageDataFn(adjX, adjY))
                }
                return false
            })

            if (isBorderPixel) {
                borderPixels.push({ x, y, color: pixelColor })
            }
        }
    }

    return borderPixels
}

const extractImageBorders = async (imagePath: string): Promise<Pixel[]> => {
    const imageDataFn = await loadImageData(imagePath)
    const image = await loadImage(imagePath)
    return await extractBorderPixels(imageDataFn, image.width, image.height)
}

export default extractImageBorders

// Example
// const borders = await extractImageBorders('./path/to/your/image.png');
