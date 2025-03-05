import Parser from "tree-sitter";
import Python from "tree-sitter-python";
import Javascript from "tree-sitter-javascript";
import Typescript from "tree-sitter-typescript";

const pythonParser = new Parser();
pythonParser.setLanguage(Python);

const javascriptParser = new Parser();
javascriptParser.setLanguage(Javascript);

const typescriptParser = new Parser();
typescriptParser.setLanguage(Typescript.typescript);

export { pythonParser, javascriptParser, typescriptParser };
