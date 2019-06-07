# github-pr-auto-merge [![Build Status](https://travis-ci.org/dawnwords/github-pr-auto-merge.svg?branch=master)](https://travis-ci.org/dawnwords/github-pr-auto-merge) [![Coverage Status](https://coveralls.io/repos/github/dawnwords/github-pr-auto-merge/badge.svg?branch=master)](https://coveralls.io/github/dawnwords/github-pr-auto-merge?branch=master)

Github Pull Request Auto Merge Command Line Tool

### Installation

```bash
# using npm
npm install -g github-pr-auto-merge

# using yarn
yarn global add github-pr-auto-merge
```

### Usage

After installation, `prautomerge` command could be found under your `$PATH`.

```bash
> prautomerge

Options:
  --repo, -r     github repository                           [string] [required]
  --owner, -o    repository owner                            [string] [required]
  --labels, -l   pull request labels as filter             [array] [default: []]
  --log-level    log level                                     [default: "info"]
  -v, --version  Show version number                                   [boolean]
  --help         Show help                                             [boolean]

```

It uses your git hub token specified in environment variable as `GITHUB_TOKEN` to connect with your
repository and traverses all the open Pull Request(PR)s containing all your specified tags, such as 
`auto-merged`, `bot` and so on.
If one of the PRs is able to be merged after approving, this tool will use your github token to approve
this PR, merge it and delete the branch it related to.


**Note** that your `GITHUB_TOKEN` should have the following access to accomplish auto-merging:
1. repo:status
2. public_repo | admin:org (for private or collaborative projects)
3. write:discussion
