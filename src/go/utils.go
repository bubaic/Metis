package main

import (
	"reflect"
	"strings"
)

func CheckStringArray(array []string, item string) bool {
	hasString := false // Default hasString to false

	if reflect.TypeOf(array).String() == "[]string" { // If this is a string array
		for _, val := range array {
			if strings.TrimSpace(val) == strings.TrimSpace(item) { // If the trimmed item and key are the same
				hasString = true // Change to true
			}
		}
	}

	return hasString
}
