let exec = require('./lib/exec');
const fs = require('fs')
const util = require('util')
const watch = require('watch')
var program = require('commander')

const readFile = util.promisify(fs.readFile)
const writeFile = util.promisify(fs.writeFile)


program
  .version('0.0.0')

program.on('--help', function(){
  console.log('  Examples:')
  console.log('')
  console.log('    $ ng new my-angular-project; cd my-angular-project; angular-pages init; npm start')
  console.log('')
});

program.parse(process.argv)

// TODO Make this safer. Might not be at the root of the project.
const PROJECT_DIR = process.cwd() 

async function go() {
  console.log('Done.')
  // Create a pages directory at ./pages.
  // Run angular-pages build (always run in the root directory of your Angular project)
  // ES6 and Angular import the PagesRouterModule at ./src/pages/pages-routing.module.ts into ./src/app/app.module.ts
  // In your package.json, add angular-pages build && to npm build.
  // Add the angular-pages build --watch & ng serve to npm start.
}

console.log('Initializing...')
go()

