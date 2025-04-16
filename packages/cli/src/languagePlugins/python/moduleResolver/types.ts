export const PYTHON_MODULE_TYPE = "module";
export const PYTHON_PACKAGE_MODULE_TYPE = "package";
export const PYTHON_NAMESPACE_MODULE_TYPE = "namespace";

/**
 * Represents the different types of Python modules that can exist in a project.
 *
 * - module: A standard Python file (.py)
 * - package: A directory with an __init__.py file
 * - namespace: A directory containing Python modules/packages but without an __init__.py
 */
export type PythonModuleType =
  | typeof PYTHON_MODULE_TYPE
  | typeof PYTHON_PACKAGE_MODULE_TYPE
  | typeof PYTHON_NAMESPACE_MODULE_TYPE;

/**
 * Represents a Python module or package within a project's module tree.
 *
 * Each module has a simple name, a full dotted path name (fullName),
 * a file system path, a type (regular module, package, or namespace),
 * a collection of child modules (if any), and an optional reference to its parent module.
 *
 * Examples:
 * - Regular module: example.py (type: "module")
 * - Package: directory with __init__.py (type: "package")
 * - Namespace package: directory without __init__.py (type: "namespace")
 */
export interface PythonModule {
  /** The simple name of the module (e.g., 'math' from 'mypackage.math') */
  name: string;
  /** The full dotted name of the module (e.g., 'mypackage.math') */
  fullName: string;
  /** The filesystem path to the module */
  path: string;
  /** The type of module (regular, package, or namespace) */
  type: PythonModuleType;
  /** Map of child modules (relevant for packages and namespace packages) */
  children: Map<string, PythonModule>;
  /** Reference to the parent module (undefined for top-level modules) */
  parent?: PythonModule;
}
