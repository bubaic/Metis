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
	NodeData, Action, Content string
	Files []string
}

// #endregion

// #region ErrorResponse SStructure

type ErrorResponse struct {
	Error string
}

// #endregion