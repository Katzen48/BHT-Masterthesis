package processing

import (
	"thesis/scraper/internal"
	"thesis/scraper/internal/metricsdatabase"
	"time"
)

type void struct{}

func Aggregate(adapter internal.Adapter, metricsClient *metricsdatabase.DatabaseClient) {
	for _, repo := range loadRepos(adapter, metricsClient) {
		var issues []internal.Issue
		var commits []internal.Commit
		var pullRequests []internal.PullRequest
		var deployments []internal.Deployment
		var environments []internal.Environment

		loadData(adapter, repo, metricsClient, &issues, &commits, &pullRequests, &deployments, &environments)
		aggregate(repo, issues, commits, pullRequests, deployments, environments, adapter, metricsClient)
	}
}

func loadRepos(adapter internal.Adapter, metricsClient *metricsdatabase.DatabaseClient) (repos []internal.Repository) {
	return metricsdatabase.ListRepositories(adapter, metricsClient)
}

func loadData(adapter internal.Adapter, repo internal.Repository, metricsClient *metricsdatabase.DatabaseClient, issues *[]internal.Issue, commits *[]internal.Commit, pullRequests *[]internal.PullRequest, deployments *[]internal.Deployment, environments *[]internal.Environment) {
	*issues = append(*issues, metricsdatabase.ListIssues(adapter, metricsClient, repo)...)
	*commits = append(*commits, metricsdatabase.ListCommits(adapter, metricsClient, repo)...)
	*pullRequests = append(*pullRequests, metricsdatabase.ListPullRequests(adapter, metricsClient, repo)...)
	*deployments = append(*deployments, metricsdatabase.ListDeployments(adapter, metricsClient, repo)...)
	*environments = append(*environments, metricsdatabase.ListEnvironments(adapter, metricsClient, repo)...)
}

func aggregate(repo internal.Repository, issues []internal.Issue, commits []internal.Commit, pullRequests []internal.PullRequest, deployments []internal.Deployment, environments []internal.Environment, adapter internal.Adapter, metricsClient *metricsdatabase.DatabaseClient) {
	deploymentFrequency := calculateDeploymentFrequency(deployments)
	metricsdatabase.InsertDeploymentFrequency(adapter, repo, deploymentFrequency, metricsClient)

	leadTimes := calculateLeadTimeForChange(issues)
	metricsdatabase.InsertLeadTimeForChange(adapter, repo, leadTimes, metricsClient)

	changeFailureRate := calculateChangeFailureRate(issues)
	metricsdatabase.InsertChangeFailureRate(adapter, repo, changeFailureRate, metricsClient)

	timesToRestoreService := calculateTimesToRestoreService(issues)
	metricsdatabase.InsertTimesToRestoreService(adapter, repo, timesToRestoreService, metricsClient)
	/*
		backtrackedCommits := backtrackCommits(pullRequests)
		tbl := table.New("Ref", "Commit", "Timestamp")
		for ref, commitIds := range backtrackedCommits {
			for commitId, timestamp := range commitIds {
				tbl.AddRow(ref, commitId, timestamp)
			}
		}

		tbl.Print()
	*/

}

func calculateDeploymentFrequency(deployments []internal.Deployment) (deploymentCounts map[string]int) {
	deploymentCounts = make(map[string]int)

	var minDate time.Time
	var maxDate time.Time

	for _, deployment := range deployments {
		if minDate.IsZero() || minDate.After(deployment.CreatedAt) {
			minDate = deployment.CreatedAt
		}

		if maxDate.IsZero() || maxDate.Before(deployment.CreatedAt) {
			maxDate = deployment.CreatedAt
		}
	}

	if maxDate.IsZero() || minDate.IsZero() {
		return deploymentCounts
	}

	maxString := maxDate.Format(time.DateOnly)
	var current time.Time
	var currentString string
	for currentString != maxString {
		if current.IsZero() {
			current = minDate
		} else {
			current = current.Add(time.Hour * 24)
		}
		currentString = current.Format(time.DateOnly)

		deploymentCounts[currentString] = 0
	}

	// Calculate per day
	for _, deployment := range deployments {
		date := deployment.CreatedAt.Format(time.DateOnly)

		_, exists := deploymentCounts[date]
		if !exists {
			deploymentCounts[date] = 1
		} else {
			deploymentCounts[date]++
		}
	}

	return deploymentCounts
}

func calculateLeadTimeForChange(issues []internal.Issue) (leadTimes map[string]time.Duration) {
	leadTimes = make(map[string]time.Duration)

	for _, issue := range issues {
		if issue.Type == nil || *issue.Type == "Issue" {
			var baseDate = time.Now()

			if issue.ClosedAt != nil && !issue.ClosedAt.IsZero() {
				baseDate = *issue.ClosedAt
			}

			leadTimes[issue.ID] = baseDate.Sub(issue.CreatedAt)
		}
	}

	return leadTimes
}

func calculateChangeFailureRate(issues []internal.Issue) float64 {
	var issueCount int = 0
	var failureCount int = 0

	for _, issue := range issues {
		if issue.Type != nil {
			issueCount++

			if *issue.Type == "Bug" {
				failureCount++
			}
		}
	}

	if issueCount < 1 {
		return 0
	}

	return float64(failureCount) / float64(issueCount)
}

func calculateTimesToRestoreService(issues []internal.Issue) (timesToRestoreService map[string]time.Duration) {
	timesToRestoreService = make(map[string]time.Duration)

	for _, issue := range issues {
		if issue.Type != nil && *issue.Type == "Bug" {
			var baseDate = time.Now()

			if issue.ClosedAt != nil && !issue.ClosedAt.IsZero() {
				baseDate = *issue.ClosedAt
			}

			timesToRestoreService[issue.ID] = baseDate.Sub(issue.CreatedAt)
		}
	}

	return timesToRestoreService
}

func backtrackCommits(pullRequests []internal.PullRequest) (commits map[string]map[string]time.Time) {
	commits = make(map[string]map[string]time.Time)
	origins := findCommitOrigins(pullRequests)

	for _, pullRequest := range pullRequests {
		base := pullRequest.Base
		head := pullRequest.Head
		mergeTime := pullRequest.MergedAt

		for _, commit := range pullRequest.Commits {
			commitId := commit.Sha
			headTime := pullRequest.CreatedAt

			commitOrigin, ok := origins[commitId]
			if ok && commitOrigin.ID == pullRequest.ID {
				headTime = commit.CreatedAt
			}

			baseDict, ok := commits[base.Ref]
			if !ok {
				baseDict = make(map[string]time.Time)
				commits[base.Ref] = baseDict
			}

			headDict, ok := commits[head.Ref]
			if !ok {
				headDict = make(map[string]time.Time)
				commits[head.Ref] = headDict
			}

			// Timestamp for Base Ref
			if mergeTime != nil {
				val, ok := baseDict[commitId]
				if ok {
					if (*mergeTime).Before(val) {
						val = *mergeTime
					}
				} else {
					val = *mergeTime
				}
				baseDict[commitId] = val
			}

			// Timestamp for Head Ref
			val, ok := headDict[commitId]
			if ok {
				if headTime.Before(val) {
					val = headTime
				}
			} else {
				val = headTime
			}
			headDict[commitId] = val
		}
	}

	return commits
}

func findCommitOrigins(pullRequests []internal.PullRequest) (origins map[string]internal.PullRequest) {
	origins = make(map[string]internal.PullRequest)

	var member void

	// Primitive Set<> implementation
	commits := make(map[string]void)

	commitPullRequests := make(map[string]map[string]internal.PullRequest)

	// Collect all commits
	for _, pullRequest := range pullRequests {
		for _, commit := range pullRequest.Commits {
			commits[commit.Sha] = member
		}
	}

	for commitId, _ := range commits {
		commitPullRequests[commitId] = make(map[string]internal.PullRequest)
	}

	for _, pullRequest := range pullRequests {
		for _, commit := range pullRequest.Commits {
			commitPullRequests[commit.Sha][pullRequest.ID] = pullRequest
		}
	}

	for commitId, connectedPullRequests := range commitPullRequests {
		var base *internal.PullRequest

		moreElements := len(connectedPullRequests) > 0
		singlePull := len(connectedPullRequests) == 1
		for moreElements {
			keys := make([]string, len(connectedPullRequests))
			unconnected := 0

			i := 0
			for key, _ := range connectedPullRequests {
				keys[i] = key
				i++
			}

			for _, key := range keys {
				pullRequest := connectedPullRequests[key]

				if base == nil {
					base = &pullRequest
				} else {
					if pullRequest.Base.Ref == base.Head.Ref {
						base = &pullRequest
						delete(connectedPullRequests, key)
					} else {
						unconnected++
					}
				}
			}

			moreElements = !singlePull && (len(connectedPullRequests) != unconnected)
		}

		origins[commitId] = *base
	}

	return origins
}
