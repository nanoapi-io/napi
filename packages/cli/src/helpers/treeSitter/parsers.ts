import Parser, { Language } from "tree-sitter";
import Python from "tree-sitter-python";
import Javascript from "tree-sitter-javascript";
import Typescript from "tree-sitter-typescript";
import CSharp from "tree-sitter-c-sharp";

const pythonParser = new Parser();
pythonParser.setLanguage(Python as Language);

const javascriptParser = new Parser();
javascriptParser.setLanguage(Javascript as Language);

const typescriptParser = new Parser();
typescriptParser.setLanguage(Typescript.typescript as Language);

const csharpParser = new Parser();
csharpParser.setLanguage(CSharp as Language);

export { pythonParser, javascriptParser, typescriptParser, csharpParser };
