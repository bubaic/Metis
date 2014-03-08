<?php
	/*
		Metis is an open source and highly robust JSON distributed database / storage solution. MetisDB requires AtlasUI Web Framework v0.40
		in order to carry out important operations such as string hashing. AtlasUI Web Framework is distributed
		and applies under the Apache License v2.0. You can find AtlasUI Web Framework at https://github.com/JoshStrobl/AtlasUI.
		This header applies to ALL files included with Metis.

		-----

		Copyright 2013 Strobl Industries

		Licensed under the Apache License, Version 2.0 (the "License");
		you may not use this file except in compliance with the License.
		You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0

		Unless required by applicable law or agreed to in writing, software distributed under the
		License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS
		OF ANY KIND, either express or implied. See the License for the specific language governing
		permissions and limitations under the License.
	*/

	include("core/fileIO.php"); // File Input / Output, encoding and decoding files, etc.
	//include("core/security.php"); // Security (Functionality Not Yet Known Or Implemented)
	include("core/system.php"); // Metis system functionality (mainly related to Nodes)
	include("core/utilities.php"); // Misc. utilities, such as conversion from MySQL to Metis

	$returnedNodeListData = metisInit();
	$nodeList = $returnedNodeListData[0];
	$directoryHostingMetis = $returnedNodeListData[1];
?>