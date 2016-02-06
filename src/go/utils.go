package main

import (
	"strings"
)

func CheckStringArray(array []string, item string) bool {
	arrayString := "," + strings.Join(array, ",") + "," // Join strings together and surround in ,
	return strings.Contains(arrayString, "," + item + ",") // Check if the ",item," exists in the string
}
