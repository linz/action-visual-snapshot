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

export async function startBuild({
  octokit,
  owner,
  repo,
  headSha: head_sha,
  name = 'Visual Snapshot',
}: Params): Promise<any> {
  core.startGroup('Starting build using GitHub API directly...');
  const {data: check} = await octokit.checks.create({
    owner,
    repo,
    head_sha,
    name,
    status: 'in_progress',
  });
  core.endGroup();
  return check.id;
}
