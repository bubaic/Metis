/*

 The following Typescript code is the Metis implementation of Chrome / ChromeOS's storage API.
 Since we do not utilize user interaction, chrome.filesystem would be the incorrect API.

 */

/// <reference path="../file.ts" />
/// <reference path="../definitions/chrome.d.ts" />

module metis.devices.chromeos {

// #region Handler for all Chrome(OS) IO

	export function Handle(uniqueIOId : string){
		var uniqueIOObject = metis.file.currentIO[uniqueIOId]; // Get the unique IO object associated with the ID
		var fileAction = uniqueIOObject["pending"]["action"]; // Get the file IO type we'll be doing
		var pendingFiles = uniqueIOObject["pending"]["files"]; // Get the pending files
		var contentOrDestinationNodes = uniqueIOObject["pending"]["contentOrDestinationNodes"]; // Potential contentOrDestinationNodes


		// #region Chrome IO Async Handler

		var chromeGetHandler = function(){ // When we have gotten the files necessary
			var uniqueIOId : string = arguments[0]; // Set uniqueIOId to the arguments provided, where zero-index is the uniqueIOId due to binding
			var fileAction = metis.file.currentIO[uniqueIOId]["pending"]["action"]; // Get the fileAction passed to us through the uniqueIOId binding

			if (fileAction == ("r" || "a" || "e")){ // If we are doing anything that somehow relates to getting the file content
				var completedIO : Object = arguments[1]; // Set completedIO to the arguments provided, where one-index is the completedIO provided by chrome.storage.local.get

				for (fileName in completedIO){ // For each file we received
					var ioSuccessful : boolean; // Define ioSuccessful as a boolean. We will only move an item and the localFileContent to the completed part of the uniqueIOObject IF this is true
					var localFileContent = completedIO[fileName]; // Get the potential fileContent (or it'll be an error)

					if (typeof localFileContent == "Object"){ // If the fileContent is an Object
						if (fileAction == "a"){ // If we were appending content
							var contentOrDestinationNodes = metis.file.currentIO[uniqueIOId]["pending"]["contentOrDestinationNodes"]; // Get the contentOrDestinationNodes

							localFileContent = metis.core.Merge(localFileContent, contentOrDestinationNodes); // Merge the JSON object from this uniqueIOObject and the read content
							chrome.storage.local.set({fileName : localFileContent}); // Store the updated file content in Chrome.StorageArea

							localFileContent = {"status" : true }; // Set the status to true
						}
						else if (fileAction == "e"){ // If we were checking if a file exists
							localFileContent = {"status" : true }; // Set the status to true
						}

						ioSuccessful = true; // Set to successful
					}
					else{ // If the fileContent is NOT an Object, most likely an error
						ioSuccessful = false; // Set to failure
					}
				}
			}
			else{ // If we were doing a write, deletion, etc.
				if (chrome.runtime.lastError == undefined){ // If the lastError in the chrome.runtime is NOT defined
					localFileContent = { "status" : "0.00"}; // Add the successful code
					ioSuccessful = true;
				}
				else{ // If the lastError in the chrome.runtime IS defined
					localFileContent = { "error" : chrome.runtime.lastError }; // Set to failure, with the error val being the chrome runtime error

					if (fileAction == "w"){ // If it was an error, best maintain the integrity of ioSuccessful
						ioSuccessful = false;
					}
					else{ // If we were deleting a file
						ioSuccessful = true; // It is less of a priority to concern ourself with any potential deletion error.
					}
				}
			}

			if (ioSuccessful == true){ // If the IO was successful
				if ((fileAction == ("r" || "e")) || ((fileAction == ("w" || "a" || "d")) && (metis.core.metisFlags["Headless"] == true))){ // Only remove the file from the array IF we won't be needed to make an call to the cloud
					metis.file.currentIO[uniqueIOId]["pending"]["files"].pop(fileName); // Remove via array.pop the file name from the files array
				}

				metis.file.currentIO[uniqueIOId]["completed"][fileName] = localFileContent; // Add the file to the completed section with the localFileContent
			}

			metis.devices.cloud.Handle(uniqueIOId); // Pass along any potential pending files to the final stage of IO, Cloud. This is a skippable step, however that is defined in the function.
		}.bind(this, uniqueIOId); // Bind to chrome, pass along the uniqueIOId

		// #endregion

		if (fileAction == ("r" || "a" || "e")){ // If we are doing anything that somehow relates to getting the file content
			chrome.storage.local.get( // Get files with Chrome's StorageArea Get() method
				pendingFiles, // Pending Files Array
				chromeGetHandler // Call ChromeGetHandler with this as chrome.storage.local, however having a forced uniqueIOId passed
			);
		}
		else if (fileAction == "w"){ // If we are writing files to Chrome.StorageArea
			var chromeSetObject : Object = {};

			for (var fileName in pendingFiles){ // For each fileName in the pendingFiles array
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

}