/*

 The following Typescript code is the IO Queue System of Metis

 */

/// <reference path="metis.ts" />
/// <reference path="file.ts" />
/// <reference path="interfaces.ts" />

module metis.queuer{

	export function Init(){
		metis.file.IO( // Check if the ioQueue file exists
			{
				"NodeData" : "internal",
				"Action" : "e",
				"Files" : "ioQueue",
				"Callback" : function(completedIO : Object){
					if (completedIO["ioQueue"]["status"] == false){ // If the ioQueue file does not exist
						metis.file.IO({"NodeData" : "internal", "Action" : "w", "Files" : "ioQueue", "ContentOrDestinationNodes" : {}}); // Create an empty ioQueue file
					}
				}
			}
		);

		document.addEventListener("online", metis.queuer.Process, false); // Add an event listener that listens to the "online" event, which means the user went from offline to online and we need to process our IO queue, if there is one
		document.addEventListener("offline", metis.queuer.ToggleStatus, false); // Add an event listener that listens to the "offline" event. When the user goes offline, we'll change this.userOffline to true so fileActionHandler can send data to ioQueue.
	}

	export function ToggleStatus() {
		metis.Online = false;
	}

	export function Process(){
		metis.file.IO( // Do a call to Read the ioQueue file
			{
				"NodeData" : "internal",
				"Action" : "r",
				"Files" : "ioQueue",
				"Callback" : function(ioQueue : Object){
					ioQueue = ioQueue["ioQueue"];

					metis.Online = true; // Set the user to online

					for (var fileName in ioQueue) { // For each file
						var nodeData : string = ioQueue[fileName]["NodeData"]; // Get the stringified nodeData
						var fileAction : string = ioQueue[fileName]["Action"]; // Get the requested fileAction
						var contentOrDestinationNodes : any = ioQueue[fileName]["ContentOrDestinationNodes"]; // Get either undefined, content for w/a, or an array of nodes for rp

						if (metis.Online){
							metis.file.IO({"NodeData" : nodeData, "Action" : fileAction, "Files": fileName, "ContentOrDestinationNodes" : contentOrDestinationNodes});
							delete ioQueue[fileName]; // Delete the file from ioQueue.
						}
						else{
							break;
						}
					}

					metis.file.IO({"NodeData" : "internal", "Action" : "u", "Files" : "ioQueue", "ContentOrDestinationNodes" : ioQueue}); // Update the ioQueue content
				}
			}
		);
	}

	// #region Add Item to ioQueue

	export function AddItem(uniqueIOObject : UniqueIOObject){
		metis.file.IO( // Do a call to Read the ioQueue file
			{
				"NodeData" : "internal",
				"Action" : "r",
				"Files" : "ioQueue",
				"Callback" : function(ioQueue : Object, callbackData : Object){
					ioQueue = ioQueue["ioQueue"];
					var relatedIOObject : UniqueIOObject= callbackData["uniqueIOObject"]; // Get the object we passed along as callback-data

					for (var fileName of relatedIOObject.Files){
						if (ioQueue.hasOwnProperty(fileName) == true){ // If the file is already in the ioQueue
							delete ioQueue[fileName]; // Delete the fileName so it can be garbage collected
						}

						var fileIOObject : APIRequest = { // Create a new UniqueIOObject for this specific
							"NodeData" : relatedIOObject.NodeData,
							"Action" : relatedIOObject.Action,
							"Files" : relatedIOObject.Files
						};

						if (relatedIOObject.Action == ("w" || "a")) { // If we are writing or appending content
							fileIOObject.ContentOrDestinationNodes = relatedIOObject.ContentOrDestinationNodes; // Set the ContentOrDestinationNodes
						}

						ioQueue[fileName] = fileIOObject; // Assign fileIOObject to the fileName
					}

					metis.file.IO({"NodeData" : "internal","Action" : "u", "Files" : "ioQueue", "ContentOrDestinationNodes" : ioQueue}); // Update the ioQueue content
				},
				"CallbackData" : {
					"uniqueIOObject" : uniqueIOObject // Add the related IO ID that we got from metis.cloud.Handler
				}
			}
		);
	}

	// #endregion
}