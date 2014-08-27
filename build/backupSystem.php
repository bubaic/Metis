<?php
	include("metis.php"); // Include the Metis class
	$metis = new Metis(); // Define $metis as a new Metis class

	if ($metis->nodeList["error"] !== 1.01){ // If the nodeList is valid (is an array)
		$metis->navigateToLocalMetisData("backup");
		$backupQueue_JSON = file_get_contents($metis->fileHashing("backup-queue") . ".json"); // Get the backup queue file
		$backupQueue = $metis->decodeJsonFile($backupQueue_JSON); // Decode the backup queue into a multi-dimensional array

		if (count($backupQueue) > 0){ // If the queue is NOT empty
			foreach ($backupQueue as $nodeData => $nodeQueue){ // For each Node Group or Node listed
				if (strpos($nodeData, "#") == false){ // If # was not found in nodeData, meaning it is either a Node Group or Node
					$backupLocation = $metis->nodeList[$nodeData]["Backup Data"]["Location"]; // Define backupLocation as the Location in the Backup Data
				}
				else{
					$nodeDataString = explode("#", $nodeData); // Separate the Node Group and Node Num
					$nodeGroup = $nodeDataString[0]; // Declare Node Group as index 0
					$nodeGroupNum = $nodeDataString[1]; // Declare Node Num as index 1
					$backupLocation = $metis->nodeList[$nodeGroup][$nodeGroupNum]["Backup Data"]["Location"]; // Define backupLocation as the Location in the Backup Data
				}

				foreach ($nodeQueue as $fileName => $fileQueueData){ // For each file in the Node Group / Node's queue
					$fileQueueAction = $fileQueueData["action"]; // Action is the individual file's queue info["action"]
					$fileContent = null; // Assign $fileContent as null

					if ($fileQueueAction == ("w" || "a")){ // If the action is to write or append (update) content
						$fileQueueAction = "w"; // Change (if necessary), the fileQueueAction to w (write), since we'll be fetching the entire file content and save that in the $backupLocation
						$fileContent = $metis->readJsonFile($nodeData, array($fileName)); // Read the file and assign to $fileContent
					}
					else{
						$fileContent = null; // Assign $fileContent as null
					}

					$fileIOResponse = $metis->fileActionHandler($backupLocation, array($fileName), $fileQueueAction, $fileContent);

					if (strpos($fileIOResponse, "0.00") !== false){ // If the action succeeded (of it contains, somewhere, 0.00
						unset($backupQueue[$nodeData][$fileName]);
					}
				}
			}

			// #region Write data back to the backup-queue file

			$fileName = $metis->fileHashing("backup-queue");
			$fileHandler = fopen($fileName . ".json", "w+"); // Create a file handler.

			if (count($backupQueue) == 0){ // If by the end of the backupSystem script there is nothing in the queue
				$fileContent = '{}'; // Set the $fileContent to be {} (empty JSON file)
			}
			else{
				$fileContent = json_encode($backupQueue); // Convert the array back to JSON
			}

			fwrite($fileHandler, $fileContent); // Write the JSON data to the file.
			fclose($fileHandler); // Close the file location.
			touch($fileName. ".json"); // Touch the file to ensure that it is set that it's been accessed and modified.

			// #endregion
		}
	}
	else{
		echo 1.01;
	}

?>