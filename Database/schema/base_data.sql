create keyspace base_data with replication = {'class': 'SimpleStrategy', 'replication_factor': 1};

create table if not exists repositories
(
    adapter        TEXT,
    id             TEXT,
    full_name      TEXT,
    default_branch TEXT,
    created_at     TIMESTAMP,
    updated_at     TIMESTAMP,
    primary key ((adapter, id))
);

GRANT ALL PERMISSIONS ON base_data.repositories TO scraper;

create table if not exists base_data.issues
(
    adapter          TEXT,
    repository_id    TEXT,
    id               TEXT,
    closed_at        TIMESTAMP,
    created_at       TIMESTAMP,
    pull_request_ids SET<TEXT>,
    primary key ((adapter, repository_id), id)
);

GRANT ALL PERMISSIONS ON base_data.issues TO scraper;

create table if not exists base_data.commits
(
    adapter          TEXT,
    repository_id    TEXT,
    id               TEXT,
    created_at       TIMESTAMP,
    primary key ((adapter, repository_id), id)
);

GRANT ALL PERMISSIONS ON base_data.commits TO scraper;

create type head
(
  ref    TEXT,
  id     TEXT
);

create table if not exists base_data.pull_requests
(
    adapter          TEXT,
    repository_id    TEXT,
    id               TEXT,
    head             head,
    base             head,
    issue_ids        SET<TEXT>,
    commit_ids       SET<TEXT>,
    closed_at        TIMESTAMP,
    merged_at        TIMESTAMP,
    created_at       TIMESTAMP,
    primary key ((adapter, repository_id), id)
);

GRANT ALL PERMISSIONS ON base_data.pull_requests TO scraper;

create table if not exists base_data.deployments
(
    adapter          TEXT,
    repository_id    TEXT,
    id               TEXT,
    sha              TEXT,
    commit_id        TEXT,
    ref              TEXT,
    task             TEXT,
    environment_id   TEXT,
    created_at       TIMESTAMP,
    updated_at       TIMESTAMP,
    primary key ((adapter, repository_id), id)
);

GRANT ALL PERMISSIONS ON base_data.deployments TO scraper;

create table if not exists base_data.environments
(
    adapter          TEXT,
    repository_id    TEXT,
    id               TEXT,
    name             TEXT,
    created_at       TIMESTAMP,
    updated_at       TIMESTAMP,
    primary key ((adapter, repository_id), id)
);

GRANT ALL PERMISSIONS ON base_data.environments TO scraper;