import swaggerJsdoc from 'swagger-jsdoc'

const swaggerOptions = {
    swaggerDefinition: {
        openapi: '3.0.0',
        components: {},
        servers: [
            {
                url: 'https://localhost:5678/',
                description: 'Main Endpoint',
            },
        ],
        info: {
            title: 'OpenAPI Change Me',
            description: `here's a description. The API is a work in progress somewhere around here, I swear.`,
            version: '1.0.0',
            contact: {
                name: 'doug@withseismic.com',
                url: 'https://x.withseismic.com',
                github:'https://github.com/dougwithseismic'

            },

        },
    },
    apis: ['./src/routes/*.ts'],
}
// Initialize swagger-jsdoc -> returns validated swagger spec in json format
const swaggerDocs = swaggerJsdoc(swaggerOptions)

export default swaggerDocs
