package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"github.com/StroblIndustries/metis-pkg" // Import the core Metis code
	"io/ioutil"
	"log/syslog"
	"net/http"
	"os" // Still needed for exit
	"strconv"
	"time"
)

var config Config // Define config as type Config

// #region Main

func main() {
	// #region Configuration and Flag Setting

	var configLocation string
	var nodeListLocation string

	flag.StringVar(&configLocation, "c", "config/metis.json", "Location of Metis config file")        // Define the config flag
	flag.StringVar(&nodeListLocation, "n", "config/nodeList.json", "Location of Metis nodeList file") // Define the nodeList flag

	flag.Parse() // Parse the flags

	// #endregion

	// #region Config and NodeList Reading

	configBytes, configReadError := ioutil.ReadFile(configLocation)   // Read the config file, assigning content to configBytes and any error to configReadError
	nodeListBytes, nodeListError := ioutil.ReadFile(nodeListLocation) // Read the nodeList file, aassigning content to nodeListBytes and any error to nodeListError

	if (configReadError != nil) || (nodeListError != nil) { // If we couldn't find the config file or nodeList ffile
		if configReadError != nil { // If we couldn't find the config file
			configErrorMessage := "Could not find config at: " + configLocation
			metis.MessageLogger(syslog.LOG_ERR, configErrorMessage) // Log the error
			fmt.Println(configErrorMessage)                         // Print in stdout as well
		}

		if nodeListError != nil { // If we couldn't find the nodeList file
			nodelistErrorMessage := "Could not find nodeList at: " + nodeListLocation
			metis.MessageLogger(syslog.LOG_ERR, nodelistErrorMessage) // Log the error
			fmt.Println(nodelistErrorMessage)                         // Print in stdout as well
		}

		os.Exit(1) // Exit as error
	}

	// #endregion

	// #region Configuration Decoding and Defaults

	configDecodeError := json.Unmarshal(configBytes, &config) // Decode the configBytes into config, with error being configDecodeError

	if configDecodeError != nil { // If we couldn't decode the config
		configDecodeErrorMessage := "Failed to decode config. Please ensure the config is valid JSON."
		metis.MessageLogger(syslog.LOG_ERR, configDecodeErrorMessage) // Log the decode error
		fmt.Println(configDecodeErrorMessage)                         // Print in stdout as well
		os.Exit(1)                                                    // Exit as error
	}

	if config.Port == 0 { // If no port is defined in config
		config.Port = 4849 // Define as 4849
	}

	if config.PuppeteeringPort == 0 { // If no puppeteering port is defined in config
		config.Port = 4850 // Define as 4850
	}

	// #endregion

	// #region Metis Initialization

	initializationSucceeded := metis.Initialize(nodeListBytes) // Initialize Metis with the nodeList, assigning bool initializationSucceeded. If it succeeds, it will change initializationSucceeded to true

	if initializationSucceeded == false { // If initialization failed
		initializationErrorMessage := "Failed to initialize Metis."
		metis.MessageLogger(syslog.LOG_ERR, initializationErrorMessage) // Log the decode error
		fmt.Println(initializationErrorMessage)                         // Print in stdout as well
		os.Exit(1)
	}

	// #endregion

	// #region Metis HTTP and Puppeteering Servers

	metisServer := http.Server{
		Addr:         ":" + strconv.Itoa(config.Port),
		Handler:      &metisHTTPHandler{},
		ReadTimeout:  time.Second * 3,
		WriteTimeout: time.Second * 10,
	}

	serveFail := metisServer.ListenAndServe() // Listen on designated port

	logMessage := "Starting Metis HTTP Server: " // Our log message we provide syslog and stdout, appending logStatusString
	logStatus := syslog.LOG_INFO                 // Set logStatus to LOG_INFO by Defaults
	logStatusString := "OK"                      // Set status string to OK by default

	if serveFail != nil { // If there was an error starting the server
		logStatus = syslog.LOG_ERR // Log as ERR instead
		logStatusString = "FAIL"   // Indicate failure
	}

	metis.MessageLogger(logStatus, logMessage+logStatusString) // Log the message to the appropriate syslog status

	if serveFail != nil {
		fmt.Println(logMessage + logStatusString) // Print to stdout as well
		os.Exit(1)                                // Immediately exit
	}

	if config.EnablePuppeteering { // If EnablePuppeteering is enabled
		http.HandleFunc("/", metisPuppetServe)                              // Handle anything to / to metisPuppetServe func
		http.ListenAndServe(":"+strconv.Itoa(config.PuppeteeringPort), nil) // Listen on puppeteering port
	}

	// #endregion
}

// #endregion
