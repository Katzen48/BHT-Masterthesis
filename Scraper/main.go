package main

import (
	"fmt"
	"gopkg.in/yaml.v2"
	"os"
	"strings"
	"thesis/scraper/internal"
)

func main() {
	config := readConfig()

	for _, repository := range config.Repositories {
		fmt.Printf("Processing Repo %s\n", repository.Id)
		internal.HandleRepository(repository, findAdapter(repository, config.Adapters))
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

func readConfig() internal.Config {
	var cfg internal.Config
	readFile(&cfg)

	return cfg
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
