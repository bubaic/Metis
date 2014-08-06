/*

 The following Typescript code is the IO Queue System of Metis

 */

/// <reference path="core.ts" />
/// <reference path="file.ts" />

module metis.queuer{

	export function Init(){
		function existsHandler(completedIO : Object){
			if (completedIO["ioQueue"] == false){ // If the ioQueue file does not exist
				metis.file.Create({"nodeData" : "internal", "fileName" : "ioQueue", "contentOrDestinationNodes" : {}}); // Create an empty ioQueue file
			}
		}

		metis.file.Exists( // Check if the ioQueue file exists
			{
				"nodeData" : "internal",
				"files" : "ioQueue",
				"callback" : existsHandler
			}
		);

		document.addEventListener("online", metis.queuer.Process, false); // Add an event listener that listens to the "online" event, which means the user went from offline to online and we need to process our IO queue, if there is one
		document.addEventListener("offline", metis.queuer.ToggleStatus, false); // Add an event listener that listens to the "offline" event. When the user goes offline, we'll change this.userOffline to true so fileActionHandler can send data to ioQueue.
	}

	export function ToggleStatus() {
		metis.core.metisFlags["User Online"] = false;
	}

	export function Process(){
		if (metis.core.metisFlags["Battery OK"] == true){ // If the battery status is seemed to be a reasonable status to ensure a network call won't be detrimental to the battery life and thus user experience
			metis.file.Read( // Do a call to Read the ioQueue file
				{
					"nodeData" : "internal",
					"files" : "ioQueue",
					"callback" : function(ioQueue : Object){
						ioQueue = ioQueue["ioQueue"];

						metis.core.metisFlags["User Online"] = true; // Set the user to online

						for (var fileName in ioQueue) { // For each file
							var nodeData : string = ioQueue[fileName]["nodeData"]; // Get the stringified nodeData
							var fileAction : string = ioQueue[fileName]["action"]; // Get the requested fileAction
							var contentOrDestinationNodes : any = ioQueue[fileName]["contentOrDestinationNodes"]; // Get either undefined, content for w/a, or an array of nodes for rp

							/* Every time we do a queueItem process, check if we're still online. The logic behind this is that if we are online, we'll do the fileActionHandler and
							 it will not re-add the item to the ioQueue since we're still online. If we happen to go offline, it will cancel the for loop and NOT continue to
							 attempt fileIO, which would just end up resulting in the same item being added to the queue and potentially creating an infinite loop.
							 */

							if (metis.core.metisFlags["User Online"] == true){
								metis.file.Handler({"nodeData" : nodeData, "files": fileName, "action" : fileAction, "contentOrDestinationNodes" : contentOrDestinationNodes});
								delete ioQueue[fileName]; // Delete the file from the nodeList. It will be garbage collected by the browser.
							}
							else{
								break;
							}
						}

						metis.file.Update({"nodeData" : "internal", "files" : "ioQueue", "contentOrDestinationNodes" : ioQueue}); // Update the ioQueue content
					}
				}
			);
		}
	}

	// #region Add Item to ioQueue

	export function AddItem(uniqueIOId : string){
		metis.file.Read( // Do a call to Read the ioQueue file
			{
				"nodeData" : "internal",
				"files" : "ioQueue",
				"callback" : function(ioQueue : Object, callbackData : Object){
					ioQueue = ioQueue["ioQueue"];
					var relatedIOObject = metis.file.currentIO[callbackData["relatedIOId"]]; // Get the corresponding Object to the relatedIOId

					var nodeData = relatedIOObject["pending"]["nodeData"]; // Get the action type
					var fileAction = relatedIOObject["pending"]["action"]; // Get the action type
					var filesToQueue = relatedIOObject["pending"]["files"]; // Get the pending files

					for (var fileIndex in filesToQueue){
						var fileName = filesToQueue[fileIndex]; // Define fileName equal to the value of the index fileIndex in the filesToQueue array

						if (ioQueue.hasOwnProperty(fileName) == true){ // If the file is already in the ioQueue
							delete ioQueue[fileName]; // Delete the fileName so it can be garbage collected
						}

						ioQueue[fileName] = {}; // Create the new fileName object in the ioQueue
						ioQueue[fileName]["nodeData"] = nodeData; // Set the nodeData as the stringified nodeData content
						ioQueue[fileName]["action"] = fileAction; // Set the action equal to the fileAction

						if (fileAction == ("w" || "a")) { // If we are writing or appending content, set the contentOrDestinationNodes variable
							var contentOrDestinationNodes = relatedIOObject["pending"]["contentOrDestinationNodes"]; // Get the content

							ioQueue[fileName]["contentOrDestinationNodes"] = contentOrDestinationNodes; // Set the contentOrDestinationNodes
						}
						else{ // If we are not writing or appending content
							delete ioQueue[fileName]["contentOrDestinationNodes"]; // Delete the contentOrDestinationNodes so we won't unnecessarily send content when processing IO
						}
					}

					metis.file.Update({"nodeData" : "internal", "files" : "ioQueue", "contentOrDestinationNodes" : ioQueue}); // Update the ioQueue content
				},
				"callback-data" : {
					"relatedIOId" : uniqueIOId // Add the related IO ID that we got from metis.cloud.Handler
				}
			}
		);
	}

	// #endregion
}