/// <reference path="../src/typescript/definitions/cordova.d.ts" />
/// <reference path="../src/typescript/definitions/chrome.d.ts" />
declare module metis.devices.cloud {
    function Handle(uniqueIOObject: Object): void;
    function fireCallback(potentialCallback: any, completedIO: Object, potentialCallbackExtraData: any): void;
}
declare module metis.devices.web {
    function Handle(uniqueIOObject: Object): void;
    function ClearAll(): void;
}
declare module metis.queuer {
    function Init(): void;
    function ToggleStatus(): void;
    function Process(): void;
    function AddItem(uniqueIOObject: Object): void;
}
declare module metis.core {
    var deviceIO: any;
    var metisFlags: Object;
    function Init(arguments: Object): void;
    function Merge(primaryObject: Object, secondaryObject: Object): Object;
}
declare module metis.file {
    function Handler(handlerArguments: Object): void;
    function Decode(jsonString: string): any;
    function Read(arguments: Object): void;
    function Create(arguments: Object): void;
    function Update(arguments: Object): void;
    function Delete(arguments: Object): void;
    function Exists(arguments: Object): void;
    function ClearAll(): void;
}
declare module metis.devices.chromeos {
    function Handle(uniqueIOObject: Object): void;
    function ClearAll(): void;
}
declare module metis {
    function Init(arguments: Object): void;
}
