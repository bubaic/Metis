<?php

	// These are system (mainly internal) related functions

	/*
		Copyright 2013-2014 Strobl Industries

		Licensed under the Apache License, Version 2.0 (the "License");
		 you may not use this file except in compliance with the License.
		 You may obtain a copy of the License at

			 http://www.apache.org/licenses/LICENSE-2.0

		 Unless required by applicable law or agreed to in writing, software
		 distributed under the License is distributed on an "AS IS" BASIS,
		 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
		 See the License for the specific language governing permissions and
		 limitations under the License.
	*/

	#region Metis Initialization - Responsible for the initialization of Metis, primarily finding the nodeList.json, decoding it from JSON to an Object / multi-dimensional array

	function metisInit(){
		$phpRoot = $_SERVER['DOCUMENT_ROOT']; // Variable to hold the root of PHP
		$originalDirectory = getcwd(); // Get the current working directory so we can change back to it after fetching the node list.
		$currentWorkingDirectory = null; // Set the current working directory. This is used to track the current directory we are in.
		$currentSearchDirectory = null; // Set the current search directory. This is used to track our progress as we move up the file system tree.

		$metisFound = false; // Declare whether we have found Metis or not yet.

		while ($metisFound !== true){ // While we have not found Metis in the file system
			if ($currentSearchDirectory !== null){ // If the current search directory is NOT null (as in it has already searched the originalDirectory)
				chdir($currentSearchDirectory); // Move to the currentSearchDirectory (as defined at the end of the while loop).
			}

			$currentWorkingDirectory = getcwd(); // Get the current working directory for the purpose of scanning.

			if (is_dir("Metis") == true){ // If Metis exists in the directory and is a directory
				$metisFound = true; // Set to true since we have found Metis
				break; // Break out of while loop since we found the directory
			}
			else{ // If Metis does NOT exist in the directory
				if ($currentWorkingDirectory !== $_SERVER['DOCUMENT_ROOT']){ // If we are not at root of the FS accessible by PHP
					if ($currentSearchDirectory == null){ // If we have yet to navigate up the FS tree
						$currentSearchDirectory = "../"; // Change the currentSearchDirectory to search the parent of the currentWorkingDirectory.
					}
					else{ // If we have already navigated up the FS tree to a point
						$currentSearchDirectory = $currentSearchDirectory . "../"; // Append an additional ../ to the currentSearchDirectory
					}
				}
			}

			chdir($originalDirectory); // Reset our location
		}

		if ($phpRoot !== ""){ // If DOCUMENT_ROOT is not an empty string
			chdir($phpRoot); // Redirect to the PHP root
			$fauxPHPRoot = getcwd(); // Get most likely the faux PHP root (issue on shared hosts usually). Will return DOCUMENT_ROOT under non-stupid hosts, self-hosting, VPS, etc
			$directoryHostingMetis = str_replace($phpRoot, $fauxPHPRoot, $currentWorkingDirectory); // Remove the PHP root from the Original Directory string and replace with fauxPHPRoot
		}
		else{ // If DOCUMENT_ROOT is an empty string (can occur on php-cli installs)
			$directoryHostingMetis = $currentWorkingDirectory; // Just set directoryHostingMetis to the current working directory
		}

		chdir($directoryHostingMetis);

		$nodeList = decodeJsonFile(file_get_contents("Metis/nodeList.json")); // Read the nodeList.json from the Metis folder and have it decoded into a multi-dimensional array (assigned to nodeList).

		if (isset($nodeList["error"])){
			$nodeList = array("error" => 1.01);
		}

		chdir($originalDirectory); // Move to the original directory
		return array($nodeList, $directoryHostingMetis); // Return the decoded nodeList or the error code AND the directory hosting Metis
	}

	#endregion

	#region Metis HTTP Request Handler

	/*
		This function is Metis' HTTP Request Handler, creating HTTP requests on the fly, primarily to do HTTP POST calls to remote Nodes / Node Groups
	 */

	function http_request($nodeAddress, $remoteRequestData_JsonFormat){
		$httpRequest = curl_init();

		/* Setting some essential cURL options */
		curl_setopt($httpRequest, CURLOPT_CUSTOMREQUEST, "POST"); // Set the custom request to POST
		curl_setopt($httpRequest, CURLOPT_CONNECTTIMEOUT, 15); // If the URL doesn't respond within 15 seconds, then we'll assume the remote Metis cluster is slow.
		curl_setopt($httpRequest, CURLOPT_FAILONERROR, true); // Fails if HTTP code is 400 or greater (other examples: 403, 500)
		curl_setopt($httpRequest, CURLOPT_FOLLOWLOCATION, false); // Do not follow PHP location header or redirects.
		curl_setopt($httpRequest, CURLOPT_MAXREDIRS, 1); // If there is more than 1 redirect from a URL, stop the request.
		curl_setopt($httpRequest, CURLOPT_RETURNTRANSFER, true); // Make sure to return as a string value rather than output it.
		curl_setopt($httpRequest, CURLOPT_SSL_VERIFYPEER, false); // Some may be used self-signed certs, do not verify peer.

		$httpRequestHeaders = array("Content-length: " . strlen($remoteRequestData_JsonFormat)); // Set the content length of the JSON data
		curl_setopt($httpRequest, CURLOPT_HTTPHEADER, $httpRequestHeaders); // Set the CURLOPT_HTTPHEADER to our value.
		curl_setopt($httpRequest, CURLOPT_URL, $nodeAddress . "/callback.php"); // Set the CURLOPT_URL to be the remote Metis cluster address + /callback.php
		curl_setopt($httpRequest, CURLOPT_POSTFIELDS, $remoteRequestData_JsonFormat); // Set the POSTFIELDS to the JSON data

		$httpResponse = curl_exec($httpRequest); // Execute the request and save it in response.
		$httpRequestError = curl_error($httpRequest) ; // Get the error (or if there isn't an error, it returns 0) of the curl_init / http request.
		curl_close($httpRequest); // Close CURL

		if ($httpRequestError == 0){ // If there isn't an error
			return $httpResponse; // Return the response
		}
		else{ // If there is an error
			$curlErrorCodes = array(
				"3" => "URL_MALFORMAT", "7" => "COULDNT_CONNECT", "18" => "PARTIAL_FILE",  "47" => "TOO_MANY_REDIRECTS", "63" => "FILESIZE_EXCEEDED", "67" => "LOGIN_DENIED"
			); // Basically, create an array with common CURL errors that'd be related to actions performed when doing HTTP requests.
			$curlErrorCodeReturned = settype($httpRequestError, "string"); // Convert the curl error from an integer to a string.
			return $curlErrorCodes[$curlErrorCodeReturned]; // Return the error message.
		}
	}

	#endregion

	#region Node Group / Node Parser
	/* This function converts acceptable Node Group / Node structured string syntax into a multi-dimensional array,
		array checking, and number-to-string conversion.
	*/

	function nodeDataParser($nodeDataDefined){
		$nodeData = array(); // Define nodeData as an array

		if (gettype($nodeDataDefined) == "string"){ // If the nodeData is a string, properly parse and convert into an array
			
			if (strpos($nodeDataDefined, "|") !== false){ // If we find the | symbol, meaning there are multiple Node Groups defined
				$nodeGroupArray = explode("|", $nodeDataDefined); // Create an array where each Node Group definition is an item
			}
			else{ // If there is not multiple Node Groups defined
				$nodeGroupArray = array($nodeDataDefined); // Define nodeGroupArray as the single array item, where the contents are the data
			}

			foreach ($nodeGroupArray as $nodeGroupName){ // For every nodeGroupName (string) listed in nodeGroupArray
				if (strpos($nodeGroupName, "#") !== false){ // If we find the # symbol, meaning there are Nodes defined'
					$nodeGroupNodes_Separated = explode("#", $nodeGroupName);
					$nodeGroupName_Full = $nodeGroupNodes_Separated[0]; // Define Node Group Name - Full as a string that is the index 0 of the separated array of nodeGroupName by #
					$nodeGroupNodes = $nodeGroupNodes_Separated[1]; // Define Node Group Nodes as a string. This string is the index 1 of the separated array of nodeGroupName by #

					if (strpos($nodeGroupNodes, ",") !== false){ // If we fine the , symbol, meaning there are multiple Nodes defined
						$nodeData[$nodeGroupName_Full] = explode(",", $nodeGroupNodes); // Define nodeData[Node Group Name] as an array of nodes (which are the result of , separation)
					}
					else{ // If we find that there is only one node defined
						$nodeData[$nodeGroupName_Full] = array($nodeGroupNodes); // Define nodeGroup[Node Group Name] of a single-item array comprised of the Node
					}
				}
				else{ // If there are no Nodes defined within the Node Group
					$nodeData[$nodeGroupName] = null; // Specify the entire Node Group as a new array item for nodeData
				}
			}
		}
		else if (gettype($nodeData) == "array"){ // If $nodeDataDefined is an array
			$nodeData = $nodeDataDefined; // Define nodeData as the nodeDataDefined
		}
		else{ // If the nodeDataDefined is not a string or an array, most likely a int / number
			$nodeData[] = (array) $nodeDataDefined; // Change the nodeDataDefined to a string, add to nodeData array
		}

		return $nodeData;
	}

	#endregion

	#region Node Info - Gets information regarding a particular Node or Node Group

	function nodeInfo($requestedNodeGroupOrNumber, $requestedNodeParameter, $optionalNodeList = null){
		if ($optionalNodeList == null){ // If the optionalNodeList was NOT defined
			$nodeList = $GLOBALS['nodeList']; // Get the global node list as a multi-dimensional array
		}
		else{ // If it was defined
			$nodeList = $optionalNodeList;
		}

		if ($nodeList[$requestedNodeGroupOrNumber] !== null){ // If the Node Group or Node IS defined in the nodeList
			if ($requestedNodeParameter !== "group-nodes"){ // If we are not getting a Node Group's list of Nodes
				$requestedNodeParameter_Value = $nodeList[$requestedNodeGroupOrNumber][$requestedNodeParameter]; // Assign the node parameter, from the requested node number, from a specified node list, to variable.
				if (isset($requestedNodeParameter_Value) && (is_null($requestedNodeParameter_Value) == false)){ // If the variable is set and is not null.
					return $requestedNodeParameter_Value; // Return the value of the variable
				}
				else{
					 return 1.03; // Return the error code #1.03
				}
			}
			else{ // If we are getting the Nodes in a Node Group
				$nodeGroupNodes = array_keys($nodeList[$requestedNodeGroupOrNumber]); // An array of keys (Nodes) (include the Node Type, which we'll filter out) derived from the Node Group
				$nodeGroupNodes = array_values(array_diff($nodeGroupNodes, array("Backup Data", "Node Type"))); // Filter out the Backup Data and Node Type keys and reset the numerical indices.
				return $nodeGroupNodes;
			}
		}
		else{ // If the Node Group or Node is NOT defined in the nodeList
			return 1.02; // Return the error code #1.02
		}
	}

	#endregion

?>