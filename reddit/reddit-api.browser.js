(() => {
  // src/reddit/get-pixel-history.ts
  var PIXEL_HISTORY_QUERY = (
    /* GraphQL */
    `
    mutation pixelHistory($input: ActInput!) {
        act(input: $input) {
            data {
                ... on BasicMessage {
                    id
                    data {
                        ... on GetTileHistoryResponseMessageData {
                            lastModifiedTimestamp
                            userInfo {
                                userID
                                username
                                __typename
                            }
                            __typename
                        }
                        __typename
                    }
                    __typename
                }
                __typename
            }
            __typename
        }
    }
`
  );

  // src/reddit/set-pixel.ts
  var SET_PIXEL_QUERY = (
    /* GraphQL */
    `
    mutation setPixel($input: ActInput!) {
        act(input: $input) {
            data {
                ... on BasicMessage {
                    id
                    data {
                        ... on GetUserCooldownResponseMessageData {
                            nextAvailablePixelTimestamp
                            __typename
                        }
                        ... on SetPixelResponseMessageData {
                            timestamp
                            __typename
                        }
                        __typename
                    }
                    __typename
                }
                __typename
            }
            __typename
        }
    }
`
  );

  // src/reddit/api.ts
  var BASE_URL = "https://gql-realtime-2.reddit.com";
  var createHeaders = (token) => ({
    accept: "*/*",
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
    Referer: "https://garlic-bread.reddit.com/"
  });
  var makeFetchRequest = async (url, body, headers, fetcher) => {
    const response = await fetcher(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      throw new Error(`Reddit API responded with ${response.status}`);
    }
    return await response.json();
  };
  var createRedditAPI = (token, fetcher = fetch) => {
    const HEADERS = createHeaders(token);
    const getPixelHistory = async (options = {}) => {
      const { coordinate = { x: 0, y: 720 }, colorIndex = 0, canvasIndex = 1 } = options;
      const body = {
        operationName: "pixelHistory",
        variables: {
          input: {
            actionName: "r/replace:get_tile_history",
            PixelMessageData: { coordinate, colorIndex, canvasIndex }
          }
        },
        query: PIXEL_HISTORY_QUERY
      };
      return await makeFetchRequest(`${BASE_URL}/query`, body, HEADERS, fetcher);
    };
    const setPixel = async (x, y, colorIndex, canvasIndex = 1) => {
      const requestBody = {
        operationName: "setPixel",
        variables: {
          input: {
            actionName: "r/replace:set_pixel",
            PixelMessageData: {
              coordinate: { x, y },
              colorIndex,
              canvasIndex
            }
          }
        },
        query: SET_PIXEL_QUERY
      };
      const response = await makeFetchRequest(`${BASE_URL}/query`, requestBody, HEADERS, fetcher);
      if (response.errors) {
        const errMessage = response.errors[0].message;
        switch (errMessage) {
          case "Ratelimited":
            const nextAvailablePixelTimestamp = response.errors[0].extensions.nextAvailablePixelTs;
            return {
              error: "rate_limited",
              data: {
                nextAvailablePixelTimestamp,
                message: `Looks like we tried to set a pixel whilst on cooldown. No problem! We'll try again.`
              }
            };
          default:
            throw new Error(response.errors);
        }
      }
      return response;
    };
    return { getPixelHistory, setPixel };
  };
})();
