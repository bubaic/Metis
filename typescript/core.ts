/*

	The following Typescript code is the Core / Internal functionality of Metis

*/

/// <reference path="definitions/cordova.d.ts" />
/// <reference path="devices/cloud.ts" />
/// <reference path="devices/cordova.ts" />
/// <reference path="file.ts" />
/// <reference path="queuer.ts" />

module metis.core{
	export var deviceIO : any;
	export var metisFlags : Object;

	export function Init(arguments : Object){
		this.metisFlags = {};

		// #region Arguments Parser / Default(er)

		if (arguments["Headless"] == (undefined || false)){ // If Headless is NOT defined or is defined as FALSE
			arguments["Headless"] = false; // Ensure undefined is changed to false
			metis.queuer.Init(); // Initialize the IO Queue System

			if (arguments["Callback"] == undefined){ // If the Callback is NOT defined
				console.log("You have defined Headless as FALSE but have NOT provided a callback URL. Expect errors."); // Log!
			}
		}

		if (arguments["Device"] == undefined){ // If Device is NOT defined
			arguments["Device"] = "Cloud"; // Set the Device to Cloud (so we'll use LocalStorage)
		}

		if (arguments["User Online"] == undefined){ // If User Online is not defined by default
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
		}


		if (arguments["Device"] == "Cloud"){ // If we are using the "Cloud" device
			this.deviceIO = metis.devices.cloud; // Set deviceIO to metis.devices.cloud
		}
		else{ // Else = Device is Cordova
			this.deviceIO = metis.devices.cordova; // Set deviceIO to metis.devices.cordova
		}


		// #endregion

		this.metisFlags = arguments; // Set the metisFlags to the arguments we've parsed
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