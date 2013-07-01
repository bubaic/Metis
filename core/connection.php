<?php

	// These are Connection related functions for MetisDB.
	
	/* List of Functions, In Order, With Description:

		getNodeList - Returns the json decoded nodeList, searches current working directory and it's parent directory for the nodeList.
		
		getNodeInfo - Returns the value of a parameter from a specific node.

		establishConnection - This function returns a connection based on the requested node and node information. This function covers local file IO, FTP and MySQLi

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
	
	function getNodeList(){
		$originalDirectory = getcwd();
		$metisExistsInDirectory = false;
		$directoryInWhichMetisExists = null;
		$allowedDirectoryChecking = array(null, "..");
		
		foreach ($allowedDirectoryChecking as $key => $thisAllowedDirectory){	
			if ($thisAllowedDirectory !== null){
				chdir($thisAllowedDirectory);
			}
			
			$currentWorkingDirectory = getcwd();
			$currentWorkingDirectory_FileDirectoryList = scandir($currentWorkingDirectory);
			
			foreach($currentWorkingDirectory_FileDirectoryList as $key => $thisFileOrDirectory){
				if ($thisFileOrDirectory == "Metis"){
					if (is_dir($thisFileOrDirectory) == true){
						$metisExistsInDirectory = true;
						$directoryInWhichMetisExists = $thisAllowedDirectory;
						break 2;
					}
				}
			}
			chdir($originalDirectory);
		}
				
		if ($metisExistsInDirectory !== false){
			chdir($originalDirectory);
			if ($directoryInWhichMetisExists !== null){
				chdir($directoryInWhichMetisExists);
			}
			$nodeList =  decodeJsonFile(file_get_contents("Metis/nodeList.json"));
		}
		else{
			return "file_doesnt_exist";
		}
		
		chdir($originalDirectory);
		return $nodeList;
	}
	
	function getNodeInfo(array $nodeList, $requestedNodeNumber, $requestedNodeParameter){
		$requestedNodeParameter_Value = $nodeList[$requestedNodeNumber][$requestedNodeParameter]; // Assign the node parameter, from the requested node number, from a specified node list, to variable.
		if ((isset($requestedNodeParameter_Value)) && ($requestedNodeParameter_Value !== "")){ // If the variable is set and is not null.
			return $requestedNodeParameter_Value; // Return the value of the variable
		}
		else{
			return "$requestedNodeNumber -> $requestedNodeParameter doesnt_exist \n Maybe it is an issue with the nodeList. Please check the var dump: \n " . var_dump($nodeList); // State it doesn't exist
		}
	}
	
	function establishConnection($requestedNodeNumber){
		global $nodeList; // Get the multi-dimensional array of the nodeList via decodeJsonFile.
		if ($nodeList !== "file_doesnt_exist"){ // If the file does exist a.k.a does not have a value of "file_doesnt_exist".
			
			if (!empty($nodeList[$requestedNodeNumber])){ // If the node number exists (empty is used as it is an array).
				$connectionType = getNodeInfo($nodeList, $requestedNodeNumber, "Node Type"); // Type of connection
				$connectionAddress = getNodeInfo($nodeList, $requestedNodeNumber, "Address"); // Connection Address
				$connectionPreferentialLocation = getNodeInfo($nodeList, $requestedNodeNumber, "Preferential Location"); // Preferred starting location or MySQL database.
				
				if ($connectionType == "ftp"){ // If the connection type is FTP
					$connectionUsername = getNodeInfo($nodeList, $requestedNodeNumber, "Username"); // Connection Username
					$connectionPassword = getNodeInfo($nodeList, $requestedNodeNumber, "Password"); // Connection Password
					$connectionUseSSL = getNodeInfo($nodeList, $requestedNodeNumber, "Use SSL");
					
					$returnedEstablishedConnection = atlasui_ftp_login($connectionAddress, $connectionUseSSL, $connectionUsername, $connectionPassword); // Return the ftp_login from AtlasUI.
					
					if (ftp_chdir($returnedEstablishedConnection, $connectionPreferentialLocation)){ // If the preferential location exists and we're able to go to it.
						return $returnedEstablishedConnection; // Return the established FTP connection.
					}
					else{ // If we are unable to navigate to the directory, either as a result of incorrect permissions or the Preferential Location not existing.
						return "Error: Preferential Location does not exist."; // Die!
					}
				}
			}
			else{
				return "There seems to be an issue with your nodeList. Please check the syntax to make sure its correct! The decoded form is: \n" . var_dump($nodeList);
			}
		}
		else{
			return "Current Directory: " . getcwd() . " | nodeList_not_found";
		}
	}
		
?>
