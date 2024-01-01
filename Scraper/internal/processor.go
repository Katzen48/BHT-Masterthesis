package internal

import "github.com/rodaine/table"

func ProcessIssues(issues []Issue) {
	printIssues(issues)
}

func printIssues(issues []Issue) {
	tbl := table.New("ID", "Created At", "Closed At", "Repo ID", "Repo Full Name", "Repo Default Branch", "Repo Created At", "Repo Updated At")
	for _, issue := range issues {
		tbl.AddRow(issue.ID, issue.CreatedAt, issue.ClosedAt, issue.Repo.Id, issue.Repo.FullName, issue.Repo.DefaultBranch, issue.Repo.CreatedAt, issue.Repo.UpdatedAt)
	}

	tbl.Print()
}
