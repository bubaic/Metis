<?php
	#region File IO Array Merger (Taken from Metis io.php)

	function fileIOArrayMerger(array $fileSetsToMerge){ // This function handles merging arrays of file data intelligently (mainly to prevent overwriting valid content with INT errors)
		$newArray = array();

		foreach($fileSetsToMerge as $fileSet){
			$currentFilesListed = array_keys($fileSet);
			foreach ($currentFilesListed as $fileName){
				if (is_null($newArray[$fileName])){ // If the fileName and it's content is NOT defined in the new array
					$newArray[$fileName] = $fileSet[$fileName];
				}
				elseif (is_float($newArray[$fileName])){ // If the fileName is defined but is an INT (error)
					if (is_array($fileSet[$fileName])){ // If it turns out this fileSet's fileName has content
						$newArray[$fileName] = $fileSet[$fileName];
					}
				}
			}
		}

		return $newArray; // Return the new array of files and their content
	}

	#endregion

	$callbackInput = file_get_contents("php://input"); // Read the JSON data sent to the callback script
	$callbackJSONArray = json_decode($callbackInput); // Decode into a multi-dimensional array

	$fileAction = $callbackJSONArray["action"]; // Get the action we are doing for the files
	$updatableFileContent = $callbackJSONArray["contentOrDestinationNodes"]; // Content we are getting only for updates
	$updatableFileContent_Array = json_decode($updatableFileContent); // Decode into a multi-dimensional array

	$returnableFileContent = array(); // Create an array to hold the returnable file content

	$staticFile = array("hello", "world"); // Static file to emulate a read
	$successCode = array("status" => "0.00"); // Success code

	foreach ($callbackJSONArray["files"] as $file){ // For each file that was sent to us
		if ($fileAction == "r"){ // If we are reading files
			$returnableFileContent[$file] = $staticFile; // Set the file content to the static file
		}
		elseif(($fileAction == "w") || ($fileAction == "d")){ // If we are writing or deleting files
			$returnableFileContent[$file] = $successCode; // Set the file content to the success code
		}
		elseif($fileAction == "a"){ // If we are appending (updating) files
			$returnableFileContent[$file] = fileIOArrayMerger($staticFile, $updatableFileContent_Array); // Merge the arrays and return it
		}
		elseif($fileAction == "e"){ // If we are checking if a file exists "in the cloud"
			$returnableFileContent[$file] = array("status", true); // Set the status to true
		}
	}

	return json_encode($returnableFileContent); // Return a JSON encoded string with the stuff
?>