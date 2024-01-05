package main

import (
	"fmt"
	"gopkg.in/yaml.v2"
	"os"
	"strings"
	"thesis/scraper/internal"
	"thesis/scraper/internal/basedatabase"
	"thesis/scraper/internal/metricsdatabase"
	"thesis/scraper/internal/processing"
)

var config internal.Config
var metricsDatabase *metricsdatabase.DatabaseClient
var baseDatabase *basedatabase.DatabaseClient

func main() {
	readConfig()
	connectToDatabase()
	defer metricsdatabase.Close(metricsDatabase)
	connectToBaseDatabase()
	defer basedatabase.Close(baseDatabase)

	for _, repository := range config.Repositories {
		fmt.Printf("Processing Repo %s\n", repository.Id)
		processing.HandleRepository(repository, findAdapter(repository, config.Adapters), baseDatabase, metricsDatabase)
	}
}

func findAdapter(repository internal.ConfigRepository, adapters []internal.Adapter) (adapter internal.Adapter) {
	for _, a := range adapters {
		if strings.ToLower(a.Name) == strings.ToLower(repository.Adapter) {
			adapter = a
			return
		}
	}

	return
}

func connectToDatabase() {
	metricsDatabase = metricsdatabase.CreateClient(config.Database)
	metricsdatabase.Connect(metricsDatabase)
}

func connectToBaseDatabase() {
	baseDatabase = basedatabase.CreateClient(config.BaseData)
}

func readConfig() {
	readFile(&config)
}

func readFile(cfg *internal.Config) {
	f, err := os.Open("config.yml")
	if err != nil {
		internal.ProcessError(err)
	}

	defer f.Close()

	decoder := yaml.NewDecoder(f)
	err = decoder.Decode(cfg)
	if err != nil {
		internal.ProcessError(err)
	}
}
