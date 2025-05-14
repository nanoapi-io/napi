import Parser, { type Language } from "npm:tree-sitter";
import Python from "npm:tree-sitter-python";
import CSharp from "npm:tree-sitter-c-sharp";

const pythonParser = new Parser();
pythonParser.setLanguage(Python as Language);
const pythonLanguage = Python.name as "python";

const csharpParser = new Parser();
csharpParser.setLanguage(CSharp as Language);
const csharpLanguage = CSharp.name as "c-sharp";

export { csharpLanguage, csharpParser, pythonLanguage, pythonParser };
