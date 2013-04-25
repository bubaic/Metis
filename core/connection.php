<?php

	// These are Connection related functions for MetisDB.
	
	/* List of Functions, In Order, With Description:
		getNodeInfo - Returns the value of a parameter from a specific node.

		establishConnection - This function returns a connection based on the requested node and node information. This function covers local file IO, FTP and MySQLi

		timeIOConnection - This function returns the number of seconds & milliseconds it takes to connect to the requested node and create test file. It automatically deletes the file it wrote when testing the connection.

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
	
	function getNodeInfo($nodeList, $requestedNodeNumber, $requestedNodeParameter){
		$requestedNodeParameter_Value = $nodeList[$requestedNodeNumber][$requestedNodeParameter]; // Assign the node parameter, from the requested node number, from a specified node list, to variable.
		if ((isset($requestedNodeParameter_Value)) && ($requestedNodeParameter_Value !== "")){ // If the variable is set and is not null.
			return $requestedNodeParameter_Value; // Return the value of the variable
		}
		else{
			return "doesnt_exist"; // State it doesn't exist
		}
	}
	
	function establishConnection($requestedNodeNumber){
		$nodeList = decodeJsonFile(file_get_contents("Metis/nodeList.json")); // Get the multi-dimensional array of the nodeList via decodeJsonFile.
		if ($nodeList !== "file_doesnt_exist"){ // If the file does exist a.k.a does not have a value of "file_doesnt_exist".
			
			if (!empty($nodeList[$requestedNodeNumber])){ // If the node number exists (empty is used as it is an array).
				$connectionType = getNodeInfo($nodeList, $requestedNodeNumber, "Node Type"); // Type of connection
				$connectionAddress = getNodeInfo($nodeList, $requestedNodeNumber, "Address"); // Connection Address
				$connectionPreferentialLocation = getNodeInfo($nodeList, $requestedNodeNumber, "Preferential Location"); // Preferred starting location or MySQL database.
				
				if ($connectionType == ("ftp" || "mysqli")){ // If the connection type is FTP or MySQL (uses MySQLi as mysql class will be deprecated in PHP).
					$connectionUsername = getNodeInfo($nodeList, $requestedNodeNumber, "Username"); // Connection Username
					$connectionPassword = getNodeInfo($nodeList, $requestedNodeNumber, "Password"); // Connection Password
					
					if ($connectionType == "ftp"){ // If the node connection type is FTP...
						$returnedEstablishedConnection = atlasui_ftp_login($connectionAddress, $connectionUsername, $connectionPassword); // Return the ftp_login from AtlasUI.
						
						if (gettype($returnedEstablishedConnection) !== "string"){ // Since we are trying to ensure that the established connection is in fact the ftp object, check if its NOT a string.
							if (ftp_chdir($returnedEstablishedConnection, $connectionPreferentialLocation)){ // If the preferential location exists and we're able to go to it.
								return $returnedEstablishedConnection; // Return the established FTP connection.
							}
							else{ // If we are unable to navigate to the directory, either as a result of incorrect permissions or the Preferential Location not existing.
								die("Error: Preferential Location does not exist."); // Die!
							}
						}
						else{ // If the returned "established connection" is in fact a string, return the error message given.
							die("Error: $returnedEstablishedConnection");
						}
					}
					elseif ($connectionType == "mysqli"){
						$returnedEstablishedConnection = atlasui_sql_connect("mysqli", $connectionAddress, $connectionPreferentialLocation, $connectionUsername, $connectionPassword);
						return $returnedEstablishedConnection;
					}
				}
				elseif ($connectionType == "local"){
					return "local||$connectionPreferentialLocation";
				}
			}
			else{
				return "There seems to be an issue with your nodeList. Please check the syntax to make sure its correct! The decoded form is: \n" . $nodeList;
			}
		}
		else{
			return "Current Directory: " . getcwd() . " | nodeList_not_found";
		}
	}
	
	function timeIOConnection($requestedServerNumber, $addRating = false){
		$testFileName = "test" . rand(1, 1000); // Generate a file name, as rand could skew the results.
		$testContent_Encode = array("test", array("test")); // Create an array that will be used for json encode in createFile.
		
		$startTimeStructure = date_create();
		$currentTime = date_format($startTimeStructure, "s.u");
		
		createFile(array($requestedServerNumber), "test", $testFileName, $testContent_Encode);
		
		$endTimeStructure = date_create();
		$endTime = date_format($endTimeStructure, "s.u");
		
		$totalIOTime = ($endTime - $currentTime); // End time minus beginning time to find the difference.
		
		if ($addRating !== false){
			if ($totalIOTime >= 7){
				$totalIOTime = $totalIOTime . "sec|dead";
			}
			elseif (($totalTime < 7) && ($totalTime >= 5)){
				$totalIOTime = $totalIOTime . "sec|bad";
			}
			elseif (($totalTime < 5) && ($totalTime >= 3)){
				$totalIOTime = $totalIOTime . "sec|ok";
			}
			else{
				$totalIOTime = $totalIOTime . "sec|good";
			}
		}
		else{
			$totalIOTime = $totalIOTime . "sec";
		}
		
		return $totalIOTime;
	}
		
?>