import {handleDirect} from './direct'

export async function handleRequest(request: Request): Promise<Response> {
    const {method} = request
    const {pathname, searchParams} = new URL(request.url)

    const pathParts = pathname.toLocaleLowerCase().split('/')

    if (pathParts.length > 0) {
        if (pathParts[0] === '') {
            pathParts.shift()
        }
        if (pathParts[pathParts.length - 1] === '') {
            pathParts.pop()
        }

        if (pathParts[0] === 'direct') {
            return await handleDirect(request, pathParts, searchParams)
        }
    }

    console.debug('Empty for url', request.url, 'path:', pathname, 'path parts:', pathParts)
    return new Response('Empty from handleRequest')
}