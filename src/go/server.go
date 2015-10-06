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
	"strings"
)

var config Config // Define config as type Config

// #region Metis HTTP Server Handler

func metisHTTPServe(writer http.ResponseWriter, requester *http.Request){
	var response []byte // Define response as an array of bytes
	var errorResponseObject ErrorResponse // Define eerrorResponseObject as an ErrorResponse

	if requester.Body != nil { // If the response has body content
		var apiRequestObject APIRequest // Define apiRequestObject as an APIRequest struct

		jsonDecoder := json.NewDecoder(requester.Body) // Define jsonDecoder as a new JSON Decoder that uses the requester.Body io.ReadCloser
		decodeErr := jsonDecoder.Decode(&apiRequestObject) // Decode the JSON into apiRequestObject, providing decode error to decodeErr

		if decodeErr == nil { // If there was no decode error
			if (apiRequestObject.NodeData != "") && (apiRequestObject.Action != "") && (len(apiRequestObject.Files) > 0) { // If this contains NodeData, an Action, and Files is an array with files
				continueIO := true

				if ((apiRequestObject.Action == "w") || (apiRequestObject.Action == "u")) && (apiRequestObject.Content == "") { // If the action is write or update and NO content is provided
					continueIO = false // Do not continue any sort of Initialization
					errorResponseObject.Error = "no_content_provided"
				}

				if continueIO { // If we are continuing Initialization
					var nodes []metis.Node // Define nodes as an array of Node

					// #region Parse NodeData

					nodeGroupsSplit := strings.Split(apiRequestObject.NodeData, "|") // Split the individual NodeGroup requests (if any) by |

					for _, nodeGroupString := range nodeGroupsSplit { // For each nodeGroupString in nodeGroupsSplit
						nodesToGet := make([]string, 0, 10)

						if strings.Contains(nodeGroupString, "#") { // If specific Nodes within this Node Group are being specified
							nodeGroupAndNodeSplit := strings.Split(nodeGroupString, "#") // Split the Node Group and Nodes in NodeData syntax
							nodesToGet = strings.Split(nodeGroupAndNodeSplit[1], ",") // Set nodesToGet as the second series of strings after splitting on # and then splitting that string by ,
						} else { // If it does not contain a #, meaning all Nodes in this Node Group
							nodesToGet = metis.NodeList[nodeGroupString].([]string) // Define the nodesToGet as the []string (type asssertion) provided for this specific NodeGroup
						}

						for _, node := range nodesToGet {
							nodes = append(nodes, metis.NodeList[node].(metis.Node)) // Append the Node (type asserted from interface{})
						}
					}

					// #endregion

					jsonResponseObject := metis.Manage(apiRequestObject.Action, nodes, apiRequestObject.Files, apiRequestObject.Content) // Call metis.Manage with the action, nodes, files, and any content. Returns map[string]interface{}
					response, _ = json.Marshal(jsonResponseObject) // Encode into JSON, assigning to response
				}
			} else { // If it does not contain nodedata, action, or files
				errorResponseObject.Error = "invalid_api_request"
			}
		} else { // If there was a decode error
			errorResponseObject.Error = "invalid_json_content"
		}
	} else { // If the response does not have body content
		errorResponseObject.Error ="no_json_provided"
	}

	if errorResponseObject.Error != "" { // If there was an error
		response, _ = json.Marshal(errorResponseObject) // Encode the errorResponseObject instead
	}

	writer.Write(response) // Write the response
}

// #endregion

// #region Metis Puppeteering Server Handler

func metisPuppetServe(writer http.ResponseWriter, requester *http.Request){
	writer.Write([]byte("Puppeteering not yet implemented."))
}

// #endregion

// #region Main

func main() {
	// #region Configuration and Flag Setting

	var configLocation string
	var nodeListLocation string

	flag.StringVar(&configLocation, "c", "config/metis.json", "Location of Metis config file")          // Define the config flag
	flag.StringVar(&nodeListLocation, "n", "config/nodeList.json", "Location of Metis nodeList file") // Define the nodeList flag

	flag.Parse() // Parse the flags

	// #endregion

	// #region Config and NodeList Reading

	configBytes, configReadError := ioutil.ReadFile(configLocation)   // Read the config file, assigning content to configBytes and any error to configReadError
	nodeListBytes, nodeListError := ioutil.ReadFile(nodeListLocation) // Read the nodeList file, aassigning content to nodeListBytes and any error to nodeListError

	if (configReadError != nil) || (nodeListError != nil) { // If we couldn't find the config file or nodeList ffile
		if configReadError != nil { // If we couldn't find the config file
			configErrorMessage := "Could not find config at: "+ configLocation
			metis.MessageLogger(syslog.LOG_ERR, configErrorMessage) // Log the error
			fmt.Println(configErrorMessage) // Print in stdout as well
		}

		if nodeListError != nil { // If we couldn't find the nodeList file
			nodelistErrorMessage := "Could not find nodeList at: "+ nodeListLocation
			metis.MessageLogger(syslog.LOG_ERR, nodelistErrorMessage) // Log the error
			fmt.Println(nodelistErrorMessage) // Print in stdout as well
		}

		os.Exit(1) // Exit as error
	}

	// #endregion

	// #region Configuration Decoding and Defaults

	configDecodeError := json.Unmarshal(configBytes, &config)    // Decode the configBytes into config, with error being configDecodeError

	if configDecodeError != nil { // If we couldn't decode the config
		configDecodeErrorMessage := "Failed to decode config. Please ensure the config is valid JSON."
		metis.MessageLogger(syslog.LOG_ERR, configDecodeErrorMessage) // Log the decode error
		fmt.Println(configDecodeErrorMessage) // Print in stdout as well
		os.Exit(1) // Exit as error
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
		fmt.Println(initializationErrorMessage) // Print in stdout as well
		os.Exit(1)
	}

	// #endregion

	// #region Metis HTTP and Puppeteering Servers

	http.HandleFunc("/", metisHTTPServe) // Handle anything to / to metisHTTPServe func
	serveFail := http.ListenAndServe(":" + strconv.Itoa(config.Port), nil) // Listen on designated port

	logMessage := "Starting Metis HTTP Server: " // Our log message we provide syslog and stdout, appending logStatusString
	logStatus := syslog.LOG_INFO // Set logStatus to LOG_INFO by Defaults
	logStatusString := "OK" // Set status string to OK by default

	if serveFail != nil { // If there was an error starting the server
		logStatus = syslog.LOG_ERR // Log as ERR instead
		logStatusString = "FAIL" // Indicate failure
	}

	metis.MessageLogger(logStatus, logMessage + logStatusString) // Log the message to the appropriate syslog status

	if serveFail != nil {
		fmt.Println(logMessage + logStatusString) // Print to stdout as well
		os.Exit(1) // Immediately exit
	}

	if config.EnablePuppeteering { // If EnablePuppeteering is enabled
		http.HandleFunc("/", metisPuppetServe) // Handle anything to / to metisPuppetServe func
		http.ListenAndServe(":" + strconv.Itoa(config.PuppeteeringPort), nil) // Listen on puppeteering port
	}

	// #endregion
}

// #endregion