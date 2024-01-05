export class Client {
    private orgUrl: string
    private token: string
    private readonly minTimeNextInvoc = 500
    private readonly timeRollOff = 1500 / 300
    private timeTillNextInvocation = this.minTimeNextInvoc
    private units: number[] = []
    private retryAfter: number = 0

    private constructor(orgUrl: string, token: string) {
        this.orgUrl = orgUrl
        if (!this.orgUrl.endsWith('/')) {
            this.orgUrl += '/'
        }

        this.token = token
    }

    static personalAccessToken(orgUrl: string, pat: string): Client {
        return new Client(orgUrl, pat)
    }

    private getHeaders() {
        return {
            'Authorization': 'Basic ' + Buffer.from(this.token).toString("base64"),
            'Accept': 'application/json'
        }
    }

    async listAllTeams() {
        const response = await (await this.executeRequest(this.orgUrl + '/_apis/teams?api-version=7.2-preview.3', {
            method: 'GET',
            headers: this.getHeaders()
        })).json()

        if (!response?.value || response.count < 1) {
            return []
        }

        return response.value
    }

    async listTeams(projectId: string) {
        const response = await (await this.executeRequest(this.orgUrl + '/_apis/projects/' + projectId + '/teams?api-version=7.2-preview.3', {
            method: 'GET',
            headers: this.getHeaders()
        })).json()

        if (!response?.value || response.count < 1) {
            return []
        }

        return response.value
    }

    async listProjects() {
        const response = await (await this.executeRequest(this.orgUrl + '_apis/projects?api-version=7.2-preview.4', {
            method: 'GET',
            headers: this.getHeaders()
        })).json()

        if (!response?.value || response.count < 1) {
            return []
        }

        return response.value
    }

    async getProject(projectId: string) {
        console.log(projectId)

        return await (await this.executeRequest(this.orgUrl + '_apis/projects/' + projectId + '?api-version=7.2-preview.4', {
            method: 'GET',
            headers: this.getHeaders()
        })).json()
    }

    async listRepositories(projectId: string) {
        const response = await (await this.executeRequest(this.orgUrl + projectId + '/_apis/git/repositories?api-version=7.2-preview.1', {
            method: 'GET',
            headers: this.getHeaders()
        })).json()

        if (!response?.value || response.count < 1) {
            return []
        }

        return response.value
    }

    async getRepository(projectId: string, repositoryId: string) {
        return await (await this.executeRequest(this.orgUrl + projectId + '/_apis/git/repositories/' + repositoryId + '?api-version=7.2-preview.1', {
            method: 'GET',
            headers: this.getHeaders()
        })).json()
    }

    async listWorkItems(projectId: string, teamId: string) {
        const queryTemplate = 'SELECT [System.Id] FROM workitems ORDER BY [System.Id]'

        const workItems: any[] = []
        let empty = false
        let lastId = 0
        while (!empty) {
            const lowerLimit = lastId
            const upperLimit = (lastId += 20000)
            const query = `${queryTemplate} WHERE ID > ${lowerLimit} AND ID < ${upperLimit}`

            try {
                const response: any = await (await this.executeRequest(this.orgUrl + projectId + '/' + teamId + '/_apis/wit/wiql/?api-version=7.2-preview.2', {
                    method: 'POST',
                    headers: {
                        ...this.getHeaders(),
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        query
                    })
                })).json()

                empty = !response?.workItems || response.workItems.length < 1
                if (!empty) {
                    workItems.push(...response.workItems)
                }
            } catch (error) {
                console.log(error)
            }
        }

        return workItems
    }

    async getWorkItem(projectId: string, ids: number[]) {
        return await (await this.executeRequest(this.orgUrl + projectId + '/_apis/wit/workitemsbatch?api-version=7.2-preview.1', {
            method: 'POST',
            headers: {
                ...this.getHeaders(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ids,
                "$expand": "all"
            })
        })).json()
    }

    async getPullRequests(projectId: string, repoId: string) {
        const response = await (await this.executeRequest(this.orgUrl + projectId + '/_apis/git/repositories/' + repoId + '/pullrequests?searchCriteria.status=all&api-version=7.1-preview.1', {
            method: 'GET',
            headers: this.getHeaders()
        })).json()

        if (!response?.value || response.count < 1) {
            return []
        }

        return response.value
    }

    async getPullRequestWorkItems(projectId: string, repoId: string, pullRequestId: string) {
        const response = await (await this.executeRequest(this.orgUrl + projectId + '/_apis/git/repositories/' + repoId + '/pullrequests/' + pullRequestId + '/workitems?api-version=7.1-preview.1', {
            method: 'GET',
            headers: this.getHeaders()
        })).json()

        if (!response?.value || response.count < 1) {
            return []
        }

        return response.value
    }

    async getPullRequestCommits(projectId: string, repoId: string, pullRequestId: string) {
        const response = await (await this.executeRequest(this.orgUrl + projectId + '/_apis/git/repositories/' + repoId + '/pullrequests/' + pullRequestId + '/commits?api-version=7.1-preview.1', {
            method: 'GET',
            headers: this.getHeaders()
        })).json()

        if (!response?.value || response.count < 1) {
            return []
        }

        return response.value
    }

    async getCommits(projectId: string, repoId: string) {
        const response = await (await this.executeRequest(this.orgUrl + projectId + '/_apis/git/repositories/' + repoId + '/commits?api-version=7.1-preview.1', {
            method: 'GET',
            headers: this.getHeaders()
        })).json()

        if (!response?.value || response.count < 1) {
            return []
        }

        return response.value
    }

    async getCommit(projectId: string, repoId: string, commitId: string) {
        return await (await this.executeRequest(this.orgUrl + projectId + '/_apis/git/repositories/' + repoId + '/commits/' + commitId + '?api-version=7.2-preview.2', {
            method: 'GET',
            headers: this.getHeaders()
        })).json()
    }

    async listPipelines(projectId: string) {
        const response = await (await this.executeRequest(this.orgUrl + projectId + '/_apis/pipelines?api-version=7.2-preview.1', {
            method: 'GET',
            headers: this.getHeaders()
        })).json()

        if (!response?.value || response.count < 1) {
            return []
        }

        return response.value
    }

    async listPipelineRuns(projectId: string, pipelineId: number) {
        const response = await (await this.executeRequest(this.orgUrl + projectId + '/_apis/pipelines/' + pipelineId + '/runs?api-version=7.2-preview.1', {
            method: 'GET',
            headers: this.getHeaders()
        })).json()

        if (!response?.value || response.count < 1) {
            return []
        }

        return response.value
    }

    async getPipelineRun(projectId: string, pipelineId: number, runId: number) {
        return await (await this.executeRequest(this.orgUrl + projectId + '/_apis/pipelines/' + pipelineId + '/runs/' + runId + '?api-version=7.2-preview.1', {
            method: 'GET',
            headers: this.getHeaders()
        })).json()
    }

    async executeRequest(url: string, options: any): Promise<Response> {
        const response: Response = await this.executeRequestRateLimited(url, options)
        if (response?.headers?.has('Retry-After')) {
            this.retryAfter = Date.now() + Number(response.headers.get('Retry-After')) * 1000
        }
        if (response?.headers?.has('X-RateLimit-Remaining')) {
            this.units.shift()
            this.units.push(Number(response.headers.has('X-RateLimit-Remaining')))
        }
        console.debug(response.headers)

        return response
    }

    executeRequestRateLimited(url: string, options: any): Promise<Response> {
        return new Promise((resolve, reject) => {
            setTimeout(async() => {
                try {
                    resolve(await this.executeRequestImmediately(url, options))
                } catch (error) {
                    reject(error)
                }
            }, this.getWaitTime())
        })
    }

    async executeRequestImmediately(url: string, options: any): Promise<Response> {
        return await fetch(url, options)
    }

    getWaitTime(): number {
        let waitTime = this.timeTillNextInvocation
        const now = Date.now()
        if (this.retryAfter > now) {
            waitTime = this.retryAfter - now
        } else if (this.units.length > 1) {
            const lastUnits = this.units[this.units.length - 1]
            const secondLastUnits = this.units[this.units.length - 2]
            const change = secondLastUnits - lastUnits * this.timeRollOff

            this.timeTillNextInvocation = Math.max(this.minTimeNextInvoc, this.timeTillNextInvocation + change)
            waitTime = this.timeTillNextInvocation
        }
        console.debug('Wait Time:', waitTime)
        console.debug('Units:', this.units)

        return waitTime
    }
}