import Parser from "tree-sitter";
import Typescript from "tree-sitter-typescript";
import JavascriptPlugin from "./javascript";

class TypescriptPlugin extends JavascriptPlugin {
  constructor() {
    super();
    this.parser.setLanguage(Typescript.typescript);
  }

  _getIdentifierUsagesQuery(identifier: Parser.SyntaxNode) {
    return new Parser.Query(
      this.parser.getLanguage(),
      `
        (
          ([
            (identifier)
            (type_identifier)
          ]) @identifier
          (#eq? @identifier "${identifier.text}")
        )
      `,
    );
  }

  _getExportIdentifierQuery() {
    return new Parser.Query(
      this.parser.getLanguage(),
      `
        declaration: ([
          (_
            name: ([(identifier) (type_identifier)]) @identifier
          )
          (_
            (_
              name: ([(identifier) (type_identifier)]) @identifier
            )
          )
        ])
      `,
    );
  }
}

export default TypescriptPlugin;
