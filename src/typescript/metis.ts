/*

 The following Typescript code is the aggregate module of Metis

 */

/// <reference path="definitions/chrome.d.ts" />
/// <reference path="definitions/cordova.d.ts" />

/// <reference path="devices/chromeos.ts" />
/// <reference path="devices/cloud.ts" />
/// <reference path="devices/web.ts" />

/// <reference path="file.ts" />
/// <reference path="queuer.ts" />

module metis{
	export var Callback : string
	export var Device : string;
	export var DeviceIO : any;
	export var Headless : boolean;
	export var Online : boolean;

	export function Init(initArgs : Object){
		// #region Arguments Parser / Default(er)

		metis.Device = "Web"; // Default to "Web" as the Metis' Device

		if (typeof initArgs["Device"] == "string"){ // If Device is defined
			metis.Device = initArgs["Device"]; // Redefine metis.Device as the one specified in initArgs
		}

		if (initArgs["Device"] !== "Cordova"){ // If the user's Device is the Cloud or Chrome(OS)
			metis.Online = window.navigator.onLine; // Set the User Online to their current navigator state
		}
		else{ // If the user's Device is Cordova
			metis.Online = true; // Default user to being online

			if (navigator.connection.type == Connection.NONE){ // If the connection is NONE
				metis.Online = false;
			}
		}

		if (initArgs["Device"].toLowerCase().indexOf("chrome") == -1){ // If the device in nature utilizes LocalStorage
			metis.DeviceIO = metis.devices.web; // Set the device to the metis.devices.web
		}
		else{ // If we are utilizing Chrome, Chrome OS, etc.
			metis.DeviceIO = metis.devices.chromeos; // Set the device to metis.devices.chromeos
		}

		// #endregion

		metis.Headless = true; // Default to Metis being Headless

		if (typeof initArgs["Callback"] == "string"){ // If a Callback is defined as a string
			metis.Headless = false; // Set Headless to false
			metis.queuer.Init(); // Initialize the IO Queue System
		}
	}

	// #endregion
}