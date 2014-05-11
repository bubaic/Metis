<?php
	include("metis.min.php"); // [Reference: https://github.com/StroblIndustries/Metis]
	$metis = new Metis(); // Define Metis

	$metisCallbackData_Json = file_get_contents("php://input"); // Read the JSON data sent to the callback script
	$metisCallbackData = $metis->decodeJsonFile($metisCallbackData_Json); // Decode the JSON content into a multi-dimensional array

	if (is_array($metis->nodeList) == true){ // If the nodeList is valid (is an array)
		if (is_array($metisCallbackData) == true){ // If the metisCallbackData is an array, it means the json_decode from decodeJsonFile was successful
			$callbackNodeData = $metisCallbackData["nodeData"]; // Get the nodeNum we'll be working with (whether it is a replicator source or simply the node we'll be doing fileIO with)
			$callbackFiles = $metisCallbackData["files"]; // Get array of files we'll be working with
			$callbackFileAction = $metisCallbackData["fileAction"]; // Get the fileAction that'll be taken. This is meant to be fully compatible (aside from replicator) with fileActionHandler

			if ($metisCallbackData["contentOrDestinationNodes"] !== null){ // If there is content we sent to the callback or a list of nodes (for replication)
				$callbackContentOrDestinationNodes = $metisCallbackData["contentOrDestinationNodes"]; // Get either the content we'll be creating or update, or the list of destination nodes for replicator. Note: This may not exist, if we're doing actions like reading.
			}

			if ($callbackFileAction !== "rp"){ // If we won't be replicating files
				$nonWriteAction = false; // Default nonWriteAction to false

				foreach(array("r", "e", "d") as $nonWriteActionString) { // Recursively check if we are doing a non-write action
					if (strpos($callbackFileAction, $nonWriteActionString) !== false){ // If we are doing a read, exist-check, or deletion
						$nonWriteAction = true; // Set nonWriteAction to true
					}
				}

				if ($nonWriteAction !== false){ // If we are reading, deleting, or checking if a file exists
					$fileIOReply = $metis->fileActionHandler($callbackNodeData, $callbackFiles, $callbackFileAction); // Assign the fileActionHandler response to fileIOReply
				}
				else{ // If we are NOT reading or deleting a file (a.k.a creating or updating)
					$fileIOReply = $metis->fileActionHandler($callbackNodeData, $callbackFiles, $callbackFileAction, $callbackContentOrDestinationNodes); // Assign the fileActionHandler response to fileIOReply. Note the difference with this call is we applied the content.
				}
			}
			else{ // If we will be replicating files
				$fileIOReply = $metis->replicator($callbackNodeData, $contentOrDestinationNodes, $files); // Assign the replicator response to fileIOReply
			}

			if (is_int($fileIOReply) == false){ // If the fileIOReply is NOT an int (it's either "0.00" indicating success or JSON content
				if ($fileIOReply !== '"0.00"'){ // If the file IO content isn't purely stating success
					echo $fileIOReply; // Reply with the JSON content or "0.00" success code
				}
				else{ // IF the fileIOReply is a success code
					echo '{"success" : "0.00"}'; // Reply with success key/val
				}
			}
			else{ // If it IS an int, meaning an error
				echo '{ "error" : ' . $fileIOReply . ' }'; // Reply with JSON, where key "Error" has a value of the error from $fileIOReply
			}
		}
		else{ // If the metisCallbackData is NOT an array, meaning json_decode failed.
			echo '{ "error" : 3.01 }'; // Reply with JSON, where key "Error" has a value of the error from decodeJsonFile
		}
	}
	else{ // If the nodeList is NOT an array, meaning it has failed to fetch the node list
		echo '{ "error" : 1.01 }'; // Reply with JSON, where key "Error" has a value of the error from $nodeList
	}
?>
