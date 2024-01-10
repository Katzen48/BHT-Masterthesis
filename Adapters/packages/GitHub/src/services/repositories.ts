import {Issue, PullRequest, Repository, Head, Commit, Deployment, Environment} from 'types'
import { global } from '@apollo/client/utilities/globals'

export async function listRepositories(): Promise<Repository[]> {
    const repositoryResults = await global.client.listRepositories()

    const repositories: Repository[] = repositoryResults.flatMap(repository => {
        return {
            id: encodeURIComponent(repository.owner.login + '/' + repository.name),
            full_name: repository.name,
            default_branch: repository.defaultBranchRef?.name,
            created_at: repository.createdAt,
            updated_at: repository.updatedAt
        }
    })

    return repositories
}

export async function getRepository(id: string): Promise<Repository> {
    const normalizedId: string = decodeURIComponent(id)
    const [ownerLogin, repositoryName] = normalizedId.split('/')

    const repository = await global.client.getRepository(ownerLogin, repositoryName)

    return {
        id: encodeURIComponent(repository.owner.login + '/' + repository.name),
        full_name: repository.name,
        default_branch: repository.defaultBranchRef?.name,
        created_at: repository.createdAt,
        updated_at: repository.updatedAt
    }
}

export async function getRepositoryIssues(id: string): Promise<Issue[]> {
    const normalizedId: string = decodeURIComponent(id)
    const [ownerLogin, repositoryName] = normalizedId.split('/')    

    const response = await global.client.listIssues(ownerLogin, repositoryName)
    const repo: Repository = {
        id: encodeURIComponent(response.owner.login + '/' + response.name),
        full_name: response.name,
        default_branch: response.defaultBranchRef?.name,
        created_at: response.createdAt,
        updated_at: response.updatedAt
    }

    const issues: Issue[] = []
    if (response.issues?.nodes?.length > 0) {
        for (const issue of response.issues.nodes) {
            const id = issue.number
            const created_at = issue.createdAt
            const closed_at = issue.closedAt
            const pull_requests: Set<string> = new Set<string>()

            if (issue.timelineItems?.nodes?.length > 0) {
                for (const item of issue.timelineItems.nodes) {
                    if (item.subject?.number) {
                        if (item.__typename === 'ConnectedEvent') {
                            pull_requests.add(String(item.subject.number))
                        } else if (item.__typename === 'DisconnectedEvent') {
                            pull_requests.delete(String(item.subject.number))
                        }
                    } else if (item.source?.number) {
                        if (item.__typename === 'ConnectedEvent') {
                            pull_requests.add(String(item.source.number))
                        } else if (item.__typename === 'DisconnectedEvent') {
                            pull_requests.delete(String(item.source.number))
                        }
                    }
                }
            }

            issues.push({
                id: String(id),
                created_at,
                closed_at,
                pull_requests: Array.from(pull_requests),
                repo
            })
        }
    }

    return issues
}

export async function getRepositoryPullRequests(id: string): Promise<PullRequest[]> {
    const normalizedId: string = decodeURIComponent(id)
    const [ownerLogin, repositoryName] = normalizedId.split('/')

    const response = await global.client.getPullRequests(ownerLogin, repositoryName)
    const repo: Repository = {
        id: encodeURIComponent(response.owner.login + '/' + response.name),
        full_name: response.name,
        default_branch: response.defaultBranchRef?.name,
        created_at: response.createdAt,
        updated_at: response.updatedAt
    }
    const pullRequests: PullRequest[] = []

    if (response.pullRequests?.nodes?.length > 0) {
        for (const pullRequest of response.pullRequests.nodes) {
            const id = String(pullRequest.number)
            const created_at = pullRequest.createdAt
            const closed_at = pullRequest.closedAt
            const merged_at = pullRequest.mergedAt
            const issues: Issue[] = []
            const commits: Commit[] = []
    
            const head: Head = {
                ref: pullRequest.headRefName
            }
            const base: Head = {
                ref: pullRequest.baseRefName,
            }

            if (pullRequest.closingIssuesReferences?.nodes?.length > 0) {
                for (const issue of pullRequest.closingIssuesReferences.nodes) {
                    issues.push({
                        id: String(issue.number),
                        created_at: issue.createdAt,
                        closed_at: issue.closedAt,
                        repo: {
                            id: encodeURIComponent(issue.repository.owner.login + '/' + issue.repository.name),
                            full_name: issue.repository.name,
                            default_branch: issue.repository.defaultBranchRef.name,
                            created_at: issue.repository.createdAt,
                            updated_at: issue.repository.updatedAt
                        }
                    })
                }
            }
            if (pullRequest.commits?.nodes?.length > 0) {
                for (const commit of pullRequest.commits.nodes) {
                    commits.push({
                        sha: commit.commit.oid,
                        repo,
                        created_at: commit.commit.authoredDate ?? commit.commit.committedDate
                    })
                }
            }

            pullRequests.push({
                id,
                created_at,
                closed_at,
                repo,
                head,
                base,
                merged_at,
                issues,
                commits
            })
        }
    }

    return pullRequests
}

export async function getRepositoryCommits(id: string): Promise<Commit[]> {
    const normalizedId: string = decodeURIComponent(id)
    const [ownerLogin, repositoryName] = normalizedId.split('/')

    const response: any = await global.client.getCommits(ownerLogin, repositoryName)
    const repo: Repository = {
        id: encodeURIComponent(response.owner.login + '/' + response.name),
        full_name: response.name,
        default_branch: response.defaultBranchRef?.name,
        created_at: response.createdAt,
        updated_at: response.updatedAt
    }

    const commitIds: Set<string> = new Set()
    const commitObjects: any = {}

    if (response.refs?.nodes?.length > 0) {
        for (const ref of response.refs.nodes) {
            if (ref.target?.history?.nodes?.length > 0) {
                for (const commit of ref.target.history.nodes) {
                    commitIds.add(commit.oid)
                    commitObjects[commit.oid] = commit
                }
            }
        }
    }

    const commits: Commit[] = []
    for (const sha of commitIds) {
        const commitObject = commitObjects[sha]
        commits.push({
            sha,
            repo,
            created_at: commitObject?.authoredDate ?? commitObject?.committedDate
        })
    }

    return commits
}

export async function getRepositoryDeployments(id: string): Promise<Deployment[]> {
    const normalizedId: string = decodeURIComponent(id)
    const [ownerLogin, repositoryName] = normalizedId.split('/')

    const rawRepo: any = await global.client.getRepository(ownerLogin, repositoryName)
    const repo: Repository = {
        id: encodeURIComponent(rawRepo.owner.login + '/' + rawRepo.name),
        full_name: rawRepo.name,
        default_branch: rawRepo.defaultBranchRef?.name,
        created_at: rawRepo.createdAt,
        updated_at: rawRepo.updatedAt
    }

    const response = await global.client.listDeployments(ownerLogin, repositoryName)

    const deployments: Deployment[] = []
    if (response?.length > 0) {
        for (const deployment of response) {
            const id = String(deployment.id)
            const sha = deployment.sha
            const commit: Commit = {
                sha: deployment.sha,
                repo
            }
            const ref = deployment.ref
            const task = deployment.task
            const environment: Environment|null = deployment.environment ? {
                id: deployment.environment,
                name: deployment.environment,
                created_at: null,
                updated_at: null
            } : null
            const created_at = deployment.created_at
            const updated_at = deployment.updated_at

            deployments.push({
                id,
                sha,
                commit,
                ref,
                task,
                environment,
                created_at,
                updated_at
            })
        }
    }

    return deployments
}

export async function getRepositoryEnvironments(id: string): Promise<Environment[]> {
    const normalizedId: string = decodeURIComponent(id)
    const [ownerLogin, repositoryName] = normalizedId.split('/')

    const response = await global.client.listEnvironments(ownerLogin, repositoryName)
    
    const environments: Environment[] = []
    if (response?.environments?.length > 0) {
        for (const environment of response.environments) {            
            environments.push({
                id: String(environment.name),
                name: environment.name,
                created_at: environment.created_at,
                updated_at: environment.updated_at
            })
        }
    }

    return environments
}