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
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

var config Config // Define config as type Config

// #region Metis HTTP Server Handler

type metisHTTPHandler struct{}

func (*metisHTTPHandler) ServeHTTP(writer http.ResponseWriter, request *http.Request) {
	var response []byte                   // Define response as an array of bytes
	var errorResponseObject ErrorResponse // Define eerrorResponseObject as an ErrorResponse

	writer.Header().Set("Access-Control-Allow-Origin", "*") // Enable Access-Control-Allow-Origin

	if request.Body != nil { // If the response has body content
		var decodeError error                        // Define decodeError as a potential error given by decoding requester.Body
		jsonDecoder := json.NewDecoder(request.Body) // Define jsonDecoder as a new JSON Decoder that uses the requester.Body io.ReadCloser

		if strings.Contains(request.Host, strconv.Itoa(config.Port)) { // If the request is being made to the primary Metis port
			if config.DisableRequestListening == false { // If we haven't disabled request listening
				var apiRequestObject APIRequest                    // Define apiRequestObject as an APIRequest struct
				decodeError = jsonDecoder.Decode(&apiRequestObject) // Decode the JSON into apiRequestObject, providing decode error to decodeErr

				if decodeError == nil { // If there was no decode error
					response, errorResponseObject = FileServe(apiRequestObject) // Serve the requester.Body to the FileServe func
				}
			} else { // If we have "disabled" request listening
				errorResponseObject.Error = "service_unavailable"
			}
		} else if strings.Contains(request.Host, strconv.Itoa(config.PuppeteeringPort)) { // If the request is being made to the primary puppeteering port
			var apiRequestObject PuppetAPIRequest              // Define apiRequestObject as a PuppetAPIRequest struct
			decodeError = jsonDecoder.Decode(&apiRequestObject) // Decode the JSON into apiRequestObject, providing decode error to decodeErr

			if decodeError == nil { // If there was no decode error
				response, errorResponseObject = PuppetServe(apiRequestObject) // Serve the requester.Body to the PuppetServe func
			}
		} else { // If it doesn't contain either ports
			errorResponseObject.Error = "invalid_location"
		}

		if decodeError != nil { // If there was a decodeError
			errorResponseObject.Error = "invalid_json_content"
		}
	} else { // If the response does not have body content
		errorResponseObject.Error = "no_json_provided"
	}

	if errorResponseObject.Error != "" { // If there was an rror
		response, _ = json.Marshal(errorResponseObject) // Encode the errorResponseObject instead
	}

	writer.Write(response)
}

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

	config.Root = filepath.Dir(configLocation)
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
		metisPuppetServer := http.Server{
			Addr:         ":" + strconv.Itoa(config.PuppeteeringPort),
			Handler:      &metisHTTPHandler{},
			ReadTimeout:  time.Second * 3,
			WriteTimeout: time.Second * 10,
		}

		metisPuppetServer.ListenAndServe()
	}

	// #endregion
}

// #endregion
