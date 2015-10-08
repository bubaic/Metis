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
                if ((uniqueIOObject.NodeData !== "internal") && (!metis.Headless) && (uniqueIOObject.PendingFiles.length !== 0)) {
                    if (metis.Online) {
                        var apiRequestObject = {
                            "NodeData": uniqueIOObject.NodeData,
                            "Action": uniqueIOObject.Action,
                            "Files": uniqueIOObject.Files
                        };
                        if (typeof uniqueIOObject.ContentOrDestinationNodes == "object") {
                            apiRequestObject.ContentOrDestinationNodes = uniqueIOObject.ContentOrDestinationNodes;
                        }
                        var xhrManager = new XMLHttpRequest;
                        function xhrHandler() {
                            if (xhrManager.readyState == 4) {
                                var uniqueIOObject = arguments[0];
                                var potentialCallbackExtraData = uniqueIOObject.CallbackData;
                                var remoteFileContent;
                                if (xhrManager.status == 200) {
                                    remoteFileContent = metis.file.Decode(xhrManager.responseText);
                                }
                                else {
                                    remoteFileContent = { "error": "HTTP ERROR CODE|" + xhrManager.status };
                                }
                                for (var fileName in remoteFileContent) {
                                    var fileContent = remoteFileContent[fileName];
                                    uniqueIOObject.CompletedFiles[fileName] = fileContent;
                                    if ((uniqueIOObject.Action == "r") || (uniqueIOObject.Action == "a")) {
                                        if (typeof fileContent["error"] == "undefined") {
                                            var newIOObject = {
                                                "NodeData": "internal",
                                                "Files": fileName,
                                                "Action": "w",
                                                "ContentOrDestinationNodes": fileContent
                                            };
                                            metis.file.IO(newIOObject);
                                        }
                                    }
                                }
                                metis.devices.cloud.fireCallback(uniqueIOObject.Callback, uniqueIOObject.CompletedFiles, uniqueIOObject.CallbackData);
                            }
                        }
                        xhrManager.onreadystatechange = xhrHandler.bind(metis, uniqueIOObject);
                        xhrManager.open("POST", metis.Callback, true);
                        xhrManager.send(JSON.stringify(apiRequestObject));
                    }
                    else {
                        if (uniqueIOObject.Action !== "r") {
                            var completedFilesKeys = Object.keys(uniqueIOObject.CompletedFiles);
                            uniqueIOObject.PendingFiles.push(completedFilesKeys);
                        }
                        var newIOObject = {
                            "NodeData": uniqueIOObject.NodeData,
                            "Action": uniqueIOObject.Action,
                            "PendingFiles": uniqueIOObject.PendingFiles,
                            "CompletedFiles": {},
                            "ContentOrDestinationNodes": uniqueIOObject.ContentOrDestinationNodes
                        };
                        metis.queuer.AddItem(newIOObject);
                        metis.devices.cloud.fireCallback(uniqueIOObject.Callback, uniqueIOObject.CompletedFiles, uniqueIOObject.CallbackData);
                    }
                }
                else {
                    metis.devices.cloud.fireCallback(uniqueIOObject.Callback, uniqueIOObject.CompletedFiles, uniqueIOObject.CallbackData);
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
/// <reference path="../metis.ts" />
/// <reference path="cloud.ts" />
var metis;
(function (metis) {
    var devices;
    (function (devices) {
        var web;
        (function (web) {
            function Handle(uniqueIOObject) {
                var fileAction = uniqueIOObject.Action;
                for (var _i = 0, _a = uniqueIOObject.PendingFiles; _i < _a.length; _i++) {
                    var fileName = _a[_i];
                    var localFileContent = { "success": true };
                    if ((fileAction == "r") || (fileAction == "a")) {
                        var fetchedContent = localStorage.getItem(fileName);
                        if (fetchedContent !== null) {
                            localFileContent = metis.file.Decode(fetchedContent);
                        }
                        else {
                            localFileContent = { "error": "file_doesnt_exist" };
                        }
                    }
                    if ((fileAction == "w") || (fileAction == "a")) {
                        if ((fileAction == "a") && (typeof localFileContent["error"] !== "string")) {
                            uniqueIOObject.ContentOrDestinationNodes = metis.file.Merge(localFileContent, uniqueIOObject.ContentOrDestinationNodes);
                        }
                        localStorage.setItem(fileName, JSON.stringify(uniqueIOObject.ContentOrDestinationNodes));
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
                    if (((fileAction == "r") && (typeof localFileContent["error"] == "undefined")) || (fileAction == "e")) {
                        allowPoppingFile = true;
                    }
                    else if ((fileAction == "w") || (fileAction == "a") || (fileAction == "d")) {
                        if (metis.Headless) {
                            allowPoppingFile = true;
                        }
                    }
                    if (allowPoppingFile) {
                        uniqueIOObject.PendingFiles = metis.file.ArrayRemove(uniqueIOObject.PendingFiles, fileName);
                    }
                    uniqueIOObject.CompletedFiles[fileName] = localFileContent;
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
// These are interfaces used by Metis
/*

 The following Typescript code is the IO Queue System of Metis

 */
/// <reference path="metis.ts" />
/// <reference path="file.ts" />
/// <reference path="interfaces.ts" />
var metis;
(function (metis) {
    var queuer;
    (function (queuer) {
        function Init() {
            metis.file.IO({
                "NodeData": "internal",
                "Action": "e",
                "Files": "ioQueue",
                "Callback": function (completedIO) {
                    if (completedIO["ioQueue"]["status"] == false) {
                        metis.file.IO({ "NodeData": "internal", "Action": "w", "Files": "ioQueue", "ContentOrDestinationNodes": {} });
                    }
                }
            });
            document.addEventListener("online", metis.queuer.Process, false);
            document.addEventListener("offline", metis.queuer.ToggleStatus, false);
        }
        queuer.Init = Init;
        function ToggleStatus() {
            metis.Online = false;
        }
        queuer.ToggleStatus = ToggleStatus;
        function Process() {
            metis.file.IO({
                "NodeData": "internal",
                "Action": "r",
                "Files": "ioQueue",
                "Callback": function (ioQueue) {
                    ioQueue = ioQueue["ioQueue"];
                    metis.Online = true;
                    for (var fileName in ioQueue) {
                        var nodeData = ioQueue[fileName]["NodeData"];
                        var fileAction = ioQueue[fileName]["Action"];
                        var contentOrDestinationNodes = ioQueue[fileName]["ContentOrDestinationNodes"];
                        if (metis.Online) {
                            metis.file.IO({ "NodeData": nodeData, "Action": fileAction, "Files": fileName, "ContentOrDestinationNodes": contentOrDestinationNodes });
                            delete ioQueue[fileName];
                        }
                        else {
                            break;
                        }
                    }
                    metis.file.IO({ "NodeData": "internal", "Action": "u", "Files": "ioQueue", "ContentOrDestinationNodes": ioQueue });
                }
            });
        }
        queuer.Process = Process;
        function AddItem(uniqueIOObject) {
            metis.file.IO({
                "NodeData": "internal",
                "Action": "r",
                "Files": "ioQueue",
                "Callback": function (ioQueue, callbackData) {
                    ioQueue = ioQueue["ioQueue"];
                    var relatedIOObject = callbackData["uniqueIOObject"];
                    for (var _i = 0, _a = relatedIOObject.Files; _i < _a.length; _i++) {
                        var fileName = _a[_i];
                        if (ioQueue.hasOwnProperty(fileName) == true) {
                            delete ioQueue[fileName];
                        }
                        var fileIOObject = {
                            "NodeData": relatedIOObject.NodeData,
                            "Action": relatedIOObject.Action,
                            "Files": relatedIOObject.Files
                        };
                        if (relatedIOObject.Action == ("w" || "a")) {
                            fileIOObject.ContentOrDestinationNodes = relatedIOObject.ContentOrDestinationNodes;
                        }
                        ioQueue[fileName] = fileIOObject;
                    }
                    metis.file.IO({ "NodeData": "internal", "Action": "u", "Files": "ioQueue", "ContentOrDestinationNodes": ioQueue });
                },
                "CallbackData": {
                    "uniqueIOObject": uniqueIOObject
                }
            });
        }
        queuer.AddItem = AddItem;
    })(queuer = metis.queuer || (metis.queuer = {}));
})(metis || (metis = {}));
/*

    The following Typescript code is the File IO functionality of Metis

*/
/// <reference path="devices/web.ts" />
/// <reference path="metis.ts" />
/// <reference path="interfaces.ts" />
/// <reference path="queuer.ts" />
var metis;
(function (metis) {
    var file;
    (function (file) {
        function IO(apiRequestObject) {
            // #region Node Data Parsing
            if (typeof apiRequestObject.NodeData === "number") {
                apiRequestObject.NodeData = apiRequestObject.NodeData.toString();
            }
            if (typeof apiRequestObject.Files == "string") {
                apiRequestObject.Files = Array(apiRequestObject.Files);
            }
            var uniqueIOObject = {
                "NodeData": apiRequestObject.NodeData,
                "Action": apiRequestObject.Action,
                "ContentOrDestinationNodes": apiRequestObject.ContentOrDestinationNodes,
                "PendingFiles": apiRequestObject.Files,
                "CompletedFiles": {},
                "Callback": apiRequestObject.Callback,
                "CallbackData": apiRequestObject.CallbackData
            };
            metis.DeviceIO.Handle(uniqueIOObject);
        }
        file.IO = IO;
        function Decode(jsonString) {
            return JSON.parse(jsonString);
        }
        file.Decode = Decode;
        function ClearAll() {
            metis.DeviceIO.ClearAll();
        }
        file.ClearAll = ClearAll;
        function ArrayRemove(ourArray, remove) {
            var itemIndex = ourArray.indexOf(remove);
            if (itemIndex !== -1) {
                return Array.prototype.concat(ourArray.slice(0, itemIndex), ourArray.slice(itemIndex + 1));
            }
            else {
                return ourArray;
            }
        }
        file.ArrayRemove = ArrayRemove;
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
        file.Merge = Merge;
    })(file = metis.file || (metis.file = {}));
})(metis || (metis = {}));
/*

 The following Typescript code is the Metis implementation of Chrome / ChromeOS's storage API.
 Since we do not utilize user interaction, chrome.filesystem would be the incorrect API.

 */
/// <reference path="../file.ts" />
/// <reference path="../interfaces.ts" />
/// <reference path="../definitions/chrome.d.ts" />
var metis;
(function (metis) {
    var devices;
    (function (devices) {
        var chromeos;
        (function (chromeos) {
            function Handle(uniqueIOObject) {
                var fileAction = uniqueIOObject.Action;
                var pendingFiles = uniqueIOObject.PendingFiles;
                var contentOrDestinationNodes = uniqueIOObject.ContentOrDestinationNodes;
                var chromeGetHandler = function () {
                    var uniqueIOObject = arguments[0];
                    var fileAction = uniqueIOObject.Action;
                    var completedIO = arguments[1];
                    for (var fileIndex in completedIO) {
                        var fileName = completedIO[fileIndex];
                        var ioSuccessful;
                        var localFileContent = completedIO[fileName];
                        if (typeof localFileContent == "Object") {
                            if ((fileAction == "r") || (fileAction == "a") || (fileAction == "e")) {
                                if (fileAction == "a") {
                                    var contentOrDestinationNodes = uniqueIOObject.ContentOrDestinationNodes;
                                    localFileContent = metis.file.Merge(localFileContent, contentOrDestinationNodes);
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
                                if (metis.Headless) {
                                    allowPoppingFile = true;
                                }
                            }
                            if (allowPoppingFile == true) {
                                uniqueIOObject.PendingFiles = metis.file.ArrayRemove(uniqueIOObject.PendingFiles, fileName);
                            }
                            uniqueIOObject.CompletedFiles[fileName] = localFileContent;
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
/// <reference path="file.ts" />
/// <reference path="queuer.ts" />
var metis;
(function (metis) {
    function Init(initArgs) {
        // #region Arguments Parser / Default(er)
        metis.Device = "Web";
        if (typeof initArgs["Device"] == "string") {
            metis.Device = initArgs["Device"];
        }
        if (initArgs["Device"] !== "Cordova") {
            metis.Online = window.navigator.onLine;
        }
        else {
            metis.Online = true;
            if (navigator.connection.type == Connection.NONE) {
                metis.Online = false;
            }
        }
        if (initArgs["Device"].toLowerCase().indexOf("chrome") == -1) {
            metis.DeviceIO = metis.devices.web;
        }
        else {
            metis.DeviceIO = metis.devices.chromeos;
        }
        metis.Headless = true;
        if (typeof initArgs["Callback"] == "string") {
            metis.Headless = false;
            metis.queuer.Init();
        }
    }
    metis.Init = Init;
})(metis || (metis = {}));
