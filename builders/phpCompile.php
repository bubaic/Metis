<?php
	include("php-compressor.php"); // Include a modified version of PHP-compressor (code.google.com/p/php-compressor/)
	$licenseHeader = file_get_contents("licenseHeader.txt"); // Get the Apache v2 license header to add to class content
	chdir("../"); // Move to Metis root directory

	$metisClassContent = ""; // Declare metisClassContent, which will (as the name implies) be the content of the Metis class
	$modules = array("php" => array("io.php", "queuer.php", "sys.php", "utils.php")); // Declare $modules as an array of folders and files that need to be compressed

	$functionConversionArray = array( // Array of functions that need to be converted, their initial values (keys) and converted values (vals)
		"= fileHashing" => '= $this->fileHashing', "(fileHashing" => '($this->fileHashing',
		"= fileIOArrayMerger" => '= $this->fileIOArrayMerger',
		"= fileActionHandler" => '= $this->fileActionHandler', "return fileActionHandler" => 'return $this->fileActionHandler',
		"= readJsonFile"=> '= $this->readJsonFile',
		"= decodeJsonFile" => '= $this->decodeJsonFile',
		"= createJsonFile" => '= $this->createJsonFile',
		"= updateJsonFile" => '= $this->updateJsonFile',
		"= replicator" => '= $this->replicator',
		"= navigateToLocalMetisData" => '= $this->navigateToLocalMetisData',
		"= nodeDataParser" => '= $this->nodeDataParser', "= nodeInfo" => '= $this->nodeInfo', "(nodeInfo" => '($this->nodeInfo',
		"= metisInit" => '= $this->metisInit',
		"= backupQueuer" => '= $this->backupQueuer', "= http_request" => '= $this->http_request',
		'$GLOBALS[\'nodeList\']' => '$this->nodeList', '$GLOBALS[\'directoryHostingMetis\']' => '$this->directoryHostingMetis'
	);

	foreach ($modules as $folderName => $files){ // For every folder listed in modules
		echo "Going to /$folderName. \n";
		chdir($folderName); // Move into the directory (ex. core)

		foreach ($files as $fileName){ // For every file list in directory that we've whitelisted
			$currentFileHandler = fopen($fileName, "r"); // Create a file handler (fileName)
			$tmpFileContent = ""; // Create a variable that holds the file content

			while (($fileContentLine = fgets($currentFileHandler)) !== false){ // For each line in the file
				$newFileLine = str_replace(array_keys($functionConversionArray), array_values($functionConversionArray), $fileContentLine); // Replace any function() call with $this->function() and remove global calls
				$tmpFileContent = $tmpFileContent . $newFileLine; // Add the line to file content
			}
			fclose($currentFileHandler); // Close the file

			$tmpFileContent = str_replace(array("<?php", "?>"), "", $tmpFileContent); // Remove all unnecessary PHP tags

			echo "Adding modified $fileName to Metis class content. \n";
			$metisClassContent = $metisClassContent . $tmpFileContent; // Append the compressed file to the Metis class content
		}
		chdir("../");
	}

	echo "Doing final touches on Metis class. \n";

	$metisConstructionContent = 'class Metis{
		public $nodeList = "";
		public $directoryHostingMetis = "";
		function __construct(){
			$returnedNodeListData = $this->metisInit();
			$this->nodeList = $returnedNodeListData[0];
			$this->directoryHostingMetis = $returnedNodeListData[1];
		}
	';
	$metisClassContent = "<?php " . $metisConstructionContent . $metisClassContent . "}"; // Finalize the Metis class content by adding beginning and end to main code

	echo "Saving compressed Metis class. \n";

	$metisClassCompressor = new Compressor; // Generate a compressor that'll only be used in the end for compressing Metis beginning content
	$metisClassCompressor->keep_line_breaks = false; // Ensure all line breaks are removed
	$metisClassCompressor->load($metisClassContent); // Load the Metis class content
	$metisContent_Compressed = $metisClassCompressor->run(); // Run the compressor

	$finalizedMetisClassContent = str_replace("<?php", "<?php \n" . $licenseHeader . "\n", $metisContent_Compressed) . "\n?>"; // Prepend the Apache v2 license header to class content and append ending PHP tag
	file_put_contents("metis.php", $finalizedMetisClassContent); // Create a file Handler called compileSave

	echo "Finished compressed Metis. \n";
?>
