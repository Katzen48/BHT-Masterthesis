package processing

import (
	"sync"
	"thesis/scraper/internal"
	"thesis/scraper/internal/metricsdatabase"
)

func Process(issues []internal.Issue, commits []internal.Commit, pullRequests []internal.PullRequest, deployments []internal.Deployment, environments []internal.Environment, adapter internal.Adapter, metricsClient *metricsdatabase.DatabaseClient, group *sync.WaitGroup) {
	defer group.Done()

	repo := findRepo(issues, commits, pullRequests)

	metricsdatabase.InsertRepository(adapter, *repo, metricsClient)
	metricsdatabase.InsertIssues(adapter, *repo, issues, metricsClient)
	metricsdatabase.InsertCommits(adapter, *repo, commits, metricsClient)
	metricsdatabase.InsertPullRequests(adapter, *repo, pullRequests, metricsClient)
	metricsdatabase.InsertDeployments(adapter, *repo, deployments, metricsClient)
	metricsdatabase.InsertEnvironments(adapter, *repo, environments, metricsClient)
}

func findRepo(issues []internal.Issue, commits []internal.Commit, pullRequests []internal.PullRequest) (repo *internal.Repository) {
	for _, issue := range issues {
		if issue.Repo != nil {
			if repo == nil {
				repo = issue.Repo
			} else if issue.Repo.Id == repo.Id {
				if issue.Repo.UpdatedAt.After(repo.UpdatedAt) {
					repo = issue.Repo
				}
			}
		}
	}

	for _, pullRequest := range pullRequests {
		if pullRequest.Repo != nil {
			if repo == nil {
				repo = pullRequest.Repo
			} else if pullRequest.Repo.Id == repo.Id {
				if pullRequest.Repo.UpdatedAt.After(repo.UpdatedAt) {
					repo = pullRequest.Repo
				}
			}
		}
	}

	for _, commit := range commits {
		if commit.Repo != nil {
			if repo == nil {
				repo = commit.Repo
			} else if commit.Repo.Id == repo.Id {
				if commit.Repo.UpdatedAt.After(repo.UpdatedAt) {
					repo = commit.Repo
				}
			}
		}
	}

	return
}
