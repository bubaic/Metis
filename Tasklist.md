This is the tasklist for Metis. If you stumbled here by accident, then feel free to [find out what the heck Metis is](https://github.com/StroblIndustries/Metis/blob/master/Readme.md).

**Backup**

- Optional automated multi-node backup that is flagged in the nodeList.json. Likely something along the lines of:

```

    {
            "1" : {
		    "Node Name" : "Local Storage",
            "Node Type" : "local",
            "Address" : "/path/to/parent/directory",
            "Username" : "",
            "Password" : "",
            "Preferential Location" : "folder_in_Metis_data",
            "Backup" : "2,3,4"
	    }
    }

```

**Core**

- Improvised garbage collecting if/where necessary


**MySQL**

- Implement MySQL to JSON functionality to convert MySQL databases / tables to JSON