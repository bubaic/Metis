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

func PuppetServe(puppetAPIRequest PuppetAPIRequest) ([]byte, error) {
	var response []byte   // Define response as array of byte
	var errorObject error // Define errorObject as an error

	keysFileBytes, keysError := ioutil.ReadFile(config.Root + "/keys") // Read the keysFile if it exists, putting error as keysError

	if keysError == nil { // If there was no keysError
		keysFile := string(keysFileBytes[:])      // Convert keysFileBytes to string
		keysList := strings.Split(keysFile, "\n") // Split the keys up into a list

		if (puppetAPIRequest.Action != "") && (puppetAPIRequest.Key != "") { // If an Action and Key is provided
			if CheckStringArray(keysList, puppetAPIRequest.Key) { // If the keysList contains the key
				if puppetAPIRequest.Action == "status" { // If we are getting or setting the status of the cluster
					puppetStatusResponseObject := PuppetStatusResponse{}

					if puppetAPIRequest.Content == "" { // If no Content was provided
						if config.DisableRequestListening { // If we have disabled request listening
							puppetStatusResponseObject.Content = "disabled"
						} else { // If we have not disabled request listening
							puppetStatusResponseObject.Content = "active"
						}
					} else { // If Content was provided

						if puppetAPIRequest.Content == "enable" { // If we are enabling request listening
							config.DisableRequestListening = false // Enable (not disable) request listening
							puppetStatusResponseObject.Content = "active"
						} else { // If we are disabling request listening
							config.DisableRequestListening = true // Disable request listening
							puppetStatusResponseObject.Content = "disabled"
						}
					}

					response, _ = json.Marshal(puppetStatusResponseObject) // Set the response to the encoding of the status response object
				} else if puppetAPIRequest.Action == "cache" { // If we are caching the NodeList from the
					response, _ = json.Marshal(PuppetCacheResponse{Content: metis.NodeList}) // Encode the NodeList into JSON and set response
				} else if (puppetAPIRequest.Action == "push") && (puppetAPIRequest.Content != "") { // If we are updating the NodeList
					puppetPushResponseObject := PuppetPushResponse{}
					initializationSucceeded := metis.Initialize([]byte(puppetAPIRequest.Content)) // Re-initialize Metis with the updated content in byte array form

					if initializationSucceeded { // If the initialization succeeded
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
