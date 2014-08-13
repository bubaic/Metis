/// <reference path="definitions/cordova.d.ts" />
/// <reference path="definitions/chrome.d.ts" />
declare module metis.devices.cloud {
    function Handle(uniqueIOId: string): void;
}
declare module metis.devices.web {
    function Handle(uniqueIOId: string): void;
}
declare module metis.queuer {
    function Init(): void;
    function ToggleStatus(): void;
    function Process(): void;
    function AddItem(uniqueIOId: string): void;
}
declare module metis.core {
    var deviceIO: any;
    var metisFlags: Object;
    function Init(arguments: Object): void;
    function Merge(primaryObject: Object, secondaryObject: Object): Object;
}
declare module metis.file {
    var currentIO: Object;
    function RandomIOIdGenerator(): string;
    function Handler(handlerArguments: Object): void;
    function Decode(jsonString: string): any;
    function Read(arguments: Object): void;
    function Create(arguments: Object): void;
    function Update(arguments: Object): void;
    function Delete(arguments: Object): void;
    function Exists(arguments: Object): void;
    function Replicator(arguments: Object): void;
}
declare module metis.devices.chromeos {
    function Handle(uniqueIOId: string): void;
}
declare module metis {
    function Init(arguments: Object): void;
    function readJsonFile(nodeDataDefined: any, files: any): void;
    function createJsonFile(nodeDataDefined: any, files: any, content: Object): void;
    function updateJsonFile(nodeDataDefined: any, files: any, content: Object, append: boolean): void;
    function decodeJsonFile(content: string): any;
    function fileExists(nodeDataDefined: any, files: any): void;
    function replicator(nodeDataDefined: any, nodeDataDestinations: any, files: any): void;
}
