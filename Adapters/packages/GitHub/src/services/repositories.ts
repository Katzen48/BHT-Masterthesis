import {Issue, PullRequest, Repository, Head, Commit, Deployment} from 'types'
import {chunk} from '../utils'
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

    //const rawRepo = await global.client.getRepository(projectId, repositoryId)
    

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
                id,
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

    // TODO pagination
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
            const id = pullRequest.number
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
                        repo
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
    const [projectId, repositoryId] = normalizedId.split('/')

    const rawRepo = await global.client.getRepository(projectId, repositoryId)
    const repo: Repository = {
        id: encodeURIComponent(rawRepo.project.id + '/' + rawRepo.id),
        full_name: rawRepo.name,
        default_branch: rawRepo.defaultBranch,
        created_at: null,
        updated_at: null 
    }

    const commits: Commit[] = (await global.client.getCommits(projectId, repositoryId)).map(commit => {
        return {
            sha: commit.commitId,
            repo
        }
    })

    return commits
}

export async function getRepositoryPipelines(id: string): Promise<any[]> {
    const normalizedId: string = decodeURIComponent(id)
    const [projectId, repositoryId] = normalizedId.split('/')

    const rawRepo = await global.client.getRepository(projectId, repositoryId)
    const repo: Repository = {
        id: encodeURIComponent(rawRepo.project.id + '/' + rawRepo.id),
        full_name: rawRepo.name,
        default_branch: rawRepo.defaultBranch,
        created_at: null,
        updated_at: null 
    }

    const commits: Commit[] = (await global.client.getCommits(projectId, repositoryId)).map(commit => {
        return {
            sha: commit.commitId,
            repo
        }
    })

    return commits
}

export async function getRepositoryDeployments(id: string)/*: Promise<Deployment[]>*/ {
    const normalizedId: string = decodeURIComponent(id)
    const [projectId, repositoryId] = normalizedId.split('/')

    const rawRepo = await global.client.getRepository(projectId, repositoryId)
    const repo: Repository = {
        id: encodeURIComponent(rawRepo.project.id + '/' + rawRepo.id),
        full_name: rawRepo.name,
        default_branch: rawRepo.defaultBranch,
        created_at: null,
        updated_at: null 
    }

    const pipelineIds = (await global.client.listPipelines(projectId)).flatMap(pipeline => pipeline.id)

    const deployments: Deployment[] = []
    for (const pipelineId of pipelineIds) {
        const runs = await global.client.listPipelineRuns(projectId, pipelineId)
        const detailedRuns = []
        for (const run of runs) {
            const detailedRun = await global.client.getPipelineRun(projectId, pipelineId, run.id)
            const repoResource = detailedRun.resources?.repositories?.self

            deployments.push({
                id: detailedRun.id,
                sha: repoResource?.version,
                commit: {
                    sha: repoResource?.version,
                    repo
                },
                ref: repoResource?.refName,
                task: detailedRun.pipeline.name,
                environment: null,
                created_at: detailedRun.createdDate,
                updated_at: detailedRun.finishedDate
            })
        }
    }

    return deployments
}