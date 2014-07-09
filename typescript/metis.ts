/*

 The following Typescript code is the Core / Internal functionality of Metis

 */

/// <reference path="devices/cloud.ts" />
/// <reference path="devices/cordova.ts" />
/// <reference path="core.ts" />
/// <reference path="file.ts" />
/// <reference path="queuer.ts" />

module metis{
	export function Init(arguments : Object){
		metis.core.Init(arguments);
	}
}