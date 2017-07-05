#!/usr/bin/env node
var program = require('commander')

program
  .version('0.0.1')
  .command('init', 'install angular-pages into an angular-cli based project')
  .command('build', 'build it')
  .parse(process.argv);
