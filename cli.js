#!/usr/bin/env node

const yargs = require('yargs');
const logNode = require('log-node');
const log = require('log').get('cli');
const { AutoMerger } = require('./lib/auto-merger');
const { version } = require('./package.json');

const { argv } = yargs
  .strict()
  .option('repo', {
    alias: 'r',
    describe: 'github repository',
    type: 'string',
  })
  .option('owner', {
    alias: 'o',
    describe: 'repository owner',
    type: 'string',
  })
  .option('labels', {
    alias: 'l',
    describe: 'pull request labels as filter',
    type: 'array',
    default: [],
  })
  .option('log-level', {
    describe: 'log level',
    choice: ['debug', 'info', 'warn', 'error'],
    default: 'info',
  })
  .demandOption(['repo', 'owner'])
  .alias('v', 'version')
  .version(`v${version}`)
  .describe('v', 'show version information')
  .help();

process.env.LOG_LEVEL = argv['log-level'];
process.env.LOG_TIME = 'abs';
try {
  logNode();
} catch (e) {
  // ignore
}
AutoMerger.handler(argv).catch((e) => {
  log.error('Fail to auto merge pr: %s', e);
});
