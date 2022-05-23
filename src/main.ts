/* eslint-env node */
import * as core from '@actions/core';
import * as github from '@actions/github';
import * as glob from '@actions/glob';
import * as io from '@actions/io';
import {fsa} from '@chunkd/fs';
import path from 'path';
import {downloadOtherWorkflowArtifact} from './api/downloadOtherWorkflowArtifact';
import {failBuild} from './api/failBuild';
import {finishBuild} from './api/finishBuild';
import {retrieveBaseSnapshots} from './api/retrieveBaseSnapshots';
import {startBuild} from './api/startBuild';
import {getPixelmatchOptions} from './getPixelmatchOptions';
import {Await} from './types';
import {diffSnapshots} from './util/diffSnapshots';
import {downloadSnapshots} from './util/downloadSnapshots';
import {generateImageGallery} from './util/generateImageGallery';
import {saveSnapshots} from './util/saveSnapshots';

fsa.list('s3://linz-basemaps');

const {owner, repo} = github.context.repo;
const token = core.getInput('github-token');
const octokit = token && github.getOctokit(token);
const {GITHUB_WORKSPACE, GITHUB_WORKFLOW} = process.env;
const pngGlob = '/**/*.png';
const shouldSaveOnly = core.getInput('save-only');

const originalCoreDebug = core.debug;

// @ts-ignore
core.debug = (message: string) => {
  originalCoreDebug(message);
};

function handleError(error: Error) {
  // Sentry.captureException(error);
  console.trace(error);
  core.setFailed(error.message);
}

async function run(): Promise<void> {
  const resultsRootPath: string = core.getInput('results-path');
  const baseBranch = core.getInput('base-branch');
  const artifactName = core.getInput('artifact-name');
  const storagePrefix = core.getInput('storage-prefix');
  const publicUrl = core.getInput('storage-url');

  const actionName = core.getInput('action-name');
  const snapshotPath: string = core.getInput('snapshot-path');

  const resultsPath = path.resolve(resultsRootPath, 'visual-snapshots-results');
  const basePath = path.resolve('/tmp/visual-snapshots-base');
  const mergeBasePath = path.resolve('/tmp/visual-snapshop-merge-base');

  const workflowRunPayload = github.context.payload.workflow_run;
  const pullRequestPayload = github.context.payload.pull_request;

  // We're only interested the first pull request... I'm not sure how there can be multiple
  // Forks do not have `pull_requests` populated...
  const workflowRunPullRequest = workflowRunPayload?.pull_requests?.[0];

  const headSha =
    pullRequestPayload?.head.sha ||
    workflowRunPullRequest?.head.sha ||
    workflowRunPayload?.head_sha;
  const headRef =
    pullRequestPayload?.head.ref ||
    workflowRunPullRequest?.head.ref ||
    (workflowRunPayload?.head_branch &&
      `${workflowRunPayload?.head_repository?.full_name}/${workflowRunPayload?.head_branch}`);

  // TODO: Need a good merge base for forks as neither of the below values will exist (input not included)
  const mergeBaseSha: string =
    core.getInput('merge-base') ||
    pullRequestPayload?.base?.sha ||
    workflowRunPullRequest?.base.sha;

  // Forward `results-path` to outputs
  core.startGroup('Set outputs');
  core.setOutput('results-path', resultsRootPath);
  core.setOutput('base-images-path', basePath);
  core.setOutput('merge-base-images-path', mergeBasePath);
  core.endGroup();

  core.startGroup('github context');
  core.debug(`merge base: ${mergeBaseSha}`);
  core.debug(JSON.stringify(github.context, null, 2));
  core.endGroup();

  try {
    if (snapshotPath) {
      await saveSnapshots({
        artifactName,
        rootDirectory: snapshotPath,
      });
    }
  } catch (error) {
    handleError(error);
  } finally {
    // Only needs to upload snapshots, do not proceed further
    if (shouldSaveOnly !== 'false') {
      return;
    }
  }

  if (!octokit) {
    const error = new Error('`github-token` missing');
    handleError(error);
    throw error;
  }

  // This is intended to only work with pull requests, we should ignore `workflow_run` from pushes
  if (workflowRunPayload?.event === 'push') {
    core.debug(
      'Push event triggered `workflow_run`... skipping as this only works for PRs'
    );
    return;
  }

  const buildId = await startBuild({
    octokit,
    owner,
    repo,

    headSha,
    headRef,
    name: actionName,
  });

  try {
    const [
      didDownloadLatest,
      didDownloadMergeBase,
    ] = await retrieveBaseSnapshots(octokit, {
      owner,
      repo,
      branch: baseBranch,
      workflow_id: `${workflowRunPayload?.name || GITHUB_WORKFLOW}.yml`,
      artifactName,
      basePath,
      mergeBasePath,
      mergeBaseSha,
    });

    if (!didDownloadLatest) {
      // It's possible there are no base snapshots e.g. if these are all
      // new snapshots.
      core.warning('Unable to download artifact from base branch');
    }

    if (!didDownloadMergeBase) {
      // We can still diff against base
      core.debug('Unable to download artifact from merge base sha');
    }

    let downloadResp: Await<ReturnType<typeof downloadSnapshots>> | null = null;

    // TODO maybe make this more explicit, but if snapshot path is not defined
    // we assume we need to fetch it from artifacts from this workflow
    if (!snapshotPath) {
      core.debug('Downloading current snapshots');

      const rootDirectory = '/tmp/visual-snapshots';

      if (github.context.eventName === 'workflow_run') {
        // TODO: fail the build if workflow_run.conclusion != 'success'
        // If this is called from a `workflow_run` event, then assume that the artifacts exist from that workflow run
        // TODO: I'm not sure what happens if there are multiple workflows defined (I assume it would get called multiple times?)
        const {data} = await octokit.actions.listWorkflowRunArtifacts({
          owner,
          repo,
          run_id: workflowRunPayload?.id,
        });

        const artifact = data.artifacts.find(({name}) => name === artifactName);

        if (!artifact) {
          throw new Error(
            `Unable to find artifact from ${workflowRunPayload?.html_url}`
          );
        }

        downloadResp = await downloadOtherWorkflowArtifact(octokit, {
          owner,
          repo,
          artifactId: artifact.id,
          downloadPath: `${rootDirectory}/visual-snapshots`,
        });
      } else {
        downloadResp = await downloadSnapshots({
          artifactName,
          rootDirectory,
        });
      }
    }

    const current = snapshotPath || downloadResp?.downloadPath;

    if (!current) {
      const err = new Error(
        !snapshotPath
          ? '`snapshot-path` input not configured'
          : 'Unable to download current snapshots'
      );
      core.error(err);
      throw err;
    }

    const currentPath = path.resolve(GITHUB_WORKSPACE, current || '');

    core.startGroup('Starting diff of snapshots...');

    // Get pixelmatch options from workflow inputs
    const pixelmatchOptions = getPixelmatchOptions();

    await io.mkdirP(resultsPath);

    const {
      baseFiles,
      changedSnapshots,
      missingSnapshots,
      newSnapshots,
    } = await diffSnapshots({
      basePath,
      mergeBasePath,
      currentPath,
      outputPath: resultsPath,
      pixelmatchOptions,
    });

    const resultsGlobber = await glob.create(`${resultsPath}${pngGlob}`, {
      followSymbolicLinks: false,
    });
    const resultsFiles = await resultsGlobber.glob();

    const gcsDestination = `${owner}/${repo}/${headSha}`;

    const resultsArtifactUrls = await Promise.all(
      resultsFiles.map(async file => {
        const relativeFilePath = path.relative(resultsPath, file);

        const target = fsa.join(
          storagePrefix,
          `${gcsDestination}/results/${relativeFilePath}`
        );
        const imageUrl = fsa.join(
          publicUrl,
          `${gcsDestination}/results/${relativeFilePath}`
        );
        console.log('Writing', {src: file, dest: target, public: imageUrl});

        await fsa.write(target, fsa.stream(file));
        return {image_url: imageUrl, alt: ''};
      })
    );

    const changedArray = [...changedSnapshots];
    const results = {
      baseFilesLength: baseFiles.length,
      changed: changedArray,
      missing: [...missingSnapshots],
      added: [...newSnapshots],
    };
    core.endGroup();

    core.startGroup('Generating image gallery...');
    await generateImageGallery(
      path.resolve(resultsPath, 'index.html'),
      results
    );

    await fsa.write(
      fsa.join(storagePrefix, `${gcsDestination}/index.html`),
      fsa.stream(path.resolve(resultsPath, 'index.html'))
    );
    const galleryUrl = fsa.join(publicUrl, `${gcsDestination}/index.html`);
    // core.endGroup();

    core.debug('Saving snapshots and finishing build...');
    await Promise.all([
      saveSnapshots({
        artifactName: `${artifactName}-results`,
        rootDirectory: resultsRootPath,
      }),

      finishBuild({
        octokit,
        id: buildId,
        owner,
        repo,
        galleryUrl,
        images: resultsArtifactUrls,
        headSha,
        results,
      }),
    ]);
  } catch (error) {
    handleError(error);
    failBuild({
      octokit,
      id: buildId,
      owner,
      repo,
      headSha,
    });
  }
}

run();
