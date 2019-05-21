
const git = require('simple-git/promise')();
const ncu = require('npm-check-updates');
const child_process = require('child_process');
const Octokit = require('@octokit/rest')
const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN || (function() { throw new Error('Cannot find GITHUB_TOKEN env var');})()
});

const branchName = 'npm-auto-update';

async function initBranch() {
    console.log(`Checking out branch: ${branchName}`);

    await git.checkout('master');
    const existingBranches = await git.branchLocal();
    if (existingBranches.all.includes(branchName)) {
        console.log('Branch exists. Deleting first');
        await git.raw(['branch', '-D', branchName]);
    }

    await git.checkoutBranch(branchName, 'master');
}

async function commitChangesToBranch() {
    console.log('Committing and pushing changes to Git');
    const message = 'NPM auto update';
    const files = [
        'package.json',
        'package-lock.json'
    ];
    await git.commit(message, files);
    await git.push('origin', branchName);
}

async function updatePackages() {
    console.log('checking package.json for updates');
    const updates = await ncu.run({
        upgrade: true
    });
    console.log('results', updates);
    return updates;
}

function hasUpdates(updates) {
    return Object.keys(updates).length;
}

function npmInstall() {
    console.log('Executing NPM install');
    return new Promise((resolve, reject) => {
        const child = child_process.spawn("npm", ["install"]);
        child.on('close', resolve);
        child.on('error', reject);
    });
}

async function determineGithubRemote() {
    const remotes = await git.getRemotes(true);
    const origin = remotes.find(({name}) => name === 'origin');
    const matches = /git@([^\:]+):([^\/]+)\/(.+)\.git/.exec(origin.refs.push);

    const [, , owner, repo] = matches;
    return {
        owner,
        repo
    };
}


function buildPullRequestBody(updates) {
    const updateList = Object.entries(updates)
        .map(([key, value]) => ` - ${key}: ${value}`)
        .join('\n');

    return `Auto update the following packages:\n\n${updateList}`;
}

async function createPullRequestIfNeeded(updates) {
    console.log('Creating Pull Request if needed');
    const remoteConfig = await determineGithubRemote();
    const pullResponse = await octokit.pulls.list({
        ...remoteConfig,
        head: branchName
    });
    if (!pullResponse.status === 200) {
        throw new Error(pullResponse.status);
    }
    if (pullResponse.data.length) {
        console.log('Pull request already exists, Updating');
        const createResponse = await octokit.pulls.update({
            ...remoteConfig,
            pull_number: pullResponse.data[0].number,
            body: buildPullRequestBody(updates)
        });
        if (!createResponse.status === 200) {
            throw new Error(createResponse.status);
        }
        return;
    }

    const createResponse = await octokit.pulls.create({
        ...remoteConfig,
        title: 'NPM Auto Update',
        head: branchName,
        base: 'master',
        body: buildPullRequestBody(updates)
    });
    if (!createResponse.status === 200) {
        throw new Error(createResponse.status);
    }
    console.log('Pull request created: ', createResponse.data.url);
}

module.exports = async function npmAutoUpdate(options) {
    console.log('Starting NPM auto update');
    await initBranch();
    const updates = await updatePackages();
    if (!hasUpdates(updates)) {
        console.log('nothing to update');
        return;
    }

    await npmInstall();
    await commitChangesToBranch();
    await createPullRequestIfNeeded();
    console.log('NPM auto update complete!');
}