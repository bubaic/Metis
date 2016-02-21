package main

import (
	"encoding/json"
	"errors"
	"github.com/StroblIndustries/metis-pkg"
	"io/ioutil"
	//"net/http"
	"strings"
)

// #region Metis Puppeteering Server Handler

// PuppetServe is for handling puppeteering API requests
func PuppetServe(puppetAPIRequest APIRequest) ([]byte, error) {
	var response []byte   // Define response as array of byte
	var errorObject error // Define errorObject as an error

	keysFileBytes, keysError := ioutil.ReadFile(config.Root + "/keys") // Read the keysFile if it exists, putting error as keysError

	if keysError == nil { // If there was no keysError
		keysFile := string(keysFileBytes[:])      // Convert keysFileBytes to string
		keysList := strings.Split(keysFile, "\n") // Split the keys up into a list

		if (puppetAPIRequest.Action != "") && (puppetAPIRequest.Key != "") { // If an Action and Key is provided
			if CheckStringArray(keysList, puppetAPIRequest.Key) { // If the keysList contains the key
				puppetAPIRequestContentString := puppetAPIRequest.Content.(string) // Type inference to string

				if puppetAPIRequest.Action == "status" { // If we are getting or setting the status of the cluster
					puppetStatusResponseObject := PuppetStatusResponse{}

					if puppetAPIRequestContentString == "get" { // If we are getting the status
						puppetStatusResponseObject.Content = "active"

						if config.DisableRequestListening { // If we have disabled request listening
							puppetStatusResponseObject.Content = "disabled"
						}
					} else { // If Content was provided
						config.DisableRequestListening = (puppetAPIRequestContentString == "disable") // Disable request listening of content string is "disable"
						puppetStatusResponseObject.Content = "disabled"

						if config.DisableRequestListening { // If we are enabling request listening
							puppetStatusResponseObject.Content = "active"
						}
					}

					response, _ = json.Marshal(puppetStatusResponseObject) // Set the response to the encoding of the status response object
				} else if puppetAPIRequest.Action == "cache" { // If we are caching the NodeList from the
					response, _ = json.Marshal(PuppetCacheResponse{Content: metis.NodeList}) // Encode the NodeList into JSON and set response
				} else if (puppetAPIRequest.Action == "push") && (puppetAPIRequestContentString != "") { // If we are updating the NodeList
					puppetPushResponseObject := PuppetPushResponse{}
					nodeListBytes := []byte(puppetAPIRequestContentString)     // Convert content string to []byte
					initializationSucceeded := metis.Initialize(nodeListBytes) // Re-initialize Metis with the updated content in byte array form

					if initializationSucceeded { // If the initialization succeeded
						ioutil.WriteFile(config.NodeListLocation, nodeListBytes, 0755) // Update the NodeList on the server
						puppetPushResponseObject.Content = "updated"
						response, _ = json.Marshal(puppetPushResponseObject) // Encode the PuppetPushResponseObject
					} else { // If the initialization did not succeed
						errorObject = errors.New("Metis Cluster failed to update.")
					}
				}
			} else { // If the key isn't contained in the key list
				errorObject = errors.New("This key is not authorized to puppet this Cluster.")
			}
		} else { // If an Action is not provided
			errorObject = errors.New("Provided body was not a valid API request.")
		}
	} else { // If there was a keysError
		errorObject = errors.New("No keys file exists on this Cluster.")
	}

	return response, errorObject
}

// #endregion
