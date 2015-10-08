/*

 The following Typescript code is the Metis implementation of Chrome / ChromeOS's storage API.
 Since we do not utilize user interaction, chrome.filesystem would be the incorrect API.

 */

/// <reference path="../file.ts" />
/// <reference path="../definitions/chrome.d.ts" />

module metis.devices.chromeos {

// #region Handler for all Chrome(OS) IO

	export function Handle(uniqueIOObject : Object){
		var fileAction = uniqueIOObject["Action"]; // Get the file IO type we'll be doing
		var pendingFiles = uniqueIOObject["pending"]; // Get the pending files
		var contentOrDestinationNodes = uniqueIOObject["ContentOrDestinationNodes"]; // Potential contentOrDestinationNodes

		// #region Chrome IO Async Handler

		var chromeGetHandler = function(){ // When we have gotten the files necessary
			var uniqueIOObject : string = arguments[0]; // Set uniqueIOId to the arguments provided, where zero-index is the uniqueIOId due to binding
			var fileAction = uniqueIOObject["Action"]; // Get the fileAction passed to us through the uniqueIOObject
			var completedIO : Object = arguments[1]; // Set completedIO to the arguments provided, where one-index is the completedIO provided by chrome.storage.local.get

			for (var fileIndex in completedIO){ // For each file we received
				var fileName = completedIO[fileIndex]; // Get the file name
				var ioSuccessful : boolean; // Define ioSuccessful as a boolean. We will only move an item and the localFileContent to the completed part of the uniqueIOObject IF this is true
				var localFileContent = completedIO[fileName]; // Get the potential fileContent (or it'll be an error)

				if (typeof localFileContent == "Object"){ // If the fileContent is an Object
					if ((fileAction == "r") || (fileAction == "a") || (fileAction == "e")){ // If we are doing anything that somehow relates to getting the file content
						if (fileAction == "a"){ // If we were appending content
							var contentOrDestinationNodes = uniqueIOObject["ContentOrDestinationNodes"]; // Get the contentOrDestinationNodes

							localFileContent = metis.core.Merge(localFileContent, contentOrDestinationNodes); // Merge the JSON object from this uniqueIOObject and the read content
							chrome.storage.local.set({fileName : localFileContent}); // Store the updated file content in Chrome.StorageArea

							localFileContent = {"status" : true }; // Set the status to true
						}
						else if (fileAction == "e"){ // If we were checking if a file exists
							localFileContent = {"status" : true }; // Set the status to true
						}
					}
					else{ // If we were doing a write, deletion, etc.
						localFileContent = { "status" : "0.00"}; // Add the successful code
					}

					ioSuccessful = true; // Set to successful
				}
				else{ // If the fileContent is NOT an Object, most likely an error
					ioSuccessful = false; // Set to failure
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

					if (allowPoppingFile == true){ // If we are allow the popping of the file'
						uniqueIOObject["pending"].pop(fileName); // Remove via array.pop the file name from the files array
					}

					uniqueIOObject["completed"][fileName] = localFileContent; // Add the file to the completed section with the localFileContent
				}
			}

			metis.devices.cloud.Handle(uniqueIOObject); // Pass along any potential pending files to the final stage of IO, Cloud. This is a skippable step, however that is defined in the function.
		}.bind(this, uniqueIOObject); // Bind to chrome, pass along the uniqueIOObject

		// #endregion

		if ((fileAction == "r") || (fileAction == "a") || (fileAction == "e")){ // If we are doing anything that somehow relates to getting the file content
			chrome.storage.local.get( // Get files with Chrome's StorageArea Get() method
				pendingFiles, // Pending Files Array
				chromeGetHandler // Call ChromeGetHandler with this as chrome.storage.local, however having a forced uniqueIOObject passed
			);
		}
		else if (fileAction == "w"){ // If we are writing files to Chrome.StorageArea
			var chromeSetObject : Object = {};

			for (var fileIndex in pendingFiles){ // For each fileName in the pendingFiles array
				var fileName : string = pendingFiles[fileIndex]; // Get the file name
				chromeSetObject[fileName] = contentOrDestinationNodes; // Since we need to have individual key/val for Chrome.StorageArea.set(), add the content to a key, where the key is the fileName
			}

			chrome.storage.local.set( // Store the items
				chromeSetObject,
				chromeGetHandler
			);
		}
		else if (fileAction == "d"){ // If we are deleting files
			chrome.storage.local.remove(// Remove all the files in the pendingFiles array
				pendingFiles,
				chromeGetHandler
			);
		}

	}

	// #endregion

	// #region Clear all files from that device

	export function ClearAll() : void {
		chrome.storage.local.clear(); // Clear the local Chrome storage
	}

	// #endregion

}