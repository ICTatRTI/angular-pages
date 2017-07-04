let exec = require('./lib/exec');
const fs = require('fs')
const util = require('util')

const readFile = util.promisify(fs.readFile)
const writeFile = util.promisify(fs.writeFile)


// TODO Make this safer. Might not be at the root of the project.
const PROJECT_DIR = process.cwd() 

async function go() {
  // Remove previously created pages module and regenerate it.
  try {
  await exec(`rm -r "${PROJECT_DIR}/src/app/pages"`)
  }
  catch(e) { }
  await exec(`cd "${PROJECT_DIR}/src/app" && ng generate module --routing pages`) 
  // Get rid of the Pages module, we'll add components to the App module.
  await exec(`rm "${PROJECT_DIR}/src/app/pages/pages.module.ts"`)

  // Get all MD file paths.
  await exec(`cd ""`)
  index=0
  const MD_PATHS = (await exec(`find ${PROJECT_DIR}/pages/ | grep ".md"`)).split('\n')

  // Convert them all to HTML
  let HTML_PATHS_TO_CLEANUP = []
  MD_PATHS.forEach(async (MD_PATH) => { 
    let HTML_PATH = MD_PATH.replace('.md', '.html') 
    console.log(`Transpiling Markdown at ${MD_PATH} to HTML at ${HTML_PATH}`)
    await exec(`cat "${MD_PATH}" | mdown > "${HTML_PATH}"`)
    HTML_PATHS_TO_CLEANUP.push(HTML_PATH);
  })

  // Get all HTML file paths.
  await exec(`cd "${PROJECT_DIR}/pages"`)
  const HTML_PATHS = (await exec(`find ${PROJECT_DIR}/pages | grep -v "\.\/\/" | grep ".html"`)).split('\n')
  console.log(`HTML_PATHS: ` + JSON.stringify(HTML_PATHS))

  // TODO: Transpile anchor tags into NG Router links.

  // Initialize an Array that we will build to replace the Routes in the Pages module. 
  let Routes = []

  // Generate a Component and Route for each HTML file.
  let i = 0;
  while (HTML_PATHS.length > i) {
    let HTML_PATH = HTML_PATHS[i]

    // Generate the Component's machine name for the file system. Convert forward slashes to double dashes. 
    let COMPONENT_MACHINE_NAME = (((HTML_PATH.split('\/')).pop()).replace('.html', '')).replace('\/', '--')
    console.log(`COMPONENT_MACHINE_NAME: ${COMPONENT_MACHINE_NAME}`)

    // Generate the Component.
    await exec(`cd "${PROJECT_DIR}/src/app/pages" && ng generate component ${COMPONENT_MACHINE_NAME}`)

    // Get the Component's Class Name that ng generated.
    let COMPONENT_FILE_CONTENTS = await readFile(`${PROJECT_DIR}/src/app/pages/${COMPONENT_MACHINE_NAME}/${COMPONENT_MACHINE_NAME}.component.ts`, 'utf-8')
    let COMPONENT_CLASS_NAME = (COMPONENT_FILE_CONTENTS.match('export class (.*) implements'))[1] 
    console.log(`COMPONENT_CLASS_NAME: ${COMPONENT_CLASS_NAME}`)

    // Copy the HTML file to Component's HTML file.
    await exec(`cp "${HTML_PATH}" "${PROJECT_DIR}/src/app/pages/${COMPONENT_MACHINE_NAME}/${COMPONENT_MACHINE_NAME}.component.html"`)

    // Edit Pages Module's routing to ES6 import Component.
    let ROUTING_FILE_CONTENTS = await readFile(`${PROJECT_DIR}/src/app/pages/pages-routing.module.ts`)
    await writeFile(`${PROJECT_DIR}/src/app/pages/pages-routing.module.ts`, "".concat(`import { ${COMPONENT_CLASS_NAME} } from './${COMPONENT_MACHINE_NAME}/${COMPONENT_MACHINE_NAME}.component';\n`, ROUTING_FILE_CONTENTS))

    Routes.push({ path: HTML_PATH.replace(`${PROJECT_DIR}/pages/`, ''), component: COMPONENT_CLASS_NAME })

    i++

  }
  
  console.log('Routes:')
  console.log(JSON.stringify(Routes))
  let RoutesString = 'const routes: Routes = ['
  i = 0
  while (Routes.length > i) {
    let Route = Routes[i]
    if (Route.path == 'index.html') {
      RoutesString = RoutesString.concat(`{ path: "", component: ${Route.component} }, `)
    }
    RoutesString = RoutesString.concat(`{ path: "${Route.path}", component: ${Route.component} }, `)
    console.log('RouteString:')
    console.log(RoutesString)
    i++
  }
  RoutesString = RoutesString.concat(`]; \/\/`)
  console.log('RoutesString:')
  console.log(RoutesString)

  // Edit routing of the Pages Module to declare route for Component.
  let ROUTING_FILE_CONTENTS = await readFile(`${PROJECT_DIR}/src/app/pages/pages-routing.module.ts`, 'utf-8')
  console.log('ROUTING_FILE_CONTENTS:')
  console.log(ROUTING_FILE_CONTENTS)
  ROUTING_FILE_CONTENTS = ROUTING_FILE_CONTENTS.replace('const routes', RoutesString)
  await writeFile(`${PROJECT_DIR}/src/app/pages/pages-routing.module.ts`, ROUTING_FILE_CONTENTS)

  // Remove HTML files that were created out of markdown.
  i = 0
  while (HTML_PATHS_TO_CLEANUP.length > i) {
    exec(`rm ${HTML_PATHS_TO_CLEANUP[i]}`)
    i++
  }

}
go()
