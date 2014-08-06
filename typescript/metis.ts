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
	export function Init(arguments : Object){
		return metis.core.Init(arguments);
	}

	// #region Backwards Compatible Function Calls

	export function readJsonFile(nodeDataDefined : any, files : any){
		var ioArgs = {
			"nodeData" : nodeDataDefined,
			"files" : files
		};

		return metis.file.Read(ioArgs);
	}

	export function createJsonFile(nodeDataDefined : any, files : any, content: Object){
		var ioArgs = {
			"nodeData" : nodeDataDefined,
			"files" : files,
			"contentOrDestinationNodes" : content
		};

		return metis.file.Create(ioArgs);
	}

	export function updateJsonFile(nodeDataDefined : any, files : any, content : Object, append : boolean){
		var ioArgs = {
			"nodeData" : nodeDataDefined,
			"files" : files,
			"contentOrDestinationNodes" : content,
			"append" : append
		};

		return metis.file.Update(ioArgs);
	}

	export function decodeJsonFile(content : string){
		return metis.file.Decode(content);
	}

	export function fileExists(nodeDataDefined : any, files : any){
		var ioArgs = {
			"nodeData" : nodeDataDefined,
			"files" : files
		};

		return metis.file.Exists(ioArgs);
	}

	export function replicator(nodeDataDefined : any, nodeDataDestinations : any, files : any){
		var ioArgs = {
			"nodeData" : nodeDataDefined,
			"files" : files,
			"contentOrDestinationNodes" : nodeDataDestinations
		};

		return metis.file.Replicator(ioArgs);
	}

	// #endregion
}
