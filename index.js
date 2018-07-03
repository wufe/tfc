const exec = require('child_process').exec;
const chalk = require('chalk');
const parser = require('gitignore-parser');
const {readFileSync} = require('fs');

const executableName = 'tfcheck';

const processArguments = process.argv;
const applicationArguments = processArguments.slice(2);

const comments = [];
for (let i = 0; i < applicationArguments.length; i++){
    const arg = applicationArguments[i];
    let comment;
    if (arg.trim().toLowerCase() === '-m' && (comment = applicationArguments[i+1])) {
        comments.push(comment);
    }
}
if (!comments.length) {
    console.log("\n", chalk.white(chalk.bgBlack(`${chalk.underline('USAGE')}: ${executableName} -m "text of the comment" [-m "another comment"]`)));
    return;
}

const tfArguments = `-comment:"${comments.join(' - ')}"`;
const gitArguments = `${comments.map(c => `-m "${c}"`).join(' ')}`;

console.log();

const execCommand = command => new Promise((resolve, reject) => {
    console.log(chalk.gray(`\n> ${command}`));
    exec(command, (error, stdout) => {
        if (error)
            return reject(error);
        return resolve(stdout.toString());
    });
});

const tfCheckoutFile = file => {
    return new Promise((resolve, reject) => {
        execCommand(`tf checkout ${file} -recursive`)
            .then(() => {
                console.log(chalk.green(`${file} checked out.`));
                resolve(file);
            })
            .catch(error => {
                if (error.message.indexOf('No matching items') === -1) {
                    reject(error);
                } else {
                    execCommand(`tf add ${file} -recursive`)
                        .then(() => {
                            console.log(chalk.green(`${file} added recursively.`));
                            resolve(file);
                        })
                        .catch(error => reject(error));
                }
            });
    });
};

execCommand(`git status --porcelain=v1`)
    .then(result => {
        const gitStatusOutcome = result.toString();
        if (!gitStatusOutcome)
            console.log(chalk.blue('Nothing to commit.')) && process.exit(0);
        const rawFiles = gitStatusOutcome.split('\n');
        const files = rawFiles.map(r => r.replace(/^(.+?)\s/i, '')).filter(x => !!x);

        let tfFiles = [...files];
        try {
            const tfIgnoreFile = readFileSync('.tfignore', 'utf8');
            const tfIgnore = parser.compile(tfIgnoreFile);
            tfFiles = tfFiles.filter(tfIgnore.accepts);
        } catch (e) {}

        console.log(chalk.cyan(`Team Foundation Server:`));
        tfFiles.forEach(file => console.log(chalk.gray(file)));
        console.log(chalk.gray('----------------'));

        // checkout all the things
        tfFiles.map(file => () => tfCheckoutFile(file))
            .reduce((p, fn) => p.then(fn), Promise.resolve())
            .then(_ => execCommand(`tf checkin ${tfArguments}`))
            .then(_ => execCommand(`git add -A`))
            .then(_ => execCommand(`git commit ${gitArguments}`))
            .catch(error => {
                console.log(chalk.red(error.toString())) && process.exit(1);
            });
    })
    .catch(error => {
        console.log(chalk.red(error.toString())) && process.exit(1);
    });