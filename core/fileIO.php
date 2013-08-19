<?php

	// These are file IO related functions

	/* List of Functions, In Order, With Description:

		fileHashing - This returns the hashed string of the name of a file. It uses a unique hash specific to the requested file name.

		navigateToLocalMetisData - This function navigates to the data folder of the local Metis "install". It requires the Address given by getNodeList()
		so it can change directory to the directory where Metis is "installed" in order to change to the Metis/data folder.

		fileActionHandler - This function is the primary file IO function of Metis, dealing with creating, reading, updating and deleting files. It
		can be called directory or indirectly through alias functions like createFile, readFile, updateFile and deleteFile.

		decodeJsonFile - This returns an array based on JSON decode.

		createJsonFile - This creates a file based on the multidimensional array it receives, along with basic data such as name of file,
		and location to store it.

		readJsonFile - This returns the JSON Encoded file based on the file name and location.

		updateJsonFile - This updates a JSON file (with input being an array of connections, the file name (hashed), and a multi-dimensional array.

		deleteJsonFile - This deletes the stored JSON file. The requested file to be deleted can also be deleted from multiple MetisDB nodes.

		replicator - This function replicates JSON files across a FTP and local nodes. You must specify the origin node (FTP or local), the
		nodes you wish to replicate to (this list of nodes must be individual items in an array), and the JSON files you wish to copy. It will copy the
		file(s) with its existing name and overwrite the file if it already exists on that node.

		-----

		Copyright 2013 Strobl Industries

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

	function fileHashing($fileName_Unsanitized){
		$fileName = str_replace(" ", "", atlasui_string_clean($fileName_Unsanitized, 1, true)); // Clean the file name of weird characters and whitespaces.
		$fileName_Hashed = atlasui_encrypt($fileName, 100000, substr($fileName, 0, 10)); // Create a hashed name of the file.
		return substr($fileName_Hashed, 1, 28); // Ensures that it doesn't break on derping Windows systems.
	}

	function navigateToLocalMetisData($nodeAddress, $nodePreferentialLocation){
		chdir($_SERVER['DOCUMENT_ROOT'] . "/" . $nodeAddress);
		chdir("Metis"); // Jump into the Metis folder
		chdir("data"); // Jump into the data folder.

		if (chdir($nodePreferentialLocation) == false){ // If we failed to change directory to the local node's preferential location...
			return 2.01; // Return the error code #2.01.
		}
	}

	function fileActionHandler($nodeNum, array $files, $fileAction, array $fileContent_JsonArray = null){
		global $nodeList; //Get the node list as a multi-dimensional array.
		$fileContent = null; // fileContent variable used to return file content or errors.
		$originalDirectory = getcwd(); // Get the current directory prior to moving to other directories.

		if (count($files) == 1){ // If the amount of files to interact of with is one (a single file)
			$multiFile = false; // We are not dealing with multiple files
		}
		else{ // If we are interacting with a multitude of files
			$multiFile = true; // We are dealing with multiple files, so multiFile needs to be set to true
		}

		if ($nodeList !== 1.01){ // If the nodeList was successfully fetched, we'll continue our file IO process
			if (atlasui_string_check($fileAction, array("r", "w", "a", "d")) !== false){ // If we are using a valid fileAction
				$nodeAddress = getNodeInfo($nodeList, $nodeNum, "Address"); // Get the address of the node that is being used
				$nodeType = getNodeInfo($nodeList, $nodeNum, "Node Type"); // Get the type of node that is being used.
				$nodePreferentialLocation = getNodeInfo($nodeList, $nodeNum, "Preferential Location"); // Get the preferential location for the Node.

				if ($nodeAddress !== 1.03){ // If getting the node info did not fail

					if (atlasui_string_check($nodeType, array("remote", "local")) !== false){ // Make sure its either an local or remote connection.

						if ($nodePreferentialLocation !== ""){ // If the node's preferential location is not empty

							if ($nodeType == "local"){
								navigateToLocalMetisData($nodeAddress, $nodePreferentialLocation); // Go to the data directory

								foreach ($files as $fileName_NotHashed){
									$fileName_Hashed = fileHashing($fileName_NotHashed); // Generate the hashed file name.

									if (($fileAction == "r") || ($fileAction == "a")){
										$thisFileContent = file_get_contents($fileName_Hashed . ".json"); // Read the file

										if ($thisFileContent == false){ // If we failed to fetch the file
											return 2.06; // Return the error code #2.06.
										}
									}

									if ($fileAction == "r"){
										if ($multiFile == false){ // If we are not fetching multiple files
											$fileContent = $thisFileContent; // The file content we'll be returning is the content of this file
										}
										else{
											$fileContent = $fileContent . "\"$fileName_NotHashed\" : " . $thisFileContent . ","; // Append the contents of this file into the fileContent, ensuring it is something like ["config"] : {FILE_CONTENT}
										}
									}
									elseif (atlasui_string_check($fileAction, array("w", "a")) !== false){
										if ($fileAction == "w"){
											$jsonData = json_encode($fileContent_JsonArray); // Encode the multidimensional array as JSON
										}
										else{
											$jsonData = array_merge(json_decode($thisFileContent, true), $fileContent_JsonArray); // Merge the two arrays (prior to that, decode the contents of the fetched file)
											$jsonData = json_encode($jsonData); // Convert back to JSON for writing.
										}

										if ($jsonData == false){
											return 3.01; // Return the error code #3.01.
										}
										else{
											$fileHandler = fopen($fileName_Hashed . ".json", "w+"); // Create a file handler.

											if ($fileHandler !== false){ // If we successfully opened the file for writing
												fwrite($fileHandler, $jsonData); // Write the JSON data to the file.
												fclose($fileHandler); // Close the file location.
												touch($fileName_Hashed . ".json"); // Touch the file to ensure that it is set that it's been accessed and modified.
												return "0.00"; // Return success code
											}
											else{
												return 2.05; // Return the error code #2.06.
											}
										}
									}
									else{ // If the fileAction is "d" (delete, last option), then we're deleting files
										if (unlink($fileName_Hashed . ".json") !== false){ // If deleting the file is a success
											return "0.00"; // Return success code
										}
										else{
											return 4.01; // Return error code for deletion
										}
									}
								}
							}
							elseif ($nodeType == "remote"){ // If we are dealing with a remote node (local-to-local)
								$remoteRequestData = array(); // Create an array that'll hold key / vals that will eventually be converted to JSON to send to the callback script.
								$remoteRequestData["fileAction"] = $fileAction; // Assign the fileAction from the fileAction given to fileActionHandler
								$remoteRequestData["nodeNum"] = $nodePreferentialLocation; // Assign the nodeNum from the nodePreferentialLocation, which in the case of remote nodes, is the remote node number to call from.
								$remoteRequestData["files"] = $files; // Assign the files array from the files array given to fileActionHandler

								if (is_null($fileContent_JsonArray) == false){ // If the fileContent_JsonArray is NOT null, meaning it exists
									$remoteRequestData["contentOrDestinationNodes"] = $fileContent_JsonArray; // Assign that content to the contentOrDestinationNodes key
								}

								$remoteRequestData_JsonFormat = json_encode($remoteRequestData, true); // Convert / encode the multi-dimensional array to JSON.
								$potentialFileContent = atlasui_http_request($nodeAddress . "/callback.php", "POST", $remoteRequestData_JsonFormat); // Do an atlasui_http_request (CURL) to the nodeAddress, method POST, with the JSON formatted data

								if (is_int(decodeJsonFile($potentialFileContent)) == true){ // If it failed to convert to JSON, meaning it is an error from atlasui_http_request()
									return 1.04; // Return the error code #1.04;
								}
								else{ // If it valid JSON, meaning it was a success
									$fileContent = $potentialFileContent; // Assign the $fileContent to the value / array from $potentialFileContent
								}
							}
						}
						else{ // If the Preferential Location is blank...
							return 2.04;  // Return the error code #2.04;
						}
					}
					else{
						return 2.02; // Return the error code #2.02;
					}
				}
				else{ // If it failed to get the nodeType.
					return 1.03; // Return the error code #1.03.
				}

				chdir($originalDirectory);

				if ($multiFile == false){
					return $fileContent;
				}
				else{
					return "{" . substr($fileContent, 0, -1) . "}";
				}
			}
			else{ // If the fileAction is NOT read, write, append or delete
				return 2.03; // Return the error code #2.03;
			}
		}
		else{ // If the nodeList is not valid / doesn't exist.
			return 1.01; // Return the error code #1.01;
		}
	}

	function decodeJsonFile($jsonEncoded_Content){
		$jsonDecodedValue = json_decode($jsonEncoded_Content, true); // This decodes the JSON formatted string into a multi-dimensional array.

		if ($jsonDecodedValue == (false || NULL || null)){ // If the decoded has failed.
			$jsonDecodedValue = 2.07; // Return the error code #2.07.
		}

		return $jsonDecodedValue;
	}

	function createJsonFile($nodeNum, array $files, array $fileContent_JsonArray){
		return fileActionHandler($nodeNum, $files, "w", $fileContent_JsonArray);
	}

	function readJsonFile($nodeNum, array $files){ // This function is an abstraction for reading files and offers multi-file reading functionality
		return fileActionHandler($nodeNum, $files, "r"); // Return the JSON file or error code from fileActionHandler
	}

	function updateJsonFile($nodeNum, array $files, array $fileContent_JsonArray, $fileAppend = false){
		if ($fileAppend !== false){
			$fileActionMode = "a";
		}
		else{
			$fileActionMode = "w";
		}

		return fileActionHandler($nodeNum, $files, $fileActionMode, $fileContent_JsonArray);
	}

	function deleteJsonFile($nodeNum, array $files){
		return fileActionHandler($nodeNum, $files, "d");
	}

	function replicator($nodeSource, array $nodeDestinations_Array, array $files){
		global $nodeList; // Fetch the Node List as a multidimensional array.

		if (gettype($nodeList) !== "int"){ // Check if getNodeList from $nodeList global is an int / error.
			foreach ($files as $fileName_NotHashed){ // Cycle through each file in the array
				$fileContent_JsonFormat = readJsonFile($nodeSource, array($fileName_NotHashed)); // Read the individual file we are replicating

				if (gettype($fileContent_JsonFormat) == "string"){ // If the fileContent_JsonFormat from readJsonFile() is not an int, generally meaning it isn't an error
					$fileContent = decodeJsonFile($fileContent_JsonFormat); // Decode it into a multi-dimensional array for the purpose of using in createJsonFile

					foreach ($nodeDestinations_Array as $nodeDestination){ // Cycle through each node we are going to be replicating files to
						createJsonFile($nodeDestination, array($fileName_NotHashed), $fileContent); // Create (or overwrite) the file you are replicating on the node destination
					}
				}
				else{
					return $fileContent_JsonFormat; // Return Error Code
				}
			}
		}
		else{ // If the nodeSource does not exist
			return $nodeList; // Return the error code.
		}
	}

?>
