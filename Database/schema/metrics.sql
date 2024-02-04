create keyspace metrics with replication = {'class': 'SimpleStrategy', 'replication_factor': 1};

create table if not exists metrics.deployment_frequencies
(
    adapter         TEXT,
    grouping_key    TEXT,
    repository_id   TEXT,
    repository_name TEXT,
    date            TIMESTAMP,
    frequency       INT,
    primary key ((adapter, grouping_key), repository_id, date)
);

GRANT ALL PERMISSIONS ON metrics.deployment_frequencies TO scraper;
GRANT ALL PERMISSIONS ON metrics.deployment_frequencies TO grafana;

create table if not exists metrics.lead_times
(
    adapter                 TEXT,
    repository_id           TEXT,
    repository_name         TEXT,
    issue_id                TEXT,
    lead_time               DURATION,
    lead_time_milliseconds  BIGINT,
    primary key ((adapter, repository_id), issue_id)
);

GRANT ALL PERMISSIONS ON metrics.lead_times TO scraper;

create table if not exists metrics.change_failure_rates
(
    adapter                 TEXT,
    repository_id           TEXT,
    repository_name         TEXT,
    rate                    DOUBLE,
    primary key ((adapter, repository_id))
);

GRANT ALL PERMISSIONS ON metrics.change_failure_rates TO scraper;
GRANT ALL PERMISSIONS ON metrics.change_failure_rates TO grafana;

create table if not exists metrics.times_to_restore_service
(
    adapter                                 TEXT,
    repository_id                           TEXT,
    repository_name                         TEXT,
    issue_id                                TEXT,
    time_to_restore_service                 DURATION,
    time_to_restore_service_milliseconds    BIGINT,
    primary key ((adapter, repository_id), issue_id)
);

GRANT ALL PERMISSIONS ON metrics.times_to_restore_service TO scraper;
GRANT ALL PERMISSIONS ON metrics.times_to_restore_service TO grafana;