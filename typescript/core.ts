/*

	The following Typescript code is the Core / Internal functionality of Metis

 */

/// <reference path="definitions/cordova.d.ts" />
/// <reference path="queuer.ts" />

module metis.core{
	import _queuer = metis.queuer;
	export var metisFlags : Object;

	export function Init(arguments : Object){
		this.metisFlags = {};

		// #region Arguments Parser / Default(er)

		if (arguments["Headless"] == "undefined"){ // If Headless is NOT defined
			arguments["Headless"] = false;
		}

		if (arguments["Device"] == "undefined"){ // If Device is NOT defined
			arguments["Device"] = "Cloud"; // Set the Device to Cloud (so we'll use LocalStorage)
		}

		if ((arguments["LocalStorage"] == "undefined") && (arguments["Device"] == "Cloud")){ // If whether to use LocalStorage (or not) is NOT defined AND Device is set to Cloud
			arguments["LocalStorage"] = true; // Default to enabling LocalStorage
		}
		else{ // If LocalStorage is defined (whether it is true or not) and Device is NOT Cloud (so Cordova)
			arguments["LocalStorage"] = false; // Set LocalStorage to false
		}

		if (arguments["User Online"] == "undefined"){ // If User Online is not defined by default
			if (arguments["Device"] == "Cloud"){ // If the user's Device is the Cloud (web)
				arguments["User Online"] = window.navigator.onLine; // Set the User Online to their current navigator state
			}
			else{ // If the user's Device is Cordova
				if (navigator.connection.type !== Connection.NONE){ // If the connection is NOT none
					arguments["User Online"] = true;
				}
				else{
					arguments["User Online"] = false;
				}
			}

			if (arguments["Headless"] !== true){ // If Headless mode is set to false, then add event handlers, since they essentially enable server communication
				document.addEventListener("online", _queuer.Process, false); // Add an event listener that listens to the "online" event, which means the user went from offline to online and we need to process our IO queue, if there is one
				document.addEventListener("offline", _queuer.ToggleStatus(), false); // Add an event listener that listens to the "offline" event. When the user goes offline, we'll change this.userOffline to true so fileActionHandler can send data to ioQueue.
			}
		}

		if (arguments["Headless"] == false){ // If Metis HeadlessMmode is set to false, check if Callback is set
			if (arguments["Callback"] == "undefined"){ // If the Callback is NOT defined
				console.log("You have defined enableHeadlessMetisOption as FALSE but have NOT provided a callback URL. Expect errors."); // Log!
			}
		}

		// #endregion

		this.metisFlags = arguments; // Set the metisFlags to the arguments we've parsed
	}

	// #endregion

	// #region Object Handling

	export function objectMerge(primaryObject: Object, secondaryObject: Object) { // This function merges objects and object properties into a single returned Object. This is a solution to not being able to use .concat()
		for (var objectProperty in secondaryObject) { // For each objectProperty in the newFileContent
			if (typeof secondaryObject[objectProperty] == "object") { // If this particular property of the newFileContent object is an object itself
				if (primaryObject[objectProperty] !== undefined) { // If the existingFileContent property IS set already
					primaryObject[objectProperty] = this.objectMerge(primaryObject[objectProperty], secondaryObject[objectProperty]); // Do a recursive object merge
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