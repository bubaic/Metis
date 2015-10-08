// These are interfaces used by Metis

interface APIRequest extends Object { // Declare APIRequest as an extension of Object
	NodeData : string|number; // NodeData
	Action : string; // Action: r,e,w,u,d
	Files ?: any; // Should actually be string|Array<string> but TypeScript union type checking is terrible. Actually required for APIRequest Object but not enforced for UniqueIOObject
	ContentOrDestinationNodes ?: Object;
	Callback ?: Function; // Optional Callback Function
	CallbackData ?: any; // Optional Callback Data
}

interface UniqueIOObject extends APIRequest { // Declare UniqueIOObject as an extension of APIRequest, where UniqueIOObject is carried across different device calls
	PendingFiles : Array<string>; // Pending Files
	CompletedFiles : Object; // Completed Files
}