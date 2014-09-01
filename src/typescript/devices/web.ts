/*

 The following Typescript code is the Metis implementation of LocalStorage / browser-based File IO.

*/

/// <reference path="cloud.ts" />

module metis.devices.web{

	// #region Handler for all LocalStorage IO

	export function Handle(uniqueIOObject : Object){
		var fileAction = uniqueIOObject["action"]; // Get the file IO type we'll be doing
		var pendingFiles = uniqueIOObject["pending"]; // Get the pending files

		// #region LocalStorage File Checking

		for (var fileIndex  in pendingFiles){ // For each file in the IO Object's pending files
			var fileName = pendingFiles[fileIndex]; // Define fileName equal to the value of the index fileIndex in the files array
			var localFileContent : any; // The content (and potential object) of the local file
			var ioSuccessful : boolean = false; // Define ioSuccessful as a boolean. We will only move an item and the localFileContent to the completed part of the uniqueIOObject IF this is true

			if ((fileAction == "r") || (fileAction == "a")){ // If we are reading files or appending content to a file
				localFileContent = localStorage.getItem(fileName); // Return the localStorage content or NULL

				if (localFileContent !== null){ // If the localFileContent is NOT null, meaning we successfully fetched the file
					localFileContent = metis.file.Decode(localFileContent); // Convert to a JSON object

					if (fileAction == "r"){ // If we are reading content
						ioSuccessful = true; // Set to successful
					}
				}
			}

			if ((fileAction == "w") || (fileAction == "a")){ // If we are writing or appending file content to LocalStorage
				if ((fileAction == "a") && (localFileContent !== null)){ // If we are appending content to a file that does exist
					localFileContent = metis.core.Merge(localFileContent, uniqueIOObject["contentOrDestinationNodes"]); // Set the localFileContent to the updated and merged content instead of a success code
					localStorage.setItem(fileName, JSON.stringify(localFileContent)); // Create a new file in LocalStorage or update the existing one (based on the uniqueIOObject key/val)
				}
				else{ // If the file content we were updating doesn't exist in the first place OR we are writing
					localFileContent = { "status" : "0.00"}; // Set to successful code since we will just act as if we are writing content
					localStorage.setItem(fileName, JSON.stringify(uniqueIOObject["contentOrDestinationNodes"])); // Create a new file in LocalStorage or update the existing one (based on the uniqueIOObject key/val)
				}

				ioSuccessful = true; // Set to successful
			}
			else if (fileAction == "d") { // If we are going to be deleting files
				localStorage.removeItem(fileName); // Remove the file from LocalStorage

				ioSuccessful = true; // Set to successful
				localFileContent = { "status" : "0.00"}; // Add the successful code
			}
			else if (fileAction == "e"){ // If we are checking if the file exists
				if (localStorage.getItem(fileName) !== null){ // If the key does exist on the device
					localFileContent = {"status" : true }; // Set the status to true
				}
				else{ // If we did not find the file locally
					localFileContent = { "status" : false }; // Set the status to false
				}

				ioSuccessful = true; // Set to successful
			}

			if (ioSuccessful == true){ // If the IO was successful
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
		}

		// #endregion

		metis.devices.cloud.Handle(uniqueIOObject); // Pass along any potential pending files to the final stage of IO, Cloud. This is a skippable step, however that is defined in the function.
	}

	// #endregion

	// #region Clear all files from that device

	export function ClearAll() : void {
		var numberOfKeys : number = localStorage.length; // Get the number of keys in LocalStorage

		for (var i = 0; i < numberOfKeys; i++){ // Recursively walk until we are at the key limit
			var fileName = localStorage.key(i); // Get the key based on the index
			localStorage.removeItem(fileName);
		}
	}

	// #endregion

}