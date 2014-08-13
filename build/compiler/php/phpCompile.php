<?php
	// Include a modified version of PHP-compressor (code.google.com/p/php-compressor/)
	class Compressor{static$RESERVED_VARS=array('$GLOBALS'=>1,'$_ENV'=>1,'$_SERVER'=>1,'$_SESSION'=>1,'$_REQUEST'=>1,'$_GET'=>1,'$_POST'=>1,'$_FILES'=>1,'$_COOKIE'=>1,'$HTTP_RAW_POST_DATA'=>1,'$php_errormsg'=>1,'$http_response_header '=>1,'$argc '=>1,'$argv '=>1,'$this'=>1);var$comment=null;var$keep_line_breaks=false;private$tokens=array();function load($B){$this->add_tokens($B);}function run(){$this->shrink_var_names();$this->remove_public_modifier();return$this->generate_result();}private function generate_result(){$C="<?php\n";if($this->comment){foreach($this->comment as$Q){$C.="# ".trim($Q)."\n";}}foreach($this->tokens as$D){$B=$D[1];if(!strlen($B))continue;if(preg_match("~^\\w\\w$~",$C[strlen($C)-1].$B[0]))$C.=" ";$C.=$B;}return$C;}private function remove_public_modifier(){for($A=0;$A<count($this->tokens)-1;$A++){if($this->tokens[$A][0]==T_PUBLIC)$this->tokens[$A]=$this->tokens[$A+1][1][0]=='$'?array(T_VAR,"var"):array(-1,"");}}private function shrink_var_names(){$G=array();$N=array();for($A=0;$A<count($this->tokens);$A++){list($J,$B)=$this->tokens[$A];if($J!=T_VARIABLE)continue;if(isset(self::$RESERVED_VARS[$B]))continue;if($A>0){$P=$this->tokens[$A-1][0];if($P==T_DOUBLE_COLON)continue;if($this->is_class_scope($A))continue;}$N[]=$A;if(!isset($G[$B]))$G[$B]=0;$G[$B]++;}arsort($G);$O=array();$A=0;foreach(array_keys($G)as$K){$O[$K]=$this->encode_id($A);$A++;}unset($G);foreach($N as$I){$K=$this->tokens[$I][1];$this->tokens[$I][1]='$'.$O[$K];}}private function is_class_scope($I){while($I--){$J=$this->tokens[$I][0];if($J==T_CLASS)return true;if($J==T_FUNCTION)return false;}return false;}private function add_tokens($B){$F=token_get_all(trim($B));if(!count($F))return;if(is_array($F[0])&&$F[0][0]==T_OPEN_TAG)array_shift($F);$M=count($F)-1;if(is_array($F[$M])&&$F[$M][0]==T_CLOSE_TAG)array_pop($F);$L=count($this->tokens)?"\n":"";foreach($F as$D){if(!is_array($D))$D=array(-1,$D);if($D[0]==T_COMMENT||$D[0]==T_DOC_COMMENT)continue;if($D[0]==T_WHITESPACE){$L.=$D[1];continue;}if($this->keep_line_breaks&&strpos($L,"\n")!==false){$this->tokens[]=array(-1,"\n");}$this->tokens[]=$D;$L="";}}private function encode_id($E){$C="";if($E>52){$C.=$this->encode_id_digit($E%53);$E=floor($E/53);}while($E>62){$C.=$this->encode_id_digit($E%63);$E=floor($E/63);}$C.=$this->encode_id_digit($E);return$C;}private function encode_id_digit($H){if($H<26)return chr(65+$H);if($H<52)return chr(71+$H);if($H==52)return"_";return chr($H-5);}}

	$licenseHeader = file_get_contents("build/compiler/php/licenseHeader.txt"); // Get the Apache v2 license header to add to class content

	$metisClassContent = ""; // Declare metisClassContent, which will (as the name implies) be the content of the Metis class
	$modules = array("src/php" => array("io.php", "queuer.php", "sys.php", "utils.php")); // Declare $modules as an array of folders and files that need to be compressed

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
			$metisClassContent = $metisClassContent . $tmpFileContent; // Append the compressed file to the Metis class content
		}
		chdir("../../");
	}

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

	$metisClassCompressor = new Compressor; // Generate a compressor that'll only be used in the end for compressing Metis beginning content
	$metisClassCompressor->keep_line_breaks = false; // Ensure all line breaks are removed
	$metisClassCompressor->load($metisClassContent); // Load the Metis class content
	$metisContent_Compressed = $metisClassCompressor->run(); // Run the compressor

	$finalizedMetisClassContent = str_replace("<?php", "<?php \n" . $licenseHeader . "\n", $metisContent_Compressed) . "\n?>"; // Prepend the Apache v2 license header to class content and append ending PHP tag
	file_put_contents("build/metis.php", $finalizedMetisClassContent); // Create a file Handler called compileSave
?>
