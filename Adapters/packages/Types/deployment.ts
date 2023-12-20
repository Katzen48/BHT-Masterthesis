import { Commit } from "./commit"
import { Environment } from "./environment"

export interface Deployments {
    data: Deployment[]
}

export interface Deployment {
    id: string
    sha: string
    commit: Commit
    ref: string
    task: string
    environment?: Environment
    created_at: Date
    updated_at: Date
}