import {listRepositories, getRepository, getRepositoryIssues, getRepositoryPullRequests, getRepositoryCommits, getRepositoryDeployments, getRepositoryEnvironments} from "./services/repositories"

export async function handleDirect(request: Request, pathParts: string[], searchParams: URLSearchParams): Promise<Response> {
    if (pathParts.length > 1) {
        switch(pathParts[1]) {
            case 'repos':
                return await handleRepos(request, pathParts, searchParams)
        }
    }

    return new Response('Empty from handleDirect')
}

async function handleRepos(request: Request, pathParts: string[], searchParams: URLSearchParams): Promise<Response> {
    if (pathParts.length < 3) {
        return Response.json(await listRepositories())
    }
    if (pathParts.length === 3) {
        return Response.json(await getRepository(pathParts[2]))
    }
    if (pathParts.length === 4) {
        switch (pathParts[3]) {
            case 'issues':
                return  Response.json(await getRepositoryIssues(pathParts[2]))
            case 'pulls':
                return Response.json(await getRepositoryPullRequests(pathParts[2]))
            case 'commits':
                return Response.json(await getRepositoryCommits(pathParts[2]))
            case 'deployments':
                return Response.json(await getRepositoryDeployments(pathParts[2]))
            case 'environments':
                return Response.json(await getRepositoryEnvironments(pathParts[2]))
        }
    }

    return new Response('Empty from handleRepos', {status: 404})
}