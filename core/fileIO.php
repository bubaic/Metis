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
		$suppressErrors = chdir($_SERVER['DOCUMENT_ROOT'] . "/" . $nodeAddress);
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
		
		if ($fileContent_JsonArray !== null){
			$jsonData = json_encode($fileContent_JsonArray); // Encode the multidimensional array as JSON
			if ($jsonData === false){
				return 3.01; // Return the error code #3.01.
			}
		}
		
		if ($nodeList !== 1.01){ // If the nodeList was successfully fetched, we'll continue our file IO process
			if (atlasui_string_check($fileAction, array("r", "w", "a", "d")) !== false){
				$nodeAddress = getNodeInfo($nodeList, $nodeNum, "Address");
				$nodeType = getNodeInfo($nodeList, $nodeNum, "Node Type"); // Get the type of node that is being used.
				$nodePreferentialLocation = getNodeInfo($nodeList, $nodeNum, "Preferential Location"); // Get the preferential location for the Node.
				
				if ($nodeAddress !== 1.03){ // If getting the node info did not fail
				
					if (atlasui_string_check($nodeType, array("ftp", "local")) == true){ // Make sure its either an FTP or local connection.
					
						if ($nodePreferentialLocation !== ""){ // If the node's preferential location is not empty
						
							if ($nodeType == "local"){
								navigateToLocalMetisData($nodeAddress, $nodePreferentialLocation); // Go to the data directory
							}
							elseif ($nodeType == "ftp"){
								$nodeConnection = establishConnection($nodeNum); // Establish a connection to create the file, since it's FTP and not local (which makes establishing a connection a logical step).
							}
							
							if (($nodeType == "local") || (($nodeType == "ftp") && (gettype($nodeConnection) !== "string"))){		
								foreach ($files as $fileName_NotHashed){
									$fileName_Hashed = fileHashing($fileName_NotHashed); // Generate the hashed file name.		
									$tempJsonFile = tmpfile(); // Create a temporary file to store the JSON info in.		
							
									if (atlasui_string_check($fileAction, array("r" || "a")) !== false){
										if ($nodeType == "local"){
											$thisFileContent = file_get_contents($fileName_Hashed . ".json"); // Read the file
									
											if ($thisFileContent == false){ // If we failed to fetch the file
												return 2.05; // Return the error code #2.05.
											}
										}
										elseif ($nodeType == "ftp"){
											ftp_get($nodeConnection, $tempJsonFile, $fileName_Hashed  . ".json", FTP_BINARY); // Read the file, saving it into the temporary JSON file.
											fseek($tempJsonFile, 0); // Go to the first character in the file.
											$thisFileContent =  file_get_contents($tempJsonFile); // Read the contents into fileContent.
										
											fclose($tempJsonFile); // Close the temporary file
										}
									
										if ($fileAction == "r"){								
											if ($multiFile == false){ // If we are not fetching multiple files
												$fileContent = $thisFileContent; // The file content we'll be returning is the content of this file
											}
											else{
												$fileContent = $fileContent . "\"$fileName_NotHashed\" : " . $thisFileContent . ","; // Append the contents of this file into the fileContent, ensuring it is something like ["config"] : {FILE_CONTENT}
											}
										}
										elseif ($fileAction == "a"){
											$jsonData = $fileContent . $jsonData; // Append the JSON data to the current file content (appending)
											if ($nodeType == "local"){
												$fileHandler = fopen($fileName_Hashed . ".json", "w+"); // Create a file handler (open the file with the requested fileAction and NO flags.
											
												if ($fileHandler !== false){ // If we successfully opened the file for writing
													fwrite($fileHandler, $jsonData); // Write the JSON data to the file.
													fclose($fileHandler); // Close the file location.
													touch($fileName_Hashed . ".json"); // Touch the file to ensure that it is set that it's been accessed and modified.
													return "0.00"; // Return success code
												}
												else{
													return 2.05; // Return the error code #2.05.
												}
											}
											else{
												fseek($tempJsonFile, 0); // Seek back to beginning of temporary file
												fwrite($tempJsonFile, $jsonData); // Write the new data to the temporary file
												ftp_put($nodeConnection, $fileName_Hashed . ".json", $tempJsonFile, FTP_BINARY, 0); // Upload the new file contents as that JSON file
												return "0.00"; // Return success code
											}
										}
									}
									elseif ($fileAction == "w"){
										if ($nodeType == "local"){ // If we are writing to a local file
											$fileHandler = fopen($fileName_Hashed . ".json", "w+"); // Create a file handler (open the file with the requested fileAction and NO flags).
										
											if ($fileHandler !== false){ // If we successfully opened the file for writing
												fwrite($fileHandler, $jsonData); // Write the JSON data to the file.
												fclose($fileHandler); // Close the file location.
												return "0.00"; // Success...
											}
											else{
												return 2.05; // Return the error code #2.05.
											}
										}
										else{ // If the file isn't local, it is accessible via FTP
											fwrite($tempJsonFile, $jsonData); // Write the JSON data to the temporary file.
											ftp_put($nodeConnection, $fileName_Hashed . ".json", $tempJsonFile, FTP_BINARY, 0); // Upload the new file contents as that JSON file
											return "0.00"; // Success...
										}								
									}
									else{ // If the fileAction == "d" (last option), then we're deleting files
										if ($nodeType == "local"){
											if (unlink($fileName_Hashed . ".json") !== false){ // If deleting the file is a success
												return "0.00"; // Return success code
											}
											else{
												return 4.01; // Return error code for deletion
											}
										}
										else{
											if (ftp_delete($establishConnection, $fileName_Hashed . ".json") !== false){ // If deleting the file via FTP is a success
												return 0.011; // Return the success code
											}
											else{
												return 4.01; // Return error code for deletion
											}
										}
									}
								
									fclose($tempJsonFile); // Close the temporary file before the end of the foreach
								}
							}
							else{
								return $nodeConnection; // As we don't know for certain if this is a connection or ftp_chdir issue, we'll return the error code carried over from establishConnection().
							}
					
							chdir($originalDirectory);
							
							if ($fileAction == "r"){
								if ($multiFile == false){
									return $fileContent;
								}
								else{
									return "{" . substr($fileContent, 0, -1) . "}";
								}
							}
						}
						else{ // If the Preferential Location is blank...
							return 2.03;  // Return the error code #2.03;
						}
					}
					else{
						return 2.02; // Return the error code #2.02;
					}
				}
				else{ // If it failed to get the nodeType.
					return 1.03; // Return the error code #1.03.
				}
			}
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
	
	function createJsonFile($nodeNum, array $files, array $fileContent_JsonArray){
		fileActionHandler($nodeNum, $fileName_NotHashed, "w", $fileContent_JsonArray);
	}
	
	function readJsonFile($nodeNum, array $files){ // This function is an abstraction for reading files and offers multi-file reading functionality
		return fileActionHandler($nodeNum, $files, "r"); // Return the JSON file or error code from fileActionHandler
	}
	
	function updateJsonFile($nodeNum, array $fileName_NotHashed, array $fileContent_JsonArray, $fileAppend = false){
		if ($fileAppend == true){
			$fileActionMode = "a";
		}
		else{
			$fileActionMode = "w";
		}
		
		return fileActionHandler($nodeNum, $fileName_NotHashed, $fileActionMode, $fileContent_JsonArray);
	}
	
	function deleteJsonFile($nodeNum, $fileName_NotHashed){
		fileActionHandler($nodeNum, $fileName_NotHashed, "d");
	}
	
	function replicator($nodeSource, array $nodeDestinations_Array, array $files){
		$nodeList = fetchNodeList(); // Fetch the Node List as a multidimensional array.
		
		if (isset($nodeList[$nodeSource])){ // Check if the Source / Origin Node exists.	
			
			foreach ($files as $fileName_NotHashed){ // Cycle through each file in the array
				$fileContent_JsonFormat = readJsonFile($nodeSource, array($fileName_Hashed)); // Read the individual file we are replicating
				$fileContent = decodeJsonFile($fileContent_JsonFormat); // Decode it into a multi-dimensional array for the purpose of using in createJsonFile
				
				if (gettype($fileContent) !== "int"){ // If the fileContent is not an int, generally meaning it isn't an error
					foreach ($nodeDestinations_Array as $nodeDestination){ // Cycle through each node we are going to be replicating files to
						createJsonFile($nodeDestination, array($fileName_Hashed), $fileContent); // Create (or overwrite) the file you are replicating on the node destination
					}
				}
			}
		}
		else{ // If the nodeSource does not exist
			return "The requested origin node does not exist."; // If the origin node does NOT exist, output error.
		}
	}
	
?>
