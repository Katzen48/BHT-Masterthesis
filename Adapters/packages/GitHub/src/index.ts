import * as Router from "./router"
import * as Authenticator from "./authenticator"
import {Client} from './services/client'

global.client = Client.personalAccessToken(process.env.ORG_URL || 'https://api.github.com/', process.env.PAT || 'test')

const server = Bun.serve({
    port: 3000,
    async fetch(request: Request) {
        await Authenticator.handleRequest(request)
        return await Router.handleRequest(request)
    },
    error(error) {
        if (error instanceof Authenticator.UnauthorizedError) {
            return new Response(null, {status: 401})
        }
    },
})

console.log(`Listening on ${server.hostname}:${server.port}`)