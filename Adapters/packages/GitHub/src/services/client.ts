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
            } else {
                moreRepos = false
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
            } else {
                moreOrgs = false
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
            query($ownerLogin: String!, $repositoryName: String!, $iCursor: String) {
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
                    issues(first: 100, after: $iCursor) {
                        pageInfo {
                            hasNextPage
                            endCursor
                        }
                        nodes {
                            number
                            createdAt
                            closedAt
                        }
                    }
                }
            }
        `

        let moreIssues = true
        let iCursor = null
        let repo: any = null

        const issues: any[] = []
        while(moreIssues) {
            const rawRepo: any = (await this.execute(query, {
                ownerLogin,
                repositoryName,
                iCursor
            })).data.repository

            if (repo === null) {
                repo = {
                    id: rawRepo?.id,
                    owner: rawRepo?.owner,
                    name: rawRepo?.name,
                    defaultBranchRef: rawRepo?.defaultBranchRef,
                    createdAt: rawRepo?.createdAt,
                    updatedAt: rawRepo?.updatedAt
                }
            }

            const rawIssues = rawRepo?.issues

            moreIssues = rawIssues?.pageInfo?.hasNextPage === true
            iCursor = rawIssues?.pageInfo?.endCursor

            if (rawIssues?.nodes?.length > 0) {
                for (const issue of rawIssues.nodes) {
                    const items: any[] = await this.getIssueTimelineItems(ownerLogin, repositoryName, issue.number)

                    issues.push({
                        ...issue,
                        timelineItems: {
                            nodes: items
                        }
                    })
                }
            }
        }

        return {
            ...repo,
            issues: {
                nodes: issues
            }
        }
    }

    async getIssueTimelineItems(ownerLogin: string, repositoryName: string, issueNumber: number) {
        const query = gql`
            query($ownerLogin: String!, $repositoryName: String!, $issueNumber: Int!, $tCursor: String) {
                repository(owner: $ownerLogin, name: $repositoryName) {
                    issue(number: $issueNumber) {
                        timelineItems(first: 100, after: $tCursor) {
                            pageInfo {
                                hasNextPage
                                endCursor
                            }
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
        `

        let moreItems = true
        let iCursor = null

        const timelineItems: any[] = []
        while(moreItems) {
            const items: any = (await this.execute(query, {
                ownerLogin,
                repositoryName,
                issueNumber,
                iCursor
            })).data.repository?.issue?.timelineItems

            moreItems = items?.pageInfo?.hasNextPage === true
            iCursor = items?.pageInfo?.endCursor

            if (items?.nodes?.length > 0) {
                for (const item of items.nodes) {
                    timelineItems.push(item)
                }
            }
        }

        return timelineItems
    }

    async getPullRequests(ownerLogin: string, repositoryName: string) {
        const query = gql`
            query($ownerLogin: String!, $repositoryName: String!, $pCursor: String) {
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
                    pullRequests(first: 100, after: $pCursor) {
                        pageInfo {
                            hasNextPage
                            endCursor
                        }
                        nodes {
                            number
                            createdAt
                            closedAt
                            headRefName
                            baseRefName
                            mergedAt
                        }
                    }
                }
            }
        `

        let morePullRequests = true
        let pCursor = null
        let repo: any = null

        const pullRequestsPromises: Promise<any>[] = []
        while(morePullRequests) {
            const rawRepo: any = (await this.execute(query, {
                ownerLogin,
                repositoryName,
                pCursor
            })).data.repository

            if (repo === null) {
                repo = {
                    id: rawRepo?.id,
                    owner: rawRepo?.owner,
                    name: rawRepo?.name,
                    defaultBranchRef: rawRepo?.defaultBranchRef,
                    createdAt: rawRepo?.createdAt,
                    updatedAt: rawRepo?.updatedAt
                }
            }

            const rawPullRequests = rawRepo?.pullRequests

            pCursor = rawPullRequests?.pageInfo?.endCursor
            morePullRequests = rawPullRequests?.pageInfo?.hasNextPage === true && pCursor !== null

            if (rawPullRequests?.nodes?.length > 0) {
                for (const pullRequest of rawPullRequests.nodes) {
                    pullRequestsPromises.push(new Promise(async (resolve) => {
                        const items: any = await this.getPullRequestNestedItems(ownerLogin, repositoryName, pullRequest.number)

                        resolve({
                            ...pullRequest,
                            ...items
                        })
                    }))
                }
            }
        }

        const pullRequests: any[] = await Promise.all(pullRequestsPromises)

        return {
            ...repo,
            pullRequests: {
                nodes: pullRequests
            }
        }
    }

    async getPullRequestNestedItems(ownerLogin: string, repositoryName: string, pullRequestNumber: number) {
        const query = gql`
            query($ownerLogin: String!, $repositoryName: String!, $pullRequestNumber: Int!, $iCursor: String, $cCursor: String) {
                repository(owner: $ownerLogin, name: $repositoryName) {
                    pullRequest(number: $pullRequestNumber) {
                        closingIssuesReferences(first: 100, after: $iCursor) {
                            pageInfo {
                                hasNextPage
                                endCursor
                            }
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
                        commits(first: 100, after: $cCursor) {
                            pageInfo {
                                hasNextPage
                                endCursor
                            }
                            nodes {
                                commit {
                                    oid
                                }
                            }
                        }
                    }
                }
            }
        `

        let moreIssues = true
        let moreCommits = true
        let iCursor = null
        let cCursor = null

        const issues: any[] = []
        const commits: any[] = []

        while(moreIssues || moreCommits) {
            const pullRequest: any = (await this.execute(query, {
                ownerLogin,
                repositoryName,
                pullRequestNumber,
                iCursor,
                cCursor
            })).data.repository?.pullRequest

            if (pullRequest?.closingIssuesReferences) {
                const closingIssuesReferences = pullRequest.closingIssuesReferences

                if (moreIssues) {
                    iCursor = closingIssuesReferences.pageInfo?.endCursor
                    moreIssues = closingIssuesReferences.pageInfo?.hasNextPage === true && iCursor !== null

                    if (closingIssuesReferences.nodes?.length > 0) {
                        for (const issue of closingIssuesReferences.nodes) {
                            issues.push(issue)
                        }
                    }
                }
            } else {
                moreIssues = false
            }

            if (pullRequest?.commits) {
                const rawCommits = pullRequest.commits

                if (moreCommits) {
                    cCursor = rawCommits.pageInfo?.endCursor
                    moreCommits = rawCommits.pageInfo?.hasNextPage === true && cCursor !== null

                    if (rawCommits.nodes?.length > 0) {
                        for (const commit of rawCommits.nodes) {
                            commits.push(commit)
                        }
                    }
                }
            } else {
                moreCommits = false
            }
        }

        return {
            closingIssuesReferences: {
                nodes: issues
            },
            commits: {
                nodes: commits
            }
        }
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