/// <reference path="definitions/cordova.d.ts" />
declare module metis.devices.cloud {
    function Read(fileName: string): any;
    function Write(fileName: string, jsonObject: Object, update: boolean): void;
    function Delete(fileName: string): void;
    function Exists(fileName: string): any;
}
declare module metis.devices.cordova {
    function Read(): void;
    function Write(): void;
    function Exists(): void;
    function Delete(): void;
    function Replicate(): void;
}
declare module metis.queuer {
    function Init(): void;
    function ToggleStatus(): void;
    function Process(): void;
    function AddItem(nodeData: any, filesToQueue: any, fileAction: string, contentOrDestinationNodes?: any): void;
}
declare module metis.file {
    function Handler(nodeDataDefined: any, files: any, fileAction: string, contentOrDestinationNodes?: any): string;
    function Decode(jsonString: string): any;
    function Read(nodeData: string, files: any): any;
    function Create(nodeData: string, files: any, jsonEncodedContent: Object): any;
    function Update(nodeData: string, files: any, jsonEncodedContent: Object, appendContent?: Boolean): any;
    function Delete(nodeData: string, files: any): any;
    function Exists(nodeData: any, files: any): any;
    function Replicator(nodeData: string, nodeDestinations: string[], files: any): any;
}
declare module metis.core {
    var deviceIO: any;
    var metisFlags: Object;
    function Init(arguments: Object): void;
    function Merge(primaryObject: Object, secondaryObject: Object): Object;
}
declare module metis {
    function Init(arguments: Object): void;
}
