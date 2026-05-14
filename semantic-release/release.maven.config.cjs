module.exports = {
    branches: ["main"],
    plugins: [
        [
            "@semantic-release/commit-analyzer",
            {
                preset: "conventionalcommits",
            },
        ],
        [
            "@semantic-release/release-notes-generator",
            {
                preset: "conventionalcommits",
            },
        ],
        "@semantic-release/changelog",
        [
            "@semantic-release/exec",
            {
                prepareCmd:
                    "mvn versions:set -DnewVersion=${nextRelease.version} -DprocessAllModules=true -DgenerateBackupPoms=false",
            },
        ],
        [
            "@semantic-release/git",
            {
                assets: ["CHANGELOG.md", "**/pom.xml"],
                message: "chore(release): ${nextRelease.version} [skip ci]",
            },
        ],
        "@semantic-release/github",
    ],
};

