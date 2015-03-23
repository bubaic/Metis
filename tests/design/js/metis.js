var metis;
(function (metis) {
    var devices;
    (function (devices) {
        var cloud;
        (function (cloud) {
            function Handle(uniqueIOObject) {
                var fileAction = uniqueIOObject["action"];
                var pendingFiles = uniqueIOObject["pending"];
                var contentOrDestinationNodes = uniqueIOObject["contentOrDestinationNodes"];
                var completedIO = uniqueIOObject["completed"];
                var potentialCallback = uniqueIOObject["callback"];
                var potentialCallbackExtraData = uniqueIOObject["callback-data"];
                if (uniqueIOObject["nodeData"] !== "internal") {
                    if (metis.core.metisFlags["Headless"] == false) {
                        if ((metis.core.metisFlags["User Online"] == true) && (metis.core.metisFlags["Battery OK"] == true)) {
                            if (pendingFiles.length > 0) {
                                var remoteIOData = {};
                                remoteIOData.nodeData = uniqueIOObject["nodeData"];
                                remoteIOData.files = pendingFiles;
                                remoteIOData.action = fileAction;
                                if (contentOrDestinationNodes !== false) {
                                    remoteIOData.contentOrDestinationNodes = contentOrDestinationNodes;
                                }
                                var xhrManager = new XMLHttpRequest;
                                function xhrHandler() {
                                    if (xhrManager.readyState == 4) {
                                        var uniqueIOObject = arguments[0];
                                        var potentialCallbackExtraData = uniqueIOObject["callback-data"];
                                        var remoteFileContent;
                                        if (xhrManager.status == 200) {
                                            remoteFileContent = metis.file.Decode(xhrManager.responseText);
                                        }
                                        else {
                                            remoteFileContent = { "error": "HTTP ERROR CODE|" + xhrManager.status };
                                        }
                                        for (var fileName in remoteFileContent) {
                                            var fileContent = remoteFileContent[fileName];
                                            uniqueIOObject["completed"][fileName] = fileContent;
                                            if ((fileAction == "r") || (fileAction == "a")) {
                                                if (fileContent["error"] == undefined) {
                                                    var newIOObject = {
                                                        "nodeData": "internal",
                                                        "files": fileName,
                                                        "action": "w",
                                                        "contentOrDestinationNodes": fileContent
                                                    };
                                                    metis.file.Handler(newIOObject);
                                                }
                                            }
                                        }
                                        metis.devices.cloud.fireCallback(potentialCallback, uniqueIOObject["completed"], potentialCallbackExtraData);
                                    }
                                }
                                xhrManager.onreadystatechange = xhrHandler.bind(metis, uniqueIOObject);
                                xhrManager.open("POST", metis.core.metisFlags["Callback"], true);
                                xhrManager.send(JSON.stringify(remoteIOData));
                            }
                            else {
                                metis.devices.cloud.fireCallback(potentialCallback, completedIO, potentialCallbackExtraData);
                            }
                        }
                        else {
                            if (uniqueIOObject["action"] !== "r") {
                                pendingFiles.push(Object.keys(completedIO));
                            }
                            if (pendingFiles.length > 0) {
                                var newIOObject = {
                                    "nodeData": uniqueIOObject["nodeData"],
                                    "pending": pendingFiles,
                                    "action": fileAction,
                                    "contentOrDestinationNodes": contentOrDestinationNodes,
                                    "completed": {}
                                };
                                metis.queuer.AddItem(newIOObject);
                            }
                            metis.devices.cloud.fireCallback(potentialCallback, completedIO, potentialCallbackExtraData);
                        }
                    }
                    else {
                        metis.devices.cloud.fireCallback(potentialCallback, completedIO, potentialCallbackExtraData);
                    }
                }
                else {
                    metis.devices.cloud.fireCallback(potentialCallback, completedIO, potentialCallbackExtraData);
                }
            }
            cloud.Handle = Handle;
            function fireCallback(potentialCallback, completedIO, potentialCallbackExtraData) {
                if (potentialCallback !== false) {
                    potentialCallback(completedIO, potentialCallbackExtraData);
                }
            }
            cloud.fireCallback = fireCallback;
        })(cloud = devices.cloud || (devices.cloud = {}));
    })(devices = metis.devices || (metis.devices = {}));
})(metis || (metis = {}));
var metis;
(function (metis) {
    var devices;
    (function (devices) {
        var web;
        (function (web) {
            function Handle(uniqueIOObject) {
                var fileAction = uniqueIOObject["action"];
                var pendingFiles = uniqueIOObject["pending"];
                for (var fileIndex in pendingFiles) {
                    var fileName = pendingFiles[fileIndex];
                    var localFileContent;
                    var ioSuccessful = false;
                    if ((fileAction == "r") || (fileAction == "a")) {
                        localFileContent = localStorage.getItem(fileName);
                        if (localFileContent !== null) {
                            localFileContent = metis.file.Decode(localFileContent);
                            if (fileAction == "r") {
                                ioSuccessful = true;
                            }
                        }
                    }
                    if ((fileAction == "w") || (fileAction == "a")) {
                        if ((fileAction == "a") && (localFileContent !== null)) {
                            localFileContent = metis.core.Merge(localFileContent, uniqueIOObject["contentOrDestinationNodes"]);
                            localStorage.setItem(fileName, JSON.stringify(localFileContent));
                        }
                        else {
                            localFileContent = { "status": "0.00" };
                            localStorage.setItem(fileName, JSON.stringify(uniqueIOObject["contentOrDestinationNodes"]));
                        }
                        ioSuccessful = true;
                    }
                    else if (fileAction == "d") {
                        localStorage.removeItem(fileName);
                        ioSuccessful = true;
                        localFileContent = { "status": "0.00" };
                    }
                    else if (fileAction == "e") {
                        if (localStorage.getItem(fileName) !== null) {
                            localFileContent = { "status": true };
                        }
                        else {
                            localFileContent = { "status": false };
                        }
                        ioSuccessful = true;
                    }
                    if (ioSuccessful == true) {
                        var allowPoppingFile = false;
                        if ((fileAction == "r") || (fileAction == "e")) {
                            allowPoppingFile = true;
                        }
                        else if ((fileAction == "w") || (fileAction == "a") || (fileAction == "d")) {
                            if (metis.core.metisFlags["Headless"] == true) {
                                allowPoppingFile = true;
                            }
                        }
                        if (allowPoppingFile == true) {
                            uniqueIOObject["pending"].pop(fileName);
                        }
                        uniqueIOObject["completed"][fileName] = localFileContent;
                    }
                }
                metis.devices.cloud.Handle(uniqueIOObject);
            }
            web.Handle = Handle;
            function ClearAll() {
                var numberOfKeys = localStorage.length;
                for (var i = 0; i < numberOfKeys; i++) {
                    var fileName = localStorage.key(i);
                    localStorage.removeItem(fileName);
                }
            }
            web.ClearAll = ClearAll;
        })(web = devices.web || (devices.web = {}));
    })(devices = metis.devices || (metis.devices = {}));
})(metis || (metis = {}));
var metis;
(function (metis) {
    var queuer;
    (function (queuer) {
        function Init() {
            metis.file.Exists({
                "nodeData": "internal",
                "files": "ioQueue",
                "callback": function (completedIO) {
                    if (completedIO["ioQueue"]["status"] == false) {
                        metis.file.Create({ "nodeData": "internal", "files": "ioQueue", "contentOrDestinationNodes": {} });
                    }
                }
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
                            }
                            else {
                                break;
                            }
                        }
                        metis.file.Update({ "nodeData": "internal", "files": "ioQueue", "contentOrDestinationNodes": ioQueue });
                    }
                });
            }
        }
        queuer.Process = Process;
        function AddItem(uniqueIOObject) {
            metis.file.Read({
                "nodeData": "internal",
                "files": "ioQueue",
                "callback": function (ioQueue, callbackData) {
                    ioQueue = ioQueue["ioQueue"];
                    var relatedIOObject = callbackData["uniqueIOObject"];
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
                            ioQueue[fileName]["contentOrDestinationNodes"] = relatedIOObject["pending"]["contentOrDestinationNodes"];
                        }
                    }
                    metis.file.Update({ "nodeData": "internal", "files": "ioQueue", "contentOrDestinationNodes": ioQueue });
                },
                "callback-data": {
                    "uniqueIOObject": uniqueIOObject
                }
            });
        }
        queuer.AddItem = AddItem;
    })(queuer = metis.queuer || (metis.queuer = {}));
})(metis || (metis = {}));
var metis;
(function (metis) {
    var core;
    (function (core) {
        core.deviceIO;
        core.metisFlags;
        function Init(initArgs) {
            metis.core.metisFlags = {};
            if (initArgs["Headless"] !== true) {
                if (initArgs["Callback"] == undefined) {
                    initArgs["Headless"] = true;
                }
                else {
                    if (initArgs["Callback"].indexOf("/callback.php") == -1) {
                        if (initArgs["Callback"].substr(initArgs["Callback"].length - 1) !== "/") {
                            initArgs["Callback"] += "/";
                        }
                        initArgs["Callback"] += "callback.php";
                    }
                }
            }
            if (initArgs["Device"] == undefined) {
                initArgs["Device"] = "Cloud";
            }
            if (initArgs["User Online"] == undefined) {
                if (initArgs["Device"] !== "Cordova") {
                    initArgs["User Online"] = window.navigator.onLine;
                }
                else {
                    initArgs["User Online"] = true;
                    if (navigator.connection.type == Connection.NONE) {
                        initArgs["User Online"] = false;
                    }
                }
            }
            initArgs["Battery OK"] = true;
            if (initArgs["Device"] == "Cordova") {
                document.addEventListener("batterystatus", function (batteryStatusInfo) {
                    metis.core.metisFlags["Battery OK"] = true;
                    if (batteryStatusInfo.isPlugged == false || batteryStatusInfo.level < 15) {
                        metis.core.metisFlags["Battery OK"] = false;
                    }
                }, false);
            }
            if (initArgs["Device"].toLowerCase().indexOf("chrome") == -1) {
                metis.core.deviceIO = metis.devices.web;
            }
            else {
                metis.core.deviceIO = metis.devices.chromeos;
            }
            metis.core.metisFlags = initArgs;
            if (metis.core.metisFlags["Headless"] == false) {
                metis.queuer.Init();
            }
        }
        core.Init = Init;
        function Merge(primaryObject, secondaryObject) {
            for (var objectProperty in secondaryObject) {
                if (typeof secondaryObject[objectProperty] == "object") {
                    if (primaryObject[objectProperty] !== undefined) {
                        primaryObject[objectProperty] = this.Merge(primaryObject[objectProperty], secondaryObject[objectProperty]);
                    }
                    else {
                        primaryObject[objectProperty] = secondaryObject[objectProperty];
                    }
                }
                else {
                    primaryObject[objectProperty] = secondaryObject[objectProperty];
                }
            }
            return primaryObject;
        }
        core.Merge = Merge;
    })(core = metis.core || (metis.core = {}));
})(metis || (metis = {}));
var metis;
(function (metis) {
    var file;
    (function (file) {
        function Handler(handlerArguments) {
            var parsedNodeData = "";
            var unparsedNodeData = handlerArguments["nodeData"];
            if (typeof unparsedNodeData == "string") {
                parsedNodeData = unparsedNodeData;
            }
            else if (typeof unparsedNodeData == "object") {
                for (var potentialNodeGroup in unparsedNodeData) {
                    var thisDataSyntax = potentialNodeGroup;
                    if (unparsedNodeData[potentialNodeGroup] !== null) {
                        thisDataSyntax = thisDataSyntax + "#";
                        var nodesInGroup = unparsedNodeData[potentialNodeGroup];
                        nodesInGroup.forEach(function (nodeNum, nodeIndex, nodesInGroup) {
                            thisDataSyntax = thisDataSyntax + nodeNum;
                            if (nodesInGroup.length !== (nodeIndex + 1)) {
                                thisDataSyntax = thisDataSyntax + ",";
                            }
                            else {
                                thisDataSyntax = thisDataSyntax + "|";
                            }
                        });
                        parsedNodeData = parsedNodeData + thisDataSyntax;
                    }
                    else {
                        unparsedNodeData = unparsedNodeData + potentialNodeGroup + "|";
                    }
                }
                unparsedNodeData = unparsedNodeData.slice(0, -1);
                parsedNodeData = unparsedNodeData;
            }
            else if (typeof unparsedNodeData == "number") {
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
            if (handlerArguments["callback-data"] == undefined) {
                handlerArguments["callback-data"] = false;
            }
            var uniqueIOObject = {
                "nodeData": parsedNodeData,
                "pending": handlerArguments["files"],
                "action": handlerArguments["action"],
                "contentOrDestinationNodes": handlerArguments["contentOrDestinationNodes"],
                "completed": {},
                "callback": handlerArguments["callback"],
                "callback-data": handlerArguments["callback-data"]
            };
            metis.core.deviceIO.Handle(uniqueIOObject);
        }
        file.Handler = Handler;
        function Decode(jsonString) {
            return JSON.parse(jsonString);
        }
        file.Decode = Decode;
        function Read(ioArgs) {
            ioArgs["action"] = "r";
            metis.file.Handler(ioArgs);
        }
        file.Read = Read;
        function Create(ioArgs) {
            ioArgs["action"] = "w";
            metis.file.Handler(ioArgs);
        }
        file.Create = Create;
        function Update(ioArgs) {
            if (ioArgs["append"] !== true) {
                delete ioArgs["append"];
                ioArgs["action"] = "w";
                metis.file.Handler(ioArgs);
            }
            else {
                delete ioArgs["append"];
                ioArgs["action"] = "a";
                metis.file.Handler(ioArgs);
            }
        }
        file.Update = Update;
        function Delete(ioArgs) {
            ioArgs["action"] = "d";
            metis.file.Handler(ioArgs);
        }
        file.Delete = Delete;
        function Exists(ioArgs) {
            ioArgs["action"] = "e";
            metis.file.Handler(ioArgs);
        }
        file.Exists = Exists;
        function ClearAll() {
            metis.core.deviceIO.ClearAll();
        }
        file.ClearAll = ClearAll;
    })(file = metis.file || (metis.file = {}));
})(metis || (metis = {}));
var metis;
(function (metis) {
    var devices;
    (function (devices) {
        var chromeos;
        (function (chromeos) {
            function Handle(uniqueIOObject) {
                var fileAction = uniqueIOObject["action"];
                var pendingFiles = uniqueIOObject["pending"];
                var contentOrDestinationNodes = uniqueIOObject["contentOrDestinationNodes"];
                var chromeGetHandler = function () {
                    var uniqueIOObject = arguments[0];
                    var fileAction = uniqueIOObject["action"];
                    var completedIO = arguments[1];
                    for (var fileIndex in completedIO) {
                        var fileName = completedIO[fileIndex];
                        var ioSuccessful;
                        var localFileContent = completedIO[fileName];
                        if (typeof localFileContent == "Object") {
                            if ((fileAction == "r") || (fileAction == "a") || (fileAction == "e")) {
                                if (fileAction == "a") {
                                    var contentOrDestinationNodes = uniqueIOObject["contentOrDestinationNodes"];
                                    localFileContent = metis.core.Merge(localFileContent, contentOrDestinationNodes);
                                    chrome.storage.local.set({ fileName: localFileContent });
                                    localFileContent = { "status": true };
                                }
                                else if (fileAction == "e") {
                                    localFileContent = { "status": true };
                                }
                            }
                            else {
                                localFileContent = { "status": "0.00" };
                            }
                            ioSuccessful = true;
                        }
                        else {
                            ioSuccessful = false;
                        }
                        if (ioSuccessful == true) {
                            var allowPoppingFile = false;
                            if ((fileAction == "r") || (fileAction == "e")) {
                                allowPoppingFile = true;
                            }
                            else if ((fileAction == "w") || (fileAction == "a") || (fileAction == "d")) {
                                if (metis.core.metisFlags["Headless"] == true) {
                                    allowPoppingFile = true;
                                }
                            }
                            if (allowPoppingFile == true) {
                                uniqueIOObject["pending"].pop(fileName);
                            }
                            uniqueIOObject["completed"][fileName] = localFileContent;
                        }
                    }
                    metis.devices.cloud.Handle(uniqueIOObject);
                }.bind(this, uniqueIOObject);
                if ((fileAction == "r") || (fileAction == "a") || (fileAction == "e")) {
                    chrome.storage.local.get(pendingFiles, chromeGetHandler);
                }
                else if (fileAction == "w") {
                    var chromeSetObject = {};
                    for (var fileIndex in pendingFiles) {
                        var fileName = pendingFiles[fileIndex];
                        chromeSetObject[fileName] = contentOrDestinationNodes;
                    }
                    chrome.storage.local.set(chromeSetObject, chromeGetHandler);
                }
                else if (fileAction == "d") {
                    chrome.storage.local.remove(pendingFiles, chromeGetHandler);
                }
            }
            chromeos.Handle = Handle;
            function ClearAll() {
                chrome.storage.local.clear();
            }
            chromeos.ClearAll = ClearAll;
        })(chromeos = devices.chromeos || (devices.chromeos = {}));
    })(devices = metis.devices || (metis.devices = {}));
})(metis || (metis = {}));
var metis;
(function (metis) {
    function Init(initArgs) {
        return metis.core.Init(initArgs);
    }
    metis.Init = Init;
})(metis || (metis = {}));