<?php
	include("php-compressor.php"); // Include a modified version of PHP-compressor (code.google.com/p/php-compressor/)
	chdir("../"); // Move to Metis root directory

	$metisClassContent = ""; // Declare metisClassContent, which will (as the name implies) be the content of the Metis class
	$modules = array("core" => array("fileIO.php", "system.php", "utilities.php")); // Declare $modules as an array of folders and files that need to be compressed

	$functionStrings = array( /* Array of functions that exist in Metis that need to be replaced with $this->function() */
		"= fileHashing","= fileActionHandler", "= readJsonFile", "= decodeJsonFile", "= createJsonFile", "= updateJsonFile", "= replicator",
		"= nodeDataParser", "= metisInit"
	);

	$functionStringsReplace = array( /* Strings of functions content that'll replace $functionStrings array items */
		'= $this->fileHashing','= $this->fileActionHandler', '= $this->readJsonFile', '= $this->decodeJsonFile', '= $this->createJsonFile', '= $this->updateJsonFile',
		'= $this->replicator','= $this->nodeDataParser', '= $this->metisInit'
	);

	foreach ($modules as $folderName => $files){ // For every folder listed in modules
		echo "Going to /$folderName. \n";
		chdir($folderName); // Move into the directory (ex. core)
		foreach ($files as $fileName){ // For every file list in directory that we've whitelisted
			$currentFileHandler = fopen($fileName, "r"); // Create a file handler (fileName)
			$tmpFileContent = ""; // Create a variable that holds the file content

			while (($fileContentLine = fgets($currentFileHandler)) !== false){ // For each line in the file
				$newFileLine = str_replace($functionStrings, $functionStringsReplace, $fileContentLine); // Replace any function() call with $this->function()
				$tmpFileContent = $tmpFileContent . $newFileLine; // Add the line to file content
			}

			fclose($currentFileHandler); // Close the file

			$PHPCompressor = new Compressor; // Generate a new Compressor
			$PHPCompressor->keep_line_breaks = false;

			echo "Loading $fileName for compression. \n";
			$PHPCompressor->load($tmpFileContent); // Load the content into the compressor

			echo "Compressing $fileName. \n";
			$compressedFile = $PHPCompressor->run(); // Define compressedFile as the PHPCompressor output (compressed PHP)
			$compressedFile = str_replace(array("<?php", "?>"), "", $compressedFile); // Remove the unnecessary PHP tags

			echo "Adding compressed $fileName to Metis class content. \n";
			$metisClassContent = $metisClassContent . $compressedFile; // Append the compressed file to the Metis class content
		}
		chdir("../");
	}



	echo "Doing final touches on Metis class. \n";
	$metisClassContent = "class Metis{" . $metisClassContent . "\n }"; // Add the class Metis wrapper around the content

	echo "Saving Metis class. \n";
	$compileSave = fopen("metis.min.php", "w+"); // Create a file Handler called compileSave
	fwrite($compileSave, $metisClassContent); // Save the content
	fclose($compileSave); // Close the file

	echo "Finished compressed Metis. \n";
?>