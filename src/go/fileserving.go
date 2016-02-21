package main

import (
	"encoding/json"
	"errors"
	"github.com/StroblIndustries/metis-pkg" // Import the core Metis code
	"reflect"
	"strings"
)

// #region Metis HTTP Server Handler

// FileServe is responsible for handling API requests and serving files
func FileServe(apiRequestObject APIRequest) ([]byte, error) {
	var response []byte   // Define response as array of byte
	var errorObject error // Define errorObject as an error

	if (apiRequestObject.NodeData != "") && (apiRequestObject.Action != "") && (len(apiRequestObject.Files) > 0) { // If this contains NodeData, an Action, and Files is an array with files
		continueIO := true

		if ((apiRequestObject.Action == "w") || (apiRequestObject.Action == "u")) && (apiRequestObject.Content == nil) { // If the action is write or update and NO content is provided
			continueIO = false // Do not continue any sort of Initialization
			errorObject = errors.New("no_content_provided")
		}

		if continueIO { // If we are continuing Initialization
			var nodeGroupsSplit []string // Define nodeGroupSplit as a string slice / array

			// #region Parse NodeData

			typeOfNodeData := reflect.TypeOf(apiRequestObject.NodeData).String() // Define typeOfNodeData as the string type of the NodeData

			if typeOfNodeData == "[]string" { // If the type of NodeData is actually a string slice
				nodeGroupsSplit = apiRequestObject.NodeData.([]string) // Simply define nodeGroupsSplit as the existing NodeData
			} else if typeOfNodeData == "string" { // If the type of NodeData is a string
				nodeGroupsSplit = strings.Split(apiRequestObject.NodeData.(string), "|") // Split the items with | as the separator
			}

			if len(nodeGroupsSplit) != 0 { // If the length of nodeGroupsSplit is not zero
				var nodes []string // Define nodes as an array of strings

				for _, nodeGroupString := range nodeGroupsSplit { // For each nodeGroupString in nodeGroupsSplit
					nodesToGet := []string{}

					if strings.Contains(nodeGroupString, "#") { // If specific Nodes within this Node Group are being specified
						nodeGroupAndNodeSplit := strings.Split(nodeGroupString, "#") // Split the Node Group and Nodes in NodeData syntax
						nodesToGet = strings.Split(nodeGroupAndNodeSplit[1], ",")    // Set nodesToGet as the second series of strings after splitting on # and then splitting that string by ,
					} else {
						switch nodeValue := metis.NodeList[nodeGroupString].(type) {
						case []interface{}: // If a Node Group
							for _, nodeString := range nodeValue { // For each nodeString in the []string (though claiming to be []interface{})
								nodesToGet = append(nodesToGet, nodeString.(string)) // Add a type asserted string of nodeString to nodesToGet
							}
						case map[string]interface{}: // If a Node
							nodesToGet = append(nodesToGet, nodeGroupString) // Add the Nodes' name
						}
					}

					if len(nodesToGet) > 0 { // If there are nodes in nodesToGet
						for _, node := range nodesToGet {
							nodes = append(nodes, node) // Append the node string
						}
					}
				}

				if len(nodes) != 0 { // If the length of nodes is not zero
					jsonResponseObject := metis.Manage(apiRequestObject.Action, nodes, apiRequestObject.Files, apiRequestObject.Content) // Call metis.Manage with the action, nodes, files, and any content. Returns map[string]interface{}
					response, _ = json.Marshal(jsonResponseObject)                                                                       // Encode into JSON, assigning to response
				} else { // If the length of nodes is zero
					errorObject = errors.New("invalid_nodedata")
				}
			} else { // If the nodeGroupsSplit is length of zero
				errorObject = errors.New("invalid_nodedata")
			}

			// #endregion
		}
	} else { // If it does not contain NodeData, Action, or Files
		errorObject = errors.New("invalid_api_request")
	}

	return response, errorObject
}

// #endregion
