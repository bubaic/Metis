/*

	The following Typescript code is the File IO functionality of Metis

*/

/// <reference path="devices/web.ts" />
/// <reference path="core.ts" />
/// <reference path="queuer.ts" />


module metis.file {
	export var currentIO : Object = {}; // Declare currentIO to be an an Object for tracking current file IO (for async purposes)

	// #region Random IO Generator

	export function RandomIOIdGenerator() : string{
		var id : string; // The random ID we generated
		var idAlreadyExists : Boolean = true; // Declare idAlreadyExists as a boolean that will change when we have created a unique ID

		while (idAlreadyExists == true){ // While idAlreadyExists is true
			id = (Math.random() * (99999 - 10000) + 10000).toFixed(0).toString();

			if (metis.file.currentIO[id] == undefined){ // If the metis.file.currentIO does not have something with this ID
				idAlreadyExists = false; // Set to false
				break; // Break out of the while loop.
			}
		}

		return id; // Return the random ID we generated
	}

	// #endregion

	// #region Metis File Handler

	// nodeDataDefined : any, files : any, fileAction : string, contentOrDestinationNodes ?: any, callbackFunction ?: Function, noCloudCall ?: Boolean
	export function Handler(handlerArguments : Object){
		var uniqueIOId : string = metis.file.RandomIOIdGenerator(); // Create a random, unique IO Id
		var parsedNodeData : string = ""; // Defined parsedNodeData as the Node Data we have parsed
		var unparsedNodeData : any = handlerArguments["nodeData"]; // Define unparsedNodeData as the nodeData defined in the arguments

		// #region Node Data Parsing

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

		var uniqueIOObject : Object = { // Create an Object to hold information regarding our IO request, which gets eventually stored to metis.file.currentIO and read by the appropriate device
			"pending" : { // Pending IO
				"nodeData" : parsedNodeData, // Parsed form of the Node Data defined
				"files" : handlerArguments["files"], // Files we are doing IO to
				"action" : handlerArguments["action"], // Action
				"contentOrDestinationNodes" : handlerArguments["contentOrDestinationNodes"]
			},
			"completed" : {}, // Completed IO Object
			"callback" : handlerArguments["callback"] // The function defined for the IO. This is optional.
		};

		metis.file.currentIO[uniqueIOId] = uniqueIOObject; // Add the currentIO and uniqueIOObject to the currentIO object

		metis.core.deviceIO.Handle(uniqueIOId);
	}

	// #endregion

	// #region Decodes (parses) a string into an Object

	export function Decode(jsonString: string) {
		return JSON.parse(jsonString);
	}

	// #endregion

	// #region Reading files from local storage (whether that be LocalStorage or chrome.storage)

	export function Read(arguments : Object) {
		arguments["action"] = "r"; // Set the action to read (r)
		metis.file.Handler(arguments);
	}

	// #endregion

	// #region Creating one or a multitude of files in LocalStorage, Chrome's Storage, and/or on the Metis Node(s)

	export function Create(arguments : Object) {
		arguments["action"] = "w"; // Set the action to write (w)
		metis.file.Handler(arguments);
	}

	// #endregion

	// #region Update one or a multitude of files in LocalStorage, Chrome's Storage, and/or on the Metis Node(s)

	export function Update(arguments : Object) {
		if(arguments["append"] !== true){ // If we are NOT appending content to the file
			delete arguments["append"]; // Delete the append item
			arguments["action"] = "w"; // Set the action to writing

			metis.file.Handler(arguments);
		}
		else{ // If we ARE appending content to the file
			delete arguments["append"]; // Delete the append item
			arguments["action"] = "a"; // Set the action to appending
			metis.file.Handler(arguments);
		}
	}

	// #endregion

	// #region Delete one or a multitude of files in LocalStorage, Chrome's Storage, and/or on the Metis Node(s)

	export function Delete(arguments : Object) {
		arguments["action"] = "d"; // Set the action to delete (d)
		metis.file.Handler(arguments);
	}

	// #endregion

	// #region Checking if one or a multitude of files in LocalStorage, Chrome's Storage, and/or on the Metis Node(s) exists

	export function Exists(arguments : Object){
		arguments["action"] = "e"; // Set the action to exists (e)
		metis.file.Handler(arguments);
	}

	// #endregion

	// #region Clear all files from that device

	export function ClearAll() : void {
		metis.core.deviceIO.ClearAll(); // Call the deviceIO and clear all files from that particular storage (only affects our domain, app, etc)
	}

	// #endregion

}