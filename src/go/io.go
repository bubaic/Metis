package metis

// #region Object Merger
// This will merge the contents of two JSON Objects, prioritizing the new content key/vals while retaining existing key/vals with no changes from new content

func ObjectMerger(){

}

// #endregion

// #region Primary File IO Handler
// URI is the resource identifier. This can either be a URL to a remote Metis session or local NodeGroup / Nodes

func Manage(uri, action string, files []string, fileContent interface{}) string {
    ioResponse := "" // Define ioResponse as an empty string that'll hold the IO response

    func (uri, action string, files []string, fileContent interface{}){ // Create an inner func that is passed the func arguments from metis.Manage
        filesLength := len(files) // Define filesLength as the length of files. We will use this in conjunction with fileFinalizedIOHandler to determine when to exit
        fileFinalizedIOHandler := make(chan string, filesLength) // Create a channel to pass along finished file IO that is the length of the files []string

        // #region File IO Return Handler

        for {
            select {
                case fileContent := <- fileFinalizedIOHandler: // When we receive fileContent
                    // #region Response Handler

                    // #endregion

                    filesLength = filesLength -1 // Return the filesLength by 1

                    if filesLength == 0 { // If we have received content for all files
                        close(fileFinalizedIOHandler) // Close the fileFinalizedIOHandler channel
                        return // Exit the function
                    }
            }
        }

        // #endregion
    }(uri, action, files, fileContent)

    return ioResponse
}

// #endregion
