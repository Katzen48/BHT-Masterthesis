package processing

import (
	"thesis/scraper/internal"
	"thesis/scraper/internal/metricsdatabase"
	"time"
)

func Aggregate(repo internal.Repository, issues []internal.Issue, commits []internal.Commit, pullRequests []internal.PullRequest, deployments []internal.Deployment, environments []internal.Environment, adapter internal.Adapter, metricsClient *metricsdatabase.DatabaseClient) {
	deploymentFrequency := calculateDeploymentFrequency(deployments)
	metricsdatabase.InsertDeploymentFrequency(adapter, repo, deploymentFrequency, metricsClient)

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

	return
}
