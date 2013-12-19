<?php

	// These are Connection related functions for MetisDB.

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

	function getNodeList(){
		$phpRoot = $_SERVER['DOCUMENT_ROOT']; // Get the server root, which we'll use to determine at what point we should stop doing recursive checking.
		$originalDirectory = getcwd(); // Get the current working directory so we can change back to it after fetching the node list.
		$numberOfAttempts = 0; // Set the number of attempts to try to find the Metis directory (every attempt look's at a prior parent directory)
		$currentSearchDirectory = null; // Set the current search directory. This is used to track our progress as we move up the file system.
		$metisExistsInDirectory = false; // Preemptive setting of metisExistsInDirectory to false. If we find Metis folder in a directory, we set it to true.

		while ($numberOfAttempts < 6){
			if ($currentSearchDirectory !== null){ // If the current search directory is NOT null (as in it has already searched the originalDirectory)
				chdir($currentSearchDirectory); // Move to the currentSearchDirectory (as defined at the end of the while loop).
			}

			$currentWorkingDirectory = getcwd(); // Get the current working directory for the purpose of scanning.
			$currentWorkingDirectory_FileDirectoryList = scandir($currentWorkingDirectory); // Scan the directory (currentWorkingDirectory_FileDirectoryList is then an array)

			foreach($currentWorkingDirectory_FileDirectoryList as $key => $thisFileOrDirectory){ // For each item in the array
				if ($thisFileOrDirectory == "Metis"){ // If the item is called "Metis"
					if (is_dir($thisFileOrDirectory) == true){ // Lets make sure someone isn't being silly by naming a file "Metis"
						$metisExistsInDirectory = true; // Assign the metisExistsInDirectory to true
						break 2; // Break out of the foreach and while loop. As we have the currentSearchDirectory saved, we do not need to do some sort of unnecessary re-assigning of that variable.
					}
				}
			}

			if ($currentSearchDirectory == null){ // If the currentSearchDirectory is the originalDirectory
				if ($originalDirectory !== $phpRoot){ // We make sure that the originalDirectory is not the PHP root.
					$currentSearchDirectory = "../"; // Change the currentSearchDirectory to search the parent of the currentWorkingDirectory.
				}
				else{ // We are already at the PHP root...
					$metisExistsInDirectory = false;
					break 1;
				}
			}
			else{ // If the currentSearchDirectory is not the originalDirectory (ie. the directory we were first starting out in)
				if ($currentWorkingDirectory !== $phpRoot){ // We make sure the current working directory is not the PHP root.
					$currentSearchDirectory = $currentSearchDirectory . "../";
				}
				else{ // We are already at the PHP root...
					$metisExistsInDirectory = false;
					break 1;
				}
			}

			chdir($originalDirectory); // Reset our location
			$numberOfAttempts = $numberOfAttempts + 1; // Assuming we got this far in the function, add one to the numberOfAttempts to make sure we don't forever do recursive navigating.
		}

		if ($metisExistsInDirectory !== false){ // If Metis DOES exist somewhere that we've searched...
			chdir($originalDirectory); // Move to the original working directory (used once again just to make sure we're there).

			if ($currentSearchDirectory !== null){ // If the directory where Metis was found is NOT the originalDirectory
				chdir($currentSearchDirectory);  // Move to the directory that Metis is in (by navigating up the filesystem tree to the directory that Metis exists in
			}

			$nodeList = decodeJsonFile(file_get_contents("Metis/nodeList.json")); // Read the nodeList.json from the Metis folder and have it decoded into a multi-dimensional array (assigned to nodeList).
		}
		else{
			$nodeList = 1.01; // Assign nodeList as error code 1.01, which is what'll be returned.
		}

		chdir($originalDirectory); // Move to the original directory
		return $nodeList; // Return the decoded nodeList or the error code.
	}

	function getNodeInfo(array $nodeList, $requestedNodeNumber, $requestedNodeParameter){
		$requestedNodeParameter_Value = $nodeList[$requestedNodeNumber][$requestedNodeParameter]; // Assign the node parameter, from the requested node number, from a specified node list, to variable.
		if (isset($requestedNodeParameter_Value)){ // If the variable is set and is not null.
			return $requestedNodeParameter_Value; // Return the value of the variable
		}
		else{
			 return 1.03; // Return the error code #1.03
		}
	}

?>