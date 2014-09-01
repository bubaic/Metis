<?php

	// These are Backup Queue related functions

	/*
		Copyright 2013-2014 Strobl Industries

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

	#region Backup System - Backup Queuer

	function backupQueuer(array $parsedNodeData, array $files, $fileAction){
		$nodeList = $GLOBALS['nodeList']; // Get the node list as a multi-dimensional array
		$backupQueueFileName = fileHashing("backup-queue");
		$directoryPriorToBackupMove = navigateToLocalMetisData("backup"); // Navigate to the backup folder

		if (is_file($backupQueueFileName . ".json")){ // If the backupQueueFile exists
			$backupQueue_Json = file_get_contents($backupQueueFileName . ".json"); // Read the contents of the backup-queue file
		}
		else{ // If the file does NOT exist
			$backupQueue_Json = false; // Set the JSON var to false
		}

		if ((strlen(trim($backupQueue_Json)) > 2) || ($backupQueue_Json !== false)){ // If the JSON is NOT the default ({}) or false (file_get_contents failure)
			$backupQueue = decodeJsonFile($backupQueue_Json); // Convert to multi-dimensional array
			$backupQueue_md5Hash = md5($backupQueue_Json); // Generate md5 hash of the file before it potentially being modified
		}
		else{ // If the backupQueue is empty or does not exist
			$backupQueue = array();
			$backupQueue_md5Hash = null; // Define the md5Hash as null
		}

		$nodeGroupNodes_WithBackup = array(); // Array to hold any of the Node Group's Nodes that will be used for backup

		#region Get Node Groups / Nodes that have backup data enabled

		foreach ($parsedNodeData as $nodeOrGroup => $potentialNodesInGroup){ // For each Node Group or Node in the parsed Node Data
			if (isset($nodeList[$nodeOrGroup]["Backup Data"])){ // If this Node Group or independent Node is meant to handle all backups of file IO
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
						if (isset($nodeGroupNodes[$nodeGroupNode]["Backup Data"])){ // If the Node has Backup elements
							if ($nodeGroupNodes[$nodeGroupNode]["Backup Data"]["Enabled"] == true){ // If this backup is enabled
								$nodeGroupNodes_WithBackup[] = $nodeOrGroup . "#" . $nodeGroupNode; // Add it to the list of Nodes with backup
							}
						}
					}
				}
				// Else don't add Node Group or Node to $nodeGroupNodes_WithBackup, therefore the backup queue adding gets skipped
			}
		}

		#endregion

		if (count($nodeGroupNodes_WithBackup) > 0){ // If there are Nodes that have Backup Data.
			foreach ($nodeGroupNodes_WithBackup as $nodeDataString){ // For each node listed in the nodeGroupNodes_WithBackup

				if (gettype($backupQueue[$nodeDataString]) !== "array"){ // If the nodeDataString array is not already defined in the backupQueue
					$backupQueue[$nodeDataString] = array();
				}

				foreach ($files as $fileName){
					if (isset($backupQueue[$nodeDataString][$fileName])){ // If the file is already in the backup queue
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

		$backupQueue_Json = json_encode($backupQueue);
		$backupQueue_NewHash = md5($backupQueue_Json); // Get the new md5 hash of the encoded backup queue

		if ($backupQueue_md5Hash !== $backupQueue_NewHash){ // If the hashes have changed (implies modification of the queue), do file IO
			$fileHandler = fopen($backupQueueFileName . ".json", "w"); // Create a file handler.
			fwrite($fileHandler, $backupQueue_Json); // Write the JSON data to the file.
			fclose($fileHandler); // Close the file location.
			touch($backupQueueFileName. ".json"); // Touch the file to ensure that it is set that it's been accessed and modified.
		} // else don't do anything, since no file IO is required

		chdir($directoryPriorToBackupMove);
	}

	#endregion

?>