/// <reference path="../src/typescript/definitions/chrome.d.ts" />
/// <reference path="../src/typescript/definitions/cordova.d.ts" />
declare module metis.devices.cloud {
    function Handle(uniqueIOObject: UniqueIOObject): void;
    function fireCallback(potentialCallback: any, completedIO: Object, potentialCallbackExtraData: any): void;
}
declare module metis.devices.web {
    function Handle(uniqueIOObject: UniqueIOObject): void;
    function ClearAll(): void;
}
interface APIRequest extends Object {
    NodeData: string | number;
    Action: string;
    Files?: any;
    ContentOrDestinationNodes?: Object;
    Callback?: Function;
    CallbackData?: any;
}
interface UniqueIOObject extends APIRequest {
    PendingFiles: Array<string>;
    CompletedFiles: Object;
}
declare module metis.queuer {
    function Init(): void;
    function ToggleStatus(): void;
    function Process(): void;
    function AddItem(uniqueIOObject: UniqueIOObject): void;
}
declare module metis.file {
    function IO(apiRequestObject: APIRequest): void;
    function Decode(jsonString: string): Object;
    function ClearAll(): void;
    function ArrayRemove(ourArray: Array<any>, remove: any): Array<any>;
    function Merge(primaryObject: Object, secondaryObject: Object): Object;
}
declare module metis.devices.chromeos {
    function Handle(uniqueIOObject: UniqueIOObject): void;
    function ClearAll(): void;
}
declare module metis {
    var Callback: string;
    var Device: string;
    var DeviceIO: any;
    var Headless: boolean;
    var Online: boolean;
    function Init(initArgs: Object): void;
}
