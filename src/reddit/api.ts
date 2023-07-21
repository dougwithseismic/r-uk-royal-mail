import { PIXEL_HISTORY_QUERY } from './get-pixel-history'
import { SET_PIXEL_QUERY } from './set-pixel'

type Coordinate = {
    x: number
    y: number
}

type PixelHistoryOptions = {
    coordinate?: Coordinate
    colorIndex?: number
    canvasIndex?: number
}

type PixelHistoryResponse = {
    data: {
        act: {
            data: {
                id: string
                data: any // This type can be refined further based on the actual structure.
            }
        }
    }
}

type PixelMessageData = {
    coordinate: Coordinate
    colorIndex: number
    canvasIndex: number
}

type SetPixelInput = {
    actionName: string
    PixelMessageData: PixelMessageData
}

type SetPixelVariables = {
    input: SetPixelInput
}

type SetPixelRequestBody = {
    operationName: string
    variables: SetPixelVariables
    query: string
}

type Fetcher = (url: string, options: RequestInit) => Promise<Response>

export const createRedditAPI = (token: string, fetcher: Fetcher = fetch) => {
    const BASE_URL = 'https://gql-realtime-2.reddit.com'
    const HEADERS = {
        accept: '*/*',
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        Referer: 'https://garlic-bread.reddit.com/',
    }

    const getPixelHistory = async (
        options: PixelHistoryOptions = {}
    ): Promise<PixelHistoryResponse> => {
        const { coordinate = { x: 0, y: 720 }, colorIndex = 0, canvasIndex = 1 } = options

        const body = {
            operationName: 'pixelHistory',
            variables: {
                input: {
                    actionName: 'r/replace:get_tile_history',
                    PixelMessageData: { coordinate, colorIndex, canvasIndex },
                },
            },

            query: PIXEL_HISTORY_QUERY,
        }

        const response = await fetcher(`${BASE_URL}/query`, {
            method: 'POST',
            headers: HEADERS,
            body: JSON.stringify(body),
        })

        if (!response.ok) {
            throw new Error(`Reddit API responded with ${response.status}`)
        }

        return await response.json()
    }

    const setPixel = async (x: number, y: number, colorIndex: number): Promise<Response> => {
        const requestBody: SetPixelRequestBody = {
            operationName: 'setPixel',
            variables: {
                input: {
                    actionName: 'r/replace:set_pixel',
                    PixelMessageData: {
                        coordinate: { x, y },
                        colorIndex,
                        canvasIndex: 1,
                    },
                },
            },

            query: SET_PIXEL_QUERY,
        }

        return fetcher(`${BASE_URL}/query`, {
            headers: HEADERS,
            body: JSON.stringify(requestBody),
            method: 'POST',
        })
    }

    return { getPixelHistory, setPixel }
}

// // Example usage:
// const api = createRedditAPI('YOUR_BEARER_TOKEN')
// api.getPixelHistory().then(console.log).catch(console.error)

// // Usage
// setPixel(325, 844, 13)
//     .then((response) => {
//         // Handle the response here
//     })
//     .catch((error) => {
//         console.error('Error setting pixel:', error)
//     })
