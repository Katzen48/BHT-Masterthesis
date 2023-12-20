import {Issue, Repository} from 'types'
import {chunk} from '../utils'

export async function listRepositories(): Promise<Repository[]> {
    const repositoryPromises = []
    const projects = await global.client.listProjects()

    for (const project of projects) {
        repositoryPromises.push(global.client.listRepositories(project.id))
    }

    let resultPromise = await Promise.all(repositoryPromises)
    const repositoryResults = []
    resultPromise.forEach(result => {
        repositoryResults.push(...result)
    })

    const repositories: Repository[] = repositoryResults.flatMap(repository => {
        return {
            id: repository.id,
            full_name: repository.name,
            default_branch: repository.defaultBranch,
            created_at: null,
            updated_at: null
        }
    })

    return repositories
}

export async function getRepository(id: string): Promise<Repository> {
    const normalizedId: string = decodeURIComponent(id)
    const [projectId, repositoryId] = normalizedId.split('/')

    const repository = await global.client.getRepository(projectId, repositoryId)

    return {
        id: repository.id,
        full_name: repository.name,
        default_branch: repository.defaultBranch,
        created_at: null,
        updated_at: null
    }
}

export async function getRepositoryIssues(id: string): Promise<Issue[]> {
    const normalizedId: string = decodeURIComponent(id)
    const [projectId, repositoryId] = normalizedId.split('/')

    const repo = await global.client.getRepository(projectId, repositoryId)

    const issuePromises = []
    const teams = await global.client.listTeams(projectId)
    for (const team of teams) {
        issuePromises.push(global.client.listWorkItems(projectId, team.id).then(async function(workItems: Array<any>) {
            const issues = []

            await chunk(workItems, async function(batch: Array<any>) {
                const ids = batch.flatMap((workItem) => workItem.id)
                issues.push(await global.client.getWorkItem(projectId, ids))
            })

            return issues
        }))
    }
    let issueResults = await Promise.all(issuePromises)
    issueResults = [...issueResults].flat().flatMap((issueResult) => issueResult.value)

    return issueResults.map(issue => {
        const pull_requests = issue.relations?.filter(relation => relation.rel === 'ArtifactLink' && relation.url?.includes('PullRequestId') && relation.attributes?.id).map(pullRequest => {
            return pullRequest.attributes.id
        })

        return {
            id: issue.id,
            pull_requests,
            created_at: issue.fields['System.CreatedDate'],
            closed_at: issue.fields['Microsoft.VSTS.Common.ClosedDate'],
            repo
        }
    })
}