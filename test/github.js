const axios = require('axios');
const sinon = require('sinon');
const chai = require('chai');

chai.should();
chai.use(require('chai-as-promised'));

const { GithubVisitor } = require('../lib/github');


describe('#GithubVisitor', () => {
  describe('#constructor', () => {
    it('should throw error when no GITHUB_TOKEN specified', () => {
      (() => new GithubVisitor()).should.throw(/missing environment variable GITHUB_TOKEN/);
    });

    it('should create an instance of GithubVisitor', () => {
      process.env.GITHUB_TOKEN = 'token';
      const visitor = new GithubVisitor();
      visitor.should.be.an.instanceOf(GithubVisitor);
      visitor.config.headers.should.deep.equal({
        Authorization: 'token token',
        Accept: 'application/vnd.github.symmetra-preview+json',
      });
    });
  });

  describe('#httpRequest', () => {
    let sandbox;
    let visitor;
    const request = { hello: 'world' };
    const response = { data: 'res' };
    const headers = {
      Authorization: 'token token',
      Accept: 'application/vnd.github.symmetra-preview+json',
    };

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      process.env.GITHUB_TOKEN = 'token';
      visitor = new GithubVisitor();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('#get', async () => {
      sandbox.stub(axios, 'get').resolves(response);
      return visitor.get('url')
        .then((resp) => {
          resp.should.deep.equal(response);
          sinon.assert.calledOnce(axios.get);
          sinon.assert.calledWith(axios.get, 'url', { headers });
        });
    });

    it('#post', async () => {
      sandbox.stub(axios, 'post').resolves(response);
      return visitor.post('url', request)
        .then((resp) => {
          resp.should.deep.equal(response);
          sinon.assert.calledOnce(axios.post);
          sinon.assert.calledWith(axios.post, 'url', request, { headers });
        });
    });

    it('#put', async () => {
      sandbox.stub(axios, 'put').resolves(response);
      return visitor.put('url')
        .then((resp) => {
          resp.should.deep.equal(response);
          sinon.assert.calledOnce(axios.put);
          sinon.assert.calledWith(axios.put, 'url', {}, { headers });
        });
    });

    it('#delete', async () => {
      sandbox.stub(axios, 'delete').resolves(response);
      return visitor.delete('url')
        .then((resp) => {
          resp.should.deep.equal(response);
          sinon.assert.calledOnce(axios.delete);
          sinon.assert.calledWith(axios.delete, 'url', { headers });
        });
    });
  });
});
