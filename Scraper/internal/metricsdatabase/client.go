package metricsdatabase

import (
	"github.com/gocql/gocql"
	"thesis/scraper/internal"
	"time"
)

type DatabaseClient struct {
	config  internal.DatabaseConfig
	cluster *gocql.ClusterConfig
	session *gocql.Session
}

var chunkSize = 50

func CreateClient(config internal.DatabaseConfig) *DatabaseClient {
	cluster := gocql.NewCluster(config.Hosts...)
	//cluster.Keyspace = config.Keyspace
	cluster.Authenticator = gocql.PasswordAuthenticator{
		Username: config.Username,
		Password: config.Password,
	}

	return &DatabaseClient{config: config, cluster: cluster}
}

func Connect(client *DatabaseClient) {
	if IsConnected(client) {
		return
	}

	var err error
	client.session, err = client.cluster.CreateSession()
	if err != nil {
		internal.ProcessError(err)
		return
	}
}

func InsertRepository(adapter internal.Adapter, repository internal.Repository, client *DatabaseClient) {
	insertValues := [2]any{adapter.Name, repository.Id}
	updateValues := [6]any{repository.FullName, repository.DefaultBranch, repository.CreatedAt, repository.UpdatedAt, adapter.Name, repository.Id}

	Upsert(client,
		"INSERT INTO base_data.repositories (adapter, id) VALUES (?,?)",
		insertValues[:],
		"UPDATE base_data.repositories SET full_name = ?, default_branch = ?, created_at = ?, updated_at = ?, manually_corrected = false WHERE adapter = ? AND id = ? IF manually_corrected != true",
		updateValues[:])
}

func InsertIssues(adapter internal.Adapter, repository internal.Repository, issues []internal.Issue, client *DatabaseClient) {
	var insertValues [][]any
	var updateValues [][]any

	for _, issue := range issues {
		insertValues = append(insertValues, []any{adapter.Name, repository.Id, issue.ID})
		updateValues = append(updateValues, []any{issue.Type, issue.PullRequests, issue.CreatedAt, issue.ClosedAt, adapter.Name, repository.Id, issue.ID})
	}

	UpsertBatch(client,
		"INSERT INTO base_data.issues (adapter, repository_id, id) VALUES (?,?,?)",
		insertValues,
		"UPDATE base_data.issues SET type = ?, pull_request_ids = ?, created_at = ?, closed_at = ?, manually_corrected = false WHERE adapter = ? AND repository_id = ? AND id = ? IF manually_corrected != true",
		updateValues)
}

func InsertCommits(adapter internal.Adapter, repository internal.Repository, commits []internal.Commit, client *DatabaseClient) {
	var insertValues [][]any
	var updateValues [][]any

	for _, commit := range commits {
		insertValues = append(insertValues, []any{adapter.Name, repository.Id, commit.Sha})
		updateValues = append(updateValues, []any{commit.CreatedAt, adapter.Name, repository.Id, commit.Sha})
	}

	UpsertBatch(client,
		"INSERT INTO base_data.commits (adapter, repository_id, id) VALUES (?,?,?)",
		insertValues,
		"UPDATE base_data.commits SET created_at = ?, manually_corrected = false WHERE adapter = ? AND repository_id = ? AND id = ? IF manually_corrected != true",
		updateValues)
}

func InsertPullRequests(adapter internal.Adapter, repository internal.Repository, pullRequests []internal.PullRequest, client *DatabaseClient) {
	var insertValues [][]any
	var updateValues [][]any

	for _, pullRequest := range pullRequests {
		var issueIds []string
		var commitIds []string

		for _, issue := range pullRequest.Issues {
			issueIds = append(issueIds, issue.ID)
		}

		for _, commit := range pullRequest.Commits {
			commitIds = append(commitIds, commit.Sha)
		}

		insertValues = append(insertValues, []any{adapter.Name, repository.Id, pullRequest.ID})
		updateValues = append(updateValues, []any{pullRequest.Head, pullRequest.Base, issueIds, commitIds, pullRequest.ClosedAt, pullRequest.MergedAt, pullRequest.CreatedAt, adapter.Name, repository.Id, pullRequest.ID})
	}

	UpsertBatch(client,
		"INSERT INTO base_data.pull_requests (adapter, repository_id, id) VALUES (?,?,?)",
		insertValues,
		"UPDATE base_data.pull_requests SET head = ?, base = ?, issue_ids = ?, commit_ids = ?, closed_at = ?, merged_at = ?, created_at = ?, manually_corrected = false WHERE adapter = ? AND repository_id = ? AND id = ? IF manually_corrected != true",
		updateValues)
}

func InsertDeployments(adapter internal.Adapter, repository internal.Repository, deployments []internal.Deployment, client *DatabaseClient) {
	var insertValues [][]any
	var updateValues [][]any

	for _, deployment := range deployments {
		var commitId *string
		var environmentId *string

		if deployment.Commit != nil {
			commitId = &deployment.Commit.Sha
		}
		if deployment.Environment != nil {
			environmentId = &deployment.Environment.Id
		}

		insertValues = append(insertValues, []any{adapter.Name, repository.Id, deployment.Id})
		updateValues = append(updateValues, []any{deployment.Sha, commitId, deployment.Ref, deployment.Task, environmentId, deployment.CreatedAt, deployment.UpdatedAt, adapter.Name, repository.Id, deployment.Id})
	}

	UpsertBatch(client,
		"INSERT INTO base_data.deployments (adapter, repository_id, id) VALUES (?,?,?)",
		insertValues,
		"UPDATE base_data.deployments SET sha = ?, commit_id = ?, ref = ?, task = ?, environment_id = ?, created_at = ?, updated_at = ?, manually_corrected = false WHERE adapter = ? AND repository_id = ? AND id = ? IF manually_corrected != true",
		updateValues)
}

func InsertEnvironments(adapter internal.Adapter, repository internal.Repository, environments []internal.Environment, client *DatabaseClient) {
	var insertValues [][]any
	var updateValues [][]any

	for _, environment := range environments {
		insertValues = append(insertValues, []any{adapter.Name, repository.Id, environment.Id})
		updateValues = append(updateValues, []any{environment.Name, environment.CreatedAt, environment.UpdatedAt, adapter.Name, repository.Id, environment.Id})
	}

	UpsertBatch(client,
		"INSERT INTO base_data.environments (adapter, repository_id, id) VALUES (?,?,?)",
		insertValues,
		"UPDATE base_data.environments SET name = ?, created_at = ?, updated_at = ?, manually_corrected = false WHERE adapter = ? AND repository_id = ? AND id = ? IF manually_corrected != true",
		updateValues)
}

func InsertDeploymentFrequency(adapter internal.Adapter, repository internal.Repository, frequencies map[string]int, client *DatabaseClient) {
	var values [][]any

	for date, frequency := range frequencies {
		timestamp, _ := time.Parse(time.DateOnly, date)
		values = append(values, []any{adapter.Name, repository.Id, repository.FullName, timestamp, frequency})
	}

	InsertBatch(client, "INSERT INTO metrics.deployment_frequencies (adapter, repository_id, repository_name, date, frequency) VALUES (?,?,?,?,?)", values)
}

func InsertLeadTimeForChange(adapter internal.Adapter, repository internal.Repository, leadTimes map[string]time.Duration, client *DatabaseClient) {
	var values [][]any

	for issueId, leadTime := range leadTimes {
		values = append(values, []any{adapter.Name, repository.Id, repository.FullName, issueId, leadTime})
	}

	InsertBatch(client, "INSERT INTO metrics.lead_times (adapter, repository_id, repository_name, issue_id, lead_time) VALUES (?,?,?,?,?)", values)
}

func InsertBatch(client *DatabaseClient, statement string, values [][]any) {
	Connect(client)

	if client.session != nil {
		var chunks [][][]any

		for i := 0; i < len(values); i += chunkSize {
			end := i + chunkSize

			if end > len(values) {
				end = len(values)
			}

			chunks = append(chunks, values[i:end])
		}

		for _, chunk := range chunks {
			batch := client.session.NewBatch(gocql.UnloggedBatch)

			for _, args := range chunk {
				batch.Entries = append(batch.Entries, gocql.BatchEntry{
					Stmt:       statement,
					Args:       args,
					Idempotent: true,
				})
			}

			if len(batch.Entries) > 0 {
				err := client.session.ExecuteBatch(batch)
				if err != nil {
					internal.ProcessError(err)
					return
				}
			}
		}
	}
}

func UpsertBatch(client *DatabaseClient, insertStatement string, insertValues [][]any, updateStatement string, updateValues [][]any) {
	Connect(client)

	if client.session != nil {
		var insertChunks [][][]any
		var updateChunks [][][]any

		for i := 0; i < len(insertValues); i += chunkSize / 2 {
			end := i + chunkSize/2

			if end > len(insertValues) {
				end = len(insertValues)
			}

			insertChunks = append(insertChunks, insertValues[i:end])
		}

		for i := 0; i < len(updateValues); i += chunkSize / 2 {
			end := i + chunkSize/2

			if end > len(updateValues) {
				end = len(updateValues)
			}

			updateChunks = append(updateChunks, updateValues[i:end])
		}

		for index, _ := range insertChunks {
			batch := client.session.NewBatch(gocql.UnloggedBatch)

			insertChunk := insertChunks[index]
			for _, args := range insertChunk {
				batch.Entries = append(batch.Entries, gocql.BatchEntry{
					Stmt:       insertStatement,
					Args:       args,
					Idempotent: true,
				})
			}

			updateChunk := updateChunks[index]
			for _, args := range updateChunk {
				batch.Entries = append(batch.Entries, gocql.BatchEntry{
					Stmt:       updateStatement,
					Args:       args,
					Idempotent: true,
				})
			}

			if len(batch.Entries) > 0 {
				err := client.session.ExecuteBatch(batch)
				if err != nil {
					internal.ProcessError(err)
					return
				}
			}
		}
	}
}

func Upsert(client *DatabaseClient, insertStatement string, insertValues []any, updateStatement string, updateValues []any) {
	Connect(client)

	if client.session != nil {
		batch := client.session.NewBatch(gocql.LoggedBatch)

		batch.Entries = append(batch.Entries, gocql.BatchEntry{
			Stmt:       insertStatement,
			Args:       insertValues,
			Idempotent: true,
		})

		batch.Entries = append(batch.Entries, gocql.BatchEntry{
			Stmt:       updateStatement,
			Args:       updateValues,
			Idempotent: true,
		})

		err := client.session.ExecuteBatch(batch)
		if err != nil {
			internal.ProcessError(err)
		}
	}
}

func Close(client *DatabaseClient) {
	if IsConnected(client) {
		client.session.Close()
	}
}

func IsConnected(client *DatabaseClient) bool {
	return client.session != nil && !client.session.Closed()
}
