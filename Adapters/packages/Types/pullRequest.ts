import { Commit } from "./commit"
import { Issue } from "./issue"
import { WorkItem } from "./workItem"

export interface PullRequests {
    data: PullRequest[]
}

export interface PullRequest extends WorkItem {
    head: Head
    base: Head
    merged_at: Date
    issue: Issue
    commits: Commit[]
}

export interface Head {
    ref: string
    sha: string
}