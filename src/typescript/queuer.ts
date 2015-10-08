/*

 The following Typescript code is the IO Queue System of Metis

 */

/// <reference path="core.ts" />
/// <reference path="file.ts" />

module metis.queuer{

	export function Init(){
		metis.file.Exists( // Check if the ioQueue file exists
			{
				"NodeData" : "internal",
				"Files" : "ioQueue",
				"callback" : function(completedIO : Object){
					if (completedIO["ioQueue"]["status"] == false){ // If the ioQueue file does not exist
						metis.file.Create({"NodeData" : "internal", "Files" : "ioQueue", "ContentOrDestinationNodes" : {}}); // Create an empty ioQueue file
					}
				}
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
					"NodeData" : "internal",
					"Files" : "ioQueue",
					"callback" : function(ioQueue : Object){
						ioQueue = ioQueue["ioQueue"];

						metis.core.metisFlags["User Online"] = true; // Set the user to online

						for (var fileName in ioQueue) { // For each file
							var nodeData : string = ioQueue[fileName]["NodeData"]; // Get the stringified nodeData
							var fileAction : string = ioQueue[fileName]["Action"]; // Get the requested fileAction
							var contentOrDestinationNodes : any = ioQueue[fileName]["ContentOrDestinationNodes"]; // Get either undefined, content for w/a, or an array of nodes for rp

							/* Every time we do a queueItem process, check if we're still online. The logic behind this is that if we are online, we'll do the fileActionHandler and
							 it will not re-add the item to the ioQueue since we're still online. If we happen to go offline, it will cancel the for loop and NOT continue to
							 attempt fileIO, which would just end up resulting in the same item being added to the queue and potentially creating an infinite loop.
							 */

							if (metis.core.metisFlags["User Online"] == true){
								metis.file.Handler({"NodeData" : nodeData, "Files": fileName, "Action" : fileAction, "ContentOrDestinationNodes" : contentOrDestinationNodes});
								delete ioQueue[fileName]; // Delete the file from the nodeList. It will be garbage collected by the browser.
							}
							else{
								break;
							}
						}

						metis.file.Update({"NodeData" : "internal", "Files" : "ioQueue", "ContentOrDestinationNodes" : ioQueue}); // Update the ioQueue content
					}
				}
			);
		}
	}

	// #region Add Item to ioQueue

	export function AddItem(uniqueIOObject : Object){
		metis.file.Read( // Do a call to Read the ioQueue file
			{
				"NodeData" : "internal",
				"Files" : "ioQueue",
				"callback" : function(ioQueue : Object, callbackData : Object){
					ioQueue = ioQueue["ioQueue"];
					var relatedIOObject = callbackData["uniqueIOObject"]; // Get the object we passed along as callback-data

					var nodeData = relatedIOObject["pending"]["NodeData"]; // Get the NodeData type
					var fileAction = relatedIOObject["pending"]["Action"]; // Get the action type
					var filesToQueue = relatedIOObject["pending"]["Files"]; // Get the pending files

					for (var fileIndex in filesToQueue){
						var fileName : string = filesToQueue[fileIndex];

						if (ioQueue.hasOwnProperty(fileName) == true){ // If the file is already in the ioQueue
							delete ioQueue[fileName]; // Delete the fileName so it can be garbage collected
						}

						ioQueue[fileName] = {}; // Create the new fileName object in the ioQueue
						ioQueue[fileName]["NodeData"] = nodeData; // Set the nodeData as the stringified nodeData content
						ioQueue[fileName]["Action"] = fileAction; // Set the action equal to the fileAction

						if (fileAction == ("w" || "a")) { // If we are writing or appending content, set the contentOrDestinationNodes variable
							ioQueue[fileName]["ContentOrDestinationNodes"] = relatedIOObject["pending"]["ContentOrDestinationNodes"]; // Set the pending contentOrDestinationNodes
						}
					}

					metis.file.Update({"NodeData" : "internal", "Files" : "ioQueue", "ContentOrDestinationNodes" : ioQueue}); // Update the ioQueue content
				},
				"callback-data" : {
					"uniqueIOObject" : uniqueIOObject // Add the related IO ID that we got from metis.cloud.Handler
				}
			}
		);
	}

	// #endregion
}