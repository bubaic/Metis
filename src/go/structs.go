package main

// Config Structure
// This structure reflects configuration options for Metis Server
type Config struct {
	EnablePuppeteering      bool
	Port                    int
	PuppeteeringPort        int
	DisableRequestListening bool
}

// APIRequest Structure
// This structure reflects the file-serving APIRequest
type APIRequest struct {
	NodeData interface{}
	Action   string
	Content  interface{}
	Files    []string
}

// PuppetAPIRequest struct
// This structure reflects the puppeteering APIRequest
type PuppetAPIRequest struct {
	Action  string
	Content interface{}
}

// ErrorResponse Structure
type ErrorResponse struct {
	Error string
}
