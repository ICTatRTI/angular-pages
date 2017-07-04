let exec = require('./lib/exec');
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

  const ANGULAR_PAGES_TEMP_DIR = `${PROJECT_DIR}/.angular-pages-temp${Date.now()}` 

  // Look up exported Classes in the page module and remove their imports from app.module.ts in case any end up dangling.
  const OLD_CLASSES = (await exec(`grep -r "export class" ${PROJECT_DIR}/src/app/pages | awk '{print $3}'`)).split('\n')
  if (OLD_CLASSES.length > 0) {
    let APP_FILE_CONTENTS = await readFile(`${PROJECT_DIR}/src/app/app.module.ts`, 'utf-8')
    var n = 0
    while (OLD_CLASSES.length > n) {
      var OLD_CLASS = OLD_CLASSES[n]
      LINE = ''
      while (LINE = APP_FILE_CONTENTS.match(`.*${OLD_CLASS}.*\n`)) {
        APP_FILE_CONTENTS = APP_FILE_CONTENTS.replace(LINE, '')
      }
      n++
    }
    await writeFile(`${PROJECT_DIR}/src/app/app.module.ts`, APP_FILE_CONTENTS)
  }

  // Remove previously created pages module and regenerate it.
  try {
    await exec(`rm -r "${PROJECT_DIR}/src/app/pages"`)
  }
  catch(e) { }
  // Remove any past temporary directory if it exists. 
  try {
    await exec(`rm -r "${ANGULAR_PAGES_TEMP_DIR}"`)
  }
  catch(e) { }
  await exec(`cd "${PROJECT_DIR}/src/app" && ng generate module --routing pages`) 
  // Get rid of the Pages module, we'll add components to the App module.
  await exec(`rm "${PROJECT_DIR}/src/app/pages/pages.module.ts"`)

  // Copy the pages directory to our temporary directory.
  await exec(`cp -r "${PROJECT_DIR}/pages" "${ANGULAR_PAGES_TEMP_DIR}"`)

  // Get all MD file paths.
  index=0
  const MD_PATHS = (await exec(`find ${ANGULAR_PAGES_TEMP_DIR} | grep ".md"`)).split('\n')

  // Convert them all to HTML
  let HTML_PATHS_TO_CLEANUP = []
  MD_PATHS.forEach(async (MD_PATH) => { 
    let HTML_PATH = MD_PATH.replace('.md', '.html') 
    await exec(`cat "${MD_PATH}" | mdown > "${HTML_PATH}"`)
  })

  // Get all HTML file paths.
  const HTML_PATHS = (await exec(`find ${ANGULAR_PAGES_TEMP_DIR} | grep -v "\.\/\/" | grep ".html"`)).split('\n')

  // TODO: Transpile anchor tags into NG Router links.

  // Initialize an Array that we will build to replace the Routes in the Pages module. 
  let Routes = []

  // Generate a Component and Route for each HTML file.
  let i = 0;
  while (HTML_PATHS.length > i) {
    let HTML_PATH = HTML_PATHS[i]

    // Generate the Component's machine name for the file system. Convert forward slashes to double dashes. 
    let COMPONENT_MACHINE_NAME = (((HTML_PATH.split('\/')).pop()).replace('.html', '')).replace('\/', '--')

    // Generate the Component.
    await exec(`cd "${PROJECT_DIR}/src/app/pages" && ng generate component ${COMPONENT_MACHINE_NAME}`)

    // Get the Component's Class Name that ng generated.
    let COMPONENT_FILE_CONTENTS = await readFile(`${PROJECT_DIR}/src/app/pages/${COMPONENT_MACHINE_NAME}/${COMPONENT_MACHINE_NAME}.component.ts`, 'utf-8')
    let COMPONENT_CLASS_NAME = (COMPONENT_FILE_CONTENTS.match('export class (.*) implements'))[1] 

    // Copy the HTML file to Component's HTML file.
    await exec(`cp "${HTML_PATH}" "${PROJECT_DIR}/src/app/pages/${COMPONENT_MACHINE_NAME}/${COMPONENT_MACHINE_NAME}.component.html"`)

    // Edit Pages Module's routing to ES6 import Component.
    let ROUTING_FILE_CONTENTS = await readFile(`${PROJECT_DIR}/src/app/pages/pages-routing.module.ts`)
    await writeFile(`${PROJECT_DIR}/src/app/pages/pages-routing.module.ts`, "".concat(`import { ${COMPONENT_CLASS_NAME} } from './${COMPONENT_MACHINE_NAME}/${COMPONENT_MACHINE_NAME}.component';\n`, ROUTING_FILE_CONTENTS))

    Routes.push({ path: (HTML_PATH.replace(`${ANGULAR_PAGES_TEMP_DIR}/`, '')).replace('.html', ''), component: COMPONENT_CLASS_NAME })

    i++

  }
   
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
  let ROUTING_FILE_CONTENTS = await readFile(`${PROJECT_DIR}/src/app/pages/pages-routing.module.ts`, 'utf-8')
  ROUTING_FILE_CONTENTS = ROUTING_FILE_CONTENTS.replace('const routes', RoutesString)
  await writeFile(`${PROJECT_DIR}/src/app/pages/pages-routing.module.ts`, ROUTING_FILE_CONTENTS)
  
  // Clean up.
  try {
    await exec(`rm -r "${ANGULAR_PAGES_TEMP_DIR}"`)
  }
  catch(e) { }

  console.log('Done.')
}

if (program.watch) {
  watch.watchTree(`${PROJECT_DIR}/pages`, function (f, curr, prev) {
    console.log('Compiling...')
    go()
  })
}
else {
  console.log('Compiling...')
  go()
}

