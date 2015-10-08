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

		var unparsedNodeData : any = handlerArguments["NodeData"]; // Define unparsedNodeData as the nodeData defined in the arguments
		var parsedNodeData : string = unparsedNodeData; // Defined parsedNodeData as the Node Data we have parsed, by default being the unparsedNodeData (where we assuming it is a string)

		if (typeof unparsedNodeData == "number"){ // If the unparsedNodeData is a number
			parsedNodeData = unparsedNodeData.toString(); // Convert to string
		}

		// #endregion

		// #region Files Variable Checking

		if (typeof handlerArguments["Files"] == "string"){ // If the filesToQueue is a string
			handlerArguments["Files"] = [handlerArguments["Files"]]; // Convert filesToQueue to an array
		}

		// #endregion

		var uniqueIOObject = { // Create an Object to hold information regarding our IO request, which gets stored to metis.file.currentIO and read by the appropriate device
			"NodeData" : parsedNodeData, // Parsed form of the Node Data defined
			"pending" : handlerArguments["Files"], // Files we are doing IO to
			"Action" : handlerArguments["Action"], // Action
			"ContentOrDestinationNodes" : handlerArguments["ContentOrDestinationNodes"],
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
		ioArgs["Action"] = "r"; // Set the action to read (r)
		metis.file.Handler(ioArgs);
	}

	// #endregion

	// #region Creating one or a multitude of files in LocalStorage, Chrome's Storage, and/or on the Metis Node(s)

	export function Create(ioArgs : Object) {
		ioArgs["Action"] = "w"; // Set the action to write (w)
		metis.file.Handler(ioArgs);
	}

	// #endregion

	// #region Update one or a multitude of files in LocalStorage, Chrome's Storage, and/or on the Metis Node(s)

	export function Update(ioArgs : Object) {
		if(ioArgs["append"] !== true){ // If we are NOT appending content to the file
			delete ioArgs["append"]; // Delete the append item
			ioArgs["Action"] = "w"; // Set the action to writing

			metis.file.Handler(ioArgs);
		}
		else{ // If we ARE appending content to the file
			delete ioArgs["append"]; // Delete the append item
			ioArgs["Action"] = "a"; // Set the action to appending
			metis.file.Handler(ioArgs);
		}
	}

	// #endregion

	// #region Delete one or a multitude of files in LocalStorage, Chrome's Storage, and/or on the Metis Node(s)

	export function Delete(ioArgs : Object) {
		ioArgs["Action"] = "d"; // Set the action to delete (d)
		metis.file.Handler(ioArgs);
	}

	// #endregion

	// #region Checking if one or a multitude of files in LocalStorage, Chrome's Storage, and/or on the Metis Node(s) exists

	export function Exists(ioArgs : Object){
		ioArgs["Action"] = "e"; // Set the action to exists (e)
		metis.file.Handler(ioArgs);
	}

	// #endregion

	// #region Clear all files from that device

	export function ClearAll() : void {
		metis.core.deviceIO.ClearAll(); // Call the deviceIO and clear all files from that particular storage (only affects our domain, app, etc)
	}

	// #endregion

}