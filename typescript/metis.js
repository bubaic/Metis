var metis;
(function (metis) {
    (function (devices) {
        (function (cloud) {
            function Handle(uniqueIOId) {
                var fileAction = metis.file.currentIO[uniqueIOId]["pending"]["action"];
                var pendingFiles = metis.file.currentIO[uniqueIOId]["pending"]["files"];
                var contentOrDestinationNodes = metis.file.currentIO[uniqueIOId]["pending"]["contentOrDestinationNodes"];

                var completedIO = metis.file.currentIO[uniqueIOId]["completed"];
                var potentialCallback = metis.file.currentIO[uniqueIOId]["callback"];
                var potentialCallbackExtraData = metis.file.currentIO[uniqueIOId]["callback-data"];

                if (metis.file.currentIO[uniqueIOId]["pending"]["nodeData"] !== "internal") {
                    if (metis.core.metisFlags["Headless"] == false) {
                        if ((metis.core.metisFlags["User Online"] == true) && (metis.core.metisFlags["Battery OK"] == true)) {
                            if (pendingFiles.length > 0) {
                                var remoteIOData = {};

                                remoteIOData.nodeData = metis.file.currentIO[uniqueIOId]["pending"]["nodeDataDefined"];
                                remoteIOData.files = pendingFiles;
                                remoteIOData.fileAction = fileAction;

                                if (contentOrDestinationNodes !== (undefined || null)) {
                                    remoteIOData.contentOrDestinationNodes = contentOrDestinationNodes;
                                }

                                var xhrManager = new XMLHttpRequest;

                                function xhrResponseHandler() {
                                    if (xhrManager.readyState == 4) {
                                        var remoteFileContent;

                                        if (xhrManager.status == 200) {
                                            remoteFileContent = metis.file.Decode(xhrManager.responseText);
                                        } else {
                                            remoteFileContent = { "error": "HTTP ERROR CODE|' + xhrManager.status + '" };
                                        }

                                        for (var fileName in remoteFileContent) {
                                            var fileContent;

                                            if (pendingFiles.length == 1) {
                                                fileName = pendingFiles[0];
                                                fileContent = remoteFileContent;
                                            } else {
                                                fileContent = remoteFileContent[fileName];
                                            }

                                            metis.file.currentIO[uniqueIOId]["pending"]["files"].pop(fileName);
                                            metis.file.currentIO[uniqueIOId]["completed"][fileName] = fileContent;

                                            if (fileAction == "r") {
                                                var newIOObject = {
                                                    "nodeData": "internal",
                                                    "files": fileName,
                                                    "action": "w",
                                                    "contentOrDestinationNodes": fileContent
                                                };

                                                metis.file.Handler(newIOObject);
                                            }
                                        }

                                        if (potentialCallback !== false) {
                                            potentialCallback(metis.file.currentIO[uniqueIOId]["completed"], potentialCallbackExtraData);
                                        }
                                    }
                                }

                                xhrManager.onreadystatechange = xhrResponseHandler;
                                xhrManager.open("POST", metis.core.metisFlags["Callback"], true);
                                xhrManager.send(JSON.stringify(remoteIOData));
                            }
                        } else {
                            var filesNeededForQueuing = metis.file.currentIO[uniqueIOId]["pending"]["files"];

                            if (metis.file.currentIO[uniqueIOId]["pending"]["action"] !== "r") {
                                filesNeededForQueuing.push(Object.keys(completedIO));
                            }

                            if (filesNeededForQueuing.length > 0) {
                                var newIOId = metis.file.RandomIOIdGenerator();

                                var newIOObject = {
                                    "pending": {
                                        "nodeDataDefined": metis.file.currentIO[uniqueIOId]["pending"]["nodeDataDefined"],
                                        "files": filesNeededForQueuing,
                                        "action": fileAction,
                                        "contentOrDestinationNodes": contentOrDestinationNodes
                                    },
                                    "completed": {}
                                };

                                metis.file.currentIO[newIOId] = newIOObject;
                                metis.queuer.AddItem(newIOId);
                            }

                            if (potentialCallback !== false) {
                                potentialCallback(completedIO, potentialCallbackExtraData);
                            }
                        }
                    } else {
                        if (potentialCallback !== false) {
                            potentialCallback(completedIO, potentialCallbackExtraData);
                        }
                    }
                }

                delete metis.file.currentIO[uniqueIOId];
            }
            cloud.Handle = Handle;
        })(devices.cloud || (devices.cloud = {}));
        var cloud = devices.cloud;
    })(metis.devices || (metis.devices = {}));
    var devices = metis.devices;
})(metis || (metis = {}));
var metis;
(function (metis) {
    (function (devices) {
        (function (web) {
            function Handle(uniqueIOId) {
                var uniqueIOObject = metis.file.currentIO[uniqueIOId];
                var fileAction = uniqueIOObject["pending"]["action"];
                var pendingFiles = uniqueIOObject["pending"]["files"];
                var contentOrDestinationNodes = uniqueIOObject["pending"]["contentOrDestinationNodes"];

                for (var fileIndex in pendingFiles) {
                    var fileName = pendingFiles[fileIndex];
                    var localFileContent;
                    var ioSuccessful;

                    if (fileAction == ("r" || "a")) {
                        localFileContent = localStorage.getItem(fileName);

                        if (localFileContent !== null) {
                            localFileContent = metis.file.Decode(localFileContent);

                            if (fileAction == "a") {
                                uniqueIOObject["contentOrDestinationNodes"] = metis.core.Merge(localFileContent, contentOrDestinationNodes);
                            } else {
                                ioSuccessful = true;
                            }
                        }
                    }

                    if (fileAction == ("w" || "a")) {
                        localStorage.setItem(fileName, JSON.stringify(contentOrDestinationNodes));

                        ioSuccessful = true;
                        localFileContent = { "status": "0.00" };
                    } else if (fileAction == "d") {
                        localStorage.removeItem(fileName);

                        ioSuccessful = true;
                        localFileContent = { "status": "0.00" };
                    } else if (fileAction == "e") {
                        if (localStorage.getItem(fileName) !== null) {
                            localFileContent = { "status": true };
                        } else {
                            localFileContent = { "status": false };
                        }

                        ioSuccessful = true;
                    }

                    if (ioSuccessful == true) {
                        if ((fileAction == ("r" || "e")) || ((fileAction == ("w" || "a" || "d")) && (metis.core.metisFlags["Headless"] == true))) {
                            metis.file.currentIO[uniqueIOId]["pending"]["files"].pop(fileName);
                        }

                        metis.file.currentIO[uniqueIOId]["completed"][fileName] = localFileContent;
                    }
                }

                metis.devices.cloud.Handle(uniqueIOId);
            }
            web.Handle = Handle;
        })(devices.web || (devices.web = {}));
        var web = devices.web;
    })(metis.devices || (metis.devices = {}));
    var devices = metis.devices;
})(metis || (metis = {}));
var metis;
(function (metis) {
    (function (queuer) {
        function Init() {
            function existsHandler(completedIO) {
                if (completedIO["ioQueue"] == false) {
                    metis.file.Create({ "nodeData": "internal", "fileName": "ioQueue", "contentOrDestinationNodes": {} });
                }
            }

            metis.file.Exists({
                "nodeData": "internal",
                "files": "ioQueue",
                "callback": existsHandler
            });

            document.addEventListener("online", metis.queuer.Process, false);
            document.addEventListener("offline", metis.queuer.ToggleStatus, false);
        }
        queuer.Init = Init;

        function ToggleStatus() {
            metis.core.metisFlags["User Online"] = false;
        }
        queuer.ToggleStatus = ToggleStatus;

        function Process() {
            if (metis.core.metisFlags["Battery OK"] == true) {
                metis.file.Read({
                    "nodeData": "internal",
                    "files": "ioQueue",
                    "callback": function (ioQueue) {
                        ioQueue = ioQueue["ioQueue"];

                        metis.core.metisFlags["User Online"] = true;

                        for (var fileName in ioQueue) {
                            var nodeData = ioQueue[fileName]["nodeData"];
                            var fileAction = ioQueue[fileName]["action"];
                            var contentOrDestinationNodes = ioQueue[fileName]["contentOrDestinationNodes"];

                            if (metis.core.metisFlags["User Online"] == true) {
                                metis.file.Handler({ "nodeData": nodeData, "files": fileName, "action": fileAction, "contentOrDestinationNodes": contentOrDestinationNodes });
                                delete ioQueue[fileName];
                            } else {
                                break;
                            }
                        }

                        metis.file.Update({ "nodeData": "internal", "files": "ioQueue", "contentOrDestinationNodes": ioQueue });
                    }
                });
            }
        }
        queuer.Process = Process;

        function AddItem(uniqueIOId) {
            metis.file.Read({
                "nodeData": "internal",
                "files": "ioQueue",
                "callback": function (ioQueue, callbackData) {
                    ioQueue = ioQueue["ioQueue"];
                    var relatedIOObject = metis.file.currentIO[callbackData["relatedIOId"]];

                    var nodeData = relatedIOObject["pending"]["nodeData"];
                    var fileAction = relatedIOObject["pending"]["action"];
                    var filesToQueue = relatedIOObject["pending"]["files"];

                    for (var fileIndex in filesToQueue) {
                        var fileName = filesToQueue[fileIndex];

                        if (ioQueue.hasOwnProperty(fileName) == true) {
                            delete ioQueue[fileName];
                        }

                        ioQueue[fileName] = {};
                        ioQueue[fileName]["nodeData"] = nodeData;
                        ioQueue[fileName]["action"] = fileAction;

                        if (fileAction == ("w" || "a")) {
                            var contentOrDestinationNodes = relatedIOObject["pending"]["contentOrDestinationNodes"];

                            ioQueue[fileName]["contentOrDestinationNodes"] = contentOrDestinationNodes;
                        } else {
                            delete ioQueue[fileName]["contentOrDestinationNodes"];
                        }
                    }

                    metis.file.Update({ "nodeData": "internal", "files": "ioQueue", "contentOrDestinationNodes": ioQueue });
                },
                "callback-data": {
                    "relatedIOId": uniqueIOId
                }
            });
        }
        queuer.AddItem = AddItem;
    })(metis.queuer || (metis.queuer = {}));
    var queuer = metis.queuer;
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

            if (arguments["Device"].toLowerCase().indexOf("chrome") == -1) {
                this.deviceIO = metis.devices.web;
            } else {
                this.deviceIO = metis.devices.chromeos;
            }

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
    (function (file) {
        file.currentIO = {};

        function RandomIOIdGenerator() {
            var id;
            var idAlreadyExists = true;

            while (idAlreadyExists == true) {
                id = (Math.random() * (99999 - 10000) + 10000).toString();

                if (metis.file.currentIO[id] == undefined) {
                    idAlreadyExists = false;
                    break;
                }
            }

            return id;
        }
        file.RandomIOIdGenerator = RandomIOIdGenerator;

        function Handler(handlerArguments) {
            var uniqueIOId = metis.file.RandomIOIdGenerator();
            var parsedNodeData = "";
            var unparsedNodeData = handlerArguments["nodeData"];

            if (typeof unparsedNodeData == "string") {
                parsedNodeData = unparsedNodeData;
            } else if (typeof unparsedNodeData == "object") {
                for (var potentialNodeGroup in unparsedNodeData) {
                    var thisDataSyntax = potentialNodeGroup;

                    if (unparsedNodeData[potentialNodeGroup] !== null) {
                        thisDataSyntax = thisDataSyntax + "#";
                        var nodesInGroup = unparsedNodeData[potentialNodeGroup];

                        nodesInGroup.forEach(function (nodeNum, nodeIndex, nodesInGroup) {
                            thisDataSyntax = thisDataSyntax + nodeNum;

                            if (nodesInGroup.length !== (nodeIndex + 1)) {
                                thisDataSyntax = thisDataSyntax + ",";
                            } else {
                                thisDataSyntax = thisDataSyntax + "|";
                            }
                        });

                        parsedNodeData = parsedNodeData + thisDataSyntax;
                    } else {
                        unparsedNodeData = unparsedNodeData + potentialNodeGroup + "|";
                    }
                }

                unparsedNodeData = unparsedNodeData.slice(0, -1);
                parsedNodeData = unparsedNodeData;
            } else if (typeof unparsedNodeData == "number") {
                parsedNodeData = unparsedNodeData.toString();
            }

            if (typeof handlerArguments["files"] == "string") {
                handlerArguments["files"] = [handlerArguments["files"]];
            }

            if (handlerArguments["contentOrDestinationNodes"] == undefined) {
                handlerArguments["contentOrDestinationNodes"] = false;
            }

            if (handlerArguments["callback"] == undefined) {
                handlerArguments["callback"] = false;
            }

            if (arguments["callback-data"] == undefined) {
                arguments["callback-data"] = false;
            }

            var uniqueIOObject = {
                "pending": {
                    "nodeData": parsedNodeData,
                    "files": handlerArguments["files"],
                    "action": handlerArguments["action"],
                    "contentOrDestinationNodes": handlerArguments["contentOrDestinationNodes"]
                },
                "completed": {},
                "callback": handlerArguments["callback"]
            };

            metis.file.currentIO[uniqueIOId] = uniqueIOObject;

            metis.core.deviceIO.Handle(uniqueIOId);
        }
        file.Handler = Handler;

        function Decode(jsonString) {
            return JSON.parse(jsonString);
        }
        file.Decode = Decode;

        function Read(arguments) {
            arguments["action"] = "r";
            metis.file.Handler(arguments);
        }
        file.Read = Read;

        function Create(arguments) {
            arguments["action"] = "w";
            metis.file.Handler(arguments);
        }
        file.Create = Create;

        function Update(arguments) {
            if (arguments["append"] == (undefined || false)) {
                delete arguments["append"];
                arguments["action"] = "w";

                metis.file.Handler(arguments);
            } else {
                delete arguments["append"];
                arguments["action"] = "a";
                metis.file.Handler(arguments);
            }
        }
        file.Update = Update;

        function Delete(arguments) {
            arguments["action"] = "d";
            metis.file.Handler(arguments);
        }
        file.Delete = Delete;

        function Exists(arguments) {
            arguments["action"] = "e";
            metis.file.Handler(arguments);
        }
        file.Exists = Exists;

        function Replicator(arguments) {
            arguments["action"] = "rp";
            metis.file.Handler(arguments);
        }
        file.Replicator = Replicator;
    })(metis.file || (metis.file = {}));
    var file = metis.file;
})(metis || (metis = {}));
var metis;
(function (metis) {
    (function (devices) {
        (function (chromeos) {
            function Handle(uniqueIOId) {
                var uniqueIOObject = metis.file.currentIO[uniqueIOId];
                var fileAction = uniqueIOObject["pending"]["action"];
                var pendingFiles = uniqueIOObject["pending"]["files"];
                var contentOrDestinationNodes = uniqueIOObject["pending"]["contentOrDestinationNodes"];

                var chromeGetHandler = function () {
                    var uniqueIOId = arguments[0];
                    var fileAction = metis.file.currentIO[uniqueIOId]["pending"]["action"];

                    if (fileAction == ("r" || "a" || "e")) {
                        var completedIO = arguments[1];

                        for (fileName in completedIO) {
                            var ioSuccessful;
                            var localFileContent = completedIO[fileName];

                            if (typeof localFileContent == "Object") {
                                if (fileAction == "a") {
                                    var contentOrDestinationNodes = metis.file.currentIO[uniqueIOId]["pending"]["contentOrDestinationNodes"];

                                    localFileContent = metis.core.Merge(localFileContent, contentOrDestinationNodes);
                                    chrome.storage.local.set({ fileName: localFileContent });

                                    localFileContent = { "status": true };
                                } else if (fileAction == "e") {
                                    localFileContent = { "status": true };
                                }

                                ioSuccessful = true;
                            } else {
                                ioSuccessful = false;
                            }
                        }
                    } else {
                        if (chrome.runtime.lastError == undefined) {
                            localFileContent = { "status": "0.00" };
                            ioSuccessful = true;
                        } else {
                            localFileContent = { "error": chrome.runtime.lastError };

                            if (fileAction == "w") {
                                ioSuccessful = false;
                            } else {
                                ioSuccessful = true;
                            }
                        }
                    }

                    if (ioSuccessful == true) {
                        if ((fileAction == ("r" || "e")) || ((fileAction == ("w" || "a" || "d")) && (metis.core.metisFlags["Headless"] == true))) {
                            metis.file.currentIO[uniqueIOId]["pending"]["files"].pop(fileName);
                        }

                        metis.file.currentIO[uniqueIOId]["completed"][fileName] = localFileContent;
                    }

                    metis.devices.cloud.Handle(uniqueIOId);
                }.bind(this, uniqueIOId);

                if (fileAction == ("r" || "a" || "e")) {
                    chrome.storage.local.get(pendingFiles, chromeGetHandler);
                } else if (fileAction == "w") {
                    var chromeSetObject = {};

                    for (var fileName in pendingFiles) {
                        chromeSetObject[fileName] = contentOrDestinationNodes;
                    }

                    chrome.storage.local.set(chromeSetObject, chromeGetHandler);
                } else if (fileAction == "d") {
                    chrome.storage.local.remove(pendingFiles, chromeGetHandler);
                }
            }
            chromeos.Handle = Handle;
        })(devices.chromeos || (devices.chromeos = {}));
        var chromeos = devices.chromeos;
    })(metis.devices || (metis.devices = {}));
    var devices = metis.devices;
})(metis || (metis = {}));
var metis;
(function (metis) {
    function Init(arguments) {
        return metis.core.Init(arguments);
    }
    metis.Init = Init;

    function readJsonFile(nodeDataDefined, files) {
        var ioArgs = {
            "nodeData": nodeDataDefined,
            "files": files
        };

        return metis.file.Read(ioArgs);
    }
    metis.readJsonFile = readJsonFile;

    function createJsonFile(nodeDataDefined, files, content) {
        var ioArgs = {
            "nodeData": nodeDataDefined,
            "files": files,
            "contentOrDestinationNodes": content
        };

        return metis.file.Create(ioArgs);
    }
    metis.createJsonFile = createJsonFile;

    function updateJsonFile(nodeDataDefined, files, content, append) {
        var ioArgs = {
            "nodeData": nodeDataDefined,
            "files": files,
            "contentOrDestinationNodes": content,
            "append": append
        };

        return metis.file.Update(ioArgs);
    }
    metis.updateJsonFile = updateJsonFile;

    function decodeJsonFile(content) {
        return metis.file.Decode(content);
    }
    metis.decodeJsonFile = decodeJsonFile;

    function fileExists(nodeDataDefined, files) {
        var ioArgs = {
            "nodeData": nodeDataDefined,
            "files": files
        };

        return metis.file.Exists(ioArgs);
    }
    metis.fileExists = fileExists;

    function replicator(nodeDataDefined, nodeDataDestinations, files) {
        var ioArgs = {
            "nodeData": nodeDataDefined,
            "files": files,
            "contentOrDestinationNodes": nodeDataDestinations
        };

        return metis.file.Replicator(ioArgs);
    }
    metis.replicator = replicator;
})(metis || (metis = {}));
