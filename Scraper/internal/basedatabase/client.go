package basedatabase

import (
	"database/sql"
	"fmt"
	"thesis/scraper/internal"
	"time"

	_ "github.com/go-sql-driver/mysql"
)

type DatabaseClient struct {
	config internal.BaseDatabaseConfig
	db     *sql.DB
}

func CreateClient(config internal.BaseDatabaseConfig) *DatabaseClient {
	var err error
	db, err := sql.Open("mysql", fmt.Sprintf("%s:%s@tcp(%s)/%s", config.Username, config.Password, config.Host, config.Database))
	if err != nil {
		internal.ProcessError(err)
		return nil
	}

	db.SetConnMaxLifetime(time.Minute * 3)
	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(10)

	return &DatabaseClient{config: config, db: db}
}

func InsertJson(client *DatabaseClient, query string, values ...any) bool {
	stmtIns, err := client.db.Prepare(query)
	if err != nil {
		internal.ProcessError(err)
		return false
	}
	defer stmtIns.Close()

	exec, err := stmtIns.Exec(values...)
	if err != nil {
		internal.ProcessError(err)
		return false
	}

	rows, err := exec.RowsAffected()
	if err != nil {
		internal.ProcessError(err)
		return false
	}

	return rows > 0
}

func Close(client *DatabaseClient) {
	err := client.db.Close()
	if err != nil {
		internal.ProcessError(err)
	}
}
