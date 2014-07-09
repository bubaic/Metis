/*

 The following Typescript code is the IO Queue System of Metis

 */

/// <reference path="core.ts" />
/// <reference path="file.ts" />

module metis.queuer{

	export function Init(){
		if (metis.file.Exists("internal", "ioQueue") !== "local"){ // If the ioQueue file does NOT already exist
			metis.file.Create("internal", "ioQueue", {}); // Create an empty ioQueue file
		}

		document.addEventListener("online", this.Process(), false); // Add an event listener that listens to the "online" event, which means the user went from offline to online and we need to process our IO queue, if there is one
		document.addEventListener("offline", this.ToggleStatus(), false); // Add an event listener that listens to the "offline" event. When the user goes offline, we'll change this.userOffline to true so fileActionHandler can send data to ioQueue.
	}

	export function ToggleStatus() {
		metis.core.metisFlags["User Online"] = false;
	}

	export function Process(){
		if (metis.core.metisFlags["Battery OK"] == true){ // If the battery status is seemed to be a reasonable status to ensure a network call won't be detrimental to the battery life and thus user experience
			var ioQueue : Object = metis.file.Decode(metis.file.Read("internal", "ioQueue"));
			this.userOnline = true; // Set the userOnline to true, meaning the is obviously online

			for (var fileName in ioQueue) { // For each file
				var nodeData : string = ioQueue[fileName]["nodeData"]; // Get the stringified nodeData
				var fileAction : string = ioQueue[fileName]["action"]; // Get the requested fileAction
				var contentOrDestinationNodes : any[] = ioQueue[fileName]["contentOrDestinationNodes"]; // Get either undefined, content for w/a, or an array of nodes for rp

				/* Every time we do a queueItem process, check if we're still online. The logic behind this is that if we are online, we'll do the fileActionHandler and
				 it will not re-add the item to the ioQueue since we're still online. If we happen to go offline, it will cancel the for loop and NOT continue to
				 attempt fileIO, which would just end up resulting in the same item being added to the queue and potentially creating an infinite loop.
				 */

				if (this.userOnline == true) {
					metis.file.Handler(nodeData, fileName, fileAction, contentOrDestinationNodes);
					ioQueue[fileName] = null; // Delete the file from the nodeList. It will be garbage collected by the browser.
				}
				else{
					break;
				}
			}

			metis.file.Update("internal", "ioQueue", ioQueue, false); // Update the ioQueue content
		}
	}

	export function AddItem(nodeData : any, filesToQueue : any, fileAction : string, contentOrDestinationNodes ?: any){
		var ioQueue : Object = metis.file.Decode(metis.file.Read("internal", "ioQueue"));

		var nodeDataDefined : string = "";

		if (typeof nodeData == "string"){ // If the nodeData is already a string format
			nodeDataDefined = nodeData; // Define the nodeDataDefined as nodeData
		}
		else if (typeof nodeData == "object"){ // If the nodeData that is defined is an object rather than a string, convert to string format
			for (var potentialNodeGroup in nodeData){ // For every property in nodeData
				var thisDataSyntax : string = potentialNodeGroup; // Define thisDataSyntax as the string syntax for this individual Node Group / Nodes.

				if (nodeData[potentialNodeGroup] !== null){ // If the potentialNodeGroup content is not null, meaning it is a Node Group with Nodes
					thisDataSyntax = thisDataSyntax + "#"; // Since there are Nodes within this Node Group, add the # to denote Nodes.
					var nodesInGroup : string[] = nodeData[potentialNodeGroup]; // Declare nodesInGroup as an array consisting of the array val of nodeData[potentialNodeGroup]

					nodesInGroup.forEach(
						function(nodeNum : string, nodeIndex : number, nodesInGroup){
							thisDataSyntax = thisDataSyntax + nodeNum; // Declare thisDataSyntax = thisDataSyntax + nodeNum (example: "Example#1")

							if (nodesInGroup.length !== (nodeIndex + 1)){ // If we are not at the last Node
								thisDataSyntax = thisDataSyntax + ","; // Add the comma separator
							}
							else{ // If we are at the last Node
								thisDataSyntax = thisDataSyntax + "|"; // Add the pipe separator
							}
						}
					);

					nodeDataDefined = nodeDataDefined + thisDataSyntax; // Append thisDataSyntax to the nodeDataDefined string
				}
				else{ // If potentialNodeGroup is either a Node Group without any defined Nodes or potentialNodeGroup is a Node
					nodeDataDefined = nodeDataDefined + potentialNodeGroup + "|"; // Append potentialNodeGroup| to nodeDataDefined
				}
			}

			nodeDataDefined = nodeDataDefined.slice(0, -1); // Remove the last | from the nodeDataDefined
		}
		else if (typeof nodeData == "number"){ // If the nodeData is a number
			nodeDataDefined = nodeData.toString(); // Convert to string
		}

		if (typeof filesToQueue == "string"){ // If the filesToQueue is a string
			filesToQueue = [filesToQueue]; // Convert filesToQueue to an array
		}

		for (var fileIndex in filesToQueue){
			var fileName = filesToQueue[fileIndex]; // Define fileName equal to the value of the index fileIndex in the filesToQueue array
			if (ioQueue.hasOwnProperty(fileName) == false){ // If the fileName is not defined in the ioQueue
				ioQueue[fileName] = {}; // Create the new fileName object in the ioQueue
			}

			if ((ioQueue[fileName]["action"] == "w") && (fileAction == "d")){ // If this file is queued for writing then is to be deleted before ioQueue is processed
				ioQueue[fileName] = null; // Set the fileName to null to be garbage collected. No reason to send a delete action for a file that was never written remotely
			}
			else{ // If this file is queued but actions are logical.
				ioQueue[fileName]["nodeData"] = nodeDataDefined; // Set the nodeData as the stringified nodeData content
				ioQueue[fileName]["action"] = fileAction; // Set the action equal to the fileAction

				if (fileAction == ("w" || "a")) { // If we are writing or appending content, set the contentOrDestinationNodes variable
					ioQueue[fileName]["contentOrDestinationNodes"] = contentOrDestinationNodes; // Set the contentOrDestinationNodes
				}
				else{ // If we are not writing or appending content
					if (ioQueue[fileName].hasOwnProperty("contentOrDestinationNodes")){ // If the fileName has a contentOrDestinationNodes property
						ioQueue[fileName]["contentOrDestinationNodes"] = null; // Set it to null so it can be garbage collected by the browser and so we won't unnecessarily send content when processing IO
					}
				}
			}
		}

		metis.file.Update("internal", "ioQueue", ioQueue, false); // Update the ioQueue content
	}
}