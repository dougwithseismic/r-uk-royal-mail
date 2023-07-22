import { PIXEL_HISTORY_QUERY } from './get-pixel-history'
import { SET_PIXEL_QUERY } from './set-pixel'

export interface RedditAPI {
    getPixelHistory: (options?: PixelHistoryOptions) => Promise<PixelHistoryResponse>
    setPixel: (x: number, y: number, colorIndex: number) => Promise<Response>
}

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

/**
 * Creates a Reddit API client for interacting with Reddit's GraphQL API.
 *
 * @param {string} token - The Bearer Token for authentication.
 * @param {Fetcher} [fetcher=fetch] - (Optional) A custom fetch function. Defaults to global fetch.
 * @returns {Object} - An API client object with methods to interact with the Reddit API.
 */

export const createRedditAPI = (token: string, fetcher: Fetcher = fetch): RedditAPI => {
    const BASE_URL = 'https://gql-realtime-2.reddit.com'
    const HEADERS = {
        accept: '*/*',
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        Referer: 'https://garlic-bread.reddit.com/',
    }

    /**
     * Fetches the history of a pixel.
     *
     * @param {PixelHistoryOptions} [options={}] - (Optional) Configuration options.
     * @returns {Promise<PixelHistoryResponse>} - A promise that resolves to the pixel history response.
     */

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
    /**
     * Sets a pixel's color at a specific coordinate.
     *
     * @param {number} x - The x-coordinate of the pixel.
     * @param {number} y - The y-coordinate of the pixel.
     * @param {number} colorIndex - The color index to set.
     * @returns {Promise<Response>} - A promise that resolves to the set pixel response.
     */

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

/**
 * EXAMPLE USAGE:
 *
 * 1. First, ensure you have an authentication token from Reddit. This might be obtained
 *    from the Reddit OAuth2 flow or other authentication methods provided by Reddit.
 *    Store this token securely.
 *
 *    const myRedditToken = 'YOUR_BEARER_TOKEN_HERE';
 *
 * 2. Create the Reddit API client:
 *
 *    const redditAPI = createRedditAPI(myRedditToken);
 *
 * 3. Use the API client to interact with the Reddit API.
 *
 *    // Fetching the history of a pixel at (10, 20) with a specific color index:
 *    redditAPI.getPixelHistory({ coordinate: { x: 10, y: 20 }, colorIndex: 3 })
 *      .then(response => {
 *          console.log('Pixel History:', response);
 *      })
 *      .catch(error => {
 *          console.error('Error fetching pixel history:', error);
 *      });
 *
 *    // Setting a pixel color at coordinates (15, 25) with color index 5:
 *    redditAPI.setPixel(15, 25, 5)
 *      .then(response => {
 *          console.log('Pixel set successfully:', response);
 *      })
 *      .catch(error => {
 *          console.error('Error setting pixel:', error);
 *      });
 *
 * 4. Always handle potential errors when calling these API methods, as demonstrated in the examples above.
 */
