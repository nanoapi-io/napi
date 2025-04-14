import Parser, { Language } from "tree-sitter";
import Python from "tree-sitter-python";
import CSharp from "tree-sitter-c-sharp";

const pythonParser = new Parser();
pythonParser.setLanguage(Python as Language);

const csharpParser = new Parser();
csharpParser.setLanguage(CSharp as Language);

export { pythonParser, csharpParser };
