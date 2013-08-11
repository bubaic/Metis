// This is the Metis Javascript / Typescript Implementation

class Metis { // Class definition "Metis"
    constructor(public metisCallbackLocation: string){ // Constructor that requires URL (string) that is the callback URL (http://example.com/Metis/callback)
    }

    /* File Action Handler: Similar to the PHP implementation, however it pushes the args into a
        custom formdata (type any), converts to JSON then sends to the callback URL
    */
    fileActionHandler(nodeNum : string, files : string[], fileAction : string, contentOrDestinationNodes ?: Array) {
        var metisXHRManager: XMLHttpRequest = new XMLHttpRequest; // Create a new XMLHttpRequest
        var metisXHRResponse: string; // Define a variable (metisXHRResponse) as a string.
        var standardJsonFormData: any = {}; // Define the custom formdata object (type any)

        standardJsonFormData.fileAction = fileAction; // Set the fileAction key / val to the fileAction arg
        standardJsonFormData.nodeNum = nodeNum; // Set the nodeNum key / val to the nodeNum arg
        standardJsonFormData.files = files; // Set the files key / val to the files array

        if (contentOrDestinationNodes !== undefined){ // If we either have content or in the case of replication, destination nodes
            standardJsonFormData.contentOrDestinationNodes = contentOrDestinationNodes; // Set the contentOrDestination Nodes key / val to the contentOrDestinationNodes arg
        }

        var metisJSONData : string = JSON.stringify(standardJsonFormData); // Define metisJSONData as a string that is the stringified version of our formdata

        /* This is a simply XHR ready state handler function for metisXHRManager */
        function returnMetisContext() {
            if (metisXHRManager.readyState == 4){ // If the ready state is 4 (done)
                if (metisXHRManager.status == 200){ // If the callback script exists (returns content no matter)
                    metisXHRResponse = metisXHRManager.responseText; // Assign the responseText from the XHR call to the metisXHRResponse
                }
                else{ // If the callback script does not exist
                    metisXHRResponse = "HTTP ERROR CODE: " + metisXHRManager.status.toString; // Assign an http error code context to the metisXHRResponse 
                }
            }
        }

        metisXHRManager.onreadystatechange = returnMetisContext; // Assign the returnMetisContext function to the readystatechange event of metisXHRManager
        metisXHRManager.open("POST", Metis.prototype.metisCallbackLocation, false); // Open the connection to the callback location, using POST, async as false
        metisXHRManager.send(metisJSONData); // Send the JSON data

        return metisXHRResponse; // Return the response we get (assigned by returnMetisContext()
    }

    /* This function is similar to the PHP decodeJsonFile in that it parses JSON string */
    decodeJsonFile(jsonString: string){
        return JSON.parse(jsonString);
    }

    /* This function is for reading one or a multitude of files from a Metis node */
    readJsonFile(nodeNum: string, files: string[]) {
        return Metis.prototype.fileActionHandler(nodeNum, files, "r");
    }
    
    /* This function is for creating one or a multitude of files from a Metis node */
    createJsonFile(nodeNum: string, files: string[], jsonEncodedContent: Array){
        return Metis.prototype.fileActionHandler(nodeNum, files, "c", jsonEncodedContent);
    }

    /* This function is for updating one or a multitude of files from a Metis node */
    updateJsonFile(nodeNum: string, files: string[], jsonEncodedContent: Array, appendContent: Boolean){
        if (appendContent === (undefined || false)) {
            return Metis.prototype.fileActionHandler(nodeNum, files, "c", jsonEncodedContent);
        }
        else{
            return Metis.prototype.fileActionHandler(nodeNum, files, "u", jsonEncodedContent);
        }
    }

    /* This function is for deleting one or a multitude of files from a Metis node */
    deleteJsonFIle(nodeNum: string, files: string[]) {
        return Metis.prototype.fileActionHandler(nodeNum, files, "d");
    }
    
    /* This function is for replication / duplicating one or a multitude of files from an origin node to one or multiple destination nodes */
    replicator(nodeNum: string, nodeDestinations : Array, files: string[]){
        return Metis.prototype.fileActionHandler(nodeNum, files, "rp", nodeDestinations);
    }
}