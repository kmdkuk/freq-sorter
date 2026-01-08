const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const semver = require('semver');

const packageJsonPath = path.resolve(__dirname, '../package.json');
const manifestJsonPath = path.resolve(__dirname, '../manifest.json');

try {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const manifestJson = JSON.parse(fs.readFileSync(manifestJsonPath, 'utf8'));

  const packageVersion = packageJson.version;
  const manifestVersion = manifestJson.version;

  console.log(`Package version: ${packageVersion}`);
  console.log(`Manifest version: ${manifestVersion}`);

  if (packageVersion !== manifestVersion) {
    console.error('Error: Versions in package.json and manifest.json do not match.');
    process.exit(1);
  }

  // Check against previous tag
  try {
    const latestTag = execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
    console.log(`Latest tag: ${latestTag}`);
    
    if (semver.valid(latestTag)) {
        if (semver.gt(latestTag, packageVersion)) {
             console.error(`Error: Current version ${packageVersion} is smaller than latest tag ${latestTag}.`);
             process.exit(1);
        }
        
        if (semver.eq(latestTag, packageVersion)) {
             console.error(`Error: Version ${packageVersion} already exists as a tag.`);
             process.exit(1);
        }
        
        // Strict continuity check
        const diff = semver.diff(latestTag, packageVersion);
        if (!['major', 'minor', 'patch'].includes(diff)) {
            console.error(`Error: Invalid version increment: ${diff}. Only major, minor, or patch increments are allowed from ${latestTag} to ${packageVersion}.`);
            process.exit(1);
        }
        
        // Check for skipped versions (simple check: next version should be exactly +1)
        const expectedNextPatch = semver.inc(latestTag, 'patch');
        const expectedNextMinor = semver.inc(latestTag, 'minor');
        const expectedNextMajor = semver.inc(latestTag, 'major');
        
        if (packageVersion !== expectedNextPatch && packageVersion !== expectedNextMinor && packageVersion !== expectedNextMajor) {
             console.error(`Error: Version skipped? Expected one of: ${expectedNextPatch}, ${expectedNextMinor}, ${expectedNextMajor}. Got: ${packageVersion}`);
             console.error('If you intended to skip versions, run git tag manually.');
             process.exit(1);
        }

    }
  } catch (e) {
    console.log('No previous tags found or git describe failed. Assuming first release.');
  }

  const tagName = `v${packageVersion}`;
  console.log(`Creating tag: ${tagName}`);

  execSync(`git tag ${tagName}`, { stdio: 'inherit' });
  console.log('Tag created successfully.');
  console.log(`Run 'git push origin ${tagName}' to push the tag and trigger release.`);

} catch (error) {
  console.error('An error occurred:', error.message);
  process.exit(1);
}
