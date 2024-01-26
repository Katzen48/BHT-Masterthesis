export interface Repositories {
    data: Repository[]
}

export interface Repository {
    id: string
    full_name: string
    default_branch: string|null
    created_at: Date|null
    updated_at: Date|null
    grouping_key: string
}