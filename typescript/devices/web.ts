/*

 The following Typescript code is the Metis implementation of LocalStorage / browser-based File IO.

*/

/// <reference path="cloud.ts" />

module metis.devices.web{

	// #region Handler for all LocalStorage IO

	export function Handle(uniqueIOId : string){
		var uniqueIOObject = metis.file.currentIO[uniqueIOId]; // Get the unique IO object associated with the ID
		var fileAction = uniqueIOObject["pending"]["action"]; // Get the file IO type we'll be doing
		var pendingFiles = uniqueIOObject["pending"]["files"]; // Get the pending files
		var contentOrDestinationNodes = uniqueIOObject["pending"]["contentOrDestinationNodes"]; // Potential contentOrDestinationNodes

		// #region LocalStorage File Checking

		for (var fileIndex  in pendingFiles){ // For each file in the IO Object's pending files
			var fileName = pendingFiles[fileIndex]; // Define fileName equal to the value of the index fileIndex in the files array
			var localFileContent : any; // The content (and potential object) of the local file
			var ioSuccessful : boolean; // Define ioSuccessful as a boolean. We will only move an item and the localFileContent to the completed part of the uniqueIOObject IF this is true

			if (fileAction == ("r" || "a")){ // If we are reading files or appending content to a file
				localFileContent = localStorage.getItem(fileName); // Return the localStorage content or NULL

				if (localFileContent !== null){ // If the localFileContent is NOT null, meaning we successfully fetched the file
					localFileContent = metis.file.Decode(localFileContent); // Convert to a JSON object

					if (fileAction == "a"){ // If we are appending content to the current file content
						uniqueIOObject["contentOrDestinationNodes"] = metis.core.Merge(localFileContent, contentOrDestinationNodes); // Merge the JSON object from this uniqueIOObject and the read content
					}
					else{ // If we are NOT appending content
						ioSuccessful = true; // Set to successful
					}
				}
			}

			if (fileAction == ("w" || "a")){ // If we are writing or appending file content to LocalStorage
				localStorage.setItem(fileName, JSON.stringify(contentOrDestinationNodes)); // Create a new file in LocalStorage or update the existing one (based on the uniqueIOObject key/val)

				ioSuccessful = true; // Set to successful
				localFileContent = { "status" : "0.00"}; // Add the successful code
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
				if ((fileAction == ("r" || "e")) || ((fileAction == ("w" || "a" || "d")) && (metis.core.metisFlags["Headless"] == true))){ // Only remove the file from the array IF we won't be needed to make an call to the cloud
					metis.file.currentIO[uniqueIOId]["pending"]["files"].pop(fileName); // Remove via array.pop the file name from the files array
				}

				metis.file.currentIO[uniqueIOId]["completed"][fileName] = localFileContent; // Add the file to the completed section with the localFileContent
			}
		}

		// #endregion

		metis.devices.cloud.Handle(uniqueIOId); // Pass along any potential pending files to the final stage of IO, Cloud. This is a skippable step, however that is defined in the function.
	}

	// #endregion

}