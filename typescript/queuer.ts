/*

 The following Typescript code is the IO Queue System of Metis

 */

/// <reference path="definitions/cordova.d.ts" />
/// <reference path="core.ts" />

module metis.queuer{
	import _core = metis.core; // Import the 

	export function ToggleStatus() {
		_core.metisFlags["User Online"] = false;
	}

	export function Process(){

	}

	export function AddItem(){

	}
}