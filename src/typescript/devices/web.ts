/*

 The following Typescript code is the Metis implementation of LocalStorage / browser-based File IO.

*/

/// <reference path="cloud.ts" />

module metis.devices.web{

	// #region Handler for all LocalStorage IO

	export function Handle(uniqueIOObject : Object){
		var fileAction = uniqueIOObject["Action"]; // Get the file IO type we'll be doing
		var pendingFiles = uniqueIOObject["pending"]; // Get the pending files

		// #region LocalStorage File Checking

		for (var fileName of pendingFiles){ // For each file in the IO Object's pending files
			var localFileContent : any = { "success" : true}; // The content (and potential object) of the local file. Default to a 0.00 "status" Object

			if ((fileAction == "r") || (fileAction == "a")){ // If we are reading files or appending content to a file
				localFileContent = localStorage.getItem(fileName); // Return the localStorage content or NULL

				if (localFileContent !== null){ // If the localFileContent is NOT null, meaning we successfully fetched the file
					localFileContent = metis.file.Decode(localFileContent); // Convert to a JSON object
				}
			}

			if ((fileAction == "w") || (fileAction == "a")){ // If we are writing or appending file content to LocalStorage
				if ((fileAction == "a") && (localFileContent !== null)){ // If we are appending content to a file that does exist
					localFileContent = metis.core.Merge(localFileContent, uniqueIOObject["ContentOrDestinationNodes"]); // Set the localFileContent to the updated and merged content instead of a success code
					localStorage.setItem(fileName, JSON.stringify(localFileContent)); // Create a new file in LocalStorage or update the existing one (based on the uniqueIOObject key/val)
				}
				else{ // If the file content we were updating doesn't exist in the first place OR we are writing
					localStorage.setItem(fileName, JSON.stringify(uniqueIOObject["ContentOrDestinationNodes"])); // Create a new file in LocalStorage or update the existing one (based on the uniqueIOObject key/val)
				}
			}
			else if (fileAction == "d") { // If we are going to be deleting files
				localStorage.removeItem(fileName); // Remove the file from LocalStorage
			}
			else if (fileAction == "e"){ // If we are checking if the file exists
				localFileContent = { "exists" : true }; // Initially set the localFileContent of this Exists check to true. If it doesn't exist, then change it.

				if (localStorage.getItem(fileName) == null){ // If the key does not exist on the device
					localFileContent = {"exists" : false }; // Set the exists key/val to false
				}
			}

			var allowPoppingFile = false; // Default popFile to false

			if ((fileAction == "r") || (fileAction == "e")){ // If we were checking if the file was read or exists
				allowPoppingFile = true; // Allow popping the file from the pending files
			}
			else if ((fileAction == "w") || (fileAction == "a") || (fileAction == "d")){ // If we are writing, appending or deleting files
				if (metis.core.metisFlags["Headless"] == true){ // IF Headless mode is enabled
					allowPoppingFile = true; // Allow popping the file from the pending files since we don't need to replicate the same actions to the server
				}
			}

			if (allowPoppingFile == true){ // If we allow the popping of the file
				uniqueIOObject["pending"].pop(fileName); // Remove via array.pop the file name from the files array
			}

			uniqueIOObject["completed"][fileName] = localFileContent; // Add the file to the completed section with the localFileContent
		}

		// #endregion

		metis.devices.cloud.Handle(uniqueIOObject); // Pass along any potential pending files to the final stage of IO, Cloud. This is a skippable step, however that is defined in the function.
	}

	// #endregion

	// #region Clear all files from that device

	export function ClearAll() : void {
		localStorage.clear(); // Call localStorage.Clear()
	}

	// #endregion

}