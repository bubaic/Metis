<?php
	header("Access-Control-Allow-Origin: *"); // Allow Cross-Origin Resource Sharing
	include("metis.php"); // [Reference: https://github.com/StroblIndustries/Metis]
	$metis = new Metis(); // Define Metis

	$metisCallbackData_Json = file_get_contents("php://input"); // Read the JSON data sent to the callback script
	$metisCallbackData = $metis->decodeJsonFile($metisCallbackData_Json); // Decode the JSON content into a multi-dimensional array

	$allowIO = false; // Declare allowIO as a boolean that defaults to false. We will change it to true if we are going to allow IO.
	$fileIOReply = ""; // Set fileIOReply as a generic variable

	if ($metis->nodeList["error"] !== 1.01){ // If the nodeList is valid (is an array)
		if (isset($metisCallbackData["error"]) == false){ // If the metisCallbackData does NOT have the error key/val, the decode was successful

			#region CORS Checking

			$parsedNodeData = $metis->nodeDataParser($metisCallbackData["nodeData"]); // Parse the NodeData string into a multi-dimensional array
			$disabledCORS = false; // Declare disabledCORS as a boolean that defaults to false, meaning CORS is enabled and IO is allowed

			foreach ($parsedNodeData as $nodeOrGroup => $potentialNodesDefined){ // Recursively go through each Node within an array or within a Node Group
				if ($metis->nodeInfo($nodeOrGroup, "Node Type") == "group"){ // If this individual $nodeOrGroup is a Node Group (rather than an array of Nodes)
					if ($metis->nodeInfo($nodeOrGroup, "Disable CORS") !== 1.03){ // If Disable CORS is declared in this Node Group
						$disabledCORS = true; // Define disabledCORS as true
						break; // Break out of the foreach
					}
					else{ // If Disable CORS is NOT declared in the Node Group data, get the Nodes
						if (gettype($potentialNodesDefined) == "array"){ // If there are Nodes already defined within the Node Group
							$nodes = $potentialNodesDefined;
						}
						else{ // If there are no Nodes defined in the Node Group (as in the syntax) then get all Nodes within that Node Group
							$nodes = nodeInfo($nodeOrGroup, "group-nodes"); // Nodes defined as $potentialNodesOrNull
						}
					}
				}
				else{
					$nodes = array($nodeOrGroup);
				}

				#region Individual Node Checking

				foreach ($nodes as $node){ // For each node in the array
					if (isset($node["Disable CORS"]) && (is_null($node["Disable CORS"]))){ // If Disable CORS is defined in this Node
						$disabledCORS = true; // Disable CORS
						break 2; // Break out of the foreach and its parent foreach
					}
				}

				#endregion
			}

			if ($disabledCORS == true){ // If we disabled CORS anywhere in the defined Node Data
				if (isset($_SERVER["HTTP_ORIGIN"])){ // If the ORIGIN was sent to the callback
					$sanitizedHttpOrigin = str_replace(array("http://", "https://", "www.", "/"), "", $_SERVER["HTTP_ORIGIN"]); // Sanitize the HTTP Origin until it is only the domain
					$sanitizedLocalDomain =  str_replace(array("http://", "https://", "www.", "/"), "", $_SERVER["SERVER_NAME"]); // Sanitize the HTTP Origin until it is only the domain

					if ($sanitizedHttpOrigin == $sanitizedLocalDomain){ // If the origin and domain defined are the same
						$allowIO = true; // Allow File IO
					}
					else{
						$fileIOReply = "CORS Disabled";
					}
				}
				else{
					$fileIOReply = "CORS Disabled";
				}
			}

			#endregion
		}
		else{ // If the metisCallbackData is NOT an array, meaning json_decode failed.
			$fileIOReply = 2.06;
		}
	}
	else{ // If the nodeList is NOT an array, meaning it has failed to fetch the node list
		$fileIOReply = 1.01;
	}

	if ($allowIO == true){ // If we are going to allow IO
		#region Do File IO

		$callbackNodeData = $metisCallbackData["nodeData"]; // Get the nodeNum we'll be working with (whether it is a replicator source or simply the node we'll be doing fileIO with)
		$callbackFiles = $metisCallbackData["files"]; // Get array of files we'll be working with
		$callbackFileAction = $metisCallbackData["action"]; // Get the fileAction that'll be taken. This is meant to be fully compatible (aside from replicator) with fileActionHandler

		if (array_key_exists("contentOrDestinationNodes", $metisCallbackData)){ // If contentOrDestinationNodes is defined
			$callbackContentOrDestinationNodes = $metisCallbackData["contentOrDestinationNodes"]; // Get either the content we'll be creating or update, or the list of destination nodes for replicator.
		}

		if ($callbackFileAction !== "rp"){ // If we won't be replicating files
			$fileIOReply = $metis->fileActionHandler($callbackNodeData, $callbackFiles, $callbackFileAction, $callbackContentOrDestinationNodes); // Assign the fileActionHandler response to fileIOReply.
		}
		else{ // If we will be replicating files
			$fileIOReply = $metis->replicator($callbackNodeData, $callbackContentOrDestinationNodes, $callbackFiles); // Assign the replicator response to fileIOReply
		}

		#endregion
	}
	else{ // If we are NOT going to allow IO
		$fileIOError = $fileIOReply; // Assign the fileIOError as the fileIOReply since we will be using fileIOReply as an array initially, so we need to set it's value elsewhere

		$fileIOReply = array(); // Set as an array

		foreach ($metisCallbackData["files"] as $fileName){ // For each file that we were initially fetching
			$fileIOReply[$fileName] = array("error" => $fileIOError); // Set the file's error to the fileIOError
		}

		$fileIOReply = json_encode($fileIOReply); // Encode the array as a JSON string
	}

	echo $fileIOReply; // Reply with the JSON content
?>
