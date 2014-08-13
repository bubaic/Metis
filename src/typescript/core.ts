/*

	The following Typescript code is the Core / Internal functionality of Metis

*/

/// <reference path="definitions/cordova.d.ts" />

/// <reference path="devices/chromeos.ts" />
/// <reference path="devices/cloud.ts" />
/// <reference path="devices/web.ts" />

/// <reference path="file.ts" />
/// <reference path="queuer.ts" />

module metis.core{
	export var deviceIO : any;
	export var metisFlags : Object;

	export function Init(arguments : Object){
		this.metisFlags = {};

		// #region Arguments Parser / Default(er)

		if (arguments["Headless"] !== true){ // If Headless mode is NOT set to true
			if (arguments["Callback"] == undefined){ // If a Callback is undefined
				arguments["Headless"] = true; //Switch to true
			}
			else{ // If a callback IS defined
				if (arguments["Callback"].indexOf("/callback.php") == -1){ // If the callback does NOT have /callback.php
					if (arguments["Callback"].substr(arguments["Callback"].length - 1) !== "/"){ // If the callback does NOT end in /
						arguments["Callback"] += "/"; // Add the /
					}

					arguments["Callback"] += "callback.php"; // Add the callback.php
				}
			}
		}

		if (arguments["Device"] == undefined){ // If Device is NOT defined
			arguments["Device"] = "Cloud"; // Set the Device to Cloud (so we'll use LocalStorage)
		}

		if (arguments["User Online"] == undefined){ // If User Online is not defined by default
			if (arguments["Device"] !== "Cordova"){ // If the user's Device is the Cloud or Chrome(OS)
				arguments["User Online"] = window.navigator.onLine; // Set the User Online to their current navigator state
			}
			else{ // If the user's Device is Cordova
				arguments["User Online"] = true; // Default user to being online

				if (navigator.connection.type == Connection.NONE){ // If the connection is NONE
					arguments["User Online"] = false;
				}
			}
		}

		// #region Battery Status Checking

		arguments["Battery OK"] = true; // Default "Battery OK" to true

		if (arguments["Device"] == "Cordova"){ // If the device is Cordova
			// #region Leverage Battery Status To Determine Whether To Process ioQueue

			document.addEventListener("batterystatus", // Create an event handler that keeps track of battery status
				function(batteryStatusInfo : BatteryStatusEvent){
					metis.core.metisFlags["Battery OK"] = true; // Default "Battery OK" to true

					if (batteryStatusInfo.isPlugged == false || batteryStatusInfo.level < 15){ // If the device is NOT plugged in OR the battery level is below 15%
						metis.core.metisFlags["Battery OK"] = false; // Set "Battery OK" to false
					}
				},
				false
			);

			// #endregion
		}

		if (arguments["Device"].toLowerCase().indexOf("chrome") == -1){ // If the device in nature utilizes LocalStorage
			this.deviceIO = metis.devices.web; // Set the device to the metis.devices.web
		}
		else{ // If we are utilizing Chrome, Chrome OS, etc.
			this.deviceIO = metis.devices.chromeos; // Set the device to metis.devices.chromeos
		}

		// #endregion

		this.metisFlags = arguments; // Set the metisFlags to the arguments we've parsed

		if (this.metisFlags["Headless"] == false){ // If Headless mode is not enabled
			metis.queuer.Init(); // Initialize the IO Queue System
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