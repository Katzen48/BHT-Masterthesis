import { listRepositories, getRepository, getRepositoryIssues } from "./services/repositories"
import {listProjects, getProject} from './services/projects'

export async function handleDirect(request: Request, pathParts: string[], searchParams: URLSearchParams): Promise<Response> {
    if (pathParts.length > 1) {
        switch(pathParts[1]) {
            case 'repos':
                return await handleRepos(request, pathParts, searchParams)
            case 'projects':
                return await handleProjects(request, pathParts, searchParams)
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
        }
    }

    return new Response('Empty from handleRepos', {status: 404})
}

async function handleProjects(request: Request, pathParts: string[], searchParams: URLSearchParams): Promise<Response> {
    if (pathParts.length < 3) {
        return Response.json(await listProjects())
    }
    if (pathParts.length === 3) {
        return Response.json(await getProject(pathParts[2]))
    }

    return new Response('Empty from handleProjects', {status: 404})
}