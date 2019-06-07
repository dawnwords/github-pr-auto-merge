/* eslint-disable global-require */

const sinon = require('sinon');
const yargs = require('yargs');
const chai = require('chai');
const path = require('path');
const log = require('log');
const { AutoMerger } = require('../lib/auto-merger');

chai.should();
chai.use(require('chai-as-promised'));

describe('#cli', () => {
  let sandbox;
  let logErrorSpy;

  beforeEach(() => {
    process.argv = ['-o', 'owner', '-r', 'repo'];

    sandbox = sinon.createSandbox();
    sandbox.stub(yargs, 'option').returns(yargs);
    sandbox.stub(yargs, 'strict').returns(yargs);
    sandbox.stub(yargs, 'demandOption').returns(yargs);
    sandbox.stub(yargs, 'alias').returns(yargs);
    sandbox.stub(yargs, 'describe').returns(yargs);
    sandbox.stub(yargs, 'version').returns(yargs);
    sandbox.stub(yargs, 'help').returns(yargs);

    logErrorSpy = sinon.spy();
    sandbox.stub(log, 'get').returns({ error: logErrorSpy });
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('#should resolves with no error when AutoMerger.handler resolves', async () => {
    const promise = { catch: sinon.spy() };
    sandbox.stub(AutoMerger, 'handler').returns(promise);
    delete require.cache[path.resolve(__dirname, '../cli.js')];
    require('../cli');
    sinon.assert.notCalled(logErrorSpy);
  });

  it('#should log error when AutoMerger.handler rejects with error', async () => {
    const promise = { catch: sinon.spy() };
    sandbox.stub(AutoMerger, 'handler').returns(promise);

    delete require.cache[path.resolve(__dirname, '../cli.js')];
    require('../cli');

    const e = new Error('ERROR');
    promise.catch.callArgWith(0, e);
    sinon.assert.calledOnce(logErrorSpy);
    sinon.assert.calledWith(logErrorSpy, 'Fail to auto merge pr: %s', e);
  });
});
