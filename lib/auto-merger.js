const log = require('log').get('auto-merger');
const { GithubVisitor } = require('./github');

const GITHUB_API_BASE = 'https://api.github.com';

class AutoMerger {
  constructor(argv, visitor) {
    this.visitor = visitor || new GithubVisitor();
    this.owner = argv.owner;
    this.repo = argv.repo;
    this.labels = argv.labels;
  }

  async listPrs() {
    const prUrl = `${GITHUB_API_BASE}/repos/${this.owner}/${this.repo}/pulls?state=open`;

    const resp = await this.visitor.get(prUrl);
    return Promise.all(resp.data.map(e => ({
      url: e.url,
      number: e.number,
      labels: e.labels.map(label => label.name),
      branch: e.head.repo.git_refs_url.replace('{/sha}', `/heads/${e.head.ref}`),
      status: e._links.statuses.href,
    }))
      .filter(pr => this.labels.every(label => pr.labels.includes(label)))
      .map((pr) => {
        let mergeablePr;
        return this.visitor.get(pr.url)
          .then((response) => {
            mergeablePr = {
              ...pr,
              mergeable: response.data.mergeable,
              mergeable_state: response.data.mergeable_state,
            };
          })
          .then(() => (AutoMerger.mergeable(mergeablePr)
            ? this.visitor.get(pr.status) : { data: [] }))
          .then(response => ({
            ...mergeablePr,
            status: response.data.length > 0 ? response.data[0].state : 'success',
          }));
      }));
  }

  async autoMerge() {
    const prs = await this.listPrs();
    log('got open pr with label %j: %j', this.labels, prs);
    let mergedPr;
    return prs.filter(pr => AutoMerger.mergeable(pr) && pr.status === 'success')
      .reduce((promise, pr) => promise.then(async () => {
        if (mergedPr) return;
        try {
          await this.visitor.post(`${pr.url}/reviews`, { event: 'APPROVE' });
        } catch (e) {
          log.warn('approve pr %s fail: %s', pr.url, e);
          return;
        }
        try {
          await this.visitor.put(`${pr.url}/merge`);
          log.notice('merge pr %s', pr.url);
          mergedPr = pr;
        } catch (e) {
          log.warn('merge pr %s fail: %s', pr.url, e);
        }
      }), Promise.resolve())
      .then(() => {
        if (mergedPr) {
          return this.visitor.delete(mergedPr.branch);
        }
        log.notice('no PR is able to be auto-merged');
        return Promise.resolve();
      });
  }

  static mergeable(pr) {
    return pr.mergeable || pr.mergeable_state !== 'dirty';
  }

  static handler(argv) {
    return new AutoMerger(argv).autoMerge();
  }
}

module.exports.AutoMerger = AutoMerger;
