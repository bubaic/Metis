package main

import (
    "net/http"
)

// #region Metis Puppeteering Server Handler

func metisPuppetServe(writer http.ResponseWriter, requester *http.Request) {
	writer.Write([]byte("Puppeteering not yet implemented."))
}

// #endregion