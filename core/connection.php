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
		$originalDirectory = getcwd(); // Get the current working directory so we can change back to it after fetching the node list.
		$metisExistsInDirectory = false; // Preemptive setting of metisExistsInDirectory to false. If we find Metis folder in a directory, we set it to true.
		$directoryInWhichMetisExists = null; // Set the directoryInWhichMetisExists to null. If the metisExistsInDirectory = true, we assign that directory to this variable.
		$allowedDirectoryChecking = array(null, ".."); // Allowed directory checking permits checking current working directory and it's parent directory.
		
		foreach ($allowedDirectoryChecking as $key => $thisAllowedDirectory){	
			if ($thisAllowedDirectory !== null){ // Essentially, if it is "..", then it'll chdir to the parent directory.
				chdir($thisAllowedDirectory);
			}
			
			$currentWorkingDirectory = getcwd(); // Get the current working directory for the purpose of scanning.
			$currentWorkingDirectory_FileDirectoryList = scandir($currentWorkingDirectory); // Scan the directory (currentWorkingDirectory_FileDirectoryList is then an array)
			
			foreach($currentWorkingDirectory_FileDirectoryList as $key => $thisFileOrDirectory){ // For each item in the array
				if ($thisFileOrDirectory == "Metis"){ // If the item is called "Metis"
					if (is_dir($thisFileOrDirectory) == true){ // Lets make sure someone isn't being silly by naming a file "Metis"
						$metisExistsInDirectory = true; // Assign the metisExistsInDirectory to true
						$directoryInWhichMetisExists = $thisAllowedDirectory; // Assign the current working directory to directoryInWhichMetisExists.
						break 2; // Break out of the two foreach loops, no sense in continuing the scanning of the directory.
					}
				}
			}
			chdir($originalDirectory); // Move to the original directory. This really just occurs if Metis isn't found in the directory.
		}
				
		if ($metisExistsInDirectory !== false){ // If Metis DOES exist somewhere that we've searched...
			chdir($originalDirectory); // Move to the original working directory (used once again just to make sure we're there).
			if ($directoryInWhichMetisExists !== null){ // If the directoryInWhichMetisExists is not null (never should be null, but check anyway)
				chdir($directoryInWhichMetisExists);  // Move to the directory that Metis is in.
			}
			$nodeList =  decodeJsonFile(file_get_contents("Metis/nodeList.json")); // Read the nodeList.json from the Metis folder and have it decoded into a multi-dimensional array (assigned to nodeList).
		}
		else{
			$nodeList = 1.01; // Assign nodeList as error code 1.01, which is what'll be returned.
		}
		
		chdir($originalDirectory); // Move to the original directory
		return $nodeList; // Return the decoded nodeList or the error code.
	}
	
	function getNodeInfo(array $nodeList, $requestedNodeNumber, $requestedNodeParameter){
		$requestedNodeParameter_Value = $nodeList[$requestedNodeNumber][$requestedNodeParameter]; // Assign the node parameter, from the requested node number, from a specified node list, to variable.
		if ((isset($requestedNodeParameter_Value)) && ($requestedNodeParameter_Value !== "")){ // If the variable is set and is not null.
			return $requestedNodeParameter_Value; // Return the value of the variable
		}
		else{
			 return 1.03; // Return the error code #1.03
		}
	}
	
	function establishConnection($requestedNodeNumber){
		global $nodeList; // Get the multi-dimensional array of the nodeList via decodeJsonFile.
		if ($nodeList !== 1.01){ // If the file does exist a.k.a the global nodeList isn't an error code.
			
			if (!empty($nodeList[$requestedNodeNumber])){ // If the node number exists (empty is used as it is an array).
				$connectionType = getNodeInfo($nodeList, $requestedNodeNumber, "Node Type"); // Type of connection
				$connectionAddress = getNodeInfo($nodeList, $requestedNodeNumber, "Address"); // Connection Address
				$connectionPreferentialLocation = getNodeInfo($nodeList, $requestedNodeNumber, "Preferential Location"); // Preferred starting location or MySQL database.
				
				if ($connectionType == "ftp"){ // If the connection type is FTP
					$connectionUsername = getNodeInfo($nodeList, $requestedNodeNumber, "Username"); // Connection Username
					$connectionPassword = getNodeInfo($nodeList, $requestedNodeNumber, "Password"); // Connection Password
					$connectionUseSSL = getNodeInfo($nodeList, $requestedNodeNumber, "Use SSL");
					
					$returnedEstablishedConnection = atlasui_ftp_login($connectionAddress, $connectionUseSSL, $connectionUsername, $connectionPassword); // Return the ftp_login from AtlasUI.
					
					if (strpos($returnedEstablishedConnection, "atlasui_ftp_login") === true){ // If atlasui_ftp_login did not fail to connect.
						if (ftp_chdir($returnedEstablishedConnection, $connectionPreferentialLocation)){ // If the preferential location exists and we're able to go to it.
							return $returnedEstablishedConnection; // Return the established FTP connection.
						}
						else{ // If we are unable to navigate to the directory, either as a result of incorrect permissions or the Preferential Location not existing.
							return 1.05; // Return the error code #1.05
						}
					}
					else{ // If atlasui_ftp_login failed to connect.
						return 1.04; // Return the error code #1.04.
					}
				}
			}
			else{
				return 1.02; // Return the error code #1.02
			}
		}
		else{
			return 1.01; // Since the nodeList has not been found and is equal to error code #1.01, return that.
		}
	}
		
?>
