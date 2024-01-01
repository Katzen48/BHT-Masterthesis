package internal

type ConfigRepository struct {
	Id      string `yaml:"id"`
	Adapter string `yaml:"adapter"`
}

type Adapter struct {
	Name    string `yaml:"name"`
	BaseUrl string `yaml:"baseurl"`
	Token   string `yaml:"token"`
}

type Config struct {
	Adapters     []Adapter          `yaml:"adapters"`
	Repositories []ConfigRepository `yaml:"repositories"`
}

// HTTP Response Types
type Repository struct {
	Id            string `json:"id"`
	FullName      string `json:"full_name"`
	DefaultBranch string `json:"default_branch"`
	CreatedAt     string `json:"created_at"`
	UpdatedAt     string `json:"updated_at"`
}

type WorkItem struct {
	ID        string     `json:"id"`
	CreatedAt string     `json:"created_at"`
	ClosedAt  string     `json:"closed_at"`
	Repo      Repository `json:"repo"`
}

type Head struct {
	Ref string `json:"ref"`
	Sha string `json:"sha"`
}

type Commit struct {
	Sha  string     `json:"sha"`
	Repo Repository `json:"repo"`
}

type PullRequest struct {
	WorkItem
	Head     Head     `json:"head"`
	Base     Head     `json:"base"`
	MergedAt string   `json:"merged_at"`
	Issues   []Issue  `json:"issues"`
	Commits  []Commit `json:"commits"`
}

type Issue struct {
	WorkItem
	PullRequests []string `json:"pull_requests"`
}
