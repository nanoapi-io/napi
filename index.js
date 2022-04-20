import { createReadStream, createWriteStream, mkdir } from 'fs';
import { fileURLToPath } from 'url'
import path from 'path';
import { createInterface } from 'readline';

const DIST_PATH = path.join(fileURLToPath(import.meta.url), '../dist');

const lineReader = createInterface({
    input: createReadStream('./test-api/api.js')
})

// TODO: Make this file a class?

let collectFunction = false;
let functionCounter = 0;
// Define object to maintain functions to be written
const functions = [];
const variables = [];
const dependencies = {};

const braces = [];

// main execution
(async () => {
    let it = lineReader[Symbol.asyncIterator]();
    let processing = true;
    while (processing) {
        let next = await it.next();

        if (next.done) {
            processing = false;
            break;
        }

        await handleLine(next.value);
    }

    await makeDirectory();
    await writeNanoAPIFiles();
})();

async function writeNanoAPIFiles() {
    // For each endpoint...
    for (let api of functions) {
        let createdNamespaces = [];
        const writer = createWriteStream(path.join(DIST_PATH, api.name + '.js'));

        // include code of dependencies...
        for (let dep of api.dependencies) {
            if (!createdNamespaces.includes(dep.importedFrom)) {
                writer.write(`const ${dep.importedFrom} = {}` + '\n');
                createdNamespaces.push(dep.importedFrom); // only one per dep
            }

            writer.write(
                '\n' + `${dep.importedFrom}.${dep.functionName} = ${dep.code}`
            );
        }

        // finally write main code.
        console.log(api.code);
        writer.write(api.code);
        writer.close();
    }
}

async function handleLine(line) {
    // Check for deps and add them to the functions dep array
    if (isDependency(line)) {
        const list = line.split(' ');
        const asIndex = list.indexOf('as');
        const name = list[asIndex+1];
        const pathString = list[asIndex+3].split(';')[0];
        const matches = /^["'`]{1}(.*)["'`]{1}$/g.exec(pathString);
        const path = matches[1];
        
        // key, value of dep name, code
        dependencies[name] = {
            name,
            path
        }

        // Find dependency functions
        try {
            dependencies[name].functions = await collectDependency(dependencies[name]);
        }
        catch (e) {
            console.error(e);
            console.log('Error handled in deps resolution')
        }
    }

    // If we see an endpoint definition or are iterating over one...
    if (isEndpoint(line) || collectFunction) {
        try {
            const shouldIgnoreFirstLine = (braces.length === 0 && !collectFunction);
    
            // start the definition stack...
            if (line.includes('{')) {
                braces.push('{');
                
                if (!collectFunction) collectFunction = true;
            }
    
            if (line.includes('}')) braces.pop();
    
            // Check if the line references a dependency, and we have definitions for those deps
            Object.keys(dependencies).forEach((dep) => {
                if (line.includes(dependencies[dep].name) && dependencies[dep].functions) {
                    // Check which function of the dep is being called
                    Object.keys(dependencies[dep].functions).forEach(funct => {
                        if (line.includes(funct)) {
                            // TODO: Should additional information be included?
                            functions[functionCounter].dependencies.push({
                                code: dependencies[dep].functions[funct],
                                importedFrom: dep,
                                functionName: funct
                            });
                        }
                    });
                }
            });
    
            if (shouldIgnoreFirstLine) {
                const url = resolveUrl(line);
                functions[functionCounter] = {code:''};
                functions[functionCounter].url = url;
                functions[functionCounter].name = resolveName(url);
                functions[functionCounter].dependencies = [];
                functions[functionCounter].code += 
                    `\nexport default function (req, res) {\n`;
            }
            else if (braces.length > 0) {
                functions[functionCounter].code += line + '\n';
            }
            
            // Reached the end of the function definition
            if (braces.length === 0) {
                functions[functionCounter].code += '};' + '\n'
                collectFunction = false;
                functionCounter++;
            }
        }
        catch (e) {
            console.error(e);
            lineReader.close();
            lineReader.removeAllListeners();
        }
    }
}

// Utility, maybe make it a -v option
lineReader.on('close', () => {
    console.log(functions[0].dependencies);
    console.log(functions);
    console.log(dependencies);
})
 
function resolveUrl(line) {
    return line.split("'")[1]; // Assume first string
}

function resolveName(url) {
    // TODO: Potentially remove leading _ by calling .shift after split
    return url.split("/").join("_");
}

async function collectDependency(dependency) {
    return new Promise((resolve, reject) => {
        const baseProjectPath = path.join(fileURLToPath(import.meta.url), '../test-api');
        const dependencyPath = path.resolve(baseProjectPath, dependency.path);
        const functions = {};
        let currentName = "";
        let brackets = [];
        let presetFirstLine = false;

        if (!dependency.path.includes('.js')) {
            console.error('Node module tree shaking not yet implemented.');
            return resolve([]);
        }

        const depReader = createInterface({
            input: createReadStream(dependencyPath)
        });

        depReader.on('line', (line) => {
            // TODO: check other function definitions
            if (line.includes('function')) {
                const lines = line.split(' ');
                const index = lines.indexOf('function');
                const name = lines[index+1].split('(')[0];

                // TODO: Other ways to define functions?
                if (lines[0] == 'export') {
                    lines.shift();
                }

                currentName = name;
                functions[currentName] = lines.join(" ") + '\n';
                presetFirstLine = true;
            }

            if (currentName) {
                if (line.includes('{')) brackets.push('{');

                if (line.includes('}')) brackets.pop();
                
                if (!presetFirstLine) functions[currentName] += line + '\n';
                
                if (brackets.length === 0) currentName = ""; // End of function def
            }

            presetFirstLine = false;
        });

        depReader.on('close', () => {
            return resolve(functions);
        });
    })
}

function isEndpoint(line) {
    return line.includes('.get');
}

function isDependency(line) {
    return line.includes('import') || line.includes('require');
}

async function makeDirectory() {
    return new Promise((resolve, reject) => {
        mkdir(DIST_PATH, (err) => {
            if (err) {
                // EEXIST is thrown when dir exists, handle gracefully
                if (err && err.code === 'EEXIST') {
                    return resolve();
                }

                return reject(err);
            }

            return resolve();
        })
    });
}