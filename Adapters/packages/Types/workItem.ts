import { Repository } from "./repository"

export interface WorkItems {
    data: WorkItem[]
}

export interface WorkItem {
    id: string
    created_at: Date
    closed_at: Date
    repo: Repository
}