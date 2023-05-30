import { createReadStream, createWriteStream, mkdir } from "fs";
import { createInterface } from "readline";
import { fileURLToPath } from "url";
import path from "path";

const DIST_PATH = path.join(
  fileURLToPath(import.meta.url),
  "../",
  "../",
  "dist"
);

// General TODOs:
// - Handle other http methods
// - Handle other function definitions (arrow, anonymous, const, etc)
// - Handle other dependency definitions (classes, etc)
// - Handle other dependency paths (node_modules, etc)
// - Handle other dependency formats (import, require, etc)
// - Handle other dependency exports (default, etc)
export class Compiler {
  constructor(entrypointFile) {
    this.entrypointFile = entrypointFile;
    this.baseProjectPath = path.dirname(this.entrypointFile);
    this.collectFunction = false;
    this.functionCounter = 0;
    this.functions = [];
    this.variables = {};
    this.dependencies = {};
    this.braces = [];
    this.lineReader = createInterface({
      input: createReadStream(entrypointFile),
    });
  }

  async compile() {
    let it = this.lineReader[Symbol.asyncIterator]();
    let processing = true;
    while (processing) {
      let next = await it.next();

      if (next.done) {
        processing = false;
        break;
      }

      await this.handleLine(next.value);
    }

    await this.makeDirectory();
    await this.writeNanoAPIFiles();
  }

  async handleLine(line) {
    // Check for deps and add them to the functions dep array
    if (this.isDependency(line)) {
      const list = line.split(" ");
      const asIndex = list.indexOf("as");
      const name = list[asIndex + 1];
      const pathString = list[asIndex + 3].split(";")[0];
      const matches = /^["'`]{1}(.*)["'`]{1}$/g.exec(pathString);
      const path = matches[1];

      // key, value of dep name, code
      this.dependencies[name] = {
        name,
        path,
      };

      // Find dependency functions
      try {
        this.dependencies[name].functions = await this.collectDependency(
          this.dependencies[name]
        );
      } catch (e) {
        console.error(e);
        console.log("Error handled in deps resolution");
      }
    }

    // If we see an endpoint definition or are iterating over one...
    if (this.isEndpoint(line) || this.collectFunction) {
      try {
        const shouldIgnoreFirstLine =
          this.braces.length === 0 && !this.collectFunction;

        // start the definition stack...
        if (line.includes("{")) {
          this.braces.push("{");

          if (!this.collectFunction) this.collectFunction = true;
        }

        if (line.includes("}")) this.braces.pop();

        // Check if the line references a dependency, and we have definitions for those deps
        Object.keys(this.dependencies).forEach((dep) => {
          if (
            line.includes(this.dependencies[dep].name) &&
            this.dependencies[dep].functions
          ) {
            // Check which function of the dep is being called
            Object.keys(this.dependencies[dep].functions).forEach((funct) => {
              if (line.includes(funct)) {
                // TODO: Should additional information be included?
                this.functions[this.functionCounter].dependencies.push({
                  code: this.dependencies[dep].functions[funct],
                  importedFrom: dep,
                  functionName: funct,
                });
              }
            });
          }
        });

        if (shouldIgnoreFirstLine) {
          const url = this.resolveUrl(line);
          this.functions[this.functionCounter] = { code: "" };
          this.functions[this.functionCounter].url = url;
          this.functions[this.functionCounter].name = this.resolveName(url);
          this.functions[this.functionCounter].dependencies = [];
          this.functions[this.functionCounter].method = this.resolveMethod(line);
          // TODO: Params may not be on this line
          const reqName = this.extractRequestParamName(line);
          const resName = this.extractResponseParamName(line);
          this.functions[this.functionCounter].requestParamName = reqName;
          this.functions[this.functionCounter].responseParamName = resName;
          this.functions[
            this.functionCounter
          ].code += `\nasync function main(${reqName}, ${resName}) {\n`;
        } else if (this.braces.length > 0) {
          this.functions[this.functionCounter].code += line + "\n";
        }

        // Reached the end of the function definition
        if (this.braces.length === 0) {
          this.functions[this.functionCounter].code += "};" + "\n";
          this.collectFunction = false;
          this.functionCounter++;
        }
      } catch (e) {
        console.error(e);
        this.lineReader.close();
        this.lineReader.removeAllListeners();
      }
    }
  }

  resolveUrl(line) {
    return line.split("'")[1]; // Assume first string
  }

  resolveName(url) {
    // TODO: Potentially remove leading _ by calling .shift after split
    return url.split("/").join("_");
  }

  // TODO: Could they be called anything else? How do we handle that?
  extractRequestParamName(line) {
    let lineArr = line.split(",");
    if (line.includes("next")) {
      return lineArr[lineArr.length - 3].split("(")[1].trim();
    }
    return lineArr[lineArr.length - 2].split("(")[1].trim();
  }

  extractResponseParamName(line) {
    let lineArr = line.split(",");
    if (line.includes("next")) {
      return lineArr[lineArr.length - 2].trim();
    }
    return lineArr[lineArr.length - 1].split(")")[0].trim();
  }

  collectDependency(dependency) {
    return new Promise((resolve, reject) => {
      const dependencyPath = path.resolve(
        this.baseProjectPath,
        dependency.path
      );
      console.log(dependencyPath);
      const depFunctions = {};
      let currentName = "";
      let brackets = [];
      let presetFirstLine = false;

      if (!dependency.path.includes(".js")) {
        console.error("Node module tree shaking not yet implemented.");
        return resolve([]);
      }

      const depReader = createInterface({
        input: createReadStream(dependencyPath),
      });

      depReader.on("line", (line) => {
        // TODO: check other function definitions
        if (line.includes("function")) {
          const lines = line.split(" ");
          const index = lines.indexOf("function");
          const name = lines[index + 1].split("(")[0];

          // TODO: Other ways to define functions?
          if (lines[0] == "export") {
            lines.shift();
          }

          currentName = name;
          depFunctions[currentName] = lines.join(" ") + "\n";
          presetFirstLine = true;
        }

        if (currentName) {
          if (line.includes("{")) brackets.push("{");

          if (line.includes("}")) brackets.pop();

          if (!presetFirstLine) depFunctions[currentName] += line + "\n";

          if (brackets.length === 0) currentName = ""; // End of function def
        }

        presetFirstLine = false;
      });

      depReader.on("close", () => {
        return resolve(depFunctions);
      });
    });
  }

  resolveMethod(line) {
    if (line.includes("get")) return "GET";
    if (line.includes("post")) return "POST";
  }

  isEndpoint(line) {
    return line.includes(".get(")
      || line.includes(".post(");
  }

  isDependency(line) {
    return line.includes("import") || line.includes("require");
  }

  async makeDirectory() {
    return new Promise((resolve, reject) => {
      mkdir(DIST_PATH, (err) => {
        if (err) {
          // EEXIST is thrown when dir exists, handle gracefully
          if (err && err.code === "EEXIST") {
            return resolve();
          }

          return reject(err);
        }

        return resolve();
      });
    });
  }

  async writeNanoAPIFiles() {
    // For each endpoint...
    for (let api of this.functions) {
      let createdNamespaces = [];
      const writer = createWriteStream(path.join(DIST_PATH, api.name + ".js"));

      // Write header including http method and url
      // TODO: Handle other methods
      writer.write(
        `// @napi:methods=${api.method}` + "\n" + `// @napi:url=${api.url}` + "\n"
      );
      // Write response overwrites
      writer.write("function responseOverwrite(values) { return values; }\n");

      // include code of dependencies...
      for (let dep of api.dependencies) {
        if (!createdNamespaces.includes(dep.importedFrom)) {
          writer.write(`const ${dep.importedFrom} = {};` + "\n");
          createdNamespaces.push(dep.importedFrom); // only one per dep
        }

        writer.write(
          "\n" + `${dep.importedFrom}.${dep.functionName} = ${dep.code}`
        );
      }

      // finally write main code.
      console.log(api.code);
      writer.write(api.code);
      writer.write(
        "\n" +
          `exports.handler = async function (event, context) {` +
          "\n" +
          `    context.json = responseOverwrite;` +
          "\n" +
          `    context.send = responseOverwrite;` +
          "\n" +
          `    return main(event, context);` +
          "\n" +
          `};`
      );
      writer.close();
    }
  }
}
