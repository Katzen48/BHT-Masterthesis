package metricsdatabase

import (
	"github.com/gocql/gocql"
	"thesis/scraper/internal"
)

type DatabaseClient struct {
	config  internal.DatabaseConfig
	cluster *gocql.ClusterConfig
	session *gocql.Session
}

func CreateClient(config internal.DatabaseConfig) *DatabaseClient {
	cluster := gocql.NewCluster(config.Hosts...)
	cluster.Keyspace = config.Keyspace

	return &DatabaseClient{config: config, cluster: cluster}
}

func Connect(client *DatabaseClient) {
	if IsConnected(client) {
		return
	}

	var err error
	client.session, err = client.cluster.CreateSession()
	if err != nil {
		internal.ProcessError(err)
		return
	}
}

func IsConnected(client *DatabaseClient) bool {
	return client.session != nil && !client.session.Closed()
}
