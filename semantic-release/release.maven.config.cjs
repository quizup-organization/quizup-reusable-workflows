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
                    "mvn -B versions:set -DnewVersion=${nextRelease.version} -DprocessAllModules=true -DgenerateBackupPoms=false " +
                    "&& if [ -d quizup-parent ]; then mvn -B -pl quizup-parent versions:set-property -Dproperty=quizup-sdk.version -DnewVersion=${nextRelease.version} -DgenerateBackupPoms=false; fi",
                publishCmd:
                    "mvn -B deploy -DskipTests",
                successCmd:
                    "mvn -B versions:set -DnewVersion=${nextRelease.version}-SNAPSHOT -DprocessAllModules=true -DgenerateBackupPoms=false " +
                    "&& if [ -d quizup-parent ]; then mvn -B -pl quizup-parent versions:set-property -Dproperty=quizup-sdk.version -DnewVersion=${nextRelease.version}-SNAPSHOT -DgenerateBackupPoms=false; fi " +
                    "&& find . -name 'pom.xml' -not -path '*/target/*' | xargs git add " +
                    "&& git remote set-url origin \"https://x-access-token:$GITHUB_TOKEN@github.com/$GITHUB_REPOSITORY.git\" " +
                    "&& git commit -m \"chore: next development version ${nextRelease.version}-SNAPSHOT [skip ci]\" " +
                    "&& git push origin HEAD",
            },
        ],
        [
            "@semantic-release/git",
            {
                assets: ["CHANGELOG.md", "**/pom.xml"],
                message: "chore(release): ${nextRelease.version} [skip ci]"
            },
        ],
        "@semantic-release/github",
    ],
};

