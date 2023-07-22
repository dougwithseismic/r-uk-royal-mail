import { json } from 'body-parser'
import { PIXEL_HISTORY_QUERY } from './get-pixel-history'
import { SET_PIXEL_QUERY } from './set-pixel'
import {
    Fetcher,
    RedditAPI,
    PixelHistoryOptions,
    PixelHistoryResponse,
    SetPixelResponse,
    SetPixelRequestBody,
} from './types'

/**
 * URL for the Reddit GraphQL API.
 *
 * @constant {string} BASE_URL
 */

const BASE_URL = 'https://gql-realtime-2.reddit.com'

/**
 * Creates the necessary headers for Reddit API requests.
 *
 * @function createHeaders
 * @param {string} token - The Bearer Token for authentication.
 * @returns {Object} - A headers object to be used in fetch requests.
 */
export const createHeaders = (token: string): object => ({
    accept: '*/*',
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
    Referer: 'https://garlic-bread.reddit.com/',
})

/**
 * Makes a fetch request with the provided data.
 *
 * @async
 * @function makeFetchRequest
 * @param {string} url - The URL to make the request to.
 * @param {Object} body - The request body.
 * @param {Object} headers - The headers for the request.
 * @param {Fetcher} fetcher - The fetch function to use.
 * @returns {Promise<Object>} - A promise that resolves with the JSON parsed response of the fetch request.
 * @throws Will throw an error if the fetch request is not successful.
 */
export const makeFetchRequest = async (
    url: string,
    body: any,
    headers: any,
    fetcher: Fetcher
): Promise<any> => {
    const response = await fetcher(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    })

    if (!response.ok) {
        throw new Error(`Reddit API responded with ${response.status}`)
    }

    return await response.json()
}

/**
 * Creates a Reddit API client for interacting with Reddit's GraphQL API.
 *
 * @function createRedditAPI
 * @param {string} token - The Bearer Token for authentication.
 * @param {Fetcher} [fetcher=fetch] - (Optional) A custom fetch function. Defaults to global fetch.
 * @returns {RedditAPI} - An API client object with methods to interact with the Reddit API.
 */

export const createRedditAPI = (token: string, fetcher: Fetcher = fetch): RedditAPI => {
    const HEADERS = createHeaders(token)

    /**
     * Fetches the history of a pixel.
     *
     * @async
     * @function getPixelHistory
     * @param {PixelHistoryOptions} [options={}] - (Optional) Configuration options.
     * @returns {Promise<PixelHistoryResponse>} - A promise that resolves to the pixel history response.
     * @throws Will throw an error if the fetch request is not successful.
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
        return await makeFetchRequest(`${BASE_URL}/query`, body, HEADERS, fetcher)
    }

    /**
     * Sets a pixel's color at a specific coordinate.
     *
     * @async
     * @function setPixel
     * @param {number} x - The x-coordinate of the pixel.
     * @param {number} y - The y-coordinate of the pixel.
     * @param {number} colorIndex - The color index to set.
     * @returns {Promise<SetPixelResponse>} - A promise that resolves to the set pixel response.
     * @throws Will throw an error if there's an error setting the pixel or if the fetch request is not successful.
     */

    const setPixel = async (
        x: number,
        y: number,
        colorIndex: number,
        canvasIndex: number = 1
    ): Promise<SetPixelResponse> => {
        const requestBody: SetPixelRequestBody = {
            operationName: 'setPixel',
            variables: {
                input: {
                    actionName: 'r/replace:set_pixel',
                    PixelMessageData: {
                        coordinate: { x, y },
                        colorIndex,
                        canvasIndex,
                    },
                },
            },
            query: SET_PIXEL_QUERY,
        }
        const response = await makeFetchRequest(`${BASE_URL}/query`, requestBody, HEADERS, fetcher)
        if (response.errors) {
            const errMessage = response.errors[0].message
            switch (errMessage) {
                case 'Ratelimited':
                    const nextAvailablePixelTimestamp =
                        response.errors[0].extensions.nextAvailablePixelTs
                    return {
                        error: 'rate_limited',
                        data: {
                            nextAvailablePixelTimestamp,
                            message: `Looks like we tried to set a pixel whilst on cooldown. No problem! We'll try again.`,
                        },
                    }
                default:
                    throw new Error(response.errors)
            }
        }
        return response
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
