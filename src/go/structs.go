package main

// #region Config Structure

type Config struct {
	EnablePuppeteering bool
	Port               int
	PuppeteeringPort   int
}

// #endregion

// #region APIRequest Structure

type APIRequest struct {
	NodeData interface{}
	Action string
	Content          interface{}
	Files            []string
}

// #endregion

// #region ErrorResponse Structure

type ErrorResponse struct {
	Error string
}

// #endregion
