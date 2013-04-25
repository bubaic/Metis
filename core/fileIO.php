<?php

	// These are file IO related functions
	
	/* List of Functions, In Order, With Description:

		fileHashing - This returns the hashed string of the name of a file. It uses a unique hash specific to the requested file name.

		navigateToLocalMetisData - This function navigates to the data folder of the local Metis "install".

		createFile - This creates a file based on the multidimensional array it receives, along with basic data such as name of file, 
		and location to store it. CreateFile also has a built in auto-duplication process by creating the same file on other MetisDB nodes.

		readFile - This returns the JSON Encoded file based on the file name and location. It creates a copy of the file with a unique
		hash based on the date, time, I.P. address, and a random number above 100000. The chances of 100000 
		individuals requesting the same file at the same second at the same computer is astronomical.

		decodeFile - This returns an array based on JSON decode.

		updateFile - This updates a JSON file (with input being an array of connections, the file name (hashed), and a multi-dimensional array.

		deleteFile - This deletes the stored JSON file. The requested file to be deleted can also be deleted from multiple MetisDB nodes.

		replicator - This function automatically converts JSON decoded data and replicates it across a specific FTP and local nodes. You 
		must specify the origin node (FTP or local), the nodes you wish to replicate to (this list of nodes must be individual items in an array),
		and the JSON file you wish to copy. It will copy the file with its existing name, not with a new name.

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
		$fileName = atlasui_string_clean($fileName_Unsanitized, 1, true);
		$fileName_Hashed = atlasui_encrypt($fileName, 100000, substr($fileName, 0, 10));
		return substr($fileName_Hashed, 1, 28);
	}
	
	function navigateToLocalMetisData(){
		if (strpos(getcwd(), "Metis") !== false){ // Check if Current Working Directory is Metis or data.
			if (strpos(getcwd(), "data") == false){
				chdir("data");
			}
		}
		else{  // If the current directory is neither Metis or data, first go to Metis then data.
			chdir("Metis");
			chdir("data");
		}
	}
	
	function createFile($nodeArray, $saveFile_Name_NotHashed, $fileContent_JsonArray){
		$tempJsonFile = tmpfile(); // Create a temporary file to store the JSON info in.
		$jsonData = json_encode($fileContent_JsonArray); // Encode the multidimensional array as JSON
		$jsonData_VerificationHash = sha1($jsonData); // Make a verification hash.
		fwrite($tempJsonFile, $jsonData); // Write the JSON data to the temporary file.
		fseek($tempJsonFile, 0); // Set the seek point to 0 so the entire file can be written to the FTP-based file.
				
		foreach ($nodeArray as $key => $nodeNum){
			$nodeList_Encoded = file_get_contents("Metis/nodeList.json") or die("Failed to get nodeList.json");
			$nodeList = decodeJsonFile($nodeList_Encoded); //Get the node list as a multi-dimensional array.
			$nodeConnection = establishConnection($nodeNum); // Establish a connection to create the file.
			$nodeType = getNodeInfo($nodeList, $nodeNum, "Node Type"); // Get the type of node that is being used.
			$nodePreferentialLocation = getNodeInfo($nodeList, $nodeNum, "Preferential Location"); // Get the preferential location for the Node.
			
			if (atlasui_string_check($nodeType, array("ftp", "mysqli", "local")) == true){ // Make sure its either an FTP, MySQLi or local connection.
				$fileName = fileHashing($saveFile_Name_NotHashed); // Generate the hashed file name.
				
				if ($nodeType == "ftp"){ // Check if the node type is FTP, if so then use an FTP specific command for asyncronously uploading the file.
					if ($nodePrefentialLocation !== ""){
						ftp_nb_put($nodeConnection, $nodePreferentialLocation . "/" . $fileName . ".json", $tempJsonFile, FTP_BINARY, 0); // Upload file to the connected node.
					}
					else{
						die("You must specify the Prefential Location for this FTP connection. If your FTP credentials are tied to a specific directory, we recommend you change that."); // Output error relating to no set preferential location.
					}
				}
				elseif ($nodeType == "local"){ // Check if the node type is local.			
					if ($nodePreferentialLocation !== ""){ // If the Preferential Location is set.
						if (strpos(getcwd(), $nodePreferentialLocation) == false){
							navigateToLocalMetisData(); // Go to the data directory

							if (chdir($nodePreferentialLocation) == false){
								die("The folder called $nodePreferentialLocation does not exist. Remember to remove all slashes, we are saving to Metis/data."); // Output error relating to failed navigation.
							}
						}
						
						$saveFile_Handler = fopen($fileName . ".json", "w"); // Automatically create the file in the Preferential Location or return an error.
						
						if (get_resource_type($saveFile_Handler) == "stream"){ // Check if the handler is a stream, otherwise it failed to open the stream. 
							fwrite($saveFile_Handler, $jsonData); // Write the JSON data to the file.
							fclose($saveFile_Handler); // Close the file location.
						}
						else{
							die("It failed to create the file for some reason. You might want to look into that. Maybe the file already exists."); // Output error relating to failed creation of the file.
						}

					}
					else{ // If the Preferential Location is blank...
						die("You must specify a Preferential Location for Node Number: $nodeNumber"); // Output error relating to no set preferential location.
					}
				}
				else{
					die("You must specify the Node Type as either FTP or local for File IO.");
				}
			}
		}
		
		fclose($tempJsonFile); // Close the temporary file. This automatically deletes it because it was established using tmpfile.
	}
	
	function readJsonFile($nodeNum, $openFile_HashedName){
		$nodeList_Encoded = file_get_contents("Metis/nodeList.json") or die("Failed to get nodeList.json");
		$nodeList = decodeJsonFile($nodeList_Encoded); //Get the node list as a multi-dimensional array.
		
		if ($nodeList !== "failed_to_get_nodeList"){
			$nodeConnection = establishConnection($nodeNum); // Establish a connection to create the file.
			$nodePreferentialLocation = getNodeInfo($nodeList, $nodeNum, "Preferential Location"); // Get the Preferential Location of the Node.
			$nodeType = getNodeInfo($nodeList, $nodeNum, "Node Type"); // Get the Type of the Node

			$uniqueFileName_Hash = substr(date("His") . str_replace(array(".", ":"), "", atlasui_ip_address() . rand(100000, 999999)), 0, 10);  // Hashed generated based on time + I.P. Address + Random #. Limited to 10 characters.
			$temporaryFileName = substr(atlasui_encrypt($openFile_HashedName, 100000, $uniqueFileName_Hash), 1); // Generates the unique name of the temporary file name.
			$tmpFile = tempnam("Metis/data/" . $nodePreferentialLocation . "/tmp/", $temporaryFileName); // Create a temporary file in the tmp folder of the Node Preferential Location with a prefix of the generated file name.
			
			if ($nodeType == "ftp"){ // If the Node Type is FTP
				if (get_resource_type($nodeConnection) == "ftp"){ // If the node connection is an FTP resource (since its returning the ftp_connect, then continue with FTP functionality.
					ftp_fget($nodeConnection, $tmpFile, $nodePreferentialLocation . "/" . $openFile_HashedName . ".json", FTP_BINARY, 0); // File download and inserting it into temporary file.		
					ftp_close($nodeConnection); // Close the established connection.
					
					return file_get_contents($temporaryFileName . ".json"); // readJsonFile will return the JSON encoded file (obviously since the file is JSON format).
				}
				else{ // If the resource of node connection is not FTP, then its most likely an error.
					die("Error: " . $nodeConnection);
				}
			}
			elseif ($nodeType == "local"){ // If the Node Type is Local
				copy("Metis/data/" . $nodePreferentialLocation . "/" . $openFile_HashedName . ".json", $tmpFile); // Copy the file from the Preferential Location to the temporary file.
				return file_get_contents($tmpFile); // readFile will retun the JSON encoded file from the temporary file.
							
			}
			else{ // If the Node Type is NOT FTP or local, return error.
				die("Getting a JSON file using Metis needs to be via FTP or local. Currently, you are trying to work with Node #$nodeNum, Preferential Location is $nodePreferentialLocation and the type is $nodeType.");
			}
			
			unlink($tmpFile);
		}
		else{
			die("Failed to get Node List.");
		}
	}
	
	function decodeJsonFile($jsonEncoded_Content){
		return json_decode($jsonEncoded_Content, true); // This decodes the JSON formatted string into a multi-dimensional array.
	}
	
	function updateJsonFile($connectionArray, $fileName_Hashed, $fileDataArray){
			$nodeList = fetchNodeList();
			$fileData = json_encode($fileDataArray);
			$temporaryFile = tmpfile();
			file_put_contents($temporaryFile, $fileData);
			
			foreach ($connectionArray as $key => $connectionNum){
				$establishedFileConnection = establishConnection($connectionNum); // Establish a connection to delete the file.
				
				if (get_resource_type($establishedFileConnection) == "ftp"){
					ftp_put($establishedFileConnection, $fileName_Hashed . ".json", $temporaryFile, FTP_BINARY, 0);
				}
				elseif ((get_resource_type($establishedFileConnection) == "string") && (strpos($establishedFileConnection, "local||") !== false)){
					$nodePreferentialLocation = getNodeInfo($nodeList, $connectionNum, "Preferential Location");
					
					navigateToLocalMetisData();
					file_put_contents($nodePreferentialLocation . "/" . $fileName_Hashed . ".json", $fileData);
				}
			}
	}
	
	function deleteFile($connectionArray, $deleteFile_Location, $deleteFile_NotHashed){
			$fileToDelete = fileHashing($deleteFile_NotHashed) . ".json"; // Create the hashed name of the JSON file.
			
			foreach ($connectionArray as $key => $connectionNum){
				$establishedFileConnection = establishConnection($connectionNum); // Establish a connection to delete the file.
				
				ftp_delete($establishedFileConnection, $deleteFile_Location . "/" . $deleteFile_NotHashed); // Delete the file.
				ftp_close($establishConnection); // Close the established connection.
			}
	}
	
	function replicator($nodeNum_Source, $nodeNum_Destinations, $fileToReplicate_NameNotHashed){
		$nodeList = fetchNodeList(); // Fetch the Node List as a multidimensional array.
		
		if (isset($nodeList[$nodeNum_Source])){ // Check if the Source / Origin Node exists.
			$nodeOriginConnection = establishConnection($nodeNum_Source); // Establish a connection with the origin node.
			$nodeType = getNodeInfo($nodeList, $nodeNum_Source, "Node Type"); // Get the source / origin node's type.
			$nodePreferentialLocation = getNodeInfo($nodeList, $nodeNum_Source, "Preferential Location"); // Get the source / origin node's preferential location.
			$fileToReplicate_TemporaryFile = tmpfile(); // Generate a temporary file that will store the JSON data for use when replicating.
			$fileToReplicate_NameHashed = fileHashing($fileToReplicate_NameNotHashed); // Generate the file hash.
			
			if ($nodePreferentialLocation !== ""){ // Check if the preferential location is NOT empty.
				if ((get_resource_type($nodeOriginConnection) == "ftp") || (strpos($nodeOriginConnection, "local||") !== false)){ // Check if the origin node's connection is FTP or local.
					if ($nodeType == "ftp"){ // If its FTP
						ftp_fget($nodeOriginConnection, $fileToReplicate_TemporaryFile, $nodePreferentialLocation . "/" . $fileName_NameHashed . ".json", FTP_BINARY, 0); // Get the remote FTP file and store it in the temporary file.
					}
					elseif ($nodeType == "local"){ // If its local
						navigateToLocalMetisData(); // Navigate to the local Metis data.
						$fileToReplicate_Content = file_get_contents($nodePreferentialLocation . "/" . $fileToReplicate_NameHashed . ".json"); // Ge thte file contents and store it in a variable.
						fwrite($fileToReplicate_TemporaryFile, $fileToReplicate_Content); // Write the content of the JSON file to a temporary file.
						fseek($fileToReplicate_TemporaryFile, 0); // Seek the position of the file to 0.
					}
				
					foreach ($nodeNum_Destinations as $key => $nodeNum_SpecificDestination){ // Go through each node
						$nodeDestinationConnection = establishConnection($nodeNum_SpecificDestination); // Establish a connection with a specific destination node connection
						$nodeDestinationType = getNodeInfo($nodeList, $nodeNum_SpecificDestination, "Node Type"); // Get the type of the specified destination node
						$nodeDestinationPreferentialLocation = getNodeInfo($nodeList, $nodeNum_SpecificDestination, "Preferential Location"); // Get the preferential location of the specified destination node.
						
						if ($nodeDestinationPreferentialLocation !== ""){ // If the destination node's preferential location is NOT empty
							if ($nodeDestinationType == "ftp"){ // If the destination node type is FTP
								if (get_resource_type($nodeDestinationConnection) == "ftp"){ // If the resource type of the destination node connection is FTP
									ftp_fput($nodeDestinationConnection, $nodeDestinationPreferentialLocation . "/" . $fileToReplicate_NameHashed . ".json", $fileToReplicate_TemporaryFile, FTP_BINARY, 0); // Upload the file content (held in the temporary file) to the preferential location -> hashed file name.json
								}
							}
							elseif ($nodeDestinationType == "local"){ // If the destination node type is local
								if (chdir($nodeDestinationPreferentialLocation) !== false){ // If there is a directory that is called by the value of the destination node's preferential location, it will automatically change to that directory then...
									copy($fileToReplicate_TemporaryFile, $fileToReplicate_NameHashed . ".json"); // Copy the temporary file to the destination node's preferential location with the hashed file name.json
								}
							}
						}
					}
					
					fclose($fileToReplicate_TemporaryFile); // Close the temporary file, which automatically deletes the temporary file.
				}
				else{
					die("The requested origin node type is not FTP or local. Please check to see if this node is \"FTP\" or \"local\"."); // If the origin node's type is NOT ftp or local, output error.
				}
			}
			else{
				die("The requested origin node's Preferential Location does not exist."); // If the origin node's preferential location does NOT exist, output error.
			}
		}
		else{
			die("The requested origin node does not exist."); // If the origin node does NOT exist, output error.
		}
	}
	
?>