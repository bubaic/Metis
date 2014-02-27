<?php

	// These are file IO related functions

	/* 
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
		$fileName_Hashed = atlasui_hashing($fileName, 100000, substr($fileName, 0, 10)); // Create a hashed name of the file.
		return substr($fileName_Hashed, 1, 28); // Ensures that it doesn't break on derping Windows systems.
	}

	// #region Navigation of File System Tree and Metis

	function navigateToLocalMetisData($nodePreferentialLocation = null){
		global $directoryHostingMetis;

		$directoryPriorToMove = getcwd();

		if ($directoryHostingMetis !== null){
			chdir($directoryHostingMetis);
		}

		chdir("Metis"); // Jump into the Metis folder
		chdir("data"); // Jump into the data folder.

		if ($nodePreferentialLocation !== null){ // If the preferential location is defined (it is acceptable for it to NOT only for the mysqlToMetis functionality)
			if (chdir($nodePreferentialLocation) == false){ // If we failed to change directory to the local node's preferential location...
				return 2.01; // Return the error code #2.01.
			}
		}

		return $directoryPriorToMove;
	}

	// #endregion

	// #region Backup System - Backup Queuer

	function backupQueuer(array $parsedNodeData, array $files, $fileAction){
		global $nodeList; // Get the node list as a multi-dimensional array
		$directoryPriorToBackupMove = navigateToLocalMetisData("backup"); // Navigate to the backup folder

		$backupQueue_Json = file_get_contents(fileHashing("backup-queue") . ".json"); // Read the contents of the backup-queue file

		$backupQueue_md5Hash = md5($backupQueue_Json); // Generate md5 hash of the file before it potentially being modified

		if (strlen(trim($backupQueue_Json)) > 2){ // If the JSON is not the default ({})
			$backupQueue = decodeJsonFile($backupQueue_Json); // Convert to multi-dimensional array
		}
		else{
			$backupQueue = array();
		}

		$nodeGroupNodes_WithBackup = array(); // Array to hold any of the Node Group's Nodes that will be used for backup

		foreach ($parsedNodeData as $nodeOrGroup => $potentialNodesInGroup){ // For each Node Group or Node in the parsed Node Data
			if ($nodeList[$nodeOrGroup]["Backup Data"] !== null){ // If this Node Group or independent Node is meant to handle all backups of file IO
				if ($nodeList[$nodeOrGroup]["Backup Data"]["Enabled"] == true){ // If this backup is enabled
					$nodeGroupNodes_WithBackup[] = $nodeOrGroup;
				}
			}
			else{ // If the Node Group or Node is NOT meant to handle all backups of file IO
				if (nodeInfo($nodeOrGroup, "Node Type") == "group"){ // If the nodeOrGroup is a Node Group

					if (gettype($potentialNodesInGroup) == "array"){ // If Nodes within the Node Group are already defined
						$nodeGroupNodes = $potentialNodesInGroup;
					}
					else{ // If Nodes within the Node Group are not already defined
						$nodeGroupNodes = nodeInfo($nodeOrGroup, "group-nodes"); // Fetch all Nodes in Group
					}

					foreach ($nodeGroupNodes as $nodeGroupNode){ // For each Node in Node Group
						if ($nodeGroupNodes[$nodeGroupNode]["Backup Data"] !== null){ // If the Node has Backup elements
							if ($nodeGroupNodes[$nodeGroupNode]["Backup Data"]["Enabled"] == true){ // If this backup is enabled
								$nodeGroupNodes_WithBackup[] = $nodeOrGroup . "#" . $nodeGroupNode; // Add it to the list of Nodes with backup
							}
						}
					}
				}
				// Else don't add Node Group or Node to $nodeGroupNodes_WithBackup, therefore the backup queue adding gets skipped
			}

			if (count($nodeGroupNodes_WithBackup) > 0){ // If there are Nodes that have Backup Data.
				foreach ($nodeGroupNodes_WithBackup as $nodeDataString){ // For each node listed in the nodeGroupNodes_WithBackup

					if (gettype($backupQueue[$nodeDataString]) !== "array"){ // If the nodeDataString array is not already defined in the backupQueue
						$backupQueue[$nodeDataString] = array();
					}

					foreach ($files as $fileName){
						if ($backupQueue[$nodeDataString][$fileName] !== null){ // If the file is already in the backup queue
							$backupQueueFileInfo = $backupQueue[$nodeDataString][$fileName]; // Declare backup queue file info as the data assigned to the file in queue
							$backupQueueFileInfo_Action = $backupQueueFileInfo["action"]; // Declare this variable as the action that is queued to take place

							if ($backupQueueFileInfo_Action !== $fileAction){ // If we are doing a different action already queued up
								if ((($backupQueueFileInfo_Action == "w") || ($backupQueueFileInfo_Action == "a")) && ($fileAction == "d")){ // If the currently queued action is to write or update a file and the action is to delete
									$backupQueue[$nodeDataString][$fileName]["action"] = $fileAction; // Change the action to delete
								}
							}
						}
						else{// If the file does not exist in the backup queue
							$backupQueue[$nodeDataString][$fileName] = array(); // Add fileName as a new item in the $nodeDataString array
							$backupQueue[$nodeDataString][$fileName]["action"] = $fileAction; // Set the file's action to fileAction
						}
					}
				}
			}
		}

		$backupQueue_Json = json_encode($backupQueue);
		$backupQueue_NewHash = md5($backupQueue_Json); // Get the new md5 hash of the encoded backup queue

		if ($backupQueue_md5Hash !== $backupQueue_NewHash){ // If the hashes have changed (implies modification of the queue), do file IO
			$fileName = fileHashing("backup-queue");
			$fileHandler = fopen($fileName . ".json", "w+"); // Create a file handler.
			fwrite($fileHandler, $backupQueue_Json); // Write the JSON data to the file.
			fclose($fileHandler); // Close the file location.
			touch($fileName. ".json"); // Touch the file to ensure that it is set that it's been accessed and modified.
		} // else don't do anything, since no file IO is required

		chdir($directoryPriorToBackupMove);
	}

	// #endregion

	// #region File IO Array Merger

	function fileIOArrayMerger(array $fileSetsToMerge){ // This function handles merging arrays of file data intelligently (mainly to prevent overwriting valid content with INT errors)
		$newArray = array();

		foreach($fileSetsToMerge as $fileSet){
			$currentFilesListed = array_keys($fileSet);
			foreach ($currentFilesListed as $fileName){
				if (is_null($newArray[$fileName])){ // If the fileName and it's content is NOT defined in the new array
					$newArray[$fileName] = $fileSet[$fileName];
				}
				elseif (is_int($newArray[$fileName])){ // If the fileName is defined but is an INT (error)
					if (is_array($fileSet[$fileName])){ // If it turns out this fileSet's fileName has content
						$newArray[$fileName] = $fileSet[$fileName];
					}
				}
			}
		}

		return $newArray; // Return the new array of files and their content
	}

	// #endregion

	function fileActionHandler($nodeDataDefined, array $files, $fileAction, array $contentOrDestinationNodes = null){
		global $nodeList; //Get the node list as a multi-dimensional array.

		if ($nodeList !== 1.01){ // If the nodeList was successfully fetched, we'll continue our file IO process
			$returnableFileContent = array(); // fileContent array used to store all file content (or error codes)
			$originalDirectory = getcwd(); // Get the current directory prior to moving to other directories.

			// #region Node Group / Node Checking

			$nodeData = nodeDataParser($nodeDataDefined);

			// #endregion

			if (count($files) == 1){ // If the amount of files to interact of with is one (a single file)
				$multiFile = false; // We are not dealing with multiple files
			}
			else{ // If we are interacting with a multitude of files
				$multiFile = true; // We are dealing with multiple files, so multiFile needs to be set to true
			}

			foreach ($nodeData as $nodeOrGroup => $potentialNodesDefined){ // Recursively go through each Node within an array or within a Node Group
				if (nodeInfo($nodeOrGroup, "Node Type") == "group"){ // If this individual $nodeOrGroup is a Node Group (rather than an array of Nodes)
					$usingNodeGroups = true; // Using Node Groups = true

					if (gettype($potentialNodesDefined) == "array"){ // If there are Nodes already defined within the Node Group
						$nodes = $potentialNodesDefined;
					}
					else{ // If there are no Nodes defined in the Node Group (as in the syntax) then get all Nodes within that Node Group
						$nodes = nodeInfo($nodeOrGroup, "group-nodes"); // Nodes defined as $potentialNodesOrNull
					}
				}
				else{
					$usingNodeGroups = false; // Using Node Groups = false
					$nodes = array($nodeOrGroup);
				}

				foreach ($nodes as $nodeNum){ // Recursively go through each Node
					if ($usingNodeGroups == true){ // If we are using Node Groups
						$nodeInfo_NodeList = $nodeList[$nodeOrGroup]; // Set the nodeInfo_NodeList variable to the Node Group sub-array, rather than the entire nodeList (or nodeInfo will fail)
					}
					else{ // If we are NOT using Node Groups
						$nodeInfo_NodeList = $nodeList; // Set the nodeInfo_NodeList variable to nodeList.
					}

					$nodeType = nodeInfo($nodeNum, "Node Type", $nodeInfo_NodeList); // Get the type of node that is being used.
					$nodePreferentialLocation = nodeInfo($nodeNum, "Preferential Location", $nodeInfo_NodeList); // Get the preferential location for the Node.

					if (($nodeType == "local") && ($nodePreferentialLocation !== "backup")){ // If the Node is local and the Node's Preferential Location is not the backup folder
						$successfulNavigation = navigateToLocalMetisData($nodePreferentialLocation); // Go to the data directory

						if ($successfulNavigation !== 2.01){ // If we successfully navigated to the folder
							foreach ($files as $fileName_NotHashed){ // For each file, do something with it in the local Node
								$fileName = fileHashing($fileName_NotHashed); // Hash the fileName to get the real name of the file
								$thisFileContent = ""; // Variable to assign the decoded file content to.

								if (($fileAction == "r") || ($fileAction == "a")){ // If we are either reading the file or appending to it (either way, we need the file)
									$thisFileContent = file_get_contents($fileName . ".json"); // Read the file

									if ($thisFileContent == false){ // If we failed to fetch the file
										$thisFileContent = 2.05; // State thisFileContent is error #2.05.
									}
									else{
										$thisFileContent = decodeJsonFile($thisFileContent); // If we successfully read the file, decode the JSON (no matter if we are reading or appending)
									}
								}

								if (($fileAction == "w") || ($thisFileContent !== 2.05 && $fileAction == "a")){ // If we are writing content to the file or appending existing content
									if ($fileAction == "a"){ // If we are appending content to an existing file
										$jsonData = array_replace_recursive($thisFileContent, $contentOrDestinationNodes); // Merge the two arrays (prior to that, decode the contents of the fetched file)
									}
									else{ // If we are only writing
										$jsonData = $contentOrDestinationNodes; // Assign the jsonData as contentOrDestinationNodes
									}

									$jsonData = json_encode($jsonData); // Convert back to JSON for writing.

									if ($jsonData == false){ // If we failed to encode the data to JSON
										$thisFileContent = 3.01; // Return the error code #3.01.
									}
									else{ // If we did NOT fail to encode the data to JSON
										$fileHandler = fopen($fileName . ".json", "w+"); // Create a file handler.
										fwrite($fileHandler, $jsonData); // Write the JSON data to the file.
										fclose($fileHandler); // Close the file location.
										touch($fileName. ".json"); // Touch the file to ensure that it is set that it's been accessed and modified.
										$thisFileContent = "0.00"; // Return success code
									}
								}
								else if ($fileAction == "e"){ // If we are checking if the file exists
									$thisFileContent = array("found" => file_exists($fileName . ".json")); // If the file does exist, $thisFileContent will be found: TRUE, else found: false.
								}
								else if ($fileAction == "d"){ // If we are deleting a file
									if (unlink($fileName . ".json") !== false){ // If deleting the file is a success
										$thisFileContent = "0.00"; // Return success code
									}
									else{
										$thisFileContent = 4.01; // Return error code for deletion
									}
								}

								if ($multiFile == true){ // Check if we are reading multiple files over the lifetime of the function
									$returnableFileContent = fileIOArrayMerger(array($returnableFileContent, array($fileName_NotHashed => $thisFileContent))); // Properly merge the multiple files array
								}
								else{ // If we were only interacting with one file
									if (($fileAction == "r") && ($thisFileContent !== 1.05)){ // If we were reading files and it was successful
										unset($files[$fileName_NotHashed]); // Remove the requested file from the $files array so we don't check for it in the future (ex. from other Nodes in a Node Group)
									}
									// This doesn't apply for creating, updating, or deleting items as we need to make sure it is done for each Node Group / Node.

									$returnableFileContent = $thisFileContent; // Decode the file contents, store in array.

									if ($fileAction == "r"){ // If we are only reading a file and we managed to get it on the first Node Group Node or independent Node
										break 3; // Break out of the files foreach, Nodes foreach and Nodes Group foreach
									}
								}

							}

							chdir($originalDirectory); // Return to the original directory
						}
						else{ // If we failed to navigate to the Node's data directory
							$returnableFileContent = 2.01; // Return error code #2.01
						}
					}
					else{ // If the Node Type is remote
						$nodeAddress = nodeInfo($nodeNum, "Node Type", $nodeInfo_NodeList);

						$remoteRequestData = array(); // Create an array that'll hold key / vals that will eventually be converted to JSON to send to the callback script.
						$remoteRequestData["fileAction"] = $fileAction; // Assign the fileAction from the fileAction given to fileActionHandler
						$remoteRequestData["nodeData"] = $nodePreferentialLocation; // Assign the nodeNum from the nodePreferentialLocation, which in the case of remote nodes, is the remote node number to call from.
						$remoteRequestData["files"] = $files; // Assign the files array from the files array given to fileActionHandler

						if (is_null($contentOrDestinationNodes) == false){ // If the fileContent_JsonArray is NOT null, meaning it exists
							$remoteRequestData["contentOrDestinationNodes"] = $contentOrDestinationNodes; // Assign that content to the contentOrDestinationNodes key
						}

						$remoteRequestData_JsonFormat = json_encode($remoteRequestData, true); // Convert / encode the multi-dimensional array to JSON.
						$returnedRemoteFilesContent = atlasui_http_request($nodeAddress . "/callback.php", "POST", $remoteRequestData_JsonFormat); // Do an atlasui_http_request (CURL) to the nodeAddress, method POST, with the JSON formatted data

						if ($multiFile == true){ // If we were fetching multiple files
							if (count($files) > 1){ // If we were fetching more than one file via the remote file IO
								$remoteFileContent_Array = decodeJsonFile($returnedRemoteFilesContent);

								foreach ($remoteFileContent_Array as $fileName => $content){
									if (gettype($content) == "array"){ // If the content of the fileName is an array (meaning it successfully fetched content)
										unset($files[$fileName]); //Remove the file from the $files array
									}
								}

								$returnableFileContent = fileIOArrayMerger(array($returnableFileContent, $returnedRemoteFilesContent)); // Properly merge the multiple files array
							}
							else{
								$fileName = $files[0]; // Assign the file's name to fileName so we can do the unsetting first THEN the fileIOArrayMerger

								if (strlen($returnedRemoteFilesContent) !== "3"){ // If the content is longer than 3, meaning it is not an error code
									unset($files[0]); //Remove the file from the $files array
								}

								$returnableFileContent = fileIOArrayMerger(array($returnableFileContent, array($fileName => $returnedRemoteFilesContent))); // Merge the single file returned with the rest
							}
						}
						else{ // If we were only fetching a single file to begin with
							$returnableFileContent = $returnedRemoteFilesContent;
						}
					}
				}
			}

			backupQueuer($nodeData, $files, $fileAction); // Send data to Backup Queuer
			return json_encode($returnableFileContent); // Return the JSON encoded version (string) of the fileContent (which is an array)
		}
		else{ // If the nodeList is not valid / doesn't exist.
			return 1.01; // Return the error code #1.01;
		}
	}

	function decodeJsonFile($jsonEncoded_Content){
		$jsonDecodedValue = json_decode($jsonEncoded_Content, true); // This decodes the JSON formatted string into a multi-dimensional array.

		if ($jsonDecodedValue == (false || NULL || null)){ // If the decoded has failed.
			$jsonDecodedValue = 2.06; // Return the error code #2.06.
		}

		return $jsonDecodedValue;
	}

	function createJsonFile($nodeData, array $files, array $contentOrDestinationNodes){
		return fileActionHandler($nodeData, $files, "w", $contentOrDestinationNodes);
	}

	function readJsonFile($nodeData, array $files){ // This function is an abstraction for reading files and offers multi-file reading functionality
		return fileActionHandler($nodeData, $files, "r"); // Return the JSON file or error code from fileActionHandler
	}

	function updateJsonFile($nodeData, array $files, array $contentOrDestinationNodes, $fileAppend = true){
		if ($fileAppend == false){ // If we are updating the file but not appending
			$fileActionMode = "w"; // Set the fileActionMode to w (write)
		}
		else{ // If we are updating the file and appending (and/or overwriting content)
			$fileActionMode = "a"; // Set the fileActionMode to a (append)
		}

		return fileActionHandler($nodeData, $files, $fileActionMode, $contentOrDestinationNodes);
	}

	function deleteJsonFile($nodeData, array $files){
		return fileActionHandler($nodeData, $files, "d");
	}

	function replicator($nodeData, $nodeDestinations, array $files){
		global $nodeList; // Fetch the Node List as a multidimensional array.

		if ($nodeList !== 1.01){ // Check if getNodeList from $nodeList global is an int / error.
			foreach ($files as $fileName_NotHashed){ // Cycle through each file in the array
				$fileContent_JsonFormat = readJsonFile($nodeData, array($fileName_NotHashed)); // Read the individual file we are replicating

				if (gettype($fileContent_JsonFormat) == "string"){ // If the fileContent_JsonFormat from readJsonFile() is not an int, generally meaning it isn't an error
					$fileContent = decodeJsonFile($fileContent_JsonFormat); // Decode it into a multi-dimensional array for the purpose of using in createJsonFile

					foreach ($nodeDestinations as $nodeDestination){ // Cycle through each node we are going to be replicating files to
						createJsonFile($nodeDestination, array($fileName_NotHashed), $fileContent); // Create (or overwrite) the file you are replicating on the node destination
					}
				}
				else{
					return $fileContent_JsonFormat; // Return Error Code
				}
			}

			return "0.00";
		}
		else{ // If the nodeSource does not exist
			return $nodeList; // Return the error code.
		}
	}

?>
