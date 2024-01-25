create table deployment_frequencies
(
    adapter         TEXT,
    repository_id   TEXT,
    repository_name TEXT,
    date            TIMESTAMP,
    frequency       INT,
    primary key ((adapter, repository_id), date)
);

GRANT ALL PERMISSIONS ON metrics.deployment_frequencies TO scraper;

create table lead_times
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