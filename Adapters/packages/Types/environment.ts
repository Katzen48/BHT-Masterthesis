export interface Environments {
    data: Environment[]
}

export interface Environment {
    id: string
    name: string
    created_at: Date|null
    updated_at: Date|null
}