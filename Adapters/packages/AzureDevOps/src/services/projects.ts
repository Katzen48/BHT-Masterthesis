import {Repositories, Repository} from 'types'

export async function listProjects() {
    const repositoriesArray = []
    const projects = await global.client.listProjects()

    return {
        data: projects
    }
}

export async function getProject(id: string) {
    const normalizedId: string = decodeURIComponent(id)

    return await global.client.getProject(normalizedId)
}