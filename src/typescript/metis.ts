/*

 The following Typescript code is the aggregate module of Metis

 */

/// <reference path="definitions/chrome.d.ts" />
/// <reference path="definitions/cordova.d.ts" />

/// <reference path="devices/chromeos.ts" />
/// <reference path="devices/cloud.ts" />
/// <reference path="devices/web.ts" />

/// <reference path="core.ts" />
/// <reference path="file.ts" />
/// <reference path="queuer.ts" />

module metis{

	// #region Metis Initialization

	export function Init(arguments : Object){
		return metis.core.Init(arguments);
	}

	// #endregion
}