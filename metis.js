var Metis = (function () {
    function Metis(enableHeadlessMetisOption, metisCallbackUrl, enableLocalStorageBoolean, userOfflineByDefault) {
        if (enableHeadlessMetisOption == true) {
            this.enableHeadlessMetis = true;
            this.enableLocalStorage = true;
            this.userOnline = false;
        } else {
            this.enableHeadlessMetis = false;

            if (metisCallbackUrl !== undefined) {
                this.metisCallbackLocation = metisCallbackUrl;

                if (enableLocalStorageBoolean !== undefined) {
                    this.enableLocalStorage = enableLocalStorageBoolean;
                } else {
                    if (window.localStorage !== undefined) {
                        this.enableLocalStorage = true;

                        if (this.fileExists("internal", "ioQueue") !== "local") {
                            this.createJsonFile("internal", "ioQueue", {});
                        }
                    } else {
                        this.enableLocalStorage = false;
                    }
                }
            } else {
                console.log("You have defined enableHeadlessMetisOption as FALSE but have NOT provided a callback URL. Expect errors.");
            }
        }

        if (userOfflineByDefault !== true) {
            this.userOnline = true;
        } else {
            this.userOnline = false;
        }
    }
    Metis.prototype.init = function () {
        if (this.enableHeadlessMetis == false) {
            document.addEventListener("online", this.processIOQueue, false);
            document.addEventListener("offline", this.toggleOfflineStatus, false);
        }
    };

    Metis.prototype.objectMerge = function (primaryObject, secondaryObject) {
        for (var objectProperty in secondaryObject) {
            if (typeof secondaryObject[objectProperty] == "object") {
                if (primaryObject[objectProperty] !== undefined) {
                    primaryObject[objectProperty] = this.objectMerge(primaryObject[objectProperty], secondaryObject[objectProperty]);
                } else {
                    primaryObject[objectProperty] = secondaryObject[objectProperty];
                }
            } else {
                primaryObject[objectProperty] = secondaryObject[objectProperty];
            }
        }

        return primaryObject;
    };

    Metis.prototype.toggleOfflineStatus = function () {
        this.userOnline = false;
    };

    Metis.prototype.addToIOQueue = function (nodeData, filesToQueue, fileAction, contentOrDestinationNodes) {
        var ioQueue = this.decodeJsonFile(this.readJsonFile("internal", "ioQueue"));

        var nodeDataDefined = "";

        if (typeof nodeData == "string") {
            nodeDataDefined = nodeData;
        } else if (typeof nodeData == "object") {
            for (var potentialNodeGroup in nodeData) {
                var thisDataSyntax = potentialNodeGroup;

                if (nodeData[potentialNodeGroup] !== null) {
                    thisDataSyntax = thisDataSyntax + "#";
                    var nodesInGroup = nodeData[potentialNodeGroup];

                    nodesInGroup.forEach(function (nodeNum, nodeIndex, nodesInGroup) {
                        thisDataSyntax = thisDataSyntax + nodeNum;

                        if (nodesInGroup.length !== (nodeIndex + 1)) {
                            thisDataSyntax = thisDataSyntax + ",";
                        } else {
                            thisDataSyntax = thisDataSyntax + "|";
                        }
                    });

                    nodeDataDefined = nodeDataDefined + thisDataSyntax;
                } else {
                    nodeDataDefined = nodeDataDefined + potentialNodeGroup + "|";
                }
            }

            nodeDataDefined = nodeDataDefined.slice(0, -1);
        } else if (typeof nodeData == "number") {
            nodeDataDefined = nodeData.toString();
        }

        if (typeof filesToQueue == "string") {
            filesToQueue = [filesToQueue];
        }

        for (var fileIndex in filesToQueue) {
            var fileName = filesToQueue[fileIndex];
            if (ioQueue.hasOwnProperty(fileName) == false) {
                ioQueue[fileName] = {};
            }

            if ((ioQueue[fileName]["action"] == "w") && (fileAction == "d")) {
                ioQueue[fileName] = null;
            } else {
                ioQueue[fileName]["nodeData"] = nodeDataDefined;
                ioQueue[fileName]["action"] = fileAction;

                if (fileAction == ("w" || "a")) {
                    ioQueue[fileName]["contentOrDestinationNodes"] = contentOrDestinationNodes;
                } else {
                    if (ioQueue[fileName].hasOwnProperty("contentOrDestinationNodes")) {
                        ioQueue[fileName]["contentOrDestinationNodes"] = null;
                    }
                }
            }
        }

        this.updateJsonFile("internal", "ioQueue", ioQueue, false);
    };

    Metis.prototype.processIOQueue = function () {
        var ioQueue = this.decodeJsonFile(this.readJsonFile("internal", "ioQueue"));
        this.userOnline = true;

        for (var fileName in ioQueue) {
            var nodeData = ioQueue[fileName]["nodeData"];
            var fileAction = ioQueue[fileName]["action"];
            var contentOrDestinationNodes = ioQueue[fileName]["contentOrDestinationNodes"];

            if (this.userOnline == true) {
                this.fileActionHandler(nodeData, fileName, fileAction, contentOrDestinationNodes);
                ioQueue[fileName] = null;
            } else {
                break;
            }
        }

        this.updateJsonFile("internal", "ioQueue", ioQueue, false);
    };

    Metis.prototype.fileActionHandler = function (nodeDataDefined, files, fileAction, contentOrDestinationNodes) {
        var fileContent = {};
        var necessaryFilesForRemoteIO = [];

        if (typeof files == "string") {
            files = [files];
        }

        if (this.enableLocalStorage == true) {
            for (var fileIndex in files) {
                var fileName = files[fileIndex];
                var localFileContent;

                if (fileAction == ("r" || "a")) {
                    localFileContent = localStorage.getItem(fileName);
                }

                if (fileAction == "r") {
                    if (localFileContent !== null) {
                        localFileContent = this.decodeJsonFile(localFileContent);

                        if (files.length == 1) {
                            fileContent = localFileContent;
                        } else {
                            fileContent[fileName] = localFileContent;
                        }
                    } else {
                        necessaryFilesForRemoteIO.push(fileName);
                    }
                } else {
                    if (fileAction !== "e") {
                        if (fileAction == "w") {
                            localStorage.setItem(fileName, JSON.stringify(contentOrDestinationNodes));
                        } else if (fileAction == "a") {
                            var updatedFileContent = JSON.stringify(this.objectMerge(localFileContent, contentOrDestinationNodes));
                            localStorage.setItem(fileName, updatedFileContent);
                        } else if (fileAction == "d") {
                            localStorage.removeItem(fileName);
                        }

                        fileContent[fileName] = this.decodeJsonFile('{"status" : "0.00"}');
                    } else {
                        if (localStorage.getItem(fileName) !== null) {
                            fileContent[fileName] = "local";
                        } else {
                            if (this.enableHeadlessMetis == true) {
                                fileContent[fileName] = false;
                            } else if ((this.enableHeadlessMetis !== true) && (nodeDataDefined !== "internal")) {
                                necessaryFilesForRemoteIO.push(fileName);
                            }
                        }
                    }
                }
            }
        } else {
            necessaryFilesForRemoteIO = files;
        }

        if (nodeDataDefined !== "internal") {
            if (this.enableHeadlessMetis == false) {
                if (this.userOnline == true) {
                    if ((fileAction == "r" && necessaryFilesForRemoteIO.length > 0) || (fileAction !== "r")) {
                        var remoteIOData = {};

                        remoteIOData.nodeData = nodeDataDefined;

                        if (fileAction == ("r" || "e")) {
                            remoteIOData.files = necessaryFilesForRemoteIO;
                        } else {
                            remoteIOData.files = files;
                        }

                        remoteIOData.fileAction = fileAction;

                        if (contentOrDestinationNodes !== (undefined || null)) {
                            remoteIOData.contentOrDestinationNodes = contentOrDestinationNodes;
                        }

                        var xhrManager = new XMLHttpRequest;
                        var metisXHRResponse = "";

                        function xhrResponseHandler() {
                            if (xhrManager.readyState == 4) {
                                if (xhrManager.status == 200) {
                                    metisXHRResponse = xhrManager.responseText;
                                } else {
                                    metisXHRResponse = '{"error" : "HTTP ERROR CODE|' + xhrManager.status + '"}';
                                }
                            }
                        }

                        xhrManager.onreadystatechange = xhrResponseHandler;
                        xhrManager.open("POST", this.metisCallbackLocation, false);
                        xhrManager.send(JSON.stringify(remoteIOData));

                        var remoteFileContent = this.decodeJsonFile(metisXHRResponse);

                        for (var fileIndex in necessaryFilesForRemoteIO) {
                            var fileName = necessaryFilesForRemoteIO[fileIndex];

                            if (necessaryFilesForRemoteIO.length == 1) {
                                fileContent = remoteFileContent;
                            } else {
                                fileContent[fileName] = remoteFileContent[fileName];
                            }

                            if ((fileAction == "r") && (this.enableLocalStorage == true)) {
                                if (necessaryFilesForRemoteIO.length == 1) {
                                    localStorage.setItem(fileName, JSON.stringify(remoteFileContent));
                                } else {
                                    localStorage.setItem(fileName, JSON.stringify(remoteFileContent[fileName]));
                                }
                            }
                        }
                    }
                } else {
                    if (fileAction !== "r") {
                        necessaryFilesForRemoteIO = files;
                    }

                    if (necessaryFilesForRemoteIO.length > 0) {
                        this.addToIOQueue(nodeDataDefined, necessaryFilesForRemoteIO, fileAction, contentOrDestinationNodes);
                    }
                }
            }
        }

        return JSON.stringify(fileContent);
    };

    Metis.prototype.decodeJsonFile = function (jsonString) {
        return JSON.parse(jsonString);
    };

    Metis.prototype.readJsonFile = function (nodeData, files) {
        return this.fileActionHandler(nodeData, files, "r");
    };

    Metis.prototype.createJsonFile = function (nodeData, files, jsonEncodedContent) {
        return this.fileActionHandler(nodeData, files, "w", jsonEncodedContent);
    };

    Metis.prototype.updateJsonFile = function (nodeData, files, jsonEncodedContent, appendContent) {
        if (appendContent == (undefined || false)) {
            return this.fileActionHandler(nodeData, files, "w", jsonEncodedContent);
        } else {
            return this.fileActionHandler(nodeData, files, "a", jsonEncodedContent);
        }
    };

    Metis.prototype.deleteJsonFile = function (nodeData, files) {
        return this.fileActionHandler(nodeData, files, "d");
    };

    Metis.prototype.fileExists = function (nodeData, files) {
        return this.fileActionHandler(nodeData, files, "e");
    };

    Metis.prototype.replicator = function (nodeData, nodeDestinations, files) {
        return this.fileActionHandler(nodeData, files, "rp", nodeDestinations);
    };
    return Metis;
})();
