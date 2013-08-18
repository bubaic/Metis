<?php
	include("../Framework/framework.php"); // [Reference: https://github.com/JoshStrobl/AtlasUI]
	include("framework.php"); // [Reference: https://stroblindustries.com/StroblIndustries/Metis]
	
	$metisCallbackData_Json = file_get_contents("php://input", "r"); // Read the JSON data sent to the callback script
	$metisCallbackData = decodeJsonFile($metisCallbackData_Json); // Decode the JSON content into a multi-dimensional array
	
	if (is_array($nodeList) == true){ // If the nodeList is valid (is an array)
		if (is_array($metisCallbackData) == true){ // If the metisCallbackData is an array, it means the json_decode from decodeJsonFile was successfull
				$callbackFileActon = $metisCallbackData["fileAction"]; // Get the fileAction that'll be taken. This is meant to be fully compatible (aside from replicator) with fileActionHandler
				$callbackNodeNum = $metisCallbackData["nodeNum"]; // Get the nodeNum we'll be working with (whether it is a replicator source or simply the node we'll be doing fileIO with)
				$callbackFiles = $metisCallbackData["files"]; // Get array of files we'll be working with
				$callbackContentOrDestinationNodes = $metisCallbackData["contentOrDestinationNodes"]; // Get either the content we'll be creating or update, or the list of destination nodes for replicator. Note: This may not exist, if we're doing actions like reading.
				
				if ($fileAction !== "rp"){ // If we won't be replicating files
					$fileIOReply = fileActionHandler($nodeNum, $files, $fileAction); // Assign the fileActionHandler response to fileIOReply
				}
				else{ // If we will be replicating files
					$fileIOReply = replicator($nodeNum, $contentOrDestinationNodes, $files); // Assign the replicator response to fileIOReply
				}
				
				if (is_int($fileIOReply) == false){ // If the fileIOReply is NOT an int (it's either "0.00" indicating success or JSON content
					echo $fileIOReply; // Reply with the JSON content or "0.00" success code
				}
				else{ // If it IS an int, meaning an error
					echo '{ "Error" : "' . $fileIOReply . '"}'; // Reply with JSON, where key "Error" has a value of the error from $fileIOReply
				}
			}
		}
		else{ // If the metisCallbackData is NOT an array, meaning json_decode failed.
			echo '{ "Error" : "' . $metisCallbackData . '"}'; // Reply with JSON, where key "Error" has a value of the error from decodeJsonFile
		}
	}
	else{ // If the nodeList is NOT an array, meaning it has failed to fetch the node list
		echo '{ "Error" : "' . $nodeList . '"}'; // Reply with JSON, where key "Error" has a value of the error from $nodeList
	}
?>