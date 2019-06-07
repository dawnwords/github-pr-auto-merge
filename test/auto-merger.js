const sinon = require('sinon');
const chai = require('chai');

const { AutoMerger } = require('../lib/auto-merger');
const { GithubVisitor } = require('../lib/github');

chai.should();
chai.use(require('chai-as-promised'));

describe('#AutoMerger', () => {
  let visitor;
  let merger;

  beforeEach(() => {
    visitor = sinon.createStubInstance(GithubVisitor);

    merger = new AutoMerger({
      owner: 'owner',
      repo: 'repo',
      labels: ['auto-merge', 'bot'],
    }, visitor);
  });

  describe('#constructor', () => {
    beforeEach(() => {
      process.env.GITHUB_TOKEN = 'token';
    });

    afterEach(() => {
      delete process.env.GITHUB_TOKEN;
    });

    it('should create an AutoMerger if given visitor', () => {
      merger.should.be.an.instanceOf(AutoMerger);
      merger.visitor.should.be.equal(visitor);
    });


    it('should create an AutoMerger if no visitor is given', () => {
      const autoMerger = new AutoMerger({});
      autoMerger.should.be.an.instanceOf(AutoMerger);
      autoMerger.visitor.should.be.an.instanceOf(GithubVisitor);
    });
  });

  describe('#listPrs', () => {
    it('should return nothing if labels not match', async () => {
      const number = 1;
      const url = 'http://test.url';
      const href = 'http://statues.ref';
      visitor.get.resolves({
        data: [{
          number,
          url,
          labels: [
            { name: 'not-merge' }, { name: 'bot' },
          ],
          head: {
            repo: {
              git_refs_url: 'http://git.ref.url{/sha}',
            },
            ref: 'head.ref',
          },
          _links: {
            statuses: {
              href,
            },
          },
        }],
      });
      return merger.listPrs().should.eventually.deep.equal([])
        .then(() => {
          sinon.assert.calledOnce(visitor.get);
        });
    });

    it('should return prs after fetching mergeable and status', async () => {
      const number = 1;
      const url = 'http://test.url';
      const href = 'http://statues.ref';
      visitor.get.withArgs(sinon.match(/.*pulls\?state=open/)).resolves({
        data: [{
          number,
          url,
          labels: [
            { name: 'auto-merge' }, { name: 'bot' }, { name: 'other' },
          ],
          head: {
            repo: {
              git_refs_url: 'http://git.ref.url{/sha}',
            },
            ref: 'headRef',
          },
          _links: {
            statuses: {
              href,
            },
          },
        }],
      });
      visitor.get.withArgs(url).resolves({
        data: {
          mergeable: true,
          mergeable_state: 'clean',
        },
      });
      visitor.get.withArgs(href).resolves({
        data: [{
          state: 'success',
        }],
      });
      return merger.listPrs().should.eventually.deep.equal([{
        url,
        number,
        mergeable: true,
        mergeable_state: 'clean',
        labels: ['auto-merge', 'bot', 'other'],
        branch: 'http://git.ref.url/heads/headRef',
        status: 'success',
      }]).then(() => {
        sinon.assert.calledThrice(visitor.get);
      });
    });

    it('should return prs after fetching mergeable without status', async () => {
      const number = 1;
      const url = 'http://test.url';
      const href = 'http://statues.ref';
      visitor.get.withArgs(sinon.match(/.*pulls\?state=open/)).resolves({
        data: [{
          number,
          url,
          labels: [
            { name: 'auto-merge' }, { name: 'bot' }, { name: 'other' },
          ],
          head: {
            repo: {
              git_refs_url: 'http://git.ref.url{/sha}',
            },
            ref: 'headRef',
          },
          _links: {
            statuses: {
              href,
            },
          },
        }],
      });
      visitor.get.withArgs(url).resolves({
        data: {
          mergeable: false,
          mergeable_state: 'dirty',
        },
      });
      return merger.listPrs().should.eventually.deep.equal([{
        url,
        number,
        mergeable: false,
        mergeable_state: 'dirty',
        labels: ['auto-merge', 'bot', 'other'],
        branch: 'http://git.ref.url/heads/headRef',
        status: 'success',
      }]).then(() => {
        sinon.assert.calledTwice(visitor.get);
      });
    });
  });

  describe('#autoMerge', () => {
    const url = 'http://test.url';
    const branch = 'http://test.url/branch';
    const status = 'success';
    const mergeable = true;
    const reviewPayload = { event: 'APPROVE' };

    beforeEach(() => {
      merger.listPrs = sinon.stub();
      merger.listPrs.resolves([{
        url, branch, status, mergeable,
      }, {
        url: `${url}2`, branch: `${branch}2`, status, mergeable,
      }]);
    });

    it('should approve, merge and delete branch once if pr is mergeable', async () => {
      visitor.post.resolves();
      visitor.put.resolves();
      visitor.delete.resolves();
      return merger.autoMerge()
        .then(() => {
          sinon.assert.calledOnce(merger.listPrs);
          sinon.assert.calledOnce(visitor.post);
          sinon.assert.calledOnce(visitor.put);
          sinon.assert.calledOnce(visitor.delete);
          sinon.assert.calledWith(visitor.post, `${url}/reviews`, reviewPayload);
          sinon.assert.calledWith(visitor.put, `${url}/merge`);
          sinon.assert.calledWith(visitor.delete, branch);
        });
    });

    it('should skip approve failed pr and try another', async () => {
      merger.listPrs.resolves([{
        url, branch, status, mergeable,
      }, {
        url: `${url}2`, branch: `${branch}2`, status, mergeable,
      }]);
      visitor.post.withArgs(`${url}/reviews`, reviewPayload).rejects(new Error('EAPPROVE'));
      visitor.post.withArgs(`${url}2/reviews`, reviewPayload).resolves();
      visitor.put.resolves();
      visitor.delete.resolves();
      return merger.autoMerge()
        .then(() => {
          sinon.assert.calledOnce(merger.listPrs);
          sinon.assert.calledTwice(visitor.post);
          sinon.assert.calledOnce(visitor.put);
          sinon.assert.calledOnce(visitor.delete);
          sinon.assert.calledWith(visitor.post, `${url}/reviews`, reviewPayload);
          sinon.assert.calledWith(visitor.post, `${url}2/reviews`, reviewPayload);
          sinon.assert.calledWith(visitor.put, `${url}2/merge`);
          sinon.assert.calledWith(visitor.delete, `${branch}2`);
        });
    });

    it('should log no pr is able to be auto merged if all pr fails', async () => {
      merger.listPrs.resolves([{
        url, branch, status, mergeable,
      }, {
        url: `${url}2`, branch: `${branch}2`, status, mergeable,
      }]);
      visitor.post.resolves();
      visitor.put.rejects(new Error('EMERGE'));
      visitor.delete.resolves();
      return merger.autoMerge()
        .then(() => {
          sinon.assert.calledOnce(merger.listPrs);
          sinon.assert.calledTwice(visitor.post);
          sinon.assert.calledTwice(visitor.put);
          sinon.assert.notCalled(visitor.delete);
          sinon.assert.calledWith(visitor.post, `${url}/reviews`, reviewPayload);
          sinon.assert.calledWith(visitor.post, `${url}2/reviews`, reviewPayload);
          sinon.assert.calledWith(visitor.put, `${url}/merge`);
          sinon.assert.calledWith(visitor.put, `${url}2/merge`);
        });
    });
  });

  describe('#handler', () => {
    it('should throw error with no GITHUB_TOKEN', () => {
      (() => AutoMerger.handler({})).should.throw(/missing environment variable GITHUB_TOKEN/);
    });
  });
});
