var metis;
(function (metis) {
    (function (devices) {
        (function (cloud) {
            function Read(fileName) {
                return localStorage.getItem(fileName);
            }
            cloud.Read = Read;

            function Write(fileName, jsonObject, update) {
                if (update == true) {
                    var existingFileContent = this.Read(fileName);
                    var fileContentObject = {};

                    if (existingFileContent !== null) {
                        existingFileContent = JSON.parse(existingFileContent);
                    } else {
                        existingFileContent = {};
                    }

                    jsonObject = metis.core.Merge(existingFileContent, fileContentObject);
                }

                localStorage.setItem(fileName, JSON.stringify(jsonObject));
            }
            cloud.Write = Write;

            function Delete(fileName) {
                localStorage.removeItem(fileName);
            }
            cloud.Delete = Delete;

            function Exists(fileName) {
                var returnableVar;
                if (this.Read(fileName) !== null) {
                    returnableVar = "local";
                } else {
                    returnableVar = false;
                }

                return returnableVar;
            }
            cloud.Exists = Exists;
        })(devices.cloud || (devices.cloud = {}));
        var cloud = devices.cloud;
    })(metis.devices || (metis.devices = {}));
    var devices = metis.devices;
})(metis || (metis = {}));
var metis;
(function (metis) {
    (function (queuer) {
        function Init() {
            if (metis.file.Exists("internal", "ioQueue") !== "local") {
                metis.file.Create("internal", "ioQueue", {});
            }

            document.addEventListener("online", this.Process(), false);
            document.addEventListener("offline", this.ToggleStatus(), false);
        }
        queuer.Init = Init;

        function ToggleStatus() {
            metis.core.metisFlags["User Online"] = false;
        }
        queuer.ToggleStatus = ToggleStatus;

        function Process() {
            if (metis.core.metisFlags["Battery OK"] == true) {
                var ioQueue = metis.file.Decode(metis.file.Read("internal", "ioQueue"));
                this.userOnline = true;

                for (var fileName in ioQueue) {
                    var nodeData = ioQueue[fileName]["nodeData"];
                    var fileAction = ioQueue[fileName]["action"];
                    var contentOrDestinationNodes = ioQueue[fileName]["contentOrDestinationNodes"];

                    if (this.userOnline == true) {
                        metis.file.Handler(nodeData, fileName, fileAction, contentOrDestinationNodes);
                        ioQueue[fileName] = null;
                    } else {
                        break;
                    }
                }

                metis.file.Update("internal", "ioQueue", ioQueue, false);
            }
        }
        queuer.Process = Process;

        function AddItem(nodeData, filesToQueue, fileAction, contentOrDestinationNodes) {
            var ioQueue = metis.file.Decode(metis.file.Read("internal", "ioQueue"));

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

            metis.file.Update("internal", "ioQueue", ioQueue, false);
        }
        queuer.AddItem = AddItem;
    })(metis.queuer || (metis.queuer = {}));
    var queuer = metis.queuer;
})(metis || (metis = {}));
var metis;
(function (metis) {
    (function (file) {
        function Handler(nodeDataDefined, files, fileAction, contentOrDestinationNodes) {
            var fileContent = {};
            var necessaryFilesForRemoteIO = [];

            if (typeof files == "string") {
                files = [files];
            }

            for (var fileIndex in files) {
                var fileName = files[fileIndex];
                var localFileContent;

                if (fileAction == "r") {
                    localFileContent = metis.core.deviceIO.Read(fileName);

                    if (localFileContent !== null) {
                        localFileContent = this.Decode(localFileContent);
                    } else {
                        necessaryFilesForRemoteIO.push(fileName);
                    }
                } else if (fileAction !== "e") {
                    if (fileAction == "w") {
                        metis.core.deviceIO.Write(fileName, contentOrDestinationNodes, false);
                    } else if (fileAction == "a") {
                        metis.core.deviceIO.Write(fileName, contentOrDestinationNodes, true);
                    } else if (fileAction == "d") {
                        metis.core.deviceIO.Delete(fileName);
                    }

                    localFileContent = this.Decode('{"status" : "0.00"}');
                } else {
                    if (metis.core.deviceIO.Exists(fileName) !== null) {
                        localFileContent = "local";
                    } else {
                        if (metis.core.metisFlags["Headless"] == true) {
                            localFileContent = false;
                        } else if ((metis.core.metisFlags["Headless"] !== true) && (nodeDataDefined !== "internal")) {
                            necessaryFilesForRemoteIO.push(fileName);
                        }
                    }
                }

                if (files.length == 1) {
                    fileContent = localFileContent;
                } else {
                    fileContent[fileName] = localFileContent;
                }
            }

            if (nodeDataDefined !== "internal") {
                if (metis.core.metisFlags["Headless"] == false) {
                    if ((metis.core.metisFlags["User Online"] == true) && (metis.core.metisFlags["Battery OK"] == true)) {
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
                            xhrManager.open("POST", metis.core.metisFlags["Callback"], false);
                            xhrManager.send(JSON.stringify(remoteIOData));

                            var remoteFileContent = this.Decode(metisXHRResponse);

                            if (necessaryFilesForRemoteIO.length == 1) {
                                fileContent = remoteFileContent;
                            } else {
                                fileContent = metis.core.Merge(fileContent, remoteFileContent);
                            }

                            if (fileAction == "r") {
                                for (var fileIndex in necessaryFilesForRemoteIO) {
                                    var fileName = necessaryFilesForRemoteIO[fileIndex];

                                    if (necessaryFilesForRemoteIO.length == 1) {
                                        metis.core.deviceIO.Write(fileName, JSON.stringify(remoteFileContent));
                                    } else {
                                        metis.core.deviceIO.Write(fileName, JSON.stringify(remoteFileContent[fileName]));
                                    }
                                }
                            }
                        }
                    } else {
                        if (fileAction !== "r") {
                            necessaryFilesForRemoteIO = files;
                        }

                        if (necessaryFilesForRemoteIO.length > 0) {
                            metis.queuer.AddItem(nodeDataDefined, necessaryFilesForRemoteIO, fileAction, contentOrDestinationNodes);
                        }
                    }
                }
            }

            return JSON.stringify(fileContent);
        }
        file.Handler = Handler;

        function Decode(jsonString) {
            return JSON.parse(jsonString);
        }
        file.Decode = Decode;

        function Read(nodeData, files) {
            return this.Handler(nodeData, files, "r");
        }
        file.Read = Read;

        function Create(nodeData, files, jsonEncodedContent) {
            return this.Handler(nodeData, files, "w", jsonEncodedContent);
        }
        file.Create = Create;

        function Update(nodeData, files, jsonEncodedContent, appendContent) {
            if (appendContent == (undefined || false)) {
                return this.Handler(nodeData, files, "w", jsonEncodedContent);
            } else {
                return this.Handler(nodeData, files, "a", jsonEncodedContent);
            }
        }
        file.Update = Update;

        function Delete(nodeData, files) {
            return this.Handler(nodeData, files, "d");
        }
        file.Delete = Delete;

        function Exists(nodeData, files) {
            return this.Handler(nodeData, files, "e");
        }
        file.Exists = Exists;

        function Replicator(nodeData, nodeDestinations, files) {
            return this.Handler(nodeData, files, "rp", nodeDestinations);
        }
        file.Replicator = Replicator;
    })(metis.file || (metis.file = {}));
    var file = metis.file;
})(metis || (metis = {}));
var metis;
(function (metis) {
    (function (core) {
        core.deviceIO;
        core.metisFlags;

        function Init(arguments) {
            this.metisFlags = {};

            if (arguments["Headless"] == (undefined || false)) {
                arguments["Headless"] = false;
                metis.queuer.Init();

                if (arguments["Callback"] == undefined) {
                    console.log("You have defined Headless as FALSE but have NOT provided a callback URL. Expect errors.");
                }
            }

            if (arguments["Device"] == undefined) {
                arguments["Device"] = "Cloud";
            }

            if (arguments["User Online"] == undefined) {
                if (arguments["Device"] == "Cloud") {
                    arguments["User Online"] = window.navigator.onLine;
                    metis.core.metisFlags["Battery OK"] = true;
                } else {
                    if (navigator.connection.type !== Connection.NONE) {
                        arguments["User Online"] = true;
                    } else {
                        arguments["User Online"] = false;
                    }

                    document.addEventListener("batterystatus", function (batteryStatusInfo) {
                        if (batteryStatusInfo.isPlugged == true || batteryStatusInfo.level >= 15) {
                            metis.core.metisFlags["Battery OK"] = true;
                        } else {
                            metis.core.metisFlags["Battery OK"] = false;
                        }
                    }, false);
                }
            }

            this.deviceIO = metis.devices.cloud;

            this.metisFlags = arguments;
        }
        core.Init = Init;

        function Merge(primaryObject, secondaryObject) {
            for (var objectProperty in secondaryObject) {
                if (typeof secondaryObject[objectProperty] == "object") {
                    if (primaryObject[objectProperty] !== undefined) {
                        primaryObject[objectProperty] = this.Merge(primaryObject[objectProperty], secondaryObject[objectProperty]);
                    } else {
                        primaryObject[objectProperty] = secondaryObject[objectProperty];
                    }
                } else {
                    primaryObject[objectProperty] = secondaryObject[objectProperty];
                }
            }

            return primaryObject;
        }
        core.Merge = Merge;
    })(metis.core || (metis.core = {}));
    var core = metis.core;
})(metis || (metis = {}));
var metis;
(function (metis) {
    function Init(arguments) {
        return metis.core.Init(arguments);
    }
    metis.Init = Init;

    function readJsonFile(nodeDataDefined, files) {
        return metis.file.Read(nodeDataDefined, files);
    }
    metis.readJsonFile = readJsonFile;

    function createJsonFile(nodeDataDefined, files, content) {
        return metis.file.Create(nodeDataDefined, files, content);
    }
    metis.createJsonFile = createJsonFile;

    function updateJsonFile(nodeDataDefined, files, append) {
        return metis.file.Update(nodeDataDefined, files, append);
    }
    metis.updateJsonFile = updateJsonFile;

    function decodeJsonFile(content) {
        return metis.file.Decode(content);
    }
    metis.decodeJsonFile = decodeJsonFile;

    function fileExists(nodeDataDefined, files) {
        return metis.file.Exists(nodeDataDefined, files);
    }
    metis.fileExists = fileExists;

    function replicator(nodeDataDefined, nodeDataDestinations, files) {
        return metis.file.Replicator(nodeDataDefined, nodeDataDestinations, files);
    }
    metis.replicator = replicator;
})(metis || (metis = {}));
