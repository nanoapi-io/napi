import Parser, { type Language } from "tree-sitter";
import Python from "npm:tree-sitter-python";
import CSharp from "npm:tree-sitter-c-sharp";
import C from "tree-sitter-c";
import Java from "npm:tree-sitter-java";
import PHP from "tree-sitter-php";

const pythonParser = new Parser();
pythonParser.setLanguage(Python as Language);
const pythonLanguage = Python.name as "python";

const csharpParser = new Parser();
csharpParser.setLanguage(CSharp as Language);
const csharpLanguage = CSharp.name as "c-sharp";

const cParser = new Parser();
cParser.setLanguage(C as Language);
const cLanguage = C.name as "c";

const javaParser = new Parser();
javaParser.setLanguage(Java as Language);
const javaLanguage = Java.name as "java";

const phpParser = new Parser();
phpParser.setLanguage(PHP.php_only as Language);
const phpLanguage = PHP.php_only.name as "php";

export {
  cLanguage,
  cParser,
  csharpLanguage,
  csharpParser,
  javaLanguage,
  javaParser,
  phpLanguage,
  phpParser,
  pythonLanguage,
  pythonParser,
};
