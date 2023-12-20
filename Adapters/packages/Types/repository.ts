export interface Repositories {
    data: Repository[]
}

export interface Repository {
    id: string
    full_name: string
    default_branch: string
    created_at: Date
    updated_at: Date
}