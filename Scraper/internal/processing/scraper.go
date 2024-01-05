package processing

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"thesis/scraper/internal"
	"thesis/scraper/internal/basedatabase"
)

var chunkSize = 20000

func HandleRepository(repository internal.ConfigRepository, adapter internal.Adapter, client *basedatabase.DatabaseClient) {
	requestIssues(repository, adapter, client)
	requestCommits(repository, adapter, client)
	requestPullRequests(repository, adapter, client)
	requestDeployments(repository, adapter, client)
	requestEnvironments(repository, adapter, client)
}

func requestPullRequests(repository internal.ConfigRepository, adapter internal.Adapter, client *basedatabase.DatabaseClient) {
	var pullRequests []internal.PullRequest
	pullRequests = request(adapter, fmt.Sprintf("direct/repos/%s/pulls", repository.Id), pullRequests)

	if (pullRequests != nil) && (len(pullRequests) > 0) {
		for _, pullRequest := range pullRequests {
			jsonValue, _ := json.Marshal(pullRequest)
			go basedatabase.InsertJson(client, "INSERT INTO pull_requests VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE `json` = ?", pullRequest.Repo.Id, pullRequest.ID, string(jsonValue), string(jsonValue))
		}

		//ProcessPullRequests(pullRequests)
	}
}

func requestIssues(repository internal.ConfigRepository, adapter internal.Adapter, client *basedatabase.DatabaseClient) {
	var issues []internal.Issue
	issues = request(adapter, fmt.Sprintf("direct/repos/%s/issues", repository.Id), issues)

	if (issues != nil) && (len(issues) > 0) {
		var chunks [][]internal.Issue

		for i := 0; i < len(issues); i += chunkSize {
			end := i + chunkSize

			if end > len(issues) {
				end = len(issues)
			}

			chunks = append(chunks, issues[i:end])
		}

		for _, chunk := range chunks {
			var valuesPlaceholder = ""
			var values []any

			for i, issue := range chunk {
				if i > 0 {
					valuesPlaceholder += ","
				}
				valuesPlaceholder += "(?,?,?)"

				jsonValue, _ := json.Marshal(issue)
				values = append(values, issue.Repo.Id, issue.ID, string(jsonValue))
			}

			statement := fmt.Sprintf("INSERT INTO issues (`repo`, `id`, `json`) VALUES %s ON DUPLICATE KEY UPDATE `json` = VALUES(`json`)", valuesPlaceholder)
			go basedatabase.InsertJson(client, statement, values...)
		}

		//ProcessIssues(issues)
	}
}

func requestCommits(repository internal.ConfigRepository, adapter internal.Adapter, client *basedatabase.DatabaseClient) {
	var commits []internal.Commit
	commits = request(adapter, fmt.Sprintf("direct/repos/%s/commits", repository.Id), commits)

	if (commits != nil) && (len(commits) > 0) {
		for _, commit := range commits {
			jsonValue, _ := json.Marshal(commit)
			go basedatabase.InsertJson(client, "INSERT INTO commits VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE `json` = ?", commit.Repo.Id, commit.Sha, string(jsonValue), string(jsonValue))
		}

		//ProcessCommits(commits)
	}
}

func requestDeployments(repository internal.ConfigRepository, adapter internal.Adapter, client *basedatabase.DatabaseClient) {
	var deployments []internal.Deployment
	deployments = request(adapter, fmt.Sprintf("direct/repos/%s/deployments", repository.Id), deployments)

	if (deployments != nil) && (len(deployments) > 0) {
		for _, deployment := range deployments {
			jsonValue, _ := json.Marshal(deployment)
			go basedatabase.InsertJson(client, "INSERT IGNORE INTO deployments VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE `json` = ?", repository.Id, deployment.Id, string(jsonValue), string(jsonValue))
		}

		//ProcessDeployments(deployments)
	}
}

func requestEnvironments(repository internal.ConfigRepository, adapter internal.Adapter, client *basedatabase.DatabaseClient) {
	var environments []internal.Environment
	environments = request(adapter, fmt.Sprintf("direct/repos/%s/environments", repository.Id), environments)

	if (environments != nil) && (len(environments) > 0) {
		for _, environment := range environments {
			jsonValue, _ := json.Marshal(environment)
			go basedatabase.InsertJson(client, "INSERT IGNORE INTO environments VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE `json` = ?", repository.Id, environment.Id, string(jsonValue), string(jsonValue))
		}

		//ProcessDeployments(environments)
	}
}

func request[V any](adapter internal.Adapter, url string, value V) V {
	res := executeGet(url, adapter)
	if res == nil {
		return *new(V)
	}

	if res.Body != nil {
		defer res.Body.Close()
	}

	body, err := io.ReadAll(res.Body)
	if err != nil {
		internal.ProcessError(err)
		return *new(V)
	}

	err = json.Unmarshal(body, &value)
	if err != nil {
		internal.ProcessError(err)
		return *new(V)
	}

	return value
}

func executeGet(endpoint string, adapter internal.Adapter) (response *http.Response) {
	req, err := http.NewRequest("GET", buildUrl(adapter.BaseUrl, endpoint), nil)

	req.Header.Set("Authorization", "Bearer "+adapter.Token)

	client := &http.Client{}
	res, err := client.Do(req)
	if err != nil {
		internal.ProcessError(err)
		return
	}

	response = res

	return
}

func buildUrl(baseUrl string, endpoint string) (url string) {
	url = baseUrl
	if !strings.HasSuffix(baseUrl, "/") {
		url += "/"
	}
	url += endpoint
	return
}
