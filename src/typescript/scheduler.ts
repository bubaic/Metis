/*

 The following Typescript code is the IO Scheduler System of Metis

 */

/// <reference path="metis.ts" />
/// <reference path="file.ts" />
/// <reference path="interfaces.ts" />

module metis.scheduler{

	export function Init(){
		metis.file.IO( // Check if the scheduler file exists
			{
				"NodeData" : "internal",
				"Action" : "e",
				"Files" : "scheduler",
				"Callback" : function(completedIO : Object){
					if (completedIO["scheduler"]["status"] == false){ // If the scheduler file does not exist
						metis.file.IO({"NodeData" : "internal", "Action" : "w", "Files" : "scheduler", "ContentOrDestinationNodes" : {}}); // Create an empty scheduler file
					}
				}
			}
		);

		document.addEventListener("online", metis.scheduler.Process, false); // Add an event listener that listens to the "online" event, which means the user went from offline to online and we need to process our IO queue, if there is one
		document.addEventListener("offline", metis.scheduler.ToggleStatus, false); // Add an event listener that listens to the "offline" event. When the user goes offline, we'll change this.userOffline to true so fileActionHandler can send data to scheduler.
	}

	export function ToggleStatus() {
		metis.Online = false;
	}

	export function Process(){
		metis.file.IO( // Do a call to Read the scheduler file
			{
				"NodeData" : "internal",
				"Action" : "r",
				"Files" : "scheduler",
				"Callback" : function(scheduler : Object){
					scheduler = scheduler["scheduler"];

					metis.Online = true; // Set the user to online

					for (var fileName in scheduler) { // For each file
						var nodeData : string = scheduler[fileName]["NodeData"]; // Get the stringified nodeData
						var fileAction : string = scheduler[fileName]["Action"]; // Get the requested fileAction
						var contentOrDestinationNodes : any = scheduler[fileName]["ContentOrDestinationNodes"]; // Get either undefined, content for w/a, or an array of nodes for rp

						if (metis.Online){
							metis.file.IO({"NodeData" : nodeData, "Action" : fileAction, "Files": fileName, "ContentOrDestinationNodes" : contentOrDestinationNodes});
							delete scheduler[fileName]; // Delete the file from scheduler.
						}
						else{
							break;
						}
					}

					metis.file.IO({"NodeData" : "internal", "Action" : "u", "Files" : "scheduler", "ContentOrDestinationNodes" : scheduler}); // Update the scheduler content
				}
			}
		);
	}

	// #region Add Item to scheduler

	export function AddItem(uniqueIOObject : UniqueIOObject){
		metis.file.IO( // Do a call to Read the scheduler file
			{
				"NodeData" : "internal",
				"Action" : "r",
				"Files" : "scheduler",
				"Callback" : function(scheduler : Object, callbackData : Object){
					scheduler = scheduler["scheduler"];
					var relatedIOObject : UniqueIOObject= callbackData["uniqueIOObject"]; // Get the object we passed along as callback-data

					for (var fileName of relatedIOObject.Files){
						if (scheduler.hasOwnProperty(fileName) == true){ // If the file is already in the scheduler
							delete scheduler[fileName]; // Delete the fileName so it can be garbage collected
						}

						var fileIOObject : APIRequest = { // Create a new UniqueIOObject for this specific
							"NodeData" : relatedIOObject.NodeData,
							"Action" : relatedIOObject.Action,
							"Files" : relatedIOObject.Files
						};

						if (relatedIOObject.Action == ("w" || "a")) { // If we are writing or appending content
							fileIOObject.ContentOrDestinationNodes = relatedIOObject.ContentOrDestinationNodes; // Set the ContentOrDestinationNodes
						}

						scheduler[fileName] = fileIOObject; // Assign fileIOObject to the fileName
					}

					metis.file.IO({"NodeData" : "internal","Action" : "u", "Files" : "scheduler", "ContentOrDestinationNodes" : scheduler}); // Update the scheduler content
				},
				"CallbackData" : {
					"uniqueIOObject" : uniqueIOObject // Add the related IO ID that we got from metis.cloud.Handler
				}
			}
		);
	}

	// #endregion
}