export class Client {
    private orgUrl: string
    private token: string

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
            'Authorization': 'Basic ' + Buffer.from(this.token).toString("base64")
        }
    }

    async listAllTeams() {
        const response = await (await fetch(this.orgUrl + '/_apis/teams?api-version=7.2-preview.3', {
            method: 'GET',
            headers: this.getHeaders()
        })).json()

        if (!response?.value || response.count < 1) {
            return []
        }

        return response.value
    }

    async listTeams(projectId: string) {
        const response = await (await fetch(this.orgUrl + '/_apis/projects/' + projectId + '/teams?api-version=7.2-preview.3', {
            method: 'GET',
            headers: this.getHeaders()
        })).json()

        if (!response?.value || response.count < 1) {
            return []
        }

        return response.value
    }

    async listProjects() {
        const response = await (await fetch(this.orgUrl + '_apis/projects?api-version=7.2-preview.4', {
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

        return await (await fetch(this.orgUrl + '_apis/projects/' + projectId + '?api-version=7.2-preview.4', {
            method: 'GET',
            headers: this.getHeaders()
        })).json()
    }

    async listRepositories(projectId: string) {
        const response = await (await fetch(this.orgUrl + projectId + '/_apis/git/repositories?api-version=7.2-preview.1', {
            method: 'GET',
            headers: this.getHeaders()
        })).json()

        if (!response?.value || response.count < 1) {
            return []
        }

        return response.value
    }

    async getRepository(projectId: string, repositoryId: string) {
        return await (await fetch(this.orgUrl + projectId + '/_apis/git/repositories/' + repositoryId + '?api-version=7.2-preview.1', {
            method: 'GET',
            headers: this.getHeaders()
        })).json()
    }

    async listWorkItems(projectId: string, teamId: string) {
        const query = 'SELECT [System.Id] FROM workitems'

        const response = await (await fetch(this.orgUrl + projectId + '/' + teamId + '/_apis/wit/wiql/?api-version=7.2-preview.2', {
            method: 'POST',
            headers: {
                ...this.getHeaders(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query
            })
        })).json()

        if (!response?.workItems) {
            return []
        }

        return response.workItems
    }

    async getWorkItem(projectId: string, ids: number[]) {
        return await (await fetch(this.orgUrl + projectId + '/_apis/wit/workitemsbatch?api-version=7.2-preview.1', {
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
        const response = await (await fetch(this.orgUrl + projectId + '/_apis/git/repositories/' + repoId + '/pullrequests?searchCriteria.status=all&api-version=7.1-preview.1', {
            method: 'GET',
            headers: this.getHeaders()
        })).json()

        if (!response?.value || response.count < 1) {
            return []
        }

        return response.value
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
}