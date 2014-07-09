/*

 The following Typescript code is the Metis implementation of "cloud" / browser-based File IO (ex. LocalStorage)

*/

module metis.devices.cloud{

	/* This function is for reading files from LocalStorage */
	export function Read(fileName : string){
		return localStorage.getItem(fileName); // Return the localStorage content or NULL
	}

	/* This function is for writing files to LocalStorage */
	export function Write(fileName : string, jsonObject : Object, update : boolean){
		if (update == true){ // If we are updating file content rather than writing to a new one (or overwriting an existing one)
			var existingFileContent = this.Read(fileName); // Read from LocalStorage
			var fileContentObject : Object = {};

			if (existingFileContent !== null){ // If the fileContent is NOT null (successful IO)
				existingFileContent = JSON.parse(existingFileContent); // Parse into a JSON object
			}
			else{ // If the existingFileContent IS null (no successful IO)
				existingFileContent = {}; // Create an empty Object
			}

			jsonObject = metis.core.Merge(existingFileContent, fileContentObject); // Merge the two file objects together
		}

		localStorage.setItem(fileName, JSON.stringify(jsonObject)); // Save the JSON stringified object
	}

	/* This function is for deleting files from LocalStorage */
	export function Delete(fileName: string){
		localStorage.removeItem(fileName); // Call the LocalStorage removeItem function
	}

	/* This function is for checking if a file exists in LocalStorage */
	export function Exists(fileName : string){
		var returnableVar : any;
		if (this.Read(fileName) !== null){ // If we successfully read the file
			returnableVar = "local"; // Return "local"
		}
		else{ // If we have NOT successfully read the file
			returnableVar = false; // Return false
		}

		return returnableVar;
	}
}