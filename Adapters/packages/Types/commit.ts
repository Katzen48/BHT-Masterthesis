import { Repository } from "./repository"

export interface Commits {
    data: Commit[]
}

export interface Commit {
    sha: string
    repo?: Repository
    created_at?: Date
}