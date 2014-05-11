declare class Metis {
    public enableHeadlessMetis: Boolean;
    public enableLocalStorage: Boolean;
    public metisCallbackLocation: string;
    public userOnline: Boolean;
    constructor(enableHeadlessMetisOption: Boolean, metisCallbackUrl?: string, enableLocalStorageBoolean?: Boolean, userOfflineByDefault?: Boolean);
    public init(): void;
    public objectMerge(primaryObject: Object, secondaryObject: Object): Object;
    public toggleOfflineStatus(): void;
    public addToIOQueue(nodeData: any, filesToQueue: any, fileAction: string, contentOrDestinationNodes?: any): void;
    public processIOQueue(): void;
    public fileActionHandler(nodeDataDefined: any, files: any, fileAction: string, contentOrDestinationNodes?: any): string;
    public decodeJsonFile(jsonString: string): any;
    public readJsonFile(nodeData: string, files: any): string;
    public createJsonFile(nodeData: string, files: any, jsonEncodedContent: Object): string;
    public updateJsonFile(nodeData: string, files: any, jsonEncodedContent: Object, appendContent?: Boolean): string;
    public deleteJsonFile(nodeData: string, files: any): string;
    public fileExists(nodeData: any, files: any): string;
    public replicator(nodeData: string, nodeDestinations: string[], files: any): string;
}
