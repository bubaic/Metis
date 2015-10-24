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
                            "Files": uniqueIOObject.PendingFiles
                        };
                        if (typeof uniqueIOObject.Content == "object") {
                            apiRequestObject.Content = uniqueIOObject.Content;
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
                                    if ((uniqueIOObject.Action == "r") || (uniqueIOObject.Action == "u")) {
                                        if (typeof fileContent["error"] == "undefined") {
                                            var newIOObject = {
                                                "NodeData": "internal",
                                                "Files": fileName,
                                                "Action": "w",
                                                "Content": fileContent
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
                            "Content": uniqueIOObject.Content
                        };
                        metis.scheduler.AddItem(newIOObject);
                        metis.devices.cloud.fireCallback(uniqueIOObject.Callback, uniqueIOObject.CompletedFiles, uniqueIOObject.CallbackData);
                    }
                }
                else {
                    metis.devices.cloud.fireCallback(uniqueIOObject.Callback, uniqueIOObject.CompletedFiles, uniqueIOObject.CallbackData);
                }
            }
            cloud.Handle = Handle;
            function fireCallback(potentialCallback, completedIO, potentialCallbackExtraData) {
                if (typeof potentialCallback == "function") {
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
                    if ((fileAction == "r") || (fileAction == "u")) {
                        var fetchedContent = localStorage.getItem(fileName);
                        if (fetchedContent !== null) {
                            localFileContent = metis.file.Decode(fetchedContent);
                        }
                        else {
                            localFileContent = { "error": "file_doesnt_exist" };
                        }
                    }
                    if ((fileAction == "w") || (fileAction == "u")) {
                        if ((fileAction == "a") && (typeof localFileContent["error"] !== "string")) {
                            uniqueIOObject.Content = metis.file.Merge(localFileContent, uniqueIOObject.Content);
                        }
                        localStorage.setItem(fileName, JSON.stringify(uniqueIOObject.Content));
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
                    if ((fileAction == "r") && (typeof localFileContent["error"] == "undefined")) {
                        allowPoppingFile = true;
                    }
                    else if (fileAction == "e") {
                        if ((localFileContent["exists"]) || ((localFileContent["exists"] == false) && (metis.Headless))) {
                            allowPoppingFile = true;
                        }
                    }
                    else if ((fileAction == "w") || (fileAction == "u") || (fileAction == "d")) {
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

 The following Typescript code is the IO Scheduler System of Metis

 */
/// <reference path="metis.ts" />
/// <reference path="file.ts" />
/// <reference path="interfaces.ts" />
var metis;
(function (metis) {
    var scheduler;
    (function (scheduler_1) {
        function Init() {
            metis.file.IO({
                "NodeData": "internal",
                "Action": "e",
                "Files": "scheduler",
                "Callback": function (completedIO) {
                    if (completedIO["scheduler"]["status"] == false) {
                        metis.file.IO({ "NodeData": "internal", "Action": "w", "Files": "scheduler", "Content": {} });
                    }
                }
            });
            document.addEventListener("online", metis.scheduler.Process, false);
            document.addEventListener("offline", metis.scheduler.ToggleStatus, false);
        }
        scheduler_1.Init = Init;
        function ToggleStatus() {
            metis.Online = false;
        }
        scheduler_1.ToggleStatus = ToggleStatus;
        function Process() {
            metis.file.IO({
                "NodeData": "internal",
                "Action": "r",
                "Files": "scheduler",
                "Callback": function (scheduler) {
                    scheduler = scheduler["scheduler"];
                    metis.Online = true;
                    for (var fileName in scheduler) {
                        var nodeData = scheduler[fileName]["NodeData"];
                        var fileAction = scheduler[fileName]["Action"];
                        var content = scheduler[fileName]["Content"];
                        if (metis.Online) {
                            metis.file.IO({ "NodeData": nodeData, "Action": fileAction, "Files": fileName, "Content": content });
                            delete scheduler[fileName];
                        }
                        else {
                            break;
                        }
                    }
                    metis.file.IO({ "NodeData": "internal", "Action": "u", "Files": "scheduler", "Content": scheduler });
                }
            });
        }
        scheduler_1.Process = Process;
        function AddItem(uniqueIOObject) {
            metis.file.IO({
                "NodeData": "internal",
                "Action": "r",
                "Files": "scheduler",
                "Callback": function (scheduler, callbackData) {
                    scheduler = scheduler["scheduler"];
                    var relatedIOObject = callbackData["uniqueIOObject"];
                    for (var _i = 0, _a = relatedIOObject.Files; _i < _a.length; _i++) {
                        var fileName = _a[_i];
                        if (scheduler.hasOwnProperty(fileName) == true) {
                            delete scheduler[fileName];
                        }
                        var fileIOObject = {
                            "NodeData": relatedIOObject.NodeData,
                            "Action": relatedIOObject.Action,
                            "Files": relatedIOObject.Files
                        };
                        if (relatedIOObject.Action == ("w" || "a")) {
                            fileIOObject.Content = relatedIOObject.Content;
                        }
                        scheduler[fileName] = fileIOObject;
                    }
                    metis.file.IO({ "NodeData": "internal", "Action": "u", "Files": "scheduler", "Content": scheduler });
                },
                "CallbackData": {
                    "uniqueIOObject": uniqueIOObject
                }
            });
        }
        scheduler_1.AddItem = AddItem;
    })(scheduler = metis.scheduler || (metis.scheduler = {}));
})(metis || (metis = {}));
/*

    The following Typescript code is the File IO functionality of Metis

*/
/// <reference path="devices/web.ts" />
/// <reference path="metis.ts" />
/// <reference path="interfaces.ts" />
/// <reference path="scheduler.ts" />
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
                "Content": apiRequestObject.Content,
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
        function Read(apiRequest) {
            apiRequest["Action"] = "r";
            metis.file.IO(apiRequest);
        }
        file.Read = Read;
        function Exists(apiRequest) {
            apiRequest["Action"] = "e";
            metis.file.IO(apiRequest);
        }
        file.Exists = Exists;
        function Write(apiRequest) {
            apiRequest["Action"] = "w";
            metis.file.IO(apiRequest);
        }
        file.Write = Write;
        function Update(apiRequest) {
            if ((typeof apiRequest["Append"] == "undefined") || (apiRequest["Append"] == false)) {
                apiRequest["Action"] = "w";
            }
            else {
                apiRequest["Action"] = "u";
            }
            metis.file.IO(apiRequest);
        }
        file.Update = Update;
        function Delete(apiRequest) {
            apiRequest["Action"] = "d";
            metis.file.IO(apiRequest);
        }
        file.Delete = Delete;
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
                var contentOrDestinationNodes = uniqueIOObject.Content;
                var chromeGetHandler = function () {
                    var uniqueIOObject = arguments[0];
                    var fileAction = uniqueIOObject.Action;
                    var completedIO = arguments[1];
                    for (var fileIndex in completedIO) {
                        var fileName = completedIO[fileIndex];
                        var ioSuccessful;
                        var localFileContent = completedIO[fileName];
                        if (typeof localFileContent == "Object") {
                            if ((fileAction !== "w") || (fileAction !== "d")) {
                                if (fileAction == "u") {
                                    var contentOrDestinationNodes = uniqueIOObject.Content;
                                    localFileContent = metis.file.Merge(localFileContent, contentOrDestinationNodes);
                                    chrome.storage.local.set({ fileName: localFileContent });
                                    localFileContent = { "status": true };
                                }
                                else if (fileAction == "e") {
                                    localFileContent = { "status": true };
                                }
                            }
                            else {
                                localFileContent = { "status": true };
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
                            else if ((fileAction == "w") || (fileAction == "u") || (fileAction == "d")) {
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
/// <reference path="scheduler.ts" />
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
        if (metis.Device.toLowerCase().indexOf("chrome") == -1) {
            metis.DeviceIO = metis.devices.web;
        }
        else {
            metis.DeviceIO = metis.devices.chromeos;
        }
        metis.Headless = true;
        if (typeof initArgs["Callback"] == "string") {
            metis.Headless = false;
            metis.Callback = initArgs["Callback"];
            metis.scheduler.Init();
        }
    }
    metis.Init = Init;
})(metis || (metis = {}));
