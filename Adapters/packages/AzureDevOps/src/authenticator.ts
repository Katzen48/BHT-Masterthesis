function isTokenValid(value: string|null): boolean {
    if (!value) {
        return false
    }

    const valueParts = value.split(' ')
    if (valueParts.length !== 2) {
        return false
    }

    if (!process.env.TOKEN) {
        return false
    }

    return valueParts[1] == process.env.TOKEN
}

export function handleRequest(request: Request) {
    const authorization = request.headers.get('Authorization')
    if (!isTokenValid(authorization)) {
        throw new UnauthorizedError()
    }
}

export class UnauthorizedError extends Error {}