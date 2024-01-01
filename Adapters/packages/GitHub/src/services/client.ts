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


        const graphUrl = baseUrl + 'graphql'
        const httpLink: ApolloLink = createHttpLink({
            uri: graphUrl
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
            const viewer: any = (await this.executeGraph(query, {
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
            const organization: any = (await this.executeGraph(query, {
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

        return (await this.executeGraph(query, {
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
            const rawRepo: any = (await this.executeGraph(query, {
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
            const items: any = (await this.executeGraph(query, {
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
            const rawRepo: any = (await this.executeGraph(query, {
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
            const pullRequest: any = (await this.executeGraph(query, {
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

    async getCommits(ownerLogin: string, repositoryName: string) {
        const query = gql`
            query($ownerLogin: String!, $repositoryName: String!, $rCursor: String) {
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
                    refs(first: 100, refPrefix: "refs/heads/", after: $rCursor) {
                        pageInfo {
                            hasNextPage
                            endCursor
                        }
                        nodes {
                            name
                        }
                    }
                }
            }
        `

        let moreRefs = true
        let rCursor = null

        const refs: any[] = []
        let repo: any = null
        while(moreRefs) {
            const rawRepo: any = (await this.executeGraph(query, {
                ownerLogin,
                repositoryName,
                rCursor
            })).data?.repository

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

            moreRefs = rawRepo?.refs?.pageInfo?.hasNextPage === true
            rCursor = rawRepo?.refs?.pageInfo?.endCursor

            if (rawRepo.refs?.nodes?.length > 0) {
                for (const ref of rawRepo.refs.nodes) {
                    const name = ref.name
                    const commits = await this.getRefCommits(ownerLogin, repositoryName, name)

                    refs.push({
                        name,
                        target: {
                            history: {
                                nodes: commits
                            }
                        }
                    })
                }
            }
        }

        return {
            ...repo,
            refs: {
                nodes: refs
            }
        }
    }

    async getRefCommits(ownerLogin: string, repositoryName: string, refName: string) {
        const query = gql`
            query($ownerLogin: String!, $repositoryName: String!, $refName: String!, $hCursor: String) {
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
                    ref(qualifiedName: $refName) {
                        target {
                          ...on Commit {
                            history(first: 100, after: $hCursor) {
                                pageInfo {
                                    hasNextPage
                                    endCursor
                                }
                                nodes {
                                    oid
                                }
                            }
                          }
                        }
                    }
                }
            }
        `

        let moreCommits = true
        let hCursor = null

        const commits: any[] = []
        while(moreCommits) {
            const rawRepo: any = (await this.executeGraph(query, {
                ownerLogin,
                repositoryName,
                hCursor,
                refName
            })).data?.repository

            moreCommits = rawRepo?.ref?.target?.history?.pageInfo?.hasNextPage === true
            hCursor = rawRepo?.ref?.target?.history?.pageInfo?.endCursor

            if (rawRepo?.ref?.target?.history?.nodes?.length > 0) {
                for (const commit of rawRepo.ref.target.history.nodes) {
                    commits.push(commit)
                }
            }
        }

        return commits
    }

    async listDeployments(ownerLogin: string, repositoryName: string) {
        const endpoint = `repos/${ownerLogin}/${repositoryName}/deployments`

        let page = 1
        let moreDeployments = true

        const deployments: any[] = []
        while (moreDeployments) {
            const response: any[] = await this.executeRest(endpoint + '?per_page=100&page=' + page)

            moreDeployments = response && response.length > 99
            if (response && response.length > 0) {
                deployments.push(...response)
            }

            if (moreDeployments) {
                page++
            }
        }

        return deployments
    }

    async listEnvironments(ownerLogin: string, repositoryName: string) {
        const endpoint = `repos/${ownerLogin}/${repositoryName}/environments`

        let page = 1
        let moreEnvironments = true

        const environments: any[] = []
        while (moreEnvironments) {
            const response: any = await this.executeRest(endpoint + '?per_page=100&page=' + page)

            moreEnvironments = response && response.environments && response.environments.length > 99
            if (response && response.environments.length > 0) {
                environments.push(...response.environments)
            }

            if (moreEnvironments) {
                page++
            }
        }

        return {
            environments
        }
    }

    private async executeGraph(query: DocumentNode, variables: any = null): Promise<ApolloQueryResult<any>> {
        return await this.client.query({
            query,
            variables,
            fetchPolicy: 'no-cache'
        })
    }

    private async executeRest(resource: string, method: string = 'GET', body: any = null): Promise<any> {        
        return await (await fetch(this.baseUrl + resource, {
            method,
            body,
            headers: this.getHeaders()
        })).json()
    }

    private getHeaders() {
        return {
            'Authorization': 'bearer ' + this.token,
            'X-GitHub-Api-Version': '2022-11-28',
            'Accept': 'application/vnd.github+json'
        }
    }
}