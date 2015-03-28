package metis

import (
    "fmt"
    "encoding/json"
    "io/ioutil"
)

// #region Package Variables

var NodeList, Settings interface{} // Define NodeList and Settings as a generic interfaces

// #endregion

// #region Metis Initialization Function

func Init() bool {
    initializationSuccessful := true // Define initializationSuccessful as a bool default to true

    // #region NodeList Fetch and Setting

    settingsByteContent, settingsFetchFailure := ioutil.ReadFile("config/settings.json") // Fetch the settingsByteContent and/or settingsFetchFailure
    nodeListByteContent, nodeListFetchFailure := ioutil.ReadFile("config/nodeList.json") // Fetch the nodeListByteContent and/or nodeListFetchFailure

    if (settingsFetchFailure == nil) && (nodeListFetchFailure == nil) { // If there was no fetch error for either settings or nodeList.json
        settingsDecodeError := json.Unmarshal(settingsByteContent, &Settings) // Decode the settings.json into metis.Settings
        nodeListDecodeError := json.Unmarshal(nodeListByteContent, &NodeList) // Decode the NodeList.json into metis.NodeList

        if (settingsDecodeError != nil) || (nodeListDecodeError != nil) { // If there was decoding error for either settings or nodelist
            if settingsDecodeError != nil { // If there a settings decode error
                fmt.Println(settingsDecodeError) // Output the settings decode error
            }
            if nodeListDecodeError != nil { // If there a nodeList decode error
                fmt.Println(nodeListDecodeError) // Output the nodeList decode error
            }

            initializationSuccessful = false // Define initializationSuccess as false
        }
    } else { // If there was a fetch error
        if settingsFetchFailure != nil { // If there a settings decode error
            fmt.Println("Failed to find settings.json. Please verify there is a settings.json in the config folder.")
        }
        if nodeListFetchFailure != nil { // If there a nodeList decode error
            fmt.Println("Failed to find nodeList.json. Please verify there is a nodeList.json in the config folder.")
        }

    }

    // #endregion

    return initializationSuccessful
}

// #endregion
