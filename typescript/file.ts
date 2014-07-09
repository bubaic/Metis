/*

	The following Typescript code is the File IO functionality of Metis

*/

/// <reference path="devices/cloud.ts" />
/// <reference path="core.ts" />
/// <reference path="queuer.ts" />

module metis.file {

	export function Handler(nodeDataDefined : any, files : any, fileAction : string, contentOrDestinationNodes ?: any){
		var fileContent: Object = {}; // Declare fileContent as an object
		var necessaryFilesForRemoteIO : string[] = []; // Declare necessaryFilesForRemoteIO as a string array.

		// #region Files Variable Checking

		if (typeof files == "string"){ // If the filesToQueue is a string
			files = [files]; // Convert filesToQueue to an array
		}

		// #endregion

		// #region Device-Based File Checking

		for (var fileIndex  in files){
			var fileName = files[fileIndex]; // Define fileName equal to the value of the index fileIndex in the files array
			var localFileContent : any; // The content (and potential object) of the local file

			if (fileAction == "r"){ // If we are reading files
				localFileContent = metis.core.deviceIO.Read(fileName); // Read from metis.devices.cloud

				if (localFileContent !== null){ // If the localFileContent is NOT null, meaning we successfully fetched the file
					localFileContent = this.Decode(localFileContent); // Convert to a JSON object
				}
				else{ // If the file does not exist locally
					necessaryFilesForRemoteIO.push(fileName); // Add the fileName to the necessaryFilesForRemoteIO string array for fetching remotely
				}
			}
			else if (fileAction !== "e"){ // If we are not checking if the file exists (meaning we can safely add the status JSON rather than the fileExists status)
				if (fileAction == "w") { // If we are going be either writing to a new file
					metis.core.deviceIO.Write(fileName, contentOrDestinationNodes, false); // Create a new file on the device
				}
				else if (fileAction == "a") { // If we are appending (or changing) content to an existing file
					metis.core.deviceIO.Write(fileName, contentOrDestinationNodes, true); // Update existing file on the device
				}
				else if (fileAction == "d") { // If we are going to be deleting files
					metis.core.deviceIO.Delete(fileName); // Remove the file from the device
				}

				localFileContent = this.Decode('{"status" : "0.00"}'); // Add fileName to the localFileContent, with status of the action as successful
			}
			else{ // If we are checking if the file exists
				if (metis.core.deviceIO.Exists(fileName) !== null){ // If the key does exist on the device
					localFileContent = "local";
				}
				else{ // If the key does not exist on the device, check if headless mode is enable and do variable assigning / array pushing accordingly
					if (metis.core.metisFlags["Headless"] == true){ // If headless Metis is enabled
						localFileContent = false; // Set it to false, since we are only checking locally (no remote connection due to Headless mode)
					}
					else if ((metis.core.metisFlags["Headless"] !== true) && (nodeDataDefined !== "internal")){ // If enableHeadlessMetis is NOT enabled and we are checking if the ioQueue file exists internally
						necessaryFilesForRemoteIO.push(fileName); // Add the fileName to the necessaryFilesForRemoteIO, since we are able to do XHR calls
					}
				}
			}

			if (files.length == 1) { // If we are only fetching one file, meaning we don't need to declare the fileName along with the content
				fileContent = localFileContent;
			}
			else { // If we are fetching more than one file
				fileContent[fileName] = localFileContent;  // Do not use the specialized name of the file, since the developer needs a predictable name (the one they are declaring in the first place), returned.
			}
		}

		// #endregion

		if (nodeDataDefined !== "internal"){ // If we are not doing an internal Metis call
			if (metis.core.metisFlags["Headless"] == false){ // If Headless Mode is disabled, then we are allowed to make XHR calls
				if((metis.core.metisFlags["User Online"] == true) && (metis.core.metisFlags["Battery OK"] == true)) { // If the user is online and Battery OK is true (battery level is not applicable or is above a particular percentage)
					if((fileAction == "r" && necessaryFilesForRemoteIO.length > 0) || (fileAction !== "r")) { // If either we are reading AND there are still necessary remote files to fetch OR we are not reading files
						var remoteIOData : any = {}; // Define the custom formdata object (type any)

						remoteIOData.nodeData = nodeDataDefined; // Set the nodeData key / val to the nodeData arg

						if(fileAction == ("r" || "e")) { // If we are reading files or checking if they exist on the server
							remoteIOData.files = necessaryFilesForRemoteIO;
						}
						else { // If we are not just reading files, it's a good idea to send ALL the requested file names to the server (so files can be appropriately added, updated, deleted, etc.)
							remoteIOData.files = files; // Set the files key / val to the files array
						}

						remoteIOData.fileAction = fileAction;// Set the fileAction key / val to the fileAction arg

						if (contentOrDestinationNodes !== (undefined || null)) { // If we either have content or in the case of replication, destination nodes
							remoteIOData.contentOrDestinationNodes = contentOrDestinationNodes; // Set the contentOrDestination Nodes key / val to the contentOrDestinationNodes arg
						}

						var xhrManager : XMLHttpRequest = new XMLHttpRequest; // Create a new XMLHttpRequest
						var metisXHRResponse = ""; // Declare metisXHRResponse to hold the response of XHR call

						function xhrResponseHandler() { // Create a function that is used as the handler for when the xhrManager returns some form of context
							if (xhrManager.readyState == 4) { // If the XHR is considered "done"
								if (xhrManager.status == 200) { // If the xhrManagerUrl was an HTTP 200
									metisXHRResponse = xhrManager.responseText; // Assign the responseText to the xhrResponse variable
								}
								else{
									metisXHRResponse = '{"error" : "HTTP ERROR CODE|' + xhrManager.status + '"}';
								}
							}
						}

						xhrManager.onreadystatechange = xhrResponseHandler;
						xhrManager.open("POST", metis.core.metisFlags["Callback"], false); // xhrManager will open a synchronous connection using the method defined in xhrManagerMethodType to the url defined in xhrManagerUrl
						xhrManager.send(JSON.stringify(remoteIOData)); // Send the data

						var remoteFileContent : Object = this.Decode(metisXHRResponse); // Decode the JSON, purely for the purposes of merging it with the the locally fetched file content and for saving on the device

						if (necessaryFilesForRemoteIO.length == 1) { // If we only requested one file, therefore the object we generated won't have a sub-object starting with the file name
							fileContent = remoteFileContent;
						}
						else { // If we requested more than one file
							fileContent = metis.core.Merge(fileContent, remoteFileContent); // Merge the two objects (one being the existing objects with fileName as key, the other being the same but from the server)
						}

						if (fileAction == "r"){ // If we were reading files
							for (var fileIndex in necessaryFilesForRemoteIO){ // Recursively cycle through each file we read from the server
								var fileName : any = necessaryFilesForRemoteIO[fileIndex]; // Define fileName equal to the value of the index fileIndex in the necessaryFilesForRemoteIO array

								if (necessaryFilesForRemoteIO.length == 1) { // Check if we only requested one file, if so then we'll just stringify the entire object
									metis.core.deviceIO.Write(fileName, JSON.stringify(remoteFileContent)); // Save the file data to the appropriate device
								}
								else{ // If we did not request only one file
									metis.core.deviceIO.Write(fileName, JSON.stringify(remoteFileContent[fileName])); // Save the file data to the appropriate device, where the file data is the particular object specified by key / Object val
								}
							}
						}
					}
				}
				else { // If the user is NOT online or their battery life is NOT sufficient
					if(fileAction !== "r") { // If we were not reading files, we'll overwrite the necessaryFilesForRemoteIO with the entire files array
						necessaryFilesForRemoteIO = files;
					}

					if(necessaryFilesForRemoteIO.length > 0) { // If it turns out that we either a) need to fetch / read files remotely or b) write, update, etc. to the remote Metis cluster
						metis.queuer.AddItem(nodeDataDefined, necessaryFilesForRemoteIO, fileAction, contentOrDestinationNodes); // Add items to the IO Queue
					}
				}
			}
		}

		return JSON.stringify(fileContent);
	}

	/* This function is similar to the PHP decodeJsonFile in that it parses JSON string */
	export function Decode(jsonString: string) {
		return JSON.parse(jsonString);
	}

	/* This function is for reading one or a multitude of files from a Metis node */
	export function Read(nodeData: string, files: any) {
		return this.Handler(nodeData, files, "r");
	}

	/* This function is for creating one or a multitude of files from a Metis node */
	export function Create(nodeData: string, files : any, jsonEncodedContent: Object) {
		return this.Handler(nodeData, files, "w", jsonEncodedContent);
	}

	/* This function is for updating one or a multitude of files from a Metis node */
	export function Update(nodeData: string, files : any, jsonEncodedContent: Object, appendContent ?: Boolean) {
		if(appendContent == (undefined || false)) {
			return this.Handler(nodeData, files, "w", jsonEncodedContent);
		}
		else {
			return this.Handler(nodeData, files, "a", jsonEncodedContent);
		}
	}

	/* This function is for deleting one or a multitude of files from a Metis node */
	export function Delete(nodeData: string, files : any) {
		return this.Handler(nodeData, files, "d");
	}

	/* This function is for checking if one or a multitude of files from a Metis Node Group or Nodes exists */

	export function Exists(nodeData : any, files : any){
		return this.Handler(nodeData, files, "e");
	}

	/* This function is for replication / duplicating one or a multitude of files from an origin node to one or multiple destination nodes */
	export function Replicator(nodeData: string, nodeDestinations: string[], files : any) {
		return this.Handler(nodeData, files, "rp", nodeDestinations);
	}
}