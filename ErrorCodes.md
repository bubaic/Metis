We will return a numerical code in the event of an error or a success (*success code returns for writing, replicating, etc.*). Except for the case of a success code, we will always return the code as an int.

- 0.00 - Success
- 1.xx - Any error beginning with an int of 1 is related to connections.
- 2.xx - Any error beginning with an int of 2 is related to fetching / reading a file. In the event that such fetching / reading is the result of a connection failure, we return a 1.xx code.
- 3.xx - Any error beginning with an int of 3 is related to writing / updating a file. In the event that such fetching / reading is the result of a connection failure, we return a 1.xx code. In the event
that the error is the result of failing to read a file (necessary for updating with the "a" *appending* flag), we will return a 2.xx or a 1.xx, depending on the scenario.
- 4.xx - Any error beginning with an int of 4 is relating to the deletion of a file.
- 5.xx - Any error beginning with an int of 5 is related to utilities.

---

### Connections

- 1.01 - Invalid or missing nodeList.
- 1.02 - Node Group or Individual Node does not exist.
- 1.03 - Failing to get a particular value from a node.
- 1.04 - "backup" is defined as a preferential location for a Node. This is a system-only folder.
- 1.05 - CURL error.
- 1.06 - Failure to connect to the MySQL database.

---

## Fetching / Reading File
- 2.01 - Failure to navigate to the parent directory of Metis.
- 2.02 - The node's type is not "local" or "remote".
- 2.03 - The action fileActionHandler is taking is not valid. It needs to be r, w, a, or d.
- 2.04 - The node's preferential location is empty (string length is 0).
- 2.05 - File does not exist.
- 2.06 - Json Decoding has failed (refer to [PHP documentation](http://php.net/manual/en/function.json-decode.php)). You may want to use json_last_error() to find the issue.

---

## Writing A File

- 3.01 - Json Encoding has failed (refer to [PHP documentation](http://php.net/manual/en/function.json-encode.php)).
- 3.02 - Quota Exceeded

---

## Deleting A File

- 4.01 - Failure to delete file. The file most likely doesn't exist.

---

## Utility Errors

- 5.01 - No table defined in the options of the mysqlToMetis() function.
