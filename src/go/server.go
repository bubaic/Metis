package main

import (
	"encoding/json"
	"errors"
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

// #region Metis HTTP Server Handler

type metisHTTPHandler struct{}

func (*metisHTTPHandler) ServeHTTP(writer http.ResponseWriter, request *http.Request) {
	var response []byte   // Define response as an array of bytes
	var errorObject error // Define errorObject as an error

	writer.Header().Set("Access-Control-Allow-Origin", "*") // Enable Access-Control-Allow-Origin

	if request.Body != nil { // If the response has body content
		var apiRequestObject APIRequest // Define apiRequestObject as an APIRequest struct
		var decodeError error           // Define decodeError as a potential error given by decoding requester.Body

		jsonDecoder := json.NewDecoder(request.Body)        // Define jsonDecoder as a new JSON Decoder that uses the requester.Body io.ReadCloser
		decodeError = jsonDecoder.Decode(&apiRequestObject) // Decode the JSON into apiRequestObject, providing decode error to decodeErr

		if decodeError == nil { // If there was no error decoding the API Request
			if apiRequestObject.Key == "" { // If this is a file-serving call
				if !config.DisableRequestListening { // If we haven't disabled request listening
					response, errorObject = FileServe(apiRequestObject) // Serve the requester.Body to the FileServe func
				} else { // If we have "disabled" request listening
					errorObject = errors.New("service_unavailable") // Set an error that the Metis cluster is not available
				}
			} else { // If this is a puppet call
				if config.EnablePuppeteering { // If puppeteering is enabled
					response, errorObject = PuppetServe(apiRequestObject) // Serve the requester.Body to the PuppetServe func
				} else { // If puppeteering is not enabled
					puppetNotEnabledMessage := "Puppeteering is not enabled on this server."
					requestCameFrom := " Puppeteering API Request came from "

					xRealIPHeaderVal := request.Header.Get("X-Real-IP") // Get any real remote I.P. / addr passed by nginx (using commonly used proxy forwarding header appending)

					if xRealIPHeaderVal == "" { // If this header doesn't exist
						xRealIPHeaderVal = request.RemoteAddr // Change to using RemoteAddr from request
					}

					requestCameFrom += xRealIPHeaderVal // Append the xRealIPHeaderVal

					errorObject = errors.New(puppetNotEnabledMessage)
					fmt.Println(puppetNotEnabledMessage + requestCameFrom)                       // Output to STDOUT
					metis.MessageLogger(syslog.LOG_ERR, puppetNotEnabledMessage+requestCameFrom) // Log as ERR as well
				}
			}
		}

		if decodeError != nil { // If there was a decodeError
			errorObject = errors.New("invalid_json_content")
		}
	} else { // If the response does not have body content
		errorObject = errors.New("no_json_provided")
	}

	if errorObject != nil { // If there was an error
		errorResponseObject := ErrorResponse{Error: fmt.Sprintf("%v", errorObject)} // Create an errorResponseObject where the val is the value of the errorObject
		response, _ = json.Marshal(errorResponseObject)                             // Encode the errorResponseObject instead
	}

	writer.Write(response)
}

// #region Main

func main() {
	// #region Configuration and Flag Setting

	var configBytes []byte    // Byte array of the metis.json content
	var nodeListBytes []byte  // Byte array of the nodeList.json content
	var configReadErr error   // Error from reading metis.json
	var nodeListReadErr error // Error from reading nodeList.json

	etcFolder := "/etc/metis/"       // Define our etcFolder as /etc/metis/
	usrFolder := "/usr/share/metis/" // Define our usrFolder as /usr/share/metis/

	config.ConfigLocation = etcFolder + "metis.json"      // Default to using /etc/metis for config, falls back to vendor /usr/share/metis if not found
	config.NodeListLocation = etcFolder + "nodeList.json" // Default to using /etc/metis for nodeList, falls back to vendor /usr/share/metis if not found

	if metis.IsDir(etcFolder, false) { // If /etc/metis/ exists
		configBytes, configReadErr = ioutil.ReadFile(config.ConfigLocation)
		nodeListBytes, nodeListReadErr = ioutil.ReadFile(config.NodeListLocation)
	}

	if configReadErr != nil { // If there was an issue getting metis.json from /etc/metis
		config.ConfigLocation = usrFolder + "metis.json"                    // Change to using usrFolder (vendor) for config
		configBytes, configReadErr = ioutil.ReadFile(config.ConfigLocation) // Re-attempt read using usrFolder (vendor)
	}

	if nodeListReadErr != nil { // If there was an issue getting nodeList.json from /etc/metis/
		config.NodeListLocation = usrFolder + "nodeList.json" // Change to using usrFolder (vendor) for nodeList
		nodeListBytes, nodeListReadErr = ioutil.ReadFile(config.NodeListLocation)
	}

	// #endregion

	// #region Config and NodeList Reading

	if (configReadErr != nil) || (nodeListReadErr != nil) { // If we couldn't find the config file or nodeList file
		if configReadErr != nil { // If we couldn't find the config file
			configErrorMessage := "Could not find config at: " + config.ConfigLocation
			metis.MessageLogger(syslog.LOG_ERR, configErrorMessage) // Log the error
			fmt.Println(configErrorMessage)                         // Print in stdout as well
		}

		if nodeListReadErr != nil { // If we couldn't find the nodeList file
			nodelistErrorMessage := "Could not find nodeList at: " + config.NodeListLocation
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

	if config.DataRootDirectory == "" { // If no Data Root Directory is defined
		config.DataRootDirectory = etcFolder + "/data" // Set to metis etcFolder + data as default
	}

	if config.Port == 0 { // If no port is defined in config
		config.Port = 4849 // Define as 4849
	}

	// #endregion

	// #region Metis Initialization

	metis.Configure(metis.ConfigOptions{DataRootDirectory: config.DataRootDirectory}) // Pass along a metis MetisConfig struct with DataRootDirectory set to the server's DataRootDirectory
	initializationSucceeded := metis.Initialize(nodeListBytes)                        // Initialize Metis with the nodeList, assigning bool initializationSucceeded. If it succeeds, it will change initializationSucceeded to true

	if !initializationSucceeded { // If initialization failed
		os.Exit(1)
	}

	// #endregion

	// #region Metis HTTP Server

	metisServer := http.Server{
		Addr:         ":" + strconv.Itoa(config.Port),
		Handler:      &metisHTTPHandler{},
		ReadTimeout:  time.Second * 3,
		WriteTimeout: time.Second * 10,
	}

	logMessage := "Starting Metis Server" // Our log message we provide syslog and stdout

	fmt.Println(logMessage)
	serveFail := metisServer.ListenAndServe() // Listen on designated port

	if serveFail != nil { // If we failed to start the server
		metis.MessageLogger(syslog.LOG_ERR, logMessage+": FAILED") // Log the decode error
		os.Exit(1)
	}
}

// #endregion
