
export interface RedditAPI {
    getPixelHistory: (options?: PixelHistoryOptions) => Promise<PixelHistoryResponse>;
    setPixel: (x: number, y: number, colorIndex: number) => Promise<SetPixelResponse>;
}
type Coordinate = {
    x: number;
    y: number;
};
export type PixelHistoryOptions = {
    coordinate?: Coordinate;
    colorIndex?: number;
    canvasIndex?: number;
};
export type PixelHistoryResponse = {
    data: {
        act: {
            data: {
                id: string;
                data: any; // This type can be refined further based on the actual structure.
            };
        };
    };
};
type PixelMessageData = {
    coordinate: Coordinate;
    colorIndex: number;
    canvasIndex: number;
};
type SetPixelInput = {
    actionName: string;
    PixelMessageData: PixelMessageData;
};
type SetPixelVariables = {
    input: SetPixelInput;
};
export type SetPixelRequestBody = {
    operationName: string;
    variables: SetPixelVariables;
    query: string;
};
export type SetPixelResponse = {
    data: {
        act?: ActResponse;
        [key: string]: any; // This type can be refined further based on the actual structure.
    };
    error?: any;
};
type ActResponse = {
    data: BasicMessage[];
    __typename: 'ActResponse';
};
type BasicMessage = {
    id: string;
    data: GetUserCooldownResponseMessageData | SetPixelResponseMessageData;
    __typename: 'BasicMessage';
};
type GetUserCooldownResponseMessageData = {
    nextAvailablePixelTimestamp: number;
    __typename: 'GetUserCooldownResponseMessageData';
};
type SetPixelResponseMessageData = {
    timestamp: number;
    __typename: 'SetPixelResponseMessageData';
};
export type Fetcher = (url: string, options: RequestInit) => Promise<Response>;
