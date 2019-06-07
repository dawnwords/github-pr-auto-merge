const axios = require('axios');
const log = require('log').get('github-visitor');

class GithubVisitor {
  constructor() {
    if (!process.env.GITHUB_TOKEN) {
      throw new Error('missing environment variable GITHUB_TOKEN');
    }
    this.config = {
      headers: {
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.symmetra-preview+json',
      },
    };
  }

  async get(url) {
    log('GET %s', url);
    return axios.get(url, this.config);
  }

  async post(url, data) {
    log('POST %s -d %j', url, data);
    return axios.post(url, data, this.config);
  }

  async put(url) {
    log('PUT %s', url);
    return axios.put(url, {}, this.config);
  }

  async delete(url) {
    log('DELETE %s', url);
    return axios.delete(url, this.config);
  }
}

module.exports.GithubVisitor = GithubVisitor;
