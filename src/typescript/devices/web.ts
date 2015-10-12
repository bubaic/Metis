/*

 The following Typescript code is the Metis implementation of LocalStorage / browser-based File IO.

*/

/// <reference path="../metis.ts" />
/// <reference path="cloud.ts" />

module metis.devices.web{

	// #region Handler for all LocalStorage IO

	export function Handle(uniqueIOObject : UniqueIOObject){
		var fileAction = uniqueIOObject.Action; // Get the file IO type we'll be doing

		// #region LocalStorage File Checking

		for (var fileName of uniqueIOObject.PendingFiles){ // For each file in the IO Object's pending files
			var localFileContent : Object = { "success" : true}; // The content (and potential object) of the local file. Default to a 0.00 "status" Object

			if ((fileAction == "r") || (fileAction == "a")){ // If we are reading files or appending content to a file
				var fetchedContent = localStorage.getItem(fileName); // Return the localStorage content or NULL

				if (fetchedContent !== null){ // If the fetchedContent is NOT null, meaning we successfully fetched the file
					localFileContent = metis.file.Decode(fetchedContent); // Convert to a JSON object
				}
				else { // If the file content is null
					localFileContent = { "error" : "file_doesnt_exist" }; // Define localFileContent as an error where we declare that the file does not exist
				}
			}

			if ((fileAction == "w") || (fileAction == "a")){ // If we are writing or appending file content to LocalStorage
				if ((fileAction == "a") && (typeof localFileContent["error"] !== "string")){ // If we are appending content to a file that does exist
					uniqueIOObject.Content = metis.file.Merge(localFileContent, uniqueIOObject.Content); // Update ContentOrDestinationNodes to the updated and merged content
				}

				localStorage.setItem(fileName, JSON.stringify(uniqueIOObject.Content)); // Create a new file in LocalStorage or update the existing one (based on the uniqueIOObject key/val)
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

			if (((fileAction == "r") && (typeof localFileContent["error"] == "undefined")) || (fileAction == "e")){ // If the file was successfully read or we were checking if the file exists
				allowPoppingFile = true; // Allow popping file from pending
			}
			else if ((fileAction == "w") || (fileAction == "a") || (fileAction == "d")){ // If we are writing, appending or deleting files
				if (metis.Headless){ // If Headless mode is enabled
					allowPoppingFile = true; // Allow popping the file from the pending files since we don't need to replicate the same actions to the server
				}
			}

			if (allowPoppingFile){ // If we allow the popping of the file
				uniqueIOObject.PendingFiles = metis.file.ArrayRemove(uniqueIOObject.PendingFiles, fileName); // Remove the file name from PendingFiles
			}

			uniqueIOObject.CompletedFiles[fileName] = localFileContent; // Add the file to the completed section with the localFileContent
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