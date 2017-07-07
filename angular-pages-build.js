let exec = require('./lib/exec')
const homedir = require('homedir')
const fs = require('fs')
const util = require('util')
const watch = require('watch')
var program = require('commander')

const readFile = util.promisify(fs.readFile)
const writeFile = util.promisify(fs.writeFile)

program
  .version('0.0.0')
  .option('--watch', 'Watch for changes and compile automatically')

program.on('--help', function(){
  console.log('  Examples:')
  console.log('')
  console.log('    $ cd my-angular-project && angular-pages --watch & npm start')
  console.log('')
});

program.parse(process.argv)

// TODO Make this safer. Might not be at the root of the project.
const PROJECT_DIR = process.cwd() 

async function go() {

  //
  // Prepare temporary files.
  //

  // Create a temporary directory.
  const TEMP_DIR = `${homedir()}/.angular-pages-${Date.now()}` 
  await exec(`mkdir ${TEMP_DIR}`)

  // Create a temporary template Angular project and generate a pages module in it.
  await exec(`cd ${TEMP_DIR} && ng new --skip-git --skip-tests --skip-install template && cd template && ng generate module --routing pages`)
 
  // Copy the pages over to the temporary directory for processing.
  await exec(`cp -r "${PROJECT_DIR}/pages" "${TEMP_DIR}/pages"`)

  //
  // Prepare Pages Module.
  // 

  // Get the pages module file contents.
  let PAGES_MODULE_FILE_CONTENTS = await readFile(`${TEMP_DIR}/template/src/app/pages/pages.module.ts`, 'utf-8')

  // Remove all lines with reference to Module in pages.module.ts except for @NgModule decorator.
  let LINES = PAGES_MODULE_FILE_CONTENTS.split('\n')
  var i = 0
  while (LINES.length > i) {
    if (LINES[i].indexOf('@NgModule') == -1 
        && LINES[i].indexOf('PagesRoutingModule') == -1 
        && LINES[i].indexOf('PagesModule') == -1
        && LINES[i].indexOf('Module') !== -1) {
      LINES[i] = ''
    }
    i++
  }
  PAGES_MODULE_FILE_CONTENTS = LINES.join('\n')

  // Look up import statement lines in app module, 
  let IMPORTS = (await exec(`grep -r --no-filename "import {" ${PROJECT_DIR}/src/app/app.module.ts | grep "Module" | grep -v "PagesModule"`)).split('\n')

  // Remove AppRoutingModule from IMPORTS because if we import that, it will break routing.
  var i = 0
  while (IMPORTS.length > i) {
    if (IMPORTS[i].indexOf('AppRoutingModule') !== -1) {
      IMPORTS.splice(i, 1)
    }
    i++
  }

  // Prepend to pages module the modified imports statements from app.module.ts. 
  var i = 0
  while (IMPORTS.length > i) {
    let IMPORT = IMPORTS[i]
    // Paths will be back one directory.
    IMPORTS[i] = IMPORT.replace('.\/', '..\/')
    i++
  }
  PAGES_MODULE_FILE_CONTENTS = IMPORTS.join('\n') + PAGES_MODULE_FILE_CONTENTS

  
  // From the list of things we imported into pages, do an Angular Module import as well.
  // Remove NgModule from IMPORTS because we do not Angular Import that.
  var i = 0
  while (IMPORTS.length > i) {
    if (IMPORTS[i].indexOf('NgModule') !== -1) {
      IMPORTS.splice(i, 1)
    }
    i++
  }
  // Get the Classes. 
  IMPORT_CLASSES = []
  var i = 0
  while (IMPORTS.length > i) {
    let IMPORT = IMPORTS[i]
    if (IMPORT.indexOf('NgModule') == -1) {
      // Paths will be back one directory.
      IMPORT_CLASSES[i] = (IMPORT.match(/{(.*?)}/))[1]
    }
    i++
  }
  PAGES_MODULE_FILE_CONTENTS = PAGES_MODULE_FILE_CONTENTS.replace('imports:','imports: [' + IMPORT_CLASSES.join(', ') + ', //')
   
  // Write the pages module file contents.
  await writeFile(`${TEMP_DIR}/template/src/app/pages/pages.module.ts`, PAGES_MODULE_FILE_CONTENTS)


  //
  // Prepare Pages Components.
  //

  // Get all MD file paths.
  index=0
  const MD_PATHS = (await exec(`find ${TEMP_DIR}/pages | grep ".md"`)).split('\n')

  // Convert them all to HTML
  let HTML_PATHS_TO_CLEANUP = []
  MD_PATHS.forEach(async (MD_PATH) => { 
    let HTML_PATH = MD_PATH.replace('.md', '.html') 
    // TODO: Use a markdown library, not CLI. 
    await exec(`cat "${MD_PATH}" | mdown > "${HTML_PATH}"`)
  })

  // Get all HTML file paths.
  const HTML_PATHS = (await exec(`find ${TEMP_DIR}/pages | grep -v "\.\/\/" | grep ".html"`)).split('\n')

  // TODO: Transpile anchor tags into NG Router links.

  // Initialize an Array that we will build to replace the Routes in the Pages module. 
  let Routes = []

  // Generate a Component for each HTML file. Also save away a Routes array for building into router later.
  var i = 0;
  while (HTML_PATHS.length > i) {

    let HTML_PATH = HTML_PATHS[i]

    // Generate the Component's machine name for the file system. Convert forward slashes to double dashes. 
    let COMPONENT_MACHINE_NAME = (((HTML_PATH.split('\/')).pop()).replace('.html', '')).replace('\/', '--')

    // Generate the Component.
    await exec(`cd "${TEMP_DIR}/template/src/app/pages" && ng generate component ${COMPONENT_MACHINE_NAME}`)

    // Remove the test file because it will fail if there is a dependency.
    await exec(`rm "${TEMP_DIR}/template/src/app/pages/${COMPONENT_MACHINE_NAME}/${COMPONENT_MACHINE_NAME}.component.spec.ts"`)

    // Get the Component's Class Name that ng generated.
    let COMPONENT_FILE_CONTENTS = await readFile(`${TEMP_DIR}/template/src/app/pages/${COMPONENT_MACHINE_NAME}/${COMPONENT_MACHINE_NAME}.component.ts`, 'utf-8')
    let COMPONENT_CLASS_NAME = (COMPONENT_FILE_CONTENTS.match('export class (.*) implements'))[1] 

    // Copy the HTML file to Component's HTML file.
    await exec(`cp "${HTML_PATH}" "${TEMP_DIR}/template/src/app/pages/${COMPONENT_MACHINE_NAME}/${COMPONENT_MACHINE_NAME}.component.html"`)

    // Edit Pages Module's routing to ES6 import Component.
    let ROUTING_FILE_CONTENTS = await readFile(`${TEMP_DIR}/template/src/app/pages/pages-routing.module.ts`)
    await writeFile(`${TEMP_DIR}/template/src/app/pages/pages-routing.module.ts`, "".concat(`import { ${COMPONENT_CLASS_NAME} } from './${COMPONENT_MACHINE_NAME}/${COMPONENT_MACHINE_NAME}.component';\n`, ROUTING_FILE_CONTENTS))

    // Stash the route for later.
    Routes.push({ path: (HTML_PATH.replace(`${TEMP_DIR}/pages/`, '')).replace('.html', ''), component: COMPONENT_CLASS_NAME })

    i++

  }

  //
  // Prepare Pages Routing Module.
  //
   
  // Generate the string of routes for the page routing module.
  let RoutesString = 'const routes: Routes = ['
  i = 0
  while (Routes.length > i) {
    let Route = Routes[i]
    // If this is the index, set an extra route that points at the root path.
    if (Route.path == 'index') {
      RoutesString = RoutesString.concat(`{ path: "", component: ${Route.component} }, `)
    }
    RoutesString = RoutesString.concat(`{ path: "${Route.path}", component: ${Route.component} }, `)
    i++
  }
  RoutesString = RoutesString.concat(`]; \/\/`)

  // Edit routing of the Pages Module to declare route for Component.
  let ROUTING_FILE_CONTENTS = await readFile(`${TEMP_DIR}/template/src/app/pages/pages-routing.module.ts`, 'utf-8')
  ROUTING_FILE_CONTENTS = ROUTING_FILE_CONTENTS.replace('const routes', RoutesString)
  await writeFile(`${TEMP_DIR}/template/src/app/pages/pages-routing.module.ts`, ROUTING_FILE_CONTENTS)

  //
  // Install new Pages Module.
  //
  
  // Remove previously created pages module and move our new pages module in.
  // TODO: This may cause `ng serve` to render 2x. Need to find a way to move everything over in one fell swoop.
  //       See discussion on Stack Overflow https://unix.stackexchange.com/questions/9899/how-to-overwrite-target-files-with-mv
  try {
    await exec(`rm -r "${PROJECT_DIR}/src/app/pages" && mv "${TEMP_DIR}/template/src/app/pages ${PROJECT_DIR}/src/app/pages"`)
  } catch (e) {
    await exec(`mv "${TEMP_DIR}/template/src/app/pages" "${PROJECT_DIR}/src/app/pages"`)
  }

  // Clean up.
  await exec(`rm -r "${TEMP_DIR}"`)
  console.log('angular-pages: done compiling')

}

if (program.watch) {
  watch.watchTree(`${PROJECT_DIR}/pages`, function (f, curr, prev) {
    console.log('angular-pages: compiling')
    // TODO: Prevent parallel builds.
    go()
  })
}
else {
  console.log('angular-pages: compiling')
  go()
}

