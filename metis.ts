// This is the Metis Javascript / Typescript Implementation

class Metis { // Class definition "Metis"
	enableLocalStorage: Boolean;
	ioQueue: Object = new Object;
	metisCallbackLocation: string;
	userOnline : Boolean;

	constructor(metisCallbackUrl: string, enableLocalStorageBoolean?: Boolean, userOfflineByDefault ?: Boolean) { // Constructor that requires URL (string) that is the callback URL (http://example.com/Metis/callback)
		this.metisCallbackLocation = metisCallbackUrl;

		if(enableLocalStorageBoolean !== undefined) { // If the developer has defined whether Local Storage should be enabled or not
			this.enableLocalStorage = enableLocalStorageBoolean; // Set the value of enableLocalStorage to the boolean that the dev. set
		}
		else { // If the developer has NOT defined whether to enable or disable the Local Storage
			this.enableLocalStorage = false; // Set the enableLocalStorage to false
		}

		if (userOfflineByDefault == undefined || false){ // If the developer has not defined userOfflineByDefault or has set it to false
			this.userOnline = true;
		}
		else { // If the developer has defined it AND it is set to true
			this.userOnline = false;
		}

	}

	init() { // Initialization function that essentially sets the event listener / handler for "online", since we can't do this within the constructor.
		document.addEventListener("online", this.processIOQueue, false); // Add an event listener that listens to the "online" event, which means the user went from offline to online and we need to process our IO queue, if there is one
		document.addEventListener("offline", this.toggleOfflineStatus, false); // Add an event listener that listens to the "offline" event. When the user goes offline, we'll change this.userOffline to true so fileActionHandler can send data to ioQueue.
	}

	// #region Object Handling

	objectMerge(existingFileContent : Object, newFileContent : Object) { // This function merges objects and object properties into a single returned Object. This is a solution to not being able to use .concat()

		for (var objectProperty in newFileContent) { // For each objectProperty in the newFileContent
			if(newFileContent[objectProperty].constructor == Object) { // If this particular property of the newFileContent object is an object itself
				if (existingFileContent[objectProperty] !== undefined) { // If the existingFileContent property IS set already
					existingFileContent[objectProperty] = this.objectMerge(existingFileContent[objectProperty], newFileContent[objectProperty]); // Do a recursive object merge
				}
				else{ // If the existingFileContent property is NOT set
					existingFileContent[objectProperty] = newFileContent[objectProperty];
				}
			}
			else { // If newFileContent property is not an object
				existingFileContent[objectProperty] = newFileContent[objectProperty]; // Do not do a merge, merely overwrite
			}
		}

		return existingFileContent; // Return the existingFileContent Object, which is now considered to be updated.
	}

	// #endregion

	// #region IO Queue System / Local Storage

	toggleOfflineStatus(){
		this.userOnline = false;
	}

	processIOQueue() { // This function processes the ioQueue upon the user changing from offline to online status
		var nodeList = Object.getOwnPropertyNames(this.ioQueue); // Create an array of all the individual nodes that'll be cycled through
		this.userOnline = true; // Set the userOnline to true, meaning the is obviously online

		nodeRecursion: for (var nodeNum in this.ioQueue) { /* For each node */

			for (var fileName in this.ioQueue[nodeNum]) { /* For each file that needs to be processed */
				var fileAction: string = this.ioQueue[nodeNum][fileName]["action"]; // Get the requested fileAction
				var contentOrDestinationNodes: any[] = this.ioQueue[nodeNum][fileName]["contentOrDestinationNodes"]; // Get either undefined, content for w/a, or an array of nodes for rp
				/* Every time we do a queueItem process, check if we're still online. The logic behind this is that if we are online, we'll do the fileActionHandler and
					it will not re-add the item to the ioQueue since we're still online. If we happen to go offline, it will cancel the for loop and NOT continue to 
					attempt fileIO, which would just end up resulting in the same item being added to the queue and potentially creating an infinite loop.
				*/

				if(this.userOnline == true) {
					this.fileActionHandler(nodeNum, [fileName], fileAction, contentOrDestinationNodes);
					this.ioQueue[nodeNum][fileName] = null; // Delete the file from the nodeList. It will be garbage collected automatically.
				}
				else {
					break nodeRecursion;
				}
			}
		}
	}

	// #endregion

	// #region File Action Handler

	fileActionHandler(nodeNum: string, files: string[], fileAction: string, contentOrDestinationNodes ?: any) {
		var fileContent: Object = new Object; // Declare fileContent as an object
		var necessaryFilesForRemoteIO : string[] = []; // Declare necessaryFilesForRemoteIO as a string array. This array may be used later after LocalStorage IO.

		if (this.enableLocalStorage == true) { // First we are going to check LocalStorage is enabled and allowed by the user, if so we'll try to process file IO locally first
			for (var i = 0;i < files.length;i++) { // Cycle through each array item (file)
				var fileName: string = files[i];
				var localFileName = nodeNum + "#" + fileName; // Declare localFileName as the specialized name of the file specific to LocalStorage
				var localFileContent : Object = new Object; // The content of the local file

				if(fileAction == ("r" || "a")) { // If we are going to be reading files (or appending, therefore needing the file content)
					localFileContent = this.decodeJsonFile(localStorage.getItem(localFileName)); // Attempt to fetch the file from LocalStorage (nodeNum#fileName) and automatically decode it
				}

				if (fileAction == "r") { // If we are going to be solely reading files, not modifying them
					if (localFileContent !== null) { // If the localFileContent is NOT null, meaning we successfully fetched the file
						if (files.length == 1){ // If we are only fetching one file, meaning we don't need to declare the fileName along with the content
							fileContent = localFileContent;
						}
						else{ // If we are fetching more than one file
							fileContent[fileName] = localFileContent;  // Do not use the specialized name of the file, since the developer needs a predictable name (the one they are declaring in the first place), returned.
						}
					}
					else { //If the file does not exist locally
						necessaryFilesForRemoteIO.push(fileName); // Add the fileName to the necessaryFilesForRemoteIO string array for fetching remotely
					}
				}
				else if (fileAction == "w") { // If we are going be either writing to a new file
					localStorage.setItem(localFileName, JSON.stringify(contentOrDestinationNodes)); // Create a new LocalStorage file with the content (which has been converted to JSON)
				}
				else if (fileAction == "a") { // If we are appending (or changing) content to an existing file
					var updatedFileContent = JSON.stringify(this.objectMerge(localFileContent, contentOrDestinationNodes)); // Merge the localFileContent object and the content we are appending
					localStorage.setItem(localFileName, updatedFileContent); // Add the file name with the new local file content
				}
				else if(fileAction == "d") { // If we are going to be deleting files
					localStorage.removeItem(localFileName); // Remove the file from localStorage
				}
				// There is no check for replication, since that is purely a remote function that requires a connection
			}
		}
		else { // If we don't have LocalStorage enabled.
			necessaryFilesForRemoteIO = files;
		}

		if(this.userOnline == true) { // If the user is online, create an XHR and process the request
			if((fileAction == "r" && necessaryFilesForRemoteIO.length > 0) || (fileAction !== "r")) { // If either we are reading AND there are still necessary remote files to fetch OR we are not reading files
				var standardJsonFormData: any = {}; // Define the custom formdata object (type any)

				standardJsonFormData.fileAction = fileAction; // Set the fileAction key / val to the fileAction arg
				standardJsonFormData.nodeNum = nodeNum; // Set the nodeNum key / val to the nodeNum arg

				if(fileAction == "r") { // If we are reading files, we should use our post-LocalStorage IO variable
					standardJsonFormData.files = necessaryFilesForRemoteIO;
				}
				else { // If we are not just reading files, it's a good idea to send ALL the requested file names to the server (so files can be appropriately added, updated, etc.)
					standardJsonFormData.files = files; // Set the files key / val to the files array
				}

				if(contentOrDestinationNodes !== undefined) { // If we either have content or in the case of replication, destination nodes
					standardJsonFormData.contentOrDestinationNodes = contentOrDestinationNodes; // Set the contentOrDestination Nodes key / val to the contentOrDestinationNodes arg
				}

				var metisJSONData: string = JSON.stringify(standardJsonFormData); // Define metisJSONData as a string that is the stringified version of our formdata
				var metisXHRManager: XMLHttpRequest = new XMLHttpRequest; // Create a new XMLHttpRequest
				var metisXHRResponse: string; // Define a variable (siXHRResponse) as a string.

				/* This is a simply XHR ready state handler function for metisXHRManager */
				function returnMetisContext() {
					if(metisXHRManager.readyState == 4) { // If the ready state is 4 (done)
						if(metisXHRManager.status == 200) { // If the callback script exists (returns content no matter)
							metisXHRResponse = metisXHRManager.responseText; // Assign the responseText from the XHR call to the metisXHRResponse
						}
						else { // If the callback script does not exist
							metisXHRResponse = "HTTP ERROR CODE: " + metisXHRManager.status; // Assign an http error code context to the metisXHRResponse 
						}
					}
				}

				metisXHRManager.onreadystatechange = returnMetisContext; // Assign the returnMetisContext function to the readystatechange event of metisXHRManager
				metisXHRManager.open("POST", this.metisCallbackLocation, false); // Open the connection to the callback location, using POST, async as false
				metisXHRManager.send(metisJSONData); // Send the JSON data

				if (fileAction == "r" && metisXHRResponse.indexOf("HTTP ERROR CODE") == -1) { // If the fileAction was read and the XHR call didn't return an HTTP error code
					var remoteFileContent: Object = this.decodeJsonFile(metisXHRResponse); // Decode the JSON, purely for the purposes of merging it with the the locally fetched file content and for saving in localStorage

					for(var i = 0;i < necessaryFilesForRemoteIO.length;i++) {
						var fileName: string = necessaryFilesForRemoteIO[i];

						if(necessaryFilesForRemoteIO.length == 1) { // If we only requested one file, therefore the object we generated won't have a sub-object starting with the file name
							fileContent[fileName] = remoteFileContent;
						}
						else { // If we requested more than one file
							fileContent[fileName] = remoteFileContent[fileName]; // Assign the fileContent[fileName to have the associated file's content
						}

						if(this.enableLocalStorage == true) {
							if(necessaryFilesForRemoteIO.length == 1) { // Once again checking if we only requested one file, if so then we'll just stringify the entire object
								localStorage.setItem(nodeNum + "#" + fileName, JSON.stringify(remoteFileContent));
							}
							else {
								localStorage.setItem(nodeNum + "#" + fileName, JSON.stringify(remoteFileContent[fileName]));
							}
						}
					}
				}
				else if(fileAction !== "r") { // If we were not reading however the request was deemed successful
					fileContent = remoteFileContent; // Set the fileContent to the remoteFileContent. We do this so the developer can determine if there was an error code or success code returned by the XHR call.
				}
			}
		}
		else { // If the user is NOT online
			if(fileAction !== "r") { // If we were not reading files, we'll overwrite the necessaryFilesForRemoteIO with the entire files array
				necessaryFilesForRemoteIO = files;
			}

			if(necessaryFilesForRemoteIO.length > 0) { // If it turns out that we either a) need to fetch / read files remotely or b) write, update, etc. to the remote Metis cluster
				for(var i = 0;i < necessaryFilesForRemoteIO.length;i++) {
					var fileName: string = necessaryFilesForRemoteIO[i];

					if (this.ioQueue.hasOwnProperty(nodeNum) == false){ // If the nodeNum is not set in the ioQueue, we need to create it as a new object
						this.ioQueue[nodeNum] = new Object;
					}

					if (this.ioQueue[nodeNum].hasOwnProperty(fileName) == false){ // If the fileName is not set within the nodeNum object, we need to create it as a new object.
						this.ioQueue[nodeNum][fileName] = new Object;
					}

					this.ioQueue[nodeNum][fileName]["action"] = fileAction; // Set the file's action for the specific node to the fileAction variable. This will overwrite any prior action.

					if (fileAction !== ("r" && "d")) { // If we are not reading or deleting files, set the contentOrDestinationNodes variable
						this.ioQueue[nodeNum][fileName]["contentOrDestinationNodes"] = contentOrDestinationNodes;
					}
				}
			}
		}

		return JSON.stringify(fileContent);
	}

	// #endregion

	/* This function is similar to the PHP decodeJsonFile in that it parses JSON string */
	decodeJsonFile(jsonString: string) {
		return JSON.parse(jsonString);
	}

	/* This function is for reading one or a multitude of files from a Metis node */
	readJsonFile(nodeNum: string, files: string[]) {
		return this.fileActionHandler(nodeNum, files, "r");
	}

	/* This function is for creating one or a multitude of files from a Metis node */
	createJsonFile(nodeNum: string, files: string[], jsonEncodedContent: Object) {
		return this.fileActionHandler(nodeNum, files, "w", jsonEncodedContent);
	}

	/* This function is for updating one or a multitude of files from a Metis node */
	updateJsonFile(nodeNum: string, files: string[], jsonEncodedContent: Object, appendContent ?: Boolean) {
		if(appendContent == (undefined || false)) {
			return this.fileActionHandler(nodeNum, files, "w", jsonEncodedContent);
		}
		else {
			return this.fileActionHandler(nodeNum, files, "a", jsonEncodedContent);
		}
	}

	/* This function is for deleting one or a multitude of files from a Metis node */
	deleteJsonFile(nodeNum: string, files: string[]) {
		return this.fileActionHandler(nodeNum, files, "d");
	}

	/* This function is for replication / duplicating one or a multitude of files from an origin node to one or multiple destination nodes */
	replicator(nodeNum: string, nodeDestinations: string[], files: string[]) {
		return this.fileActionHandler(nodeNum, files, "rp", nodeDestinations);
	}
}
