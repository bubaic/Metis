/*

 The following Typescript code is the Metis implementation of "Cloud" / server-based File IO.

 */

/// <reference path="../file.ts" />

module metis.devices.cloud {

	// #region Handler for all Cloud IO

	export function Handle(uniqueIOObject : UniqueIOObject){
		if ((uniqueIOObject.NodeData !== "internal") && (!metis.Headless) && (uniqueIOObject.PendingFiles.length !== 0)){ // If we are not doing an internal Metis call, we're not Headless, and we have pending files
			if(metis.Online) { // If the user is online
				var apiRequestObject : APIRequest = { // Create an APIRequest Object
					"NodeData" : uniqueIOObject.NodeData, // Set the NodeData key/val to the NodeData in uniqueIOObject
					"Action" : uniqueIOObject.Action, // Set the Action key/val to the Action in uniqueIOObject
					"Files" : uniqueIOObject.Files // Set the Files key/val to the Files in uniqueIOObject
				};

				if (typeof uniqueIOObject.ContentOrDestinationNodes == "object") { // If we either have content or in the case of replication, destination nodes
					apiRequestObject.ContentOrDestinationNodes = uniqueIOObject.ContentOrDestinationNodes; // Set the ContentOrDestinationNodes key / val to the ContentOrDestinationNodes arg
				}

				var xhrManager : XMLHttpRequest = new XMLHttpRequest; // Create a new XMLHttpRequest

				function xhrHandler(){ // Create a function that is used as the handler for when the xhrManager returns some form of context
					if (xhrManager.readyState == 4) { // If the XHR is considered "done"
						var uniqueIOObject : UniqueIOObject = arguments[0]; // Bound uniqueIOObject
						var potentialCallbackExtraData : any = uniqueIOObject.CallbackData;

						var remoteFileContent : Object; // Define remoteFileContent as the Object we return or need to create if there is an HTTP error

						if (xhrManager.status == 200) { // If the xhrManager.status was an HTTP 200
							remoteFileContent = metis.file.Decode(xhrManager.responseText); // Decode the responseText and assign it to the remoteFileContent
						}
						else{ // If the xhrManager.status was NOT an HTTP 200
							remoteFileContent = {"error" : "HTTP ERROR CODE|" + xhrManager.status }; // Create an Object with the error code and assign it to remoteFileContent
						}

						for (var fileName in remoteFileContent){ // For each file in the remoteFileContent
							var fileContent : Object = remoteFileContent[fileName]; // Set the fileContent Object specific to the file

							uniqueIOObject.CompletedFiles[fileName] = fileContent; // Set the fileName in the completed section to the particular content we've defined

							if ((uniqueIOObject.Action == "r") || (uniqueIOObject.Action == "a")){ // If we are reading or appending to files, get the content we have and store it locally. For appending, this makes sense if the server has content we didn't have before.
								if (typeof fileContent["error"] == "undefined"){ // If the response we got back was NOT an error
									var newIOObject : APIRequest = { // Create a new Object to pass to metis.file.Handler
										"NodeData" : "internal", // Set to internal so it'll skip XHR
										"Files" : fileName, // Set the files to the fileName
										"Action" : "w", // Set to write
										"ContentOrDestinationNodes" : fileContent // Set to the fileContent
									};

									metis.file.IO(newIOObject); // Call the metis.file.Handler with a request to save the content locally and not do another cloud call.
								}
							}
						}

						metis.devices.cloud.fireCallback(uniqueIOObject.Callback, uniqueIOObject.CompletedFiles, uniqueIOObject.CallbackData); // Fire callback with the completed content and any extra data.
					}
				}

				xhrManager.onreadystatechange = xhrHandler.bind(metis, uniqueIOObject); // Pass the uniqueIOObject
				xhrManager.open("POST", metis.Callback, true); // xhrManager will open an async connection using POST to the url defined in xhrManagerUrl
				xhrManager.send(JSON.stringify(apiRequestObject)); // Send the data
			}
			else{ // If the user is NOT online
				if(uniqueIOObject.Action !== "r") { // If we were not reading files
					var completedFilesKeys : any = Object.keys(uniqueIOObject.CompletedFiles); // Define completedFileKeys as the keys in the CompletedFiles Object
					uniqueIOObject.PendingFiles.push(completedFilesKeys); // Push even the completed IO file list to the filesNeededForQueuing, since we need to do the same action on the server.
				}

				var newIOObject : UniqueIOObject = { // Create an Object to hold information regarding our IO request and add the corresponding Object to the metis.file.currentIO
					"NodeData" : uniqueIOObject.NodeData, // Node Data we defined
					"Action" : uniqueIOObject.Action, // Action
					"PendingFiles" : uniqueIOObject.PendingFiles, // Files we are doing IO to
					"CompletedFiles" : {}, // Completed IO Object
					"ContentOrDestinationNodes" : uniqueIOObject.ContentOrDestinationNodes
				};

				metis.scheduler.AddItem(newIOObject); // Add the new IO Object
				metis.devices.cloud.fireCallback(uniqueIOObject.Callback, uniqueIOObject.CompletedFiles, uniqueIOObject.CallbackData); // Fire callback with the completed content and any extra data.
			}
		}
		else{ // In the event that the developer is intentionally using the "internal" mapping (used in Metis tests as well)
			metis.devices.cloud.fireCallback(uniqueIOObject.Callback, uniqueIOObject.CompletedFiles, uniqueIOObject.CallbackData); // Fire callback with the completed content and any extra data.
		}
	}

	// #endregion

	// #region Finalized Callback Function

	export function fireCallback(potentialCallback : any, completedIO : Object, potentialCallbackExtraData : any) : void {
		if (potentialCallback !== false){ // If the callback defined is a Function (since we set it to false earlier in IO process if it is undefined)
			potentialCallback(completedIO, potentialCallbackExtraData); // Return with at least the IO that is completed
		}
	}

	// #endregion

}