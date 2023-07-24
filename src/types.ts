// types.ts
export type Pixel = {
    x: number
    y: number
    color: string // Could be represented as hex string, e.g., "#FF5733"
}

export type PixelRequest = {
    action: 'requestPixel'
}

export type PixelCheck = {
    action: 'checkPixel'
    pixel: Pixel
}

export type PixelResponse = {
    action: 'sendPixel' | 'noPixelsLeft'
    pixel?: Pixel[]
}

export type ReceiveAccessToken = {
    action: 'receiveAccessToken'
    data: {
        accessToken?: string
    }
}

export type Message = PixelRequest | PixelCheck | PixelResponse | ReceiveAccessToken
