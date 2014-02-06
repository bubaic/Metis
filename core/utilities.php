<?php
	
	// These are misc. utilities

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

	function fileExists($nodeNum, array $files){ // This function checks if a file exists within a node
		global $nodeList;

		if ($nodeList !== 1.01){ // If we successfully fetched the nodeList
			if ($nodeList[$nodeNum] !== null){ // If the node exists

				$nodeAddress = getNodeInfo($nodeList, $nodeNum, "Address"); // Get the address / directory of the Node.
				$nodeType = getNodeInfo($nodeList, $nodeNum, "Node Type"); // Get the type of node that is being used.
				$nodePreferentialLocation = getNodeInfo($nodeList, $nodeNum, "Preferential Location"); // Get the preferential location for the Node.

				if ($nodeAddress !== 1.03){ // If getting the node info did not fail
					if ($nodeType == "local"){ // If the Node is local, then continue
						$successfulNavigation = navigateToLocalMetisData($nodeAddress, $nodePreferentialLocation); // Navigate to the Node directory

						if ($successfulNavigation !== 2.01){ // If the navigation was successful
							$filesToFilesExistArray = array();
							$filesInArray = count($files); // Get the number of files in the array

							foreach ($files as $fileName){ // For each file in the array
								$fileExists = is_file(fileHashing($fileName) . ".json"); // Get the boolean value if the file exists (use is_file so we don't need to include path like in file_exists)

								if ($filesInArray > 1){ // If there is more than one file, use an array
									$filesToFilesExistArray[$fileName] = $fileExists; // Declare that the fileName exists or not (ex: "bacon" = true)
								}
								else{ // If there is NOT more than one file
									$filesToFilesExistArray = $fileExists; // Change array to bool, set to the boolean value of fileExists
								}
							}

							return $filesToFilesExistArray;
						}
						else{
							return 2.01; // Return error code #2.01
						}
					}
					else{
						return 5.02; // Return error code #5.02
					}
				}
				else{
					return 1.03; // Return error code #5.03;
				}
			}
			else{
				return 1.02; // Return error code #1.02
			}
		}
		else{
			return 1.01; // Return error code #1.01
		}
	}

	function mysqlToMetis($mysqliConnection, $nodeNum, array $options){
		global $nodeList; //Get the node list as a multi-dimensional array

		if (is_object($mysqliConnection)){ // If the MySQL connection is an object, generally meaning it is a successful connection, then carry on with the conversion process
			if ($nodeList !== 1.01){ // If we successfully fetched the nodeList
				if ($nodeList[$nodeNum] !== null){ // If the node exists
					// #region Get all array options
					
					$debug = $options["debug"];
					$filePrefix = $options["filePrefix"];
					$includePrimaryFieldInFile = $options["includePrimaryFieldInFile"];
					$mysqliTable = $options["table"];
					$primaryField = $options["primaryField"];
					
					// #endregion
					
					if (is_string($mysqliTable) == true){ // If the mysqlTable is defined and IS a string
						$mysqliLayoutOfTable = mysqli_query($mysqliConnection, "SHOW COLUMNS FROM " . $mysqliTable); // Generate a mysql query that gets the layout (fields, types, etc) of the table
						$mysqliRowQuery = mysqli_query($mysqliConnection, "SELECT * FROM " . $mysqliTable); // Generate a mysqli query that gets the file contents
						
						$mysqliTableFields = array(); // Create an array that'll hold the list of fields in the table
						
						// #region Individual Table Structure Row Fetching
						
						while ($tableData = mysqli_fetch_array($mysqliLayoutOfTable)){
							$mysqliTableFields[] = $tableData[0]; // Get the value of the first index ("Fields") and add it to the $mysqliTableFields array
						}

						if ($primaryField == null){ // If $primaryField == null (not defined)
							$primaryField = $mysqliTableFields[0]; // Set it to name of the first table field
						}

						// #endregion
						
						// #region Individual Table Data Row Fetching
						
						while ($rowData = mysqli_fetch_array($mysqliRowQuery)){ // For every row, get it's data and...
							$metisFileContent = array(); // Create an array that'll hold the "converted" key / vals of the file, which'll eventually be converted by fileActionHandler into JSON and stored
							
							if ($filePrefix !== null){ // If a file prefix has been defined, we will use that instead of the name of the table
								$metisFileName = $filePrefix;
							}
							else{ // If the filePrefix has not been defined
								$metisFileName = $mysqliTable; // Set the $metisFileName to be the name of the table.
							}
							
							// #region Primary Field Fetching
							
							$metisFileName = $metisFileName . "_" . $rowData[$primaryField]; // Set the metisFileName

							if ($includePrimaryFieldInFile == true){ // If $includePrimaryFieldInFile is true
								$metisFileContent[$primaryField] = $rowData[$primaryField]; // Set a key / val pair for the primaryField and it's content
							}

							// #endregion
							
							foreach ($mysqliTableFields as $mysqliTableFieldName){ // For every field
								if ($mysqliTableFieldName !== $primaryField){ // If the mysqliTableFieldName is NOT the primaryField (since we determine if we should add it into the filecontent before this)
									$metisFileContent[$mysqliTableFieldName] = $rowData[$mysqliTableFieldName]; // Assign the content of the field / column to the equiv. key in the file content
								}
							}

							/* debugOnlyVar simply means that createJsonFile will occur, no matter what and in instances of debugging, it will echo the response code. */
							$debugOnlyVar = createJsonFile($nodeNum, array($metisFileName), $metisFileContent); // Create the file

							if ($debug == true){ // If debugging is true
								print "We attempted to create " . $metisFileName . " on Node #" . $nodeNum . " and received the following response: " . $debugOnlyVar . "<br />";
							}
						}
						
						// #endregion

						return "0.00"; // Return success code
					}
					else{
						return 5.01; // Return error code #5.01
					}
				}
				else{ // If the node doesn't exist
					return 1.02; // Return error code #1.02
				}
			}
			else{
				return 1.01; // Return error code #1.01
			}
		}
		else{ // If the provided connection is NOT a resource, meaning it is most likely a failed connection
			return 1.05; // Return error code #5.01
		}
	}

?>
