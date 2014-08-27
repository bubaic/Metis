/*

 The following Typescript code is the Metis implementation of "Cloud" / server-based File IO.

 */

/// <reference path="../file.ts" />

module metis.devices.cloud {

	// #region Handler for all Cloud IO

	export function Handle(uniqueIOObject : Object){
		// #region Pending-Related Variables

		var fileAction = uniqueIOObject["pending"]["action"]; // Get the file IO type we'll be doing
		var pendingFiles = uniqueIOObject["pending"]["files"]; // Get the pending files
		var contentOrDestinationNodes = uniqueIOObject["pending"]["contentOrDestinationNodes"]; // Potential contentOrDestinationNodes

		// #endregion

		var completedIO = uniqueIOObject["completed"];
		var potentialCallback = uniqueIOObject["callback"]; // Get the potential function associated with this IO
		var potentialCallbackExtraData = uniqueIOObject["callback-data"]; // Get the potential extra data we should pass to the callback

		if (uniqueIOObject["pending"]["nodeData"] !== "internal"){ // If we are not doing an internal Metis call
			if (metis.core.metisFlags["Headless"] == false){ // If Headless Mode is disabled, then we are allowed to make XHR calls
				if((metis.core.metisFlags["User Online"] == true) && (metis.core.metisFlags["Battery OK"] == true)) { // If the user is online and Battery OK is true (battery level is not applicable or is above a particular percentage)
					if(pendingFiles.length > 0){ // If  there are still necessary remote files to do IO with
						var remoteIOData : any = {}; // Define the custom formdata object (type any)

						remoteIOData.nodeData = uniqueIOObject["pending"]["nodeData"]; // Set the nodeData key / val to the nodeData arg
						remoteIOData.files = pendingFiles; // Set the files key / val to the pendingFiles array
						remoteIOData.action = fileAction;// Set the fileAction key / val to the fileAction arg

						if (contentOrDestinationNodes !== false) { // If we either have content or in the case of replication, destination nodes
							remoteIOData.contentOrDestinationNodes = contentOrDestinationNodes; // Set the contentOrDestination Nodes key / val to the contentOrDestinationNodes arg
						}

						var xhrManager : XMLHttpRequest = new XMLHttpRequest; // Create a new XMLHttpRequest

						function xhrResponseHandler() { // Create a function that is used as the handler for when the xhrManager returns some form of context
							if (xhrManager.readyState == 4) { // If the XHR is considered "done"
								var uniqueIOObject : string = arguments[0]; // Since we are bound to xhrResponseHandler with a uniqueIOId passed as the first arg, let us go ahead and get that.
								var remoteFileContent : Object; // Define remoteFileContent as the Object we return or need to create if there is an HTTP error

								if (xhrManager.status == 200) { // If the xhrManagerUrl was an HTTP 200
									remoteFileContent = metis.file.Decode(xhrManager.responseText); // Decode the responseText and assign it to the remoteFileContent
								}
								else{
									remoteFileContent = {"error" : "HTTP ERROR CODE|" + xhrManager.status }; // Create an Object and assign it to remoteFileContent
								}

								for (var fileName in remoteFileContent){
									if (remoteFileContent["error"] == undefined){ // If an XHR error did not occur
										var fileContent : Object = remoteFileContent[fileName]; // Set the fileContent Object specific to the file
									}
									else{ // If an XHR error DID occur
										var fileContent : Object = remoteFileContent; // Set the fileContent Object to be the error Object we defined in the xhrManager.status handler
									}

									uniqueIOObject["pending"]["files"].pop(fileName); // Remove the file from the pending files array
									uniqueIOObject["completed"][fileName] = fileContent; // Set the fileName in the completed section to the particular content we've defined

									if ((fileAction == "r") || (fileAction == "a")){ // If we are reading or appending to files, get the content we have and store it locally. For appending, this makes sense if the server has content we didn't have before.
										var newIOObject : Object = { // Create a new Object to pass to metis.file.Handler
											"nodeData" : "internal", // Set to internal so it'll skip XHR
											"files" : fileName, // Set the files to the fileName
											"action" : "w", // Set to write
											"contentOrDestinationNodes" : fileContent // Set to the fileContent
										};

										metis.file.Handler(newIOObject); // Call the metis.file.Handler with a request to save the content locally and not do another cloud call.
									}
								}

								metis.devices.cloud.fireCallback(potentialCallback, uniqueIOObject["completed"], potentialCallbackExtraData); // Fire callback with the completed content and any extra data.
							}
						}

						xhrManager.onreadystatechange = xhrResponseHandler.bind(metis, uniqueIOObject);
						xhrManager.open("POST", metis.core.metisFlags["Callback"], true); // xhrManager will open an async connection using POST to the url defined in xhrManagerUrl
						xhrManager.send(JSON.stringify(remoteIOData)); // Send the data
					}
				}
				else { // If the user is NOT online or their battery life is NOT sufficient
					var filesNeededForQueuing = uniqueIOObject["pending"]["files"]; // Add the currently pending files to the filesNeededForQueing

					if(uniqueIOObject["pending"]["action"] !== "r") { // If we were not reading files
						filesNeededForQueuing.push(Object.keys(completedIO)); // Push even the completed IO file list to the filesNeededForQueuing, since we need to do the same action on the server.
					}

					if(filesNeededForQueuing.length > 0) { // If it turns out that we either a) need to fetch / read files remotely or b) write, update, etc. to the remote Metis cluster
						var newIOObject = { // Create an Object to hold information regarding our IO request and add the corresponding Object to the metis.file.currentIO
							"pending" : { // Pending IO
								"nodeData" : uniqueIOObject["pending"]["nodeData"], // Node Data we defined
								"files" : filesNeededForQueuing, // Files we are doing IO to
								"action" : fileAction, // Action
								"contentOrDestinationNodes" : contentOrDestinationNodes
							},
							"completed" : {} // Completed IO Object
						};

						metis.queuer.AddItem(newIOObject); // Add the new IO Object
					}

					metis.devices.cloud.fireCallback(potentialCallback, uniqueIOObject["completed"], potentialCallbackExtraData); // Fire callback with the completed content and any extra data.
				}
			}
			else{ // If we are on Headless mode
				metis.devices.cloud.fireCallback(potentialCallback, uniqueIOObject["completed"], potentialCallbackExtraData); // Fire callback with the completed content and any extra data.
			}
		}
		else{ // In the event that the developer is intentionally using the "internal" mapping (used in Metis tests as well)
			metis.devices.cloud.fireCallback(potentialCallback, uniqueIOObject["completed"], potentialCallbackExtraData); // Fire callback with the completed content and any extra data.
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