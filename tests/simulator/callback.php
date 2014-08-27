<?php
	$callbackInput = file_get_contents("php://input"); // Read the JSON data sent to the callback script
	$callbackJSONArray = json_decode($callbackInput, true); // Decode into a multi-dimensional array

	if ($callbackJSONArray["nodeData"] !== "corsDisableTest"){ // If we are not testing the CORS disabled handler in Typescript
		header("Access-Control-Allow-Origin: *"); // Allow CORS

		$fileAction = $callbackJSONArray["action"]; // Get the action we are doing for the files
		$updatableFileContent = $callbackJSONArray["contentOrDestinationNodes"]; // Content we are getting only for updates

		$returnableFileContent = array(); // Create an array to hold the returnable file content

		$staticFile = array("hello" => "world"); // Static file to emulate a read
		$successCode = array("status" => "0.00"); // Success code

		foreach ($callbackJSONArray["files"] as $file){ // For each file that was sent to us
			if ($fileAction == "r"){ // If we are reading files
				$returnableFileContent[$file] = $staticFile; // Set the file content to the static file
			}
			elseif (($fileAction == "w") || ($fileAction == "d")){ // If we are writing or deleting files
				$returnableFileContent[$file] = $successCode; // Set the file content to the success code
			}
			elseif ($fileAction == "a"){ // If we are appending (updating) files
				$returnableFileContent[$file] = array_merge_recursive($staticFile, $updatableFileContent); // Merge the arrays and return it
			}
			elseif ($fileAction == "e"){ // If we are checking if a file exists "in the cloud"
				$returnableFileContent[$file] = array("status", true); // Set the status to true
			}
		}

		echo json_encode($returnableFileContent); // Return a JSON encoded string with the stuff
	}
	else{ // If we ARE testing the CORS disabled handler in Typescript
		header("Access-Control-Allow-Origin: " . $_SERVER["SERVER_NAME"]); // Only allow simulation directly from stroblindustries.com, meaning Typescript's handling of failed calls will be triggered
	}

?>