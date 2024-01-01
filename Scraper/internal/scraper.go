package internal

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
)

func HandleRepository(repository ConfigRepository, adapter Adapter) {
	requestIssues(repository, adapter)
	//requestPulls(repository, adapter)
}

func requestPulls(repository ConfigRepository, adapter Adapter) {
	res := executeGet(fmt.Sprintf("direct/repos/%s/pulls", repository.Id), adapter)
	if res == nil {
		fmt.Println("Empty")
		return
	}

	if res.Body != nil {
		defer res.Body.Close()
	}

	body, err := io.ReadAll(res.Body)
	if err != nil {
		ProcessError(err)
		return
	}

	var pullRequests []PullRequest
	err = json.Unmarshal(body, &pullRequests)
	if err != nil {
		ProcessError(err)
		return
	}

}

func requestIssues(repository ConfigRepository, adapter Adapter) {
	res := executeGet(fmt.Sprintf("direct/repos/%s/issues", repository.Id), adapter)
	if res == nil {
		return
	}

	if res.Body != nil {
		defer res.Body.Close()
	}

	body, err := io.ReadAll(res.Body)
	if err != nil {
		ProcessError(err)
		return
	}

	var issues []Issue
	err = json.Unmarshal(body, &issues)
	if err != nil {
		ProcessError(err)
		return
	}

	if (issues != nil) && (len(issues) > 0) {
		ProcessIssues(issues)
	}
}

func executeGet(endpoint string, adapter Adapter) (response *http.Response) {
	req, err := http.NewRequest("GET", buildUrl(adapter.BaseUrl, endpoint), nil)

	req.Header.Set("Authorization", "Bearer "+adapter.Token)

	client := &http.Client{}
	res, err := client.Do(req)
	if err != nil {
		ProcessError(err)
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
