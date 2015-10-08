/*

 The following Typescript code is the Metis implementation of "Cloud" / server-based File IO.

 */
/// <reference path="../file.ts" />
var metis;
(function (metis) {
    var devices;
    (function (devices) {
        var cloud;
        (function (cloud) {
            function Handle(uniqueIOObject) {
                // #region Pending-Related Variables
                var fileAction = uniqueIOObject["Action"];
                var pendingFiles = uniqueIOObject["pending"];
                var contentOrDestinationNodes = uniqueIOObject["ContentOrDestinationNodes"];
                var completedIO = uniqueIOObject["completed"];
                var potentialCallback = uniqueIOObject["callback"];
                var potentialCallbackExtraData = uniqueIOObject["callback-data"];
                if (uniqueIOObject["NodeData"] !== "internal") {
                    if (metis.core.metisFlags["Headless"] == false) {
                        if ((metis.core.metisFlags["User Online"] == true) && (metis.core.metisFlags["Battery OK"] == true)) {
                            if (pendingFiles.length > 0) {
                                var remoteIOData = {};
                                remoteIOData.NodeData = uniqueIOObject["NodeData"];
                                remoteIOData.Files = pendingFiles;
                                remoteIOData.Action = fileAction;
                                if (contentOrDestinationNodes !== false) {
                                    remoteIOData.ContentOrDestinationNodes = contentOrDestinationNodes;
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
                                                if (typeof fileContent["error"] == "undefined") {
                                                    var newIOObject = {
                                                        "NodeData": "internal",
                                                        "Files": fileName,
                                                        "Action": "w",
                                                        "ContentOrDestinationNodes": fileContent
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
                            if (uniqueIOObject["Action"] !== "r") {
                                pendingFiles.push(Object.keys(completedIO));
                            }
                            if (pendingFiles.length > 0) {
                                var newIOObject = {
                                    "NodeData": uniqueIOObject["NodeData"],
                                    "pending": pendingFiles,
                                    "Action": fileAction,
                                    "ContentOrDestinationNodes": contentOrDestinationNodes,
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
/*

 The following Typescript code is the Metis implementation of LocalStorage / browser-based File IO.

*/
/// <reference path="cloud.ts" />
var metis;
(function (metis) {
    var devices;
    (function (devices) {
        var web;
        (function (web) {
            function Handle(uniqueIOObject) {
                var fileAction = uniqueIOObject["Action"];
                var pendingFiles = uniqueIOObject["pending"];
                for (var _i = 0; _i < pendingFiles.length; _i++) {
                    var fileName = pendingFiles[_i];
                    var localFileContent = { "success": true };
                    if ((fileAction == "r") || (fileAction == "a")) {
                        localFileContent = localStorage.getItem(fileName);
                        if (localFileContent !== null) {
                            localFileContent = metis.file.Decode(localFileContent);
                        }
                    }
                    if ((fileAction == "w") || (fileAction == "a")) {
                        if ((fileAction == "a") && (localFileContent !== null)) {
                            localFileContent = metis.core.Merge(localFileContent, uniqueIOObject["ContentOrDestinationNodes"]);
                            localStorage.setItem(fileName, JSON.stringify(localFileContent));
                        }
                        else {
                            localStorage.setItem(fileName, JSON.stringify(uniqueIOObject["ContentOrDestinationNodes"]));
                        }
                    }
                    else if (fileAction == "d") {
                        localStorage.removeItem(fileName);
                    }
                    else if (fileAction == "e") {
                        localFileContent = { "exists": true };
                        if (localStorage.getItem(fileName) == null) {
                            localFileContent = { "exists": false };
                        }
                    }
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
                metis.devices.cloud.Handle(uniqueIOObject);
            }
            web.Handle = Handle;
            function ClearAll() {
                localStorage.clear();
            }
            web.ClearAll = ClearAll;
        })(web = devices.web || (devices.web = {}));
    })(devices = metis.devices || (metis.devices = {}));
})(metis || (metis = {}));
/*

 The following Typescript code is the IO Queue System of Metis

 */
/// <reference path="core.ts" />
/// <reference path="file.ts" />
var metis;
(function (metis) {
    var queuer;
    (function (queuer) {
        function Init() {
            metis.file.Exists({
                "NodeData": "internal",
                "Files": "ioQueue",
                "callback": function (completedIO) {
                    if (completedIO["ioQueue"]["status"] == false) {
                        metis.file.Create({ "NodeData": "internal", "Files": "ioQueue", "ContentOrDestinationNodes": {} });
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
                    "NodeData": "internal",
                    "Files": "ioQueue",
                    "callback": function (ioQueue) {
                        ioQueue = ioQueue["ioQueue"];
                        metis.core.metisFlags["User Online"] = true;
                        for (var fileName in ioQueue) {
                            var nodeData = ioQueue[fileName]["NodeData"];
                            var fileAction = ioQueue[fileName]["Action"];
                            var contentOrDestinationNodes = ioQueue[fileName]["ContentOrDestinationNodes"];
                            if (metis.core.metisFlags["User Online"] == true) {
                                metis.file.Handler({ "NodeData": nodeData, "Files": fileName, "Action": fileAction, "ContentOrDestinationNodes": contentOrDestinationNodes });
                                delete ioQueue[fileName];
                            }
                            else {
                                break;
                            }
                        }
                        metis.file.Update({ "NodeData": "internal", "Files": "ioQueue", "ContentOrDestinationNodes": ioQueue });
                    }
                });
            }
        }
        queuer.Process = Process;
        function AddItem(uniqueIOObject) {
            metis.file.Read({
                "NodeData": "internal",
                "Files": "ioQueue",
                "callback": function (ioQueue, callbackData) {
                    ioQueue = ioQueue["ioQueue"];
                    var relatedIOObject = callbackData["uniqueIOObject"];
                    var nodeData = relatedIOObject["pending"]["NodeData"];
                    var fileAction = relatedIOObject["pending"]["Action"];
                    var filesToQueue = relatedIOObject["pending"]["Files"];
                    for (var fileIndex in filesToQueue) {
                        var fileName = filesToQueue[fileIndex];
                        if (ioQueue.hasOwnProperty(fileName) == true) {
                            delete ioQueue[fileName];
                        }
                        ioQueue[fileName] = {};
                        ioQueue[fileName]["NodeData"] = nodeData;
                        ioQueue[fileName]["Action"] = fileAction;
                        if (fileAction == ("w" || "a")) {
                            ioQueue[fileName]["ContentOrDestinationNodes"] = relatedIOObject["pending"]["ContentOrDestinationNodes"];
                        }
                    }
                    metis.file.Update({ "NodeData": "internal", "Files": "ioQueue", "ContentOrDestinationNodes": ioQueue });
                },
                "callback-data": {
                    "uniqueIOObject": uniqueIOObject
                }
            });
        }
        queuer.AddItem = AddItem;
    })(queuer = metis.queuer || (metis.queuer = {}));
})(metis || (metis = {}));
/*

    The following Typescript code is the Core / Internal functionality of Metis

*/
/// <reference path="definitions/cordova.d.ts" />
/// <reference path="devices/chromeos.ts" />
/// <reference path="devices/cloud.ts" />
/// <reference path="devices/web.ts" />
/// <reference path="file.ts" />
/// <reference path="queuer.ts" />
var metis;
(function (metis) {
    var core;
    (function (core) {
        function Init(initArgs) {
            metis.core.metisFlags = {};
            if (((typeof initArgs["Headless"] == "boolean") && (initArgs["Headless"] !== true)) || (typeof initArgs["Headless"] !== "boolean")) {
                if (typeof initArgs["Callback"] == "undefined") {
                    initArgs["Headless"] = true;
                }
                else {
                    initArgs["Headless"] = false;
                }
            }
            if (typeof initArgs["Device"] == "undefined") {
                initArgs["Device"] = "Cloud";
            }
            if (typeof initArgs["User Online"] == "undefined") {
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
            if (initArgs["Device"] == "Cloud") {
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
/*

    The following Typescript code is the File IO functionality of Metis

*/
/// <reference path="devices/web.ts" />
/// <reference path="core.ts" />
/// <reference path="queuer.ts" />
var metis;
(function (metis) {
    var file;
    (function (file) {
        function Handler(handlerArguments) {
            // #region Node Data Parsing
            var unparsedNodeData = handlerArguments["NodeData"];
            var parsedNodeData = unparsedNodeData;
            if (typeof unparsedNodeData == "number") {
                parsedNodeData = unparsedNodeData.toString();
            }
            if (typeof handlerArguments["Files"] == "string") {
                handlerArguments["Files"] = [handlerArguments["Files"]];
            }
            var uniqueIOObject = {
                "NodeData": parsedNodeData,
                "pending": handlerArguments["Files"],
                "Action": handlerArguments["Action"],
                "ContentOrDestinationNodes": handlerArguments["ContentOrDestinationNodes"],
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
            ioArgs["Action"] = "r";
            metis.file.Handler(ioArgs);
        }
        file.Read = Read;
        function Create(ioArgs) {
            ioArgs["Action"] = "w";
            metis.file.Handler(ioArgs);
        }
        file.Create = Create;
        function Update(ioArgs) {
            if (ioArgs["append"] !== true) {
                delete ioArgs["append"];
                ioArgs["Action"] = "w";
                metis.file.Handler(ioArgs);
            }
            else {
                delete ioArgs["append"];
                ioArgs["Action"] = "a";
                metis.file.Handler(ioArgs);
            }
        }
        file.Update = Update;
        function Delete(ioArgs) {
            ioArgs["Action"] = "d";
            metis.file.Handler(ioArgs);
        }
        file.Delete = Delete;
        function Exists(ioArgs) {
            ioArgs["Action"] = "e";
            metis.file.Handler(ioArgs);
        }
        file.Exists = Exists;
        function ClearAll() {
            metis.core.deviceIO.ClearAll();
        }
        file.ClearAll = ClearAll;
    })(file = metis.file || (metis.file = {}));
})(metis || (metis = {}));
/*

 The following Typescript code is the Metis implementation of Chrome / ChromeOS's storage API.
 Since we do not utilize user interaction, chrome.filesystem would be the incorrect API.

 */
/// <reference path="../file.ts" />
/// <reference path="../definitions/chrome.d.ts" />
var metis;
(function (metis) {
    var devices;
    (function (devices) {
        var chromeos;
        (function (chromeos) {
            function Handle(uniqueIOObject) {
                var fileAction = uniqueIOObject["Action"];
                var pendingFiles = uniqueIOObject["pending"];
                var contentOrDestinationNodes = uniqueIOObject["ContentOrDestinationNodes"];
                var chromeGetHandler = function () {
                    var uniqueIOObject = arguments[0];
                    var fileAction = uniqueIOObject["Action"];
                    var completedIO = arguments[1];
                    for (var fileIndex in completedIO) {
                        var fileName = completedIO[fileIndex];
                        var ioSuccessful;
                        var localFileContent = completedIO[fileName];
                        if (typeof localFileContent == "Object") {
                            if ((fileAction == "r") || (fileAction == "a") || (fileAction == "e")) {
                                if (fileAction == "a") {
                                    var contentOrDestinationNodes = uniqueIOObject["ContentOrDestinationNodes"];
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
/*

 The following Typescript code is the aggregate module of Metis

 */
/// <reference path="definitions/chrome.d.ts" />
/// <reference path="definitions/cordova.d.ts" />
/// <reference path="devices/chromeos.ts" />
/// <reference path="devices/cloud.ts" />
/// <reference path="devices/web.ts" />
/// <reference path="core.ts" />
/// <reference path="file.ts" />
/// <reference path="queuer.ts" />
var metis;
(function (metis) {
    function Init(initArgs) {
        return metis.core.Init(initArgs);
    }
    metis.Init = Init;
})(metis || (metis = {}));
