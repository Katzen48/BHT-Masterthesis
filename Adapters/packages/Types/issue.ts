import { PullRequest } from "./pullRequest"
import { WorkItem } from "./workItem"

export interface Issues {
    data: Issue[]
}

export interface Issue extends WorkItem {
    pull_requests: string[]
}