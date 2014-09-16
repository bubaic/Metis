currentTest = 0;
potentialInterval = ""; // Set potentialInterval
suite = "Metis"; // Set the "suite" of tests to Metis
testResults = {}; // Define tests as an empty Object that we will put test results in

function testDone(){ // Define done as a function to call when the test is done

    // #region Test Summary Creation
    for (var testDescription in testResults){ // For each test in the testResults
        var testOutput = suite + " " + testDescription; // Start off the testOuput with suite + description (example: Metis needs to write to a file)
        testOutput += " and this action "; // Append "and this action". Total example so far "Metis needs to write to a file and this action "

        if (testResults[testDescription] == true){ // If the test succeeded
            testOutput += "did ";
        }
        else{ // If the test failed
            testOutput += "did not ";
        }

        testOutput += "pass.";

        console.log(testOutput); // Log the output (example: "Metis needs to write to a file and this action did pass.
    }
    // #endregion

}

function nextTest(){ // Run the next test
    currentTest += 1; // Next Test
    var newKey = Object.keys(tests)[currentTest];

    tests[newKey](); // Execute the new test
}

metis.Init(
    {
        "Callback" : "https://stroblindustries.com/~metis/simulator",
        "Headless" : false
    }
);

tests = { // Define the tests that will be executed
    "needs to write to a file" : function(){
        metis.file.Create(
            {
                "nodeData" : "1",
                "files" : "example",
                "contentOrDestinationNodes" : {
                    "hello" : "world"
                },
                "callback" : function(completedIO){
                    if (JSON.stringify(completedIO) == '{"example":{"status":"0.00"}}'){ // If the output matches
                        testResults["needs to write to a file"] = true; // The test succeeded
                    }
                    else{ // If the output does NOT match
                        testResults["needs to write to a file"] = false; // The test failed
                    }

                    nextTest(); // Execute next test
                }
            }
        );
    },
    "needs to update a file" : function(){
        metis.file.Update(
            {
                "nodeData" : "1",
                "files" : "example",
                "append" : true,
                "contentOrDestinationNodes" : {
                    "Metis" : "Yea, this thing."
                },
                "callback" : function(completedIO){
                    if (JSON.stringify(completedIO) == '{"example":{"hello":"world","Metis":"Yea, this thing."}}'){ // If the output matches
                        testResults["needs to update a file"] = true; // The test succeeded
                    }
                    else{ // If the output does NOT match
                        testResults["needs to update a file"] = false; // The test failed
                    }

                    nextTest(); // Execute next test
                }
            }
        );
    },
    "needs to read a file" : function(){
        metis.file.Read(
            {
                "nodeData" : "1",
                "files" : "example",
                "callback" : function(completedIO){
                    if (JSON.stringify(completedIO) == '{"example":{"hello":"world","Metis":"Yea, this thing."}}'){ // If the output matches
                        testResults["needs to read a file"] = true; // The test succeeded
                    }
                    else{ // If the output does NOT match
                        testResults["needs to read a file"] = false; // The test failed
                    }

                    nextTest(); // Execute next test
                }
            }
        );
    },
    "need to delete a file" : function(){
        metis.file.Delete(
            {
                "nodeData" : "1",
                "files" : "example",
                "callback" : function(completedIO){
                    if (JSON.stringify(completedIO) == '{"example":{"status":"0.00"}}'){ // If the output matches
                        testResults["needs to delete a file"] = true; // The test succeeded
                    }
                    else{ // If the output does NOT match
                        testResults["needs to delete a file"] = false; // The test failed
                    }

                    nextTest(); // Execute next test
                }
            }
        );
    },
    "needs to handle CORS issues" : function(){
        metis.file.Read(
            {
                "nodeData" : "corsDisableTest",
                "files" : "cors",
                "callback" : function(completedIO){
                    if (JSON.stringify(completedIO) == '{"cors":{"error":"CORS Disabled"}}'){ // If the error property is defined as "CORS Disabled"
                        testResults["needs to handle CORS issues"] = true; // The test succeeded
                    }
                    else{ // If the error property is set to CORS Disabled
                        testResults["needs to handle CORS issues"] = false; // The test failed
                    }

                    testDone(); // Call testDone function
                }
            }
        );
    }
}

tests[Object.keys(tests)[0]](); // Execute the first test