import { handleRequest } from "./router"
import {Client} from './services/client'

global.client = Client.personalAccessToken(process.env.ORG_URL || 'test', process.env.PAT || 'test')

const server = Bun.serve({
    port: 3000,
    async fetch(request: Request) {
        return await handleRequest(request)
    }
})

console.log(`Listening on ${server.hostname}:${server.port}`)