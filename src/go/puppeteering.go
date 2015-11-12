package main

import (
	"encoding/json"
	"github.com/StroblIndustries/metis-pkg"
	"io/ioutil"
	//"net/http"
	"strings"
)

// #region Metis Puppeteering Server Handler

func PuppetServe(puppetAPIRequest PuppetAPIRequest) ([]byte, ErrorResponse) {
	var response []byte                   // Define response as array of byte
	var errorResponseObject ErrorResponse // Define errorResponseObject as an ErrorResponse

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
				} else if (puppetAPIRequest.Action == "update") && (puppetAPIRequest.Content != "") { // If we are updating the NodeList
					puppetPushResponseObject := PuppetPushResponse{}
					initializationSucceeded := metis.Initialize([]byte(puppetAPIRequest.Content)) // Re-initialize Metis with the updated content in byte array form

					if initializationSucceeded { // If the initialization succeeded
						puppetPushResponseObject.Content = "updated"
					} else { // If the initialization did not succeed
						puppetPushResponseObject.Content = "failed"
					}

					response, _ = json.Marshal(puppetPushResponseObject) // Encode the PuppetPushResponseObject
				}
			} else {
				errorResponseObject.Error = "invalid_key"
			}
		} else { // If an Action is not provided
			errorResponseObject.Error = "invalid_api_request"
		}
	} else { // If there was a keysError
		errorResponseObject.Error = "no_keys_file"
	}

	return response, errorResponseObject
}

// #endregion
