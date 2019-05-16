
const git = require('simple-git/promise')();
const ncu = require('npm-check-updates');

async function initBranch() {
    const branchName = 'npm-auto-update';
    console.log(`Checking out branch: ${branchName}`);

    await git.checkout('master');
    const existingBranches = await git.branchLocal();
    if (existingBranches.all.includes(branchName)) {
        console.log('Branch exists. Deleting first');
        await git.deleteLocalBranch(branchName);
    }

    await git.checkoutBranch(branchName, 'master');
}

async function updatePackages() {
    console.log('checking package.json for updates');
    const updates = await ncu.run({
        upgrade: true
    });
    console.log('results', updates);
}

module.exports = async function npmAutoUpdate(options) {
    console.log('Starting NPM auto update');
    await initBranch();
    await updatePackages();

    console.log('NPM auto update complete!');
}