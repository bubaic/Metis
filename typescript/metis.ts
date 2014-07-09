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
		return metis.core.Init(arguments);
	}

	// #region Backwards Compatible Function Calls

	export function readJsonFile(nodeDataDefined : any, files : any){
		return metis.file.Read(nodeDataDefined, files);
	}

	export function createJsonFile(nodeDataDefined : any, files : any, content: Object){
		return metis.file.Create(nodeDataDefined, files, content);
	}

	export function updateJsonFile(nodeDataDefined : any, files : any, append : boolean){
		return metis.file.Update(nodeDataDefined, files, append);
	}

	export function decodeJsonFile(content : string){
		return metis.file.Decode(content);
	}

	export function fileExists(nodeDataDefined : any, files : any){
		return metis.file.Exists(nodeDataDefined, files);
	}

	export function replicator(nodeDataDefined : any, nodeDataDestinations : any, files : any){
		return metis.file.Replicator(nodeDataDefined, nodeDataDestinations, files);
	}

	// #endregion
}