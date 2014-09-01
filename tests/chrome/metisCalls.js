function addResponse(action, completedIO){
    console.log(action + ": " + JSON.stringify(completedIO)); // Set the content to the JSON stringified completedIO
}

document.addEventListener("DOMContentLoaded",
    function(){
        metis.Init( // Initialize Metis
            {
                "Callback" : "https://stroblindustries.com/~metis/simulator", // Set the Callback to the simulator
                "Headless" : false, // No headless mode
                "Device" : "Chrome" // Set the device to Chrome
            }
        );

        metis.file.Create(
            {
                "nodeData" : "Example#1",
                "files" : "example",
                "contentOrDestinationNodes" : {
                    "hello" : "world"
                },
                "callback" : function(completedIO){
                   addResponse("Create", completedIO);
                }
            }
        );

        metis.file.Read(
            {
                "nodeData" : "Example#1",
                "files" : "example",
                "callback" : function(completedIO){
                    addResponse("Read", completedIO);
                }
            }
        );

        metis.file.Update(
            {
                "nodeData" : "Example#1",
                "files" : "example",
                "append" : true,
                "contentOrDestinationNodes" : {
                    "Metis" : "Yea, this thing."
                },
                "callback" : function(completedIO){
                    addResponse("Update", completedIO);
                }
            }
        );

        metis.file.Delete(
            {
                "nodeData" : "Example#1",
                "files" : "example",
                "callback" : function(completedIO){
                    addResponse("Delete", completedIO);
                }
            }
        );

        metis.file.Read(
            {
                "nodeData" : "corsDisableTest",
                "files" : "example",
                "callback" : function(completedIO){
                    addResponse("CORS Disable Test", completedIO);
                }
            }
        );
    }
);