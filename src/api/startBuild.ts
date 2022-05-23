import * as core from '@actions/core';
import * as github from '@actions/github';

type Octokit = ReturnType<typeof github.getOctokit>;

type Params = {
  octokit: Octokit;
  owner: string;
  repo: string;
  headSha: string;
  headRef: string;
  name: string;
};

export async function startBuild(opt: Params): Promise<any> {
  core.startGroup('Starting build using GitHub API directly...');
  core.info(
    `CreateCheck repo:${opt.owner}/${opt.repo}#${opt.headSha} name: ${opt.name}`
  );
  const {data: check} = await opt.octokit.checks.create({
    owner: opt.owner,
    repo: opt.repo,
    head_sha: opt.headSha,
    name: opt.name,
    status: 'in_progress',
  });
  core.endGroup();
  return check.id;
}
