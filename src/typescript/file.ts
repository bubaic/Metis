/*

	The following Typescript code is the File IO functionality of Metis

*/

/// <reference path="devices/web.ts" />
/// <reference path="core.ts" />
/// <reference path="queuer.ts" />


module metis.file {
	// #region Metis File Handler

	// nodeDataDefined : any, files : any, fileAction : string, contentOrDestinationNodes ?: any, callbackFunction ?: Function, noCloudCall ?: Boolean
	export function Handler(handlerArguments : Object){

		// #region Node Data Parsing

		var parsedNodeData : string = ""; // Defined parsedNodeData as the Node Data we have parsed
		var unparsedNodeData : any = handlerArguments["nodeData"]; // Define unparsedNodeData as the nodeData defined in the arguments

		if (typeof unparsedNodeData == "string"){ // If the nodeDataDefined is already a string format
			parsedNodeData = unparsedNodeData; // Define the parsedNodeData as nodeDataDefined
		}
		else if (typeof unparsedNodeData == "object"){ // If the unparsedNodeData that is defined is an object rather than a string, convert to string format
			for (var potentialNodeGroup in unparsedNodeData){ // For every property in nodeData
				var thisDataSyntax : string = potentialNodeGroup; // Define thisDataSyntax as the string syntax for this individual Node Group / Nodes.

				if (unparsedNodeData[potentialNodeGroup] !== null){ // If the potentialNodeGroup content is not null, meaning it is a Node Group with Nodes
					thisDataSyntax = thisDataSyntax + "#"; // Since there are Nodes within this Node Group, add the # to denote Nodes.
					var nodesInGroup : string[] = unparsedNodeData[potentialNodeGroup]; // Declare nodesInGroup as an array consisting of the array val of unparsedNodeData[potentialNodeGroup]

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

					parsedNodeData = parsedNodeData + thisDataSyntax; // Append thisDataSyntax to the parsedNodeData string
				}
				else{ // If potentialNodeGroup is either a Node Group without any defined Nodes or potentialNodeGroup is a Node
					unparsedNodeData = unparsedNodeData + potentialNodeGroup + "|"; // Append potentialNodeGroup| to unparsedNodeData
				}
			}

			unparsedNodeData = unparsedNodeData.slice(0, -1); // Remove the last | from the unparsedNodeData
			parsedNodeData = unparsedNodeData; // Set the parsedNodeData to the unparsedNodeData string
		}
		else if (typeof unparsedNodeData == "number"){ // If the unparsedNodeData is a number
			parsedNodeData = unparsedNodeData.toString(); // Convert to string
		}

		// #endregion

		// #region Files Variable Checking

		if (typeof handlerArguments["files"] == "string"){ // If the filesToQueue is a string
			handlerArguments["files"] = [handlerArguments["files"]]; // Convert filesToQueue to an array
		}

		// #endregion

		// #region Content Or Destination Nodes Checking

		if (handlerArguments["contentOrDestinationNodes"] == undefined){ // If contentOrDestinationNodes is NOT defined (for instance in r, e, or d actions)
			handlerArguments["contentOrDestinationNodes"] = false; // Define as false for the uniqueIOObject
		}

		// #endregion

		// #region Callback Checking

		if (handlerArguments["callback"] == undefined){ // If the callbackFunction is NOT defined
			handlerArguments["callback"] = false; // Defined as false for the uniqueIOObject
		}

		if (handlerArguments["callback-data"] == undefined){ // If callback-data is NOT defined
			handlerArguments["callback-data"] = false; // Define as false for the uniqueIOObject
		}

		// #endregion

		var uniqueIOObject = { // Create an Object to hold information regarding our IO request, which gets stored to metis.file.currentIO and read by the appropriate device
			"nodeData" : parsedNodeData, // Parsed form of the Node Data defined
			"pending" : handlerArguments["files"], // Files we are doing IO to
			"action" : handlerArguments["action"], // Action
			"contentOrDestinationNodes" : handlerArguments["contentOrDestinationNodes"],
			"completed" : {}, // Completed IO Object
			"callback" : handlerArguments["callback"], // The function defined for the IO. This is optional.
			"callback-data" : handlerArguments["callback-data"] // Any associated data for the callback that we should pass
		};

		metis.core.deviceIO.Handle(uniqueIOObject);
	}

	// #endregion

	// #region Decodes (parses) a string into an Object

	export function Decode(jsonString: string) {
		return JSON.parse(jsonString);
	}

	// #endregion

	// #region Reading files from local storage (whether that be LocalStorage or chrome.storage)

	export function Read(ioArgs : Object) {
		ioArgs["action"] = "r"; // Set the action to read (r)
		metis.file.Handler(ioArgs);
	}

	// #endregion

	// #region Creating one or a multitude of files in LocalStorage, Chrome's Storage, and/or on the Metis Node(s)

	export function Create(ioArgs : Object) {
		ioArgs["action"] = "w"; // Set the action to write (w)
		metis.file.Handler(ioArgs);
	}

	// #endregion

	// #region Update one or a multitude of files in LocalStorage, Chrome's Storage, and/or on the Metis Node(s)

	export function Update(ioArgs : Object) {
		if(ioArgs["append"] !== true){ // If we are NOT appending content to the file
			delete ioArgs["append"]; // Delete the append item
			ioArgs["action"] = "w"; // Set the action to writing

			metis.file.Handler(ioArgs);
		}
		else{ // If we ARE appending content to the file
			delete ioArgs["append"]; // Delete the append item
			ioArgs["action"] = "a"; // Set the action to appending
			metis.file.Handler(ioArgs);
		}
	}

	// #endregion

	// #region Delete one or a multitude of files in LocalStorage, Chrome's Storage, and/or on the Metis Node(s)

	export function Delete(ioArgs : Object) {
		ioArgs["action"] = "d"; // Set the action to delete (d)
		metis.file.Handler(ioArgs);
	}

	// #endregion

	// #region Checking if one or a multitude of files in LocalStorage, Chrome's Storage, and/or on the Metis Node(s) exists

	export function Exists(ioArgs : Object){
		ioArgs["action"] = "e"; // Set the action to exists (e)
		metis.file.Handler(ioArgs);
	}

	// #endregion

	// #region Clear all files from that device

	export function ClearAll() : void {
		metis.core.deviceIO.ClearAll(); // Call the deviceIO and clear all files from that particular storage (only affects our domain, app, etc)
	}

	// #endregion

}