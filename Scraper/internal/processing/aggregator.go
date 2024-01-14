package processing

import (
	"thesis/scraper/internal"
	"thesis/scraper/internal/metricsdatabase"
	"time"
)

type void struct{}

func Aggregate(repo internal.Repository, issues []internal.Issue, commits []internal.Commit, pullRequests []internal.PullRequest, deployments []internal.Deployment, environments []internal.Environment, adapter internal.Adapter, metricsClient *metricsdatabase.DatabaseClient) {
	deploymentFrequency := calculateDeploymentFrequency(deployments)
	metricsdatabase.InsertDeploymentFrequency(adapter, repo, deploymentFrequency, metricsClient)

	leadTimes := calculateLeadTimeForChange(issues)
	metricsdatabase.InsertLeadTimeForChange(adapter, repo, leadTimes, metricsClient)
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
		if issue.ClosedAt != nil {
			leadTimes[issue.ID] = issue.ClosedAt.Sub(issue.CreatedAt)
		}
	}

	return leadTimes
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
