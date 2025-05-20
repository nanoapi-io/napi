# NanoAPI C Plugin

This plugin manages parsing and mapping of dependencies in C projects.

**Warning :** This plugin relies on tree-sitter, which has an unreliable parser for C. Not every C project is entirely compatible. Warnings may be issued where tree-sitter finds errors.

## Class diagram

```mermaid
classDiagram
    class CMetricsAnalyzer {
        +analyzeNode(node: Parser.SyntaxNode): CComplexityMetrics
    }

    class CExtractor {
        -manifest: DependencyManifest
        -registry: Map<string, CFile>
        -includeResolver: CIncludeResolver
        +extractSymbols(symbolsMap: Map<string, SymbolsToExtract>): Map<string, File>
    }

    class CSymbolRegistry {
        -headerResolver: CHeaderResolver
        -files: Map<string, File>
        +getRegistry(): Map<string, CFile>
    }

    class CHeaderResolver {
        +resolveSymbols(file: File): ExportedSymbol[]
    }

    class CIncludeResolver {
        -symbolRegistry: Map<string, CFile>
        -files: Map<string, File>
        +getInclusions(): Map<string, Inclusions>
    }

    class CInvocationResolver {
        -includeResolver: CIncludeResolver
        +getInvocationsForSymbol(symbol: Symbol): Invocations
        +getInvocationsForFile(filepath: string): Invocations
    }

    class CDependencyFormatter {
        -symbolRegistry: CSymbolRegistry
        -includeResolver: CIncludeResolver
        -invocationResolver: CInvocationResolver
        +formatFile(filepath: string): CDepFile
    }

    class Symbol {
        <<abstract>>
        -name: string
        -declaration: ExportedSymbol
    }

    class FunctionSignature {
        -definition: FunctionDefinition
        -isMacro: boolean
    }

    class FunctionDefinition {
        -signature: FunctionSignature
        -isMacro: boolean
    }

    class DataType {
        -typedefs: Map<string, Typedef>
    }

    class Typedef {
        -datatype: DataType
    }

    class Variable {
        -isMacro: boolean
    }

    class CFile {
        -file: File
        -symbols: Map<string, Symbol>
        -type: CFileType
    }

    class ExportedSymbol {
        -name: string
        -type: SymbolType
        -specifiers: StorageClassSpecifier[]
        -qualifiers: TypeQualifier[]
        -node: Parser.SyntaxNode
        -identifierNode: Parser.SyntaxNode
        -filepath: string
    }

    class Inclusions {
        -filepath: string
        -symbols: Map<string, Symbol>
        -internal: string[]
        -standard: Map<string, Parser.SyntaxNode>
    }

    class Invocations {
        -resolved: Map<string, Symbol>
        -unresolved: Set<string>
    }

    class CDependency {
        -id: string
        -isExternal: boolean
        -symbols: Record<string, string>
    }

    class CDepFile {
        -id: string
        -filePath: string
        -rootNode: Parser.SyntaxNode
        -lineCount: number
        -characterCount: number
        -dependencies: Record<string, CDependency>
        -symbols: Record<string, CDepSymbol>
    }

    class CDepSymbol {
        -id: string
        -type: CDepSymbolType
        -lineCount: number
        -characterCount: number
        -node: Parser.SyntaxNode
        -dependents: Record<string, CDependent>
        -dependencies: Record<string, CDependency>
    }

    class CComplexityMetrics {
        -cyclomaticComplexity: number
        -codeLinesCount: number
        -linesCount: number
        -codeCharacterCount: number
        -characterCount: number
    }

    class CodeCounts {
        -lines: number
        -characters: number
    }

    class CommentSpan {
        -start: Point
        -end: Point
    }

    %% Relationships
    Symbol <|-- FunctionSignature
    Symbol <|-- FunctionDefinition
    Symbol <|-- DataType
    Symbol <|-- Typedef
    Symbol <|-- Variable
    CSymbolRegistry --> CFile
    CSymbolRegistry --> CHeaderResolver
    CIncludeResolver --> CSymbolRegistry
    CInvocationResolver --> CIncludeResolver
    CDependencyFormatter --> CSymbolRegistry
    CDependencyFormatter --> CIncludeResolver
    CDependencyFormatter --> CInvocationResolver
    CExtractor --> CSymbolRegistry
    CExtractor --> CIncludeResolver
    CExtractor --> CFile
    CFile --> Symbol
    Typedef --> DataType
    DataType --> Typedef
    Invocations --> Symbol
    Inclusions --> Symbol
    CDepFile --> CDependency
    CDepFile --> CDepSymbol
    CDepSymbol --> CDependent
    CDepSymbol --> CDependency
    CMetricsAnalyzer --> CComplexityMetrics
    CMetricsAnalyzer --> CodeCounts
    CMetricsAnalyzer --> CommentSpan
```
