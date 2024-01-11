create table deployment_frequencies
(
    adapter       TEXT,
    repository_id TEXT,
    date          TIMESTAMP,
    frequency     INT,
    primary key ((adapter, repository_id), date)
);

GRANT ALL PERMISSIONS ON metrics.deployment_frequencies TO scraper;