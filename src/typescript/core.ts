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

	export function Init(initArgs : Object){
		metis.core.metisFlags = {};

		// #region Arguments Parser / Default(er)

		if (((typeof initArgs["Headless"] == "boolean")  && (initArgs["Headless"] !== true)) || (typeof initArgs["Headless"] !== "boolean")) { // If Headless mode is NOT set to true
			if (typeof initArgs["Callback"] == "undefined"){ // If a Callback is undefined
				initArgs["Headless"] = true; // Set to true
			} else { // If a callback is defined
				initArgs["Headless"] = false; // Set to false
			}
		}

		if (typeof initArgs["Device"] == "undefined"){ // If Device is NOT defined
			initArgs["Device"] = "Cloud"; // Set the Device to Cloud (so we'll use LocalStorage)
		}

		if (typeof initArgs["User Online"] == "undefined"){ // If User Online is not defined by default
			if (initArgs["Device"] !== "Cordova"){ // If the user's Device is the Cloud or Chrome(OS)
				initArgs["User Online"] = window.navigator.onLine; // Set the User Online to their current navigator state
			}
			else{ // If the user's Device is Cordova
				initArgs["User Online"] = true; // Default user to being online

				if (navigator.connection.type == Connection.NONE){ // If the connection is NONE
					initArgs["User Online"] = false;
				}
			}
		}

		// #region Battery Status Checking

		initArgs["Battery OK"] = true; // Default "Battery OK" to true

		if (initArgs["Device"] == "Cordova"){ // If the device is Cordova
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

		if (initArgs["Device"] == "Cloud"){ // If the device in nature utilizes LocalStorage
			metis.core.deviceIO = metis.devices.web; // Set the device to the metis.devices.web
		}
		else{ // If we are utilizing Chrome, Chrome OS, etc.
			metis.core.deviceIO = metis.devices.chromeos; // Set the device to metis.devices.chromeos
		}

		// #endregion

		metis.core.metisFlags = initArgs; // Set the metisFlags to the arguments we've parsed

		if (metis.core.metisFlags["Headless"] == false){ // If Headless mode is not enabled
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