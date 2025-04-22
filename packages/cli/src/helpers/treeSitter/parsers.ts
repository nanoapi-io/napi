import Parser, { Language } from "tree-sitter";
import Python from "tree-sitter-python";
import CSharp from "tree-sitter-c-sharp";

const pythonParser = new Parser();
pythonParser.setLanguage(Python as Language);
const pythonLanguage = Python.name as "python";

const csharpParser = new Parser();
csharpParser.setLanguage(CSharp as Language);
const csharpLanguage = CSharp.name as "c-sharp";

export { pythonParser, pythonLanguage, csharpParser, csharpLanguage };
