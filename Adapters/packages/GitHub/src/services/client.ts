import { ApolloClient, InMemoryCache, gql, NormalizedCacheObject, createHttpLink, ApolloLink, concat, ApolloQueryResult, DocumentNode } from '@apollo/client/core';

export class Client {
    private baseUrl: string
    private token: string
    private client: ApolloClient<NormalizedCacheObject>

    private constructor(baseUrl: string, token: string) {
        this.baseUrl = baseUrl
        if (!this.baseUrl.endsWith('/')) {
            this.baseUrl += '/'
        }

        this.token = token


        const httpLink: ApolloLink = createHttpLink({
            uri: baseUrl
        })
        const authLink = new ApolloLink((operation, forward) => {
            operation.setContext({
                headers: {
                  authorization: `bearer ${this.token}`,
                },
              });
              return forward(operation);
          });

        this.client = new ApolloClient({
            cache: new InMemoryCache(),
            link: concat(authLink, httpLink)
        })
    }

    static personalAccessToken(orgUrl: string, pat: string): Client {
        return new Client(orgUrl, pat)
    }

    async listRepositories() {
        const query = gql`
            query($rCursor: String, $oCursor: String) {
                viewer {
                    repositories(first: 100, after: $rCursor) {
                        pageInfo {
                            hasNextPage
                            endCursor
                        }
                        nodes {
                            id
                            owner {
                                login
                            }
                            name
                            defaultBranchRef {
                                name
                            }
                            createdAt
                            updatedAt
                        }
                    }
                    organizations(first: 100, after: $oCursor) {
                        pageInfo {
                            hasNextPage
                            endCursor
                        }
                        nodes {
                            login
                        }
                    }
                }
            }
        `

        const repos: any[] = []

        let moreRepos = true
        let moreOrgs = true

        let rCursor = null
        let oCursor = null

        while(moreRepos || moreOrgs) {
            const viewer: any = (await this.execute(query, {
                rCursor,
                oCursor
            })).data?.viewer

            if (viewer?.repositories) {
                const repositories: any = viewer.repositories
                
                if (moreRepos) {
                    rCursor = repositories.pageInfo?.endCursor
                    moreRepos = repositories.pageInfo?.hasNextPage === true
                    
                    if (repositories.nodes?.length > 0) {
                        for (const repo of repositories.nodes) {
                            repos.push(repo)
                        }
                    }
                }
            }

            if (viewer?.organizations) {
                const organizations: any = viewer.organizations

                if (moreOrgs) {
                    moreOrgs = (organizations.pageInfo?.hasNextPage === true)
                    oCursor = organizations?.pageInfo?.endCursor

                    if (organizations.nodes?.length > 0) {
                        for (const organization of organizations.nodes) {
                            repos.push(...(await this.getOrganizationRepositories(organization.login)))
                        }
                    }
                }
            }
        }

        return repos
    }

    async getOrganizationRepositories(organizationLogin: string) {
        const query = gql`
            query($organizationLogin: String!, $rCursor: String) {
                organization(login: $organizationLogin) {
                    repositories(first: 100, after: $rCursor) {
                        pageInfo {
                            hasNextPage
                            endCursor
                        }
                        nodes {
                            id
                            owner {
                                login
                            }
                            name
                            defaultBranchRef {
                                name
                            }
                            createdAt
                            updatedAt
                        }
                    }
                }
            }
        `

        let moreRepos = true
        let rCursor = null

        const repos: any[] = []
        while(moreRepos) {
            const organization: any = (await this.execute(query, {
                rCursor,
                organizationLogin
            })).data?.organization

            moreRepos = organization?.repositories?.pageInfo?.hasNextPage === true
            rCursor = organization?.repositories?.pageInfo?.endCursor

            if (organization.repositories?.nodes?.length > 0) {
                for (const repo of organization.repositories.nodes) {
                    repos.push(repo)
                }
            }
        }

        return repos
    }

    async getRepository(ownerLogin: string, repositoryName: string) {
        const query = gql`
            query($ownerLogin: String!, $repositoryName: String!) {
                repository(owner: $ownerLogin, name: $repositoryName) {
                    id
                    owner {
                        login
                    }
                    name
                    defaultBranchRef {
                        name
                    }
                    createdAt
                    updatedAt
                  }
            }
        `

        return (await this.execute(query, {
            ownerLogin,
            repositoryName
        })).data.repository
    }

    async listIssues(ownerLogin: string, repositoryName: string) {
        const query = gql`
            query($ownerLogin: String!, $repositoryName: String!) {
                repository(owner: $ownerLogin, name: $repositoryName) {
                    id
                    owner {
                        login
                    }
                    name
                    defaultBranchRef {
                        name
                    }
                    createdAt
                    updatedAt
                    issues(first: 100) {
                        nodes {
                            number
                            createdAt
                            closedAt
                            timelineItems(first: 100) {
                                nodes {
                                    ...on ConnectedEvent {
                                        subject {
                                            ...on PullRequest {
                                                number
                                            }
                                        }
                                        source {
                                            ...on PullRequest {
                                                number
                                            }
                                        }
                                    }
                                    ...on DisconnectedEvent {
                                        subject {
                                            ...on PullRequest {
                                                number
                                            }
                                        }
                                        source {
                                            ...on PullRequest {
                                                number
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        `

        return (await this.execute(query, {
            ownerLogin,
            repositoryName
        })).data.repository
    }

    async getPullRequests(ownerLogin: string, repositoryName: string) {
        const query = gql`
            query($ownerLogin: String!, $repositoryName: String!) {
                repository(owner: $ownerLogin, name: $repositoryName) {
                    id
                    owner {
                        login
                    }
                    name
                    defaultBranchRef {
                        name
                    }
                    createdAt
                    updatedAt
                    pullRequests(first: 100) {
                        nodes {
                            number
                            createdAt
                            closedAt
                            headRefName
                            baseRefName
                            mergedAt
                            closingIssuesReferences(first: 100) {
                                nodes {
                                    number
                                    createdAt
                                    closedAt
                                    repository {
                                        name
                                        owner {
                                            login
                                        }
                                        defaultBranchRef {
                                            name
                                        }
                                        createdAt
                                        updatedAt
                                    }
                                }
                            }
                            commits(first: 100) {
                                nodes {
                                    commit {
                                        oid
                                    }
                                }
                            }
                        }
                    }
                }
            }
        `

        return (await this.execute(query, {
            ownerLogin,
            repositoryName
        })).data.repository
    }

    async getPullRequestWorkItems(projectId: string, repoId: string, pullRequestId: string) {
        const response = await (await fetch(this.orgUrl + projectId + '/_apis/git/repositories/' + repoId + '/pullrequests/' + pullRequestId + '/workitems?api-version=7.1-preview.1', {
            method: 'GET',
            headers: this.getHeaders()
        })).json()

        if (!response?.value || response.count < 1) {
            return []
        }

        return response.value
    }

    async getPullRequestCommits(projectId: string, repoId: string, pullRequestId: string) {
        const response = await (await fetch(this.orgUrl + projectId + '/_apis/git/repositories/' + repoId + '/pullrequests/' + pullRequestId + '/commits?api-version=7.1-preview.1', {
            method: 'GET',
            headers: this.getHeaders()
        })).json()

        if (!response?.value || response.count < 1) {
            return []
        }

        return response.value
    }

    async getCommits(projectId: string, repoId: string) {
        const response = await (await fetch(this.orgUrl + projectId + '/_apis/git/repositories/' + repoId + '/commits?api-version=7.1-preview.1', {
            method: 'GET',
            headers: this.getHeaders()
        })).json()

        if (!response?.value || response.count < 1) {
            return []
        }

        return response.value
    }

    async getCommit(projectId: string, repoId: string, commitId: string) {
        return await (await fetch(this.orgUrl + projectId + '/_apis/git/repositories/' + repoId + '/commits/' + commitId + '?api-version=7.2-preview.2', {
            method: 'GET',
            headers: this.getHeaders()
        })).json()
    }

    async listPipelines(projectId: string) {
        const response = await (await fetch(this.orgUrl + projectId + '/_apis/pipelines?api-version=7.2-preview.1', {
            method: 'GET',
            headers: this.getHeaders()
        })).json()

        if (!response?.value || response.count < 1) {
            return []
        }

        return response.value
    }

    async listPipelineRuns(projectId: string, pipelineId: number) {
        const response = await (await fetch(this.orgUrl + projectId + '/_apis/pipelines/' + pipelineId + '/runs?api-version=7.2-preview.1', {
            method: 'GET',
            headers: this.getHeaders()
        })).json()

        if (!response?.value || response.count < 1) {
            return []
        }

        return response.value
    }

    async getPipelineRun(projectId: string, pipelineId: number, runId: number) {
        return await (await fetch(this.orgUrl + projectId + '/_apis/pipelines/' + pipelineId + '/runs/' + runId + '?api-version=7.2-preview.1', {
            method: 'GET',
            headers: this.getHeaders()
        })).json()
    }

    private async execute(query: DocumentNode, variables: any = null): Promise<ApolloQueryResult<any>> {
        return await this.client.query({
            query,
            variables,
            fetchPolicy: 'no-cache'
        })
    }
}