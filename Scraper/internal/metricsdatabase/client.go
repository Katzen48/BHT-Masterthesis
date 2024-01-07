package metricsdatabase

import (
	"github.com/gocql/gocql"
	"thesis/scraper/internal"
)

type DatabaseClient struct {
	config  internal.DatabaseConfig
	cluster *gocql.ClusterConfig
	session *gocql.Session
}

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
	Insert(client, "INSERT INTO base_data.repositories (adapter, id, full_name, default_branch, created_at, updated_at) VALUES (?,?,?,?,?,?)", adapter.Name, repository.Id, repository.FullName, repository.DefaultBranch, repository.CreatedAt, repository.UpdatedAt)
}

func InsertIssues(adapter internal.Adapter, repository internal.Repository, issues []internal.Issue, client *DatabaseClient) {
	var values [][]any

	for _, issue := range issues {
		values = append(values, []any{adapter.Name, repository.Id, issue.ID, issue.PullRequests, issue.CreatedAt, issue.ClosedAt})
	}

	InsertBatch(client, "INSERT INTO base_data.issues (adapter, repository_id, id, pull_request_ids, created_at, closed_at) VALUES (?,?,?,?,?,?)", values)
}

func InsertCommits(adapter internal.Adapter, repository internal.Repository, commits []internal.Commit, client *DatabaseClient) {
	var values [][]any

	for _, commit := range commits {
		values = append(values, []any{adapter.Name, repository.Id, commit.Sha})
	}

	InsertBatch(client, "INSERT INTO base_data.commits (adapter, repository_id, id) VALUES (?,?,?)", values)
}

func InsertPullRequests(adapter internal.Adapter, repository internal.Repository, pullRequests []internal.PullRequest, client *DatabaseClient) {
	var values [][]any

	for _, pullRequest := range pullRequests {
		var issueIds []string
		var commitIds []string

		for _, issue := range pullRequest.Issues {
			issueIds = append(issueIds, issue.ID)
		}

		for _, commit := range pullRequest.Commits {
			commitIds = append(commitIds, commit.Sha)
		}

		values = append(values, []any{adapter.Name, repository.Id, pullRequest.ID, pullRequest.Head, pullRequest.Base, issueIds, commitIds, pullRequest.ClosedAt, pullRequest.MergedAt, pullRequest.CreatedAt})
	}

	InsertBatch(client, "INSERT INTO base_data.pull_requests (adapter, repository_id, id, head, base, issue_ids, commit_ids, closed_at, merged_at, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)", values)
}

func InsertBatch(client *DatabaseClient, statement string, values [][]any) {
	Connect(client)

	if client.session != nil {
		batch := client.session.NewBatch(gocql.UnloggedBatch)

		for _, args := range values {
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

func Insert(client *DatabaseClient, statement string, values ...any) {
	Connect(client)

	if client.session != nil {
		err := client.session.Query(statement, values...).Exec()
		if err != nil {
			internal.ProcessError(err)
			return
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
