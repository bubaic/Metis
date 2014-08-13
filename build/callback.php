<?php
	header("Access-Control-Allow-Origin: *"); // Allow CORS
	include("metis.php"); // [Reference: https://github.com/StroblIndustries/Metis]
	$metis = new Metis(); // Define Metis

	$metisCallbackData_Json = file_get_contents("php://input"); // Read the JSON data sent to the callback script
	$metisCallbackData = $metis->decodeJsonFile($metisCallbackData_Json); // Decode the JSON content into a multi-dimensional array

	$fileIOReply = ""; // Set fileIOReply as a generic variable

	if (isset($metis->nodeList)){ // If the nodeList is valid (is an array)
		if (isset($metisCallbackData["error"]) == false){ // If the metisCallbackData does NOT have the error key/val, the decode was successful
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
		}
		else{ // If the metisCallbackData is NOT an array, meaning json_decode failed.
			$fileIOReply = 2.06;
		}
	}
	else{ // If the nodeList is NOT an array, meaning it has failed to fetch the node list
		$fileIOReply = 1.01;
	}

	if (is_float($fileIOReply) == true){ // If the fileIOReply is an integer
		$fileIOReply = '{ "error" : ' . $fileIOReply . ' }'; // Set the fileIOReply to a JSON stringified version of the error and code
	}

	echo $fileIOReply; // Reply with the JSON content
?>
