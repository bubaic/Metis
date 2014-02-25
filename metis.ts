// This is the Metis Javascript / Typescript Implementation

class Metis { // Class definition "Metis"
	enableHeadlessMetis: Boolean;
	enableLocalStorage: Boolean;
	ioQueue: Object = new Object;
	metisCallbackLocation: string;
	userOnline: Boolean;

	constructor(enableHeadlessMetisOption: Boolean, metisCallbackUrl ?: string, enableLocalStorageBoolean?: Boolean, userOfflineByDefault?: Boolean) { // Constructor that requires defining the headless server mode and IF set to false, the callback URL

		if (enableHeadlessMetisOption == true) { // If the developer has defined enableHeadlessMetisOption as true
			this.enableHeadlessMetis = true;
			this.enableLocalStorage = true; // Force enableLocalStorage to true, as that is required to be headless
			this.userOnline = false; // Set the user to offline
		}
		else { // If the developer has NOT defined whether HeadlessMetis should be enabled OR the developer has set it to false
			this.enableHeadlessMetis = false;

			if (metisCallbackUrl !== undefined) { // If metisCallbackUrl is defined
				this.metisCallbackLocation = metisCallbackUrl;

				if (enableLocalStorageBoolean !== undefined) { // If the developer has defined whether Local Storage should be enabled or not
					this.enableLocalStorage = enableLocalStorageBoolean; // Set the value of enableLocalStorage to the boolean that the dev. set
				}
				else { // If the developer has NOT defined whether to enable or disable the Local Storage
					this.enableLocalStorage = false; // Set the enableLocalStorage to false
				}
			}
			else { // If the callback URL is not defined
				console.log("You have defined enableHeadlessMetisOption as FALSE but have NOT provided a callback URL. Expect errors.");
			}
		}

		if (userOfflineByDefault == (undefined || false)) { // If the developer has not defined userOfflineByDefault or has set it to false
			this.userOnline = true;
		}
		else { // If the developer has defined it AND it is set to true
			this.userOnline = false;
		}
	}

	// #region Metis Initialization

	init() { // Initialization function that essentially sets the event listener / handler for "online", since we can't do this within the constructor.
		if (this.enableHeadlessMetis == false) { // If enableHeadlessMetis is set to false, then add the event listeners, since they essentially enable server communication
			document.addEventListener("online", this.processIOQueue, false); // Add an event listener that listens to the "online" event, which means the user went from offline to online and we need to process our IO queue, if there is one
			document.addEventListener("offline", this.toggleOfflineStatus, false); // Add an event listener that listens to the "offline" event. When the user goes offline, we'll change this.userOffline to true so fileActionHandler can send data to ioQueue.
		}
	}

	// #endregion

	// #region Object Handling

	objectMerge(primaryObject: Object, secondaryObject: Object) { // This function merges objects and object properties into a single returned Object. This is a solution to not being able to use .concat()
		for (var objectProperty in secondaryObject) { // For each objectProperty in the newFileContent
			if (typeof secondaryObject[objectProperty] == "object") { // If this particular property of the newFileContent object is an object itself
				if (primaryObject[objectProperty] !== undefined) { // If the existingFileContent property IS set already
					primaryObject[objectProperty] = this.objectMerge(primaryObject[objectProperty], secondaryObject[objectProperty]); // Do a recursive object merge
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

	// #region IO Queue System / Local Storage

	toggleOfflineStatus() {
		this.userOnline = false;
	}

	addToIOQueue(nodeData : any, filesToQueue : string[], fileAction : string, contentOrDestinationNodes ?: any){ // This function adds items to the ioQueue
		var nodeDataDefined : string = "";

		if (typeof nodeData == "string"){ // If the nodeData is already a string format
			nodeDataDefined = nodeData; // Define the nodeDataDefined as nodeData
		}
		else if (typeof nodeData == "object"){ // If the nodeData that is defined is an object rather than a string, convert to string format
			for (var potentialNodeGroup in nodeData){ // For every property in nodeData
				var thisDataSyntax : string = potentialNodeGroup; // Define thisDataSyntax as the string syntax for this individual Node Group / Nodes.

				if (nodeData[potentialNodeGroup] !== null){ // If the potentialNodeGroup content is not null, meaning it is a Node Group with Nodes
					thisDataSyntax = thisDataSyntax + "#"; // Since there are Nodes within this Node Group, add the # to denote Nodes.
					var nodesInGroup : string[] = nodeData[potentialNodeGroup]; // Declare nodesInGroup as an array consisting of the array val of nodeData[potentialNodeGroup]

					nodesInGroup.forEach(
						function(nodeNum : string, nodeIndex : number, nodesInGroup){
							thisDataSyntax = thisDataSyntax + nodeNum; // Declare thisDataSyntax = thisDataSyntax + nodeNum (example: "Example#1")

							if (nodesInGroup.length !== (nodeIndex + 1)){ // If we are not at the last Node
								thisDataSyntax = thisDataSyntax + ","; // Add the comma separator
							}
							else{ // If we are at the last Node
								thisDataSyntax = thisDataSyntax + "|"; // Add the pipe separator
							}
						}
					);

					nodeDataDefined = nodeDataDefined + thisDataSyntax; // Append thisDataSyntax to the nodeDataDefined string
				}
				else{ // If potentialNodeGroup is either a Node Group without any defined Nodes or potentialNodeGroup is a Node
					nodeDataDefined = nodeDataDefined + potentialNodeGroup + "|"; // Append potentialNodeGroup| to nodeDataDefined
				}
			}

			nodeDataDefined = nodeDataDefined.slice(0, -1); // Remove the last | from the nodeDataDefined
		}
		else if (typeof nodeData == "number"){ // If the nodeData is a number
			nodeDataDefined = nodeData.toString(); // Convert to string
		}

		for (var fileIndex in filesToQueue){
			var fileName = filesToQueue[fileIndex]; // Define fileName equal to the value of the index fileIndex in the filesToQueue array
			if (this.ioQueue.hasOwnProperty(fileName) == false){ // If the fileName is not defined in the ioQueue
				this.ioQueue[fileName] = new Object; // Create the new fileName object in the ioQueue
			}

			if ((this.ioQueue[fileName]["action"] == "w") && (fileAction == "d")){ // If this file is queued for writing then is to be deleted before ioQueue is processed
				this.ioQueue[fileName] = null; // Set the fileName to null to be garbage collected. No reason to send a delete action for a file that was never written remotely
			}
			else{ // If this file is queued but actions are logical.
				this.ioQueue[fileName]["nodeData"] = nodeDataDefined; // Set the nodeData as the stringified nodeData content
				this.ioQueue[fileName]["action"] = fileAction; // Set the action equal to the fileAction

				if (fileAction == ("w" || "a")) { // If we are writing or appending content, set the contentOrDestinationNodes variable
					this.ioQueue[fileName]["contentOrDestinationNodes"] = contentOrDestinationNodes; // Set the contentOrDestinationNodes
				}
				else{ // If we are not writing or appending content
					if (this.ioQueue[fileName].hasOwnProperty("contentOrDestinationNodes")){ // If the fileName has a contentOrDestinationNodes property
						this.ioQueue[fileName]["contentOrDestinationNodes"] = null; // Set it to null so it can be garbage collected by the browser and so we won't unnecessarily send content when processing IO
					}
				}
			}
		}

	}

	processIOQueue() { // This function processes the ioQueue upon the user changing from offline to online status
		this.userOnline = true; // Set the userOnline to true, meaning the is obviously online

		for (var fileName in this.ioQueue) { // For each file
			var nodeData : string = this.ioQueue[fileName]["nodeData"]; // Get the stringified nodeData
			var fileAction : string = this.ioQueue[fileName]["action"]; // Get the requested fileAction
			var contentOrDestinationNodes : any[] = this.ioQueue[fileName]["contentOrDestinationNodes"]; // Get either undefined, content for w/a, or an array of nodes for rp

			/* Every time we do a queueItem process, check if we're still online. The logic behind this is that if we are online, we'll do the fileActionHandler and
				it will not re-add the item to the ioQueue since we're still online. If we happen to go offline, it will cancel the for loop and NOT continue to
				attempt fileIO, which would just end up resulting in the same item being added to the queue and potentially creating an infinite loop.
			*/

			if (this.userOnline == true) {
				this.fileActionHandler(nodeData, fileName, fileAction, contentOrDestinationNodes);
				this.ioQueue[fileName] = null; // Delete the file from the nodeList. It will be garbage collected by the browser.
			}
			else{
				break;
			}
		}
	}

	// #endregion

	// #region File Action Handler

	fileActionHandler(nodeDataDefined : any, files : any, fileAction : string, contentOrDestinationNodes ?: any) {
		var fileContent: Object = new Object; // Declare fileContent as an object
		var necessaryFilesForRemoteIO : string[] = []; // Declare necessaryFilesForRemoteIO as a string array. This array may be used later after LocalStorage IO.

		// #region Files Checking

		if (typeof files == "string"){ // If files is a string (one file)
			files = new Array(files); // Convert to an array with a single item
		}

		// #endregion

		if (this.enableLocalStorage == true) { // First we are going to check LocalStorage is enabled and allowed by the user, if so we'll try to process file IO locally first
			for (var fileIndex  in files){
				var fileName = files[fileIndex]; // Define fileName equal to the value of the index fileIndex in the files array
				var localFileContent : any; // The content (and potential object) of the local file

				if (fileAction == ("r" || "a")) { // If we are going to be reading files (or appending, therefore needing the file content)
					localFileContent = localStorage.getItem(fileName); // Attempt to fetch the file from LocalStorage
				}

				if (fileAction == "r") { // If we are going to be solely reading files, not modifying them
					if (localFileContent !== null) { // If the localFileContent is NOT null, meaning we successfully fetched the file
						localFileContent = this.decodeJsonFile(localFileContent);

						if (files.length == 1) { // If we are only fetching one file, meaning we don't need to declare the fileName along with the content
							fileContent = localFileContent;
						}
						else { // If we are fetching more than one file
							fileContent[fileName] = localFileContent;  // Do not use the specialized name of the file, since the developer needs a predictable name (the one they are declaring in the first place), returned.
						}
					}
					else { //If the file does not exist locally
						necessaryFilesForRemoteIO.push(fileName); // Add the fileName to the necessaryFilesForRemoteIO string array for fetching remotely
					}
				}
				else { // If the fileAction is not read
					if (fileAction !== "e"){ // If we are not checking if the file exists (meaning we can safely add the status JSON rather than the fileExists status)
						if (fileAction == "w") { // If we are going be either writing to a new file
							localStorage.setItem(fileName, JSON.stringify(contentOrDestinationNodes)); // Create a new LocalStorage file with the content (which has been converted to JSON)
						}
						else if (fileAction == "a") { // If we are appending (or changing) content to an existing file
							var updatedFileContent = JSON.stringify(this.objectMerge(localFileContent, contentOrDestinationNodes)); // Merge the localFileContent object and the content we are appending
							localStorage.setItem(fileName, updatedFileContent); // Add the file name with the new local file content
						}
						else if (fileAction == "d") { // If we are going to be deleting files
							localStorage.removeItem(fileName); // Remove the file from localStorage
						}

						fileContent[fileName] = this.decodeJsonFile('{"status" : "0.00"}'); // Add fileName to the fileContent, with status of the action as successful
					}
					else{ // If we are checking if the file exists
						if (localStorage.getItem(fileName) !== null){ // If the key does exist in localStorage
							fileContent[fileName] = "local";
						}
						else{ // If the key does not exist in localStorage, push to necessaryFilesForRemoteIO so we can check online
							necessaryFilesForRemoteIO.push(fileName);
						}
					}
				}

				// There is no check for replication, since that is purely a remote function that requires a connection
			}
		}
		else { // If we don't have LocalStorage enabled.
			necessaryFilesForRemoteIO = files;
		}

		if (this.enableHeadlessMetis == false){ // If enableHeadlessMetis is set to false, then we are allowed to make XHR calls
			if(this.userOnline == true) { // If the user is online, create an XHR and process the request
				if((fileAction == "r" && necessaryFilesForRemoteIO.length > 0) || (fileAction !== "r")) { // If either we are reading AND there are still necessary remote files to fetch OR we are not reading files
					var remoteIOData : any = {}; // Define the custom formdata object (type any)

					remoteIOData.nodeData = nodeDataDefined; // Set the nodeData key / val to the nodeData arg

					if(fileAction == ("r" || "e")) { // If we are reading files, we should use our post-LocalStorage IO variable
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
					xhrManager.open("POST", this.metisCallbackLocation, false); // xhrManager will open a synchronous connection using the method defined in xhrManagerMethodType to the url defined in xhrManagerUrl
					xhrManager.send(JSON.stringify(remoteIOData)); // Send the data

					var remoteFileContent : Object = this.decodeJsonFile(metisXHRResponse); // Decode the JSON, purely for the purposes of merging it with the the locally fetched file content and for saving in localStorage

					for (var fileIndex in necessaryFilesForRemoteIO){
						var fileName : any = necessaryFilesForRemoteIO[fileIndex]; // Define fileName equal to the value of the index fileIndex in the necessaryFilesForRemoteIO array

						if (necessaryFilesForRemoteIO.length == 1) { // If we only requested one file, therefore the object we generated won't have a sub-object starting with the file name
							fileContent = remoteFileContent;
						}
						else { // If we requested more than one file
							fileContent[fileName] = remoteFileContent[fileName]; // Assign the fileContent[fileName to have the associated file's content
						}

						if ((fileAction == "r") && (this.enableLocalStorage == true)){ // If we are reading files and Local Storage is enabled
							if (necessaryFilesForRemoteIO.length == 1) { // Once again checking if we only requested one file, if so then we'll just stringify the entire object
								localStorage.setItem(fileName, JSON.stringify(remoteFileContent));
							}
							else {
								localStorage.setItem(fileName, JSON.stringify(remoteFileContent[fileName]));
							}
						}
					}
				}
			}
			else { // If the user is NOT online
				if(fileAction !== "r") { // If we were not reading files, we'll overwrite the necessaryFilesForRemoteIO with the entire files array
					necessaryFilesForRemoteIO = files;
				}

				if(necessaryFilesForRemoteIO.length > 0) { // If it turns out that we either a) need to fetch / read files remotely or b) write, update, etc. to the remote Metis cluster
					this.addToIOQueue(nodeDataDefined, necessaryFilesForRemoteIO, fileAction, contentOrDestinationNodes); // Add items to the IO Queue
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
	readJsonFile(nodeData: string, files: string[]) {
		return this.fileActionHandler(nodeData, files, "r");
	}

	/* This function is for creating one or a multitude of files from a Metis node */
	createJsonFile(nodeData: string, files: string[], jsonEncodedContent: Object) {
		return this.fileActionHandler(nodeData, files, "w", jsonEncodedContent);
	}

	/* This function is for updating one or a multitude of files from a Metis node */
	updateJsonFile(nodeData: string, files: string[], jsonEncodedContent: Object, appendContent ?: Boolean) {
		if(appendContent == (undefined || false)) {
			return this.fileActionHandler(nodeData, files, "w", jsonEncodedContent);
		}
		else {
			return this.fileActionHandler(nodeData, files, "a", jsonEncodedContent);
		}
	}

	/* This function is for deleting one or a multitude of files from a Metis node */
	deleteJsonFile(nodeData: string, files: string[]) {
		return this.fileActionHandler(nodeData, files, "d");
	}

	/* This function is for checking if one or a multitude of files from a Metis Node Group or Nodes exists */

	fileExists(nodeData : any, files: string[]){
		return this.fileActionHandler(nodeData, files, "e");
	}

	/* This function is for replication / duplicating one or a multitude of files from an origin node to one or multiple destination nodes */
	replicator(nodeData: string, nodeDestinations: string[], files: string[]) {
		return this.fileActionHandler(nodeData, files, "rp", nodeDestinations);
	}
}
