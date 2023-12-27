import {Issue, PullRequest, Repository, Head, Commit, Deployment} from 'types'
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
            id: encodeURIComponent(repository.project.id + '/' + repository.id),
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
        id: repository.project.id + '/' + repository.id,
        full_name: repository.name,
        default_branch: repository.defaultBranch,
        created_at: null,
        updated_at: null
    }
}

export async function getRepositoryIssues(id: string): Promise<Issue[]> {
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

export async function getRepositoryPullRequests(id: string): Promise<PullRequest[]> {
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

    // TODO pagination
    const results: any[] = await global.client.getPullRequests(projectId, repositoryId)
    const pullRequests: PullRequest[] = []
    
    for (const pullRequest of results) {
        const issues: Issue[] = (await global.client.getPullRequestWorkItems(projectId, repositoryId, pullRequest.pullRequestId)).map(workItem => {
            return {
                id: workItem.id
            }
        })

        const commits: Commit[] = (await global.client.getPullRequestCommits(projectId, repositoryId, pullRequest.pullRequestId)).map(commit => {
            return {
                sha: commit.commitId
            }
        })

        const head: Head = {
            ref: pullRequest.sourceRefName,
            sha: pullRequest.lastMergeSourceCommit.commitId
        }
        const base: Head = {
            ref: pullRequest.targetRefName,
            sha: pullRequest.lastMergeTargetCommit.commitId
        }
        pullRequests.push({
            id: pullRequest.pullRequestId,
            created_at: pullRequest.creationDate,
            closed_at: pullRequest.closedDate,
            repo,
            head,
            base,
            merged_at: pullRequest.status === 'completed' ? pullRequest.closedDate : null,
            issues,
            commits
        })
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