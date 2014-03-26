<?php
	include("php-compressor.php"); // Include a modified version of PHP-compressor (code.google.com/p/php-compressor/)
	chdir("../"); // Move to Metis root directory

	$metisClassCompressor = new Compressor; // Generate a compressor that'll only be used in the end for compressing Metis beginning content
	$metisClassCompressor->keep_line_breaks = false;

	$metisClassContent = ""; // Declare metisClassContent, which will (as the name implies) be the content of the Metis class
	$modules = array("core" => array("fileIO.php", "system.php", "utilities.php")); // Declare $modules as an array of folders and files that need to be compressed

	$functionConversionArray = array( // Array of functions that need to be converted, their initial values (keys) and converted values (vals)
		"= fileHashing" => '= $this->fileHashing', "= fileActionHandler" => '= $this->fileActionHandler', "= readJsonFile"=> '= $this->readJsonFile',
		"= decodeJsonFile" => '= $this->decodeJsonFile', "= createJsonFile" => '= $this->createJsonFile', "= updateJsonFile" => '= $this->updateJsonFile',
		"= replicator" => '= $this->replicator', "= nodeDataParser" => '= $this->nodeDataParser', "= metisInit" => '= $this->metisInit',
		"= backupQueuer" => '= $this->backupQueuer'
	);

	foreach ($modules as $folderName => $files){ // For every folder listed in modules
		echo "Going to /$folderName. \n";
		chdir($folderName); // Move into the directory (ex. core)
		foreach ($files as $fileName){ // For every file list in directory that we've whitelisted
			$currentFileHandler = fopen($fileName, "r"); // Create a file handler (fileName)
			$tmpFileContent = ""; // Create a variable that holds the file content

			while (($fileContentLine = fgets($currentFileHandler)) !== false){ // For each line in the file
				if ((strpos($fileContentLine, 'global $nodeList') == false) && (strpos($fileContentLine, 'global $directoryHostingMetis') == false)){ // If the line does not have a global call
					$newFileLine = str_replace(array_keys($functionConversionArray), array_values($functionConversionArray), $fileContentLine); // Replace any function() call with $this->function()
					$newFileLine = str_replace(
						array('$nodeList', '$directoryHostingMetis'),
						array('$this->nodeList', '$this->directoryHostingMetis'), $newFileLine); // Replace any reference to public nodeList and directoryHostingMetis variables

					$tmpFileContent = $tmpFileContent . $newFileLine; // Add the line to file content
				}
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

	$metisConstructionContent = 'class Metis{public $nodeList = "";	public $directoryHostingMetis = "";function __construct(){$returnedNodeListData = $this->metisInit();
	$this->nodeList = $returnedNodeListData[0];$this->directoryHostingMetis = $returnedNodeListData[1];}';

	$metisClassCompressor->load(str_replace(array("\r", "\n"), "", $metisConstructionContent)); // Load the construction content
	$metisConstructionContent_Compressed = $metisClassCompressor->run(); // Save the construction content compressed

	$metisClassContent = $metisConstructionContent_Compressed . $metisClassContent . "}"; // Finalize the Metis class content by adding beginning and end to main code

	echo "Saving Metis class. \n";
	$compileSave = fopen("metis.min.php", "w+"); // Create a file Handler called compileSave
	fwrite($compileSave, $metisClassContent); // Save the content
	fclose($compileSave); // Close the file

	echo "Finished compressed Metis. \n";
?>