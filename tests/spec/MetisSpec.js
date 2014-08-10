metis.Init(
    {
        "Callback" : "https://stroblindustries.com/~metis/simulator/",
        "Headless" : false
    }
);

describe("Metis", function() {
    var currentObject = {}; // Define currentObject

    beforeEach(function() { // Before each test
        currentObject = {}; // Reset the currentObjecty
    });

    // #region Test Writing Files

    describe("needs to write to a file", function() {

        beforeEach(
          function(){
              metis.file.Create(
                  {
                      "nodeData" : "1",
                      "files" : "example",
                      "contentOrDestinationNodes" : {
                          "hello" : "world"
                      },
                      "callback" : function(completedIO){
                          currentObject = completedIO;
                      }
                  }
              );
              
          }
        );

        it("should do so asynchronously", function() {
            expect(JSON.stringify(currentObject)).toEqual('{"example":{"status":"0.00"}}');
        });

    });

    // #endregion

    // #region Test Reading Files

    describe("needs to read a file", function() {

        beforeEach(
            function(){
                metis.file.Read(
                    {
                        "nodeData" : "1",
                        "files" : "example",
                        "callback" : function(completedIO){
                            currentObject = completedIO;
                        }
                    }
                );
                
            }
        );

        it("should do so asynchronously", function() {
            expect(JSON.stringify(currentObject)).toEqual('{"example":{"hello":"world"}}');
        });

    });

    // #endregion

    // #region Test Updating Files

    describe("needs to update a file", function() {

        beforeEach(
            function(){
                metis.file.Update(
                    {
                        "nodeData" : "1",
                        "files" : "example",
                        "append" : true,
                        "contentOrDestinationNodes" : {
                            "Metis" : "Yea, this thing."
                        },
                        "callback" : function(completedIO){
                            currentObject = completedIO;
                        }
                    }
                );
                
            }
        );

        it("should do so asynchronously", function() {
            expect(JSON.stringify(currentObject)).toEqual('{"example":{"hello":"world","Metis":"Yea, this thing."}}');
        });

    });

    // #endregion

    // #region Test Deleting Files

    describe("needs to delete a file", function() {

        beforeEach(
            function(){
                metis.file.Delete(
                    {
                        "nodeData" : "1",
                        "files" : "example",
                        "callback" : function(completedIO){
                            currentObject = completedIO;
                        }
                    }
                );
                
            }
        );

        it("should do so asynchronously", function() {
            expect(JSON.stringify(currentObject)).toEqual('{"example":{"status":"0.00"}}');
        });

    });

    // #endregion

    // #region Test Clearing All Files

    describe("needs to clear all files", function() {

        beforeEach(
            function(){
                metis.file.Create(
                    {
                        "nodeData" : "1",
                        "files" : "example",
                        "contentOrDestinationNodes" : {
                            "hello" : "world"
                        },
                        "callback" : function(){
                            metis.file.ClearAll(); // Clear all files
                        }
                    }
                );
            }
        );

        it("should remove the files from the device.", function() {
            expect(localStorage.length).toEqual(0); // Expect to be zero
        });

    });

    // #endregion

});