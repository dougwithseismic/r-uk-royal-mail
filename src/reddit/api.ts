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

/*
# 🍵☠️ Reddit API Tea-Time with Sir Pixel the Pirate ☠️🍵

Ahoy mateys! Lend an ear, for Sir Pixel, the most esteemed tea pirate in all of the British Isles, has stumbled upon a bounty of code that lets one parlay with the treacherous waters of the Reddit GraphQL API. As with any fine treasure, let us embark on a voyage of understanding its mysteries!

---

## The Lay of the Land (Code Overview)

1. We be importing treasures from various locations, such as the `body-parser` and specific queries for manipulating pixels.
2. Our home port be set as `https://gql-realtime-2.reddit.com`, the Reddit GraphQL API.

---

## The Pirate's Tools (Main Functions)

### `createHeaders(token: string): object`

Arr, this be the key to safe passage on the Reddit seas! It crafts the proper headers for the ship, ensuring we're recognized by those API landlubbers.

### `makeFetchRequest(...)`

With a map in hand, this function sails the treacherous waters of the Internet to reach Reddit's shores. But beware! Rough seas may throw errors, so be ready to catch any thrown overboard.

### `createRedditAPI(token: string, fetcher: Fetcher = fetch): RedditAPI`

The captain's quarters of our operation. It prepares our ship for the voyage and equips it with two main tools:

- `getPixelHistory(...)`: Retrieves tales of a pixel's past adventures.
- `setPixel(...)`: Marks our territory on the canvas by setting a pixel's hue.

---

## The Pirate's Guide (Usage)

1. **Obtaining the Secret Map (Token)**: Before ye set sail, procure an authentication token from Reddit. This be your map through OAuth2 or other mysterious ways offered by Reddit. Guard it with your life!

   ```javascript
   const myRedditToken = 'YOUR_BEARER_TOKEN_HERE';
   ```

2. **Ready the Ship (Create API client)**: With the map in hand, prepare your ship for the grand journey.

   ```javascript
   const redditAPI = createRedditAPI(myRedditToken);
   ```

3. **Embark on Adventures (Using the API)**:

   - To hear the tales of a pixel's past:
     ```javascript
     redditAPI.getPixelHistory({ coordinate: { x: 10, y: 20 }, colorIndex: 3 })
       .then(response => {
           console.log('Pixel History:', response);
       })
       .catch(error => {
           console.error('Error fetching pixel history:', error);
       });
     ```

   - To stake your claim on a piece of the canvas:
     ```javascript
     redditAPI.setPixel(15, 25, 5)
       .then(response => {
           console.log('Pixel set successfully:', response);
       })
       .catch(error => {
           console.error('Error setting pixel:', error);
       });
     ```

4. **The Pirate's Caution**: The seas be unpredictable! Always be on the lookout for errors when interacting with the API. A wise pirate is always prepared for the unexpected!

--

# 📜 Additional Provisions for the Voyage (Advanced Tips) 📜

---

## 🍪 Storing Ye Cookies (Data Persistence)

Should ye wish to remember your interactions with the Reddit shores, think about storing your tokens and pixel histories in a trusty chest (database or local storage). But remember, keep that chest locked tight against prying eyes!

---

## 🌊 Handling the Stormy Seas (Error Handling)

'Tis the nature of the sea to be unpredictable. Your interactions with the Reddit API may sometimes encounter choppy waters. Best to have a contingency plan:

1. **Ratelimited?** Be patient! The Reddit seas sometimes ask sailors to slow down. If ye get this error, wait for the cooldown and try again.
   
2. **API Errors**: Keep an eye out for any errors thrown by the API. If your crew (code) reports the situation as `Ratelimited`, ensure you check for the `nextAvailablePixelTimestamp` to know when it's safe to sail again.

---

## 🦜 Listening to the Crows Nest (Feedback)

Should ye be in need of feedback from your shipmates or users, consider implementing some logging or a feedback system. Let them parrots squawk when they see issues, so you know the state of the seas!

---

## 🍵 Afternoon Tea with Sir Pixel

Lastly, after your hard work on the high seas, always take a moment to sit down for a cuppa. Every great British tea pirate knows the importance of a good Earl Grey to keep the spirits high and the code sharp!

---

So, there ye have it, mateys! Sir Pixel wishes you fair winds and following seas on your coding adventures. And should you ever find yourself in a pickle, just remember the pirate's code (well, more guidelines than actual rules) and keep a steady hand on the helm. Cheerio and anchors aweigh! ☕️⚓

To conclude, always remember, a pirate's life be full of adventure and peril, but with the right tools and some good ol' British tea, the Reddit GraphQL API be no match for Sir Pixel the Pirate. May your voyages be smooth, and your pixels ever in your favour! ☕️🏴‍☠️


*/
