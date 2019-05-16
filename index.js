
const git = require('simple-git/promise')();

async function initBranch() {
    const branchName = 'npm-auto-update';
    console.log(`Checking out branch: ${branchName}`);
    await git.checkoutBranch(branchName, 'master');
}

module.exports = async function npmAutoUpdate(options) {
    console.log('Starting NPM auto update');
    await initBranch();

    console.log('NPM auto update complete!');
}