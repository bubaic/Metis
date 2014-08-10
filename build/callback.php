<?php
	header("Access-Control-Allow-Origin: *"); // Allow CORS
	include("metis.min.php"); // [Reference: https://github.com/StroblIndustries/Metis]
	$metis = new Metis(); // Define Metis

	$metisCallbackData_Json = file_get_contents("php://input"); // Read the JSON data sent to the callback script
	$metisCallbackData = $metis->decodeJsonFile($metisCallbackData_Json); // Decode the JSON content into a multi-dimensional array

	$fileIOReply = ""; // Set fileIOReply as a generic variable

	if ($metis->nodeList !== 1.01){ // If the nodeList is valid (is an array)
		if ($metisCallbackData !== 2.05){ // If the metisCallbackData is an array, it means the json_decode from decodeJsonFile was successful
			$callbackNodeData = $metisCallbackData["nodeData"]; // Get the nodeNum we'll be working with (whether it is a replicator source or simply the node we'll be doing fileIO with)
			$callbackFiles = $metisCallbackData["files"]; // Get array of files we'll be working with
			$callbackFileAction = $metisCallbackData["action"]; // Get the fileAction that'll be taken. This is meant to be fully compatible (aside from replicator) with fileActionHandler

			if (isset($metisCallbackData["contentOrDestinationNodes"])){ // If contentOrDestinationNodes is defined
				$callbackContentOrDestinationNodes = $metisCallbackData["contentOrDestinationNodes"]; // Get either the content we'll be creating or update, or the list of destination nodes for replicator.
			}
			else{ // If the contentOrDestination nodes is NOT defined
				$callbackContentOrDestinationNodes = null; // Set to null, which is the default in fileActionHandler and will be handled appropriately, automatically.
			}

			if ($callbackFileAction !== "rp"){ // If we won't be replicating files
				$fileIOReply = $metis->fileActionHandler($callbackNodeData, $callbackFiles, $callbackFileAction, $callbackContentOrDestinationNodes); // Assign the fileActionHandler response to fileIOReply.
			}
			else{ // If we will be replicating files
				$fileIOReply = $metis->replicator($callbackNodeData, $callbackContentOrDestinationNodes, $callbackFiles); // Assign the replicator response to fileIOReply
			}
		}
		else{ // If the metisCallbackData is NOT an array, meaning json_decode failed.
			$fileIOReply = 2.05;
		}
	}
	else{ // If the nodeList is NOT an array, meaning it has failed to fetch the node list
		$fileIOReply = 1.01;
	}

	if (is_float($fileIOReply) == false){ // If the fileIOReply is NOT an int (it's either "0.00" indicating success or JSON content
		if ($fileIOReply !== "0.00"){ // If the file IO content isn't purely stating success
			echo $fileIOReply; // Reply with the JSON content or "0.00" success code
		}
		else{ // IF the fileIOReply is a success code
			echo '{"success" : "0.00"}'; // Reply with success key/val
		}
	}
	else{ // If it IS an int, meaning an error
		echo '{ "error" : ' . $fileIOReply . ' }'; // Reply with JSON, where key "Error" has a value of the error from $fileIOReply
	}
?>
