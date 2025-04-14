export const PYTHON_MODULE_TYPE = "module";
export const PYTHON_PACKAGE_MODULE_TYPE = "package";
export const PYTHON_NAMESPACE_MODULE_TYPE = "namespace";

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
 */
export interface PythonModule {
  name: string;
  fullName: string;
  path: string;
  type: PythonModuleType;
  children: Map<string, PythonModule>;
  parent?: PythonModule;
}
