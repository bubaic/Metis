package main

import (
    "encoding/json"
    "github.com/StroblIndustries/metis-pkg" // Import the core Metis code
    "net/http"
    "reflect"
    "strings"
)

// #region Metis HTTP Server Handler

type metisHTTPHandler struct{}

func (*metisHTTPHandler) ServeHTTP(writer http.ResponseWriter, requester *http.Request) {
	var response []byte                   // Define response as an array of bytes
	var errorResponseObject ErrorResponse // Define eerrorResponseObject as an ErrorResponse

	writer.Header().Set("Access-Control-Allow-Origin", "*") // Enable Access-Control-Allow-Origin

	if requester.Body != nil { // If the response has body content
		var apiRequestObject APIRequest // Define apiRequestObject as an APIRequest struct

		jsonDecoder := json.NewDecoder(requester.Body)     // Define jsonDecoder as a new JSON Decoder that uses the requester.Body io.ReadCloser
		decodeErr := jsonDecoder.Decode(&apiRequestObject) // Decode the JSON into apiRequestObject, providing decode error to decodeErr

		if decodeErr == nil { // If there was no decode error
			if (apiRequestObject.NodeData != "") && (apiRequestObject.Action != "") && (len(apiRequestObject.Files) > 0) { // If this contains NodeData, an Action, and Files is an array with files
				continueIO := true

				if ((apiRequestObject.Action == "w") || (apiRequestObject.Action == "u")) && (apiRequestObject.Content == nil) { // If the action is write or update and NO content is provided
					continueIO = false // Do not continue any sort of Initialization
					errorResponseObject.Error = "no_content_provided"
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
						var nodes []metis.Node // Define nodes as an array of Node

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
									individualNodeInfo := metis.NodeList[node].(map[string]interface{})
									newNode := metis.Node{}

									nodeFolder := individualNodeInfo["Folder"]               // Get any Folder key/val of this Node
									nodeAddress := individualNodeInfo["Address"]             // Get any Address key/val of this Node
									nodeExternalNodes := individualNodeInfo["ExternalNodes"] // Get any ExternalNodes key/val of this Node

									if nodeFolder != nil { // If a Folder key/val exists
										newNode.Folder = nodeFolder.(string)
									}

									if nodeAddress != nil { // If a Node Address key/val exists
										newNode.Address = nodeAddress.(string)
									}

									if nodeExternalNodes != nil { // If a Node ExternalNodes key/val exists
										newNode.ExternalNodes = nodeExternalNodes.(string)
									}

									nodes = append(nodes, newNode) // Append the Node (type asserted from interface{})
								}
							}
						}

						if len(nodes) != 0 { // If the length of nodes is not zero
							jsonResponseObject := metis.Manage(apiRequestObject.Action, nodes, apiRequestObject.Files, apiRequestObject.Content) // Call metis.Manage with the action, nodes, files, and any content. Returns map[string]interface{}
							response, _ = json.Marshal(jsonResponseObject)                                                                       // Encode into JSON, assigning to response
						} else { // If the length of nodes is zero
							errorResponseObject.Error = "invalid_nodedata"
						}
					} else { // If the nodeGroupsSplit is length of zero
						errorResponseObject.Error = "invalid_nodedata"
					}

					// #endregion
				}
			} else { // If it does not contain NodeData, Action, or Files
				errorResponseObject.Error = "invalid_api_request"
			}
		} else { // If there was a decode error
			errorResponseObject.Error = "invalid_json_content"
		}
	} else { // If the response does not have body content
		errorResponseObject.Error = "no_json_provided"
	}

	if errorResponseObject.Error != "" { // If there was an error
		response, _ = json.Marshal(errorResponseObject) // Encode the errorResponseObject instead
	}

	writer.Write(response)                                  // Write the response
}

// #endregion