/*

 The following Typescript code is the Metis implementation of "Cloud" / server-based File IO.

 */

/// <reference path="../file.ts" />

module metis.devices.cloud {

	// #region Handler for all Cloud IO

	export function Handle(uniqueIOId : string){
		// #region Pending-Related Variables

		var fileAction = metis.file.currentIO[uniqueIOId]["pending"]["action"]; // Get the file IO type we'll be doing
		var pendingFiles = metis.file.currentIO[uniqueIOId]["pending"]["files"]; // Get the pending files
		var contentOrDestinationNodes = metis.file.currentIO[uniqueIOId]["pending"]["contentOrDestinationNodes"]; // Potential contentOrDestinationNodes

		// #endregion

		var completedIO = metis.file.currentIO[uniqueIOId]["completed"];
		var potentialCallback = metis.file.currentIO[uniqueIOId]["callback"]; // Get the potential function associated with this IO
		var potentialCallbackExtraData = metis.file.currentIO[uniqueIOId]["callback-data"]; // Get the potential extra data we should pass to the callback

		if (metis.file.currentIO[uniqueIOId]["pending"]["nodeData"] !== "internal"){ // If we are not doing an internal Metis call
			if (metis.core.metisFlags["Headless"] == false){ // If Headless Mode is disabled, then we are allowed to make XHR calls
				if((metis.core.metisFlags["User Online"] == true) && (metis.core.metisFlags["Battery OK"] == true)) { // If the user is online and Battery OK is true (battery level is not applicable or is above a particular percentage)
					if(pendingFiles.length > 0){ // If  there are still necessary remote files to do IO with
						var remoteIOData : any = {}; // Define the custom formdata object (type any)

						remoteIOData.nodeData = metis.file.currentIO[uniqueIOId]["pending"]["nodeDataDefined"]; // Set the nodeData key / val to the nodeData arg
						remoteIOData.files = pendingFiles; // Set the files key / val to the pendingFiles array
						remoteIOData.fileAction = fileAction;// Set the fileAction key / val to the fileAction arg

						if (contentOrDestinationNodes !== (undefined || null)) { // If we either have content or in the case of replication, destination nodes
							remoteIOData.contentOrDestinationNodes = contentOrDestinationNodes; // Set the contentOrDestination Nodes key / val to the contentOrDestinationNodes arg
						}

						var xhrManager : XMLHttpRequest = new XMLHttpRequest; // Create a new XMLHttpRequest

						function xhrResponseHandler() { // Create a function that is used as the handler for when the xhrManager returns some form of context
							if (xhrManager.readyState == 4) { // If the XHR is considered "done"
								var remoteFileContent : Object; // Define remoteFileContent as the Object we return or need to create if there is an HTTP error

								if (xhrManager.status == 200) { // If the xhrManagerUrl was an HTTP 200
									remoteFileContent = metis.file.Decode(xhrManager.responseText); // Decode the responseText and assign it to the remoteFileContent
								}
								else{
									remoteFileContent = {"error" : "HTTP ERROR CODE|' + xhrManager.status + '"}; // Create an Object and assign it to remoteFileContent
								}

								for (var fileName in remoteFileContent){
									var fileContent : Object;

									if (pendingFiles.length == 1){ // If the length of pendingFiles is one
										fileName = pendingFiles[0]; // Change the fileName to be the only array item in pendingFiles
										fileContent = remoteFileContent; // Set the fileContent equal to the content we received
									}
									else{ // If there is more than one pending files and therefore more returned data from the remoteFileContent
										fileContent = remoteFileContent[fileName]; // Get the content Object specific to this Object
									}

									metis.file.currentIO[uniqueIOId]["pending"]["files"].pop(fileName); // Remove the file from the pending files array
									metis.file.currentIO[uniqueIOId]["completed"][fileName] = fileContent; // Set the fileName in the completed section to the particular content we've defined

									if (fileAction == "r"){ // If we are reading files, get the content we have and store it locally
										var newIOObject : Object = { // Create a new Object to pass to metis.file.Handler
											"nodeData" : "internal", // Set to internal so it'll skip XHR
											"files" : fileName, // Set the files to the fileName
											"action" : "w", // Set to write
											"contentOrDestinationNodes" : fileContent // Set to the fileContent
										};

										metis.file.Handler(newIOObject); // Call the metis.file.Handler with a request to save the content locally and not do another cloud call.
									}
								}

								if (potentialCallback !== false){ // If we were provided a function to call with the completed content
									potentialCallback(metis.file.currentIO[uniqueIOId]["completed"], potentialCallbackExtraData); // Send to the function defined the completed content
								}
							}
						}

						xhrManager.onreadystatechange = xhrResponseHandler;
						xhrManager.open("POST", metis.core.metisFlags["Callback"], true); // xhrManager will open an async connection using POST to the url defined in xhrManagerUrl
						xhrManager.send(JSON.stringify(remoteIOData)); // Send the data
					}
				}
				else { // If the user is NOT online or their battery life is NOT sufficient
					var filesNeededForQueuing = metis.file.currentIO[uniqueIOId]["pending"]["files"]; // Add the currently pending files to the filesNeededForQueing

					if(metis.file.currentIO[uniqueIOId]["pending"]["action"] !== "r") { // If we were not reading files
						filesNeededForQueuing.push(Object.keys(completedIO)); // Push even the completed IO file list to the filesNeededForQueuing, since we need to do the same action on the server.
					}

					if(filesNeededForQueuing.length > 0) { // If it turns out that we either a) need to fetch / read files remotely or b) write, update, etc. to the remote Metis cluster
						var newIOId : string = metis.file.RandomIOIdGenerator(); // Generate a new IO Id for this queued IO

						var newIOObject : Object = { // Create an Object to hold information regarding our IO request
							"pending" : { // Pending IO
								"nodeDataDefined" : metis.file.currentIO[uniqueIOId]["pending"]["nodeDataDefined"], // Node Data we defined
								"files" : filesNeededForQueuing, // Files we are doing IO to
								"action" : fileAction, // Action
								"contentOrDestinationNodes" : contentOrDestinationNodes
							},
							"completed" : {} // Completed IO Object
						};

						metis.file.currentIO[newIOId] = newIOObject; // Add the new IO ID and the corresponding Object to the metis.file.currentIO
						metis.queuer.AddItem(newIOId); // Add the IO ID
					}

					if (potentialCallback !== false){ // If the callback defined is a Function (since we set it to false earlier in IO process if it is undefined)
						potentialCallback(completedIO, potentialCallbackExtraData); // Return with at least the IO that is completed
					}
				}
			}
			else{ // If we are on Headless mode
				if (potentialCallback !== false){ // If the callback defined is a Function (since we set it to false earlier in IO process if it is undefined)
					potentialCallback(completedIO, potentialCallbackExtraData); // Return with at least the IO that is completed
				}
			}
		}

		delete metis.file.currentIO[uniqueIOId]; // Delete this IO ID and the corresponding object
	}

	// #endregion

}