package internal

import "time"

type ConfigRepository struct {
	Id      string `yaml:"id"`
	Adapter string `yaml:"adapter"`
}

type Adapter struct {
	Name    string `yaml:"name"`
	BaseUrl string `yaml:"baseurl"`
	Token   string `yaml:"token"`
}

type DatabaseConfig struct {
	Hosts    []string `yaml:"hosts,omitempty"`
	Username string   `yaml:"username,omitempty"`
	Password string   `yaml:"password,omitempty"`
	Keyspace string   `yaml:"keyspace,omitempty"`
}

type BaseDatabaseConfig struct {
	Host     string `yaml:"host,omitempty"`
	Username string `yaml:"username,omitempty"`
	Password string `yaml:"password,omitempty"`
	Database string `yaml:"database,omitempty"`
}

type Config struct {
	Adapters     []Adapter          `yaml:"adapters"`
	Repositories []ConfigRepository `yaml:"repositories"`
	Database     DatabaseConfig     `yaml:"metricsdatabase"`
	BaseData     BaseDatabaseConfig `json:"baseData"`
}

// HTTP Response Types
type Repository struct {
	Id            string    `json:"id"`
	FullName      string    `json:"full_name"`
	DefaultBranch string    `json:"default_branch"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type WorkItem struct {
	ID        string      `json:"id"`
	CreatedAt time.Time   `json:"created_at"`
	ClosedAt  *time.Time  `json:"closed_at,omitempty"`
	Repo      *Repository `json:"repo"`
}

type Head struct {
	Ref string `json:"ref" cql:"ref"`
	Sha string `json:"sha" cql:"id"`
}

type Commit struct {
	Sha       string      `json:"sha"`
	Repo      *Repository `json:"repo"`
	CreatedAt time.Time   `json:"created_at"`
}

type PullRequest struct {
	WorkItem
	Head     *Head      `json:"head"`
	Base     *Head      `json:"base"`
	MergedAt *time.Time `json:"merged_at,omitempty"`
	Issues   []Issue    `json:"issues"`
	Commits  []Commit   `json:"commits"`
}

type Issue struct {
	WorkItem
	PullRequests []string `json:"pull_requests"`
}

type Environment struct {
	Id        string    `json:"id"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"created_At"`
	UpdatedAt time.Time `json:"updated_At"`
}

type Deployment struct {
	Id          string       `json:"id"`
	Sha         string       `json:"sha"`
	Commit      *Commit      `json:"commit"`
	Ref         string       `json:"ref"`
	Task        string       `json:"task"`
	Environment *Environment `json:"environment"`
	CreatedAt   time.Time    `json:"created_At"`
	UpdatedAt   time.Time    `json:"updated_At"`
}
