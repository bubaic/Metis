/*

	The following Typescript code is the File IO functionality of Metis

*/

/// <reference path="devices/web.ts" />
/// <reference path="metis.ts" />
/// <reference path="interfaces.ts" />
/// <reference path="queuer.ts" />

module metis.file {
	// #region Metis File IO Func

	// nodeDataDefined : any, files : any, fileAction : string, contentOrDestinationNodes ?: any, callbackFunction ?: Function, noCloudCall ?: Boolean
	export function IO(apiRequestObject : APIRequest){

		// #region Node Data Parsing

		if (typeof apiRequestObject.NodeData === "number"){ // If the unparsedNodeData is a number
			apiRequestObject.NodeData = apiRequestObject.NodeData.toString(); // Convert to string
		}

		// #endregion

		// #region Files Variable Checking

		if (typeof apiRequestObject.Files == "string"){ // If the Files in apiRequestObject is a string
			apiRequestObject.Files = Array(apiRequestObject.Files); // Convert apiRequestObject.Files to an array
		}

		// #endregion

		var uniqueIOObject : UniqueIOObject = { // Create an Object to hold information regarding our IO request, which gets stored to metis.file.currentIO and read by the appropriate device
			"NodeData" : apiRequestObject.NodeData, // Parsed form of the Node Data defined
			"Action" : apiRequestObject.Action, // Action
			"ContentOrDestinationNodes" : apiRequestObject.ContentOrDestinationNodes,
			"PendingFiles" : apiRequestObject.Files, // Files we are doing IO to
			"CompletedFiles" : {}, // Completed IO Object
			"Callback" : apiRequestObject.Callback, // The function defined for the IO. This is optional.
			"CallbackData" : apiRequestObject.CallbackData // Any associated data for the callback that we should pass
		};

		metis.DeviceIO.Handle(uniqueIOObject);
	}

	// #endregion

	// #region Decodes (parses) a string into an Object

	export function Decode(jsonString: string) : Object {
		return JSON.parse(jsonString);
	}

	// #endregion

	// #region Clear all files from that device

	export function ClearAll() : void {
		metis.DeviceIO.ClearAll(); // Call the deviceIO and clear all files from that particular storage (only affects our domain, app, etc)
	}

	// #endregion

	// #region Array Item Removal

	export function ArrayRemove(ourArray : Array<any>, remove : any) : Array<any> {
		var itemIndex : number = ourArray.indexOf(remove); // Define itemIndex as the index of the remove in ourArray

		if (itemIndex !== -1){ // If the item exists
			return Array.prototype.concat(ourArray.slice(0, itemIndex), ourArray.slice(itemIndex +1)); // Return an Array that is the concat of the beginning of the array until the index of the item and the items after the remove item
		}
		else { // If the item does not exist
			return ourArray;
		}
	}

	// #endregion

	// #region Object Handling

	export function Merge(primaryObject: Object, secondaryObject: Object) { // This function merges objects and object properties into a single returned Object. This is a solution to not being able to use .concat()
		for (var objectProperty in secondaryObject) { // For each objectProperty in the newFileContent
			if (typeof secondaryObject[objectProperty] == "object") { // If this particular property of the newFileContent object is an object itself
				if (primaryObject[objectProperty] !== undefined) { // If the existingFileContent property IS set already
					primaryObject[objectProperty] = this.Merge(primaryObject[objectProperty], secondaryObject[objectProperty]); // Do a recursive object merge
				}
				else { // If the existingFileContent property is NOT set
					primaryObject[objectProperty] = secondaryObject[objectProperty];
				}
			}
			else { // If newFileContent property is not an object
				primaryObject[objectProperty] = secondaryObject[objectProperty]; // Do not do a merge, merely overwrite
			}
		}

		return primaryObject; // Return the existingFileContent Object, which is now considered to be updated.
	}

	// #endregion
}