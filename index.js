#!/usr/bin/env node

const { readFileSync, existsSync, writeFileSync } = require('fs');
const path = require('path');

const { promisify } = require('util');
const _exec = promisify(require('child_process').exec);
const moment = require('moment');
const { prompt } = require('inquirer');
const GitHub = require('github');
const ProgressBar = require('progress');

const DRY_RUN = !!process.env.DRY_RUN;

DRY_RUN && console.log('❗️  DRY RUN ❗️');
function exec(cmd) {
  if (DRY_RUN) {
    return new Promise(resolve => setTimeout(resolve, 1));
  }
  return _exec(`${cmd}`);
}

function getMomentForPosition(x, y, refDate) {
  return moment(refDate)
    .add(x, 'weeks')
    .add(y, 'days')
    .hour(12);
}

async function recreateRepo({ GITHUB_API_TOKEN, GITHUB_REPO, GITHUB_USER }) {
  // removing the repo removes the dots from the graph
  const github = new GitHub();
  github.authenticate({
    type: 'token',
    token: GITHUB_API_TOKEN,
  });
  try {
    !DRY_RUN &&
      (await github.repos.delete({
        owner: GITHUB_USER,
        repo: GITHUB_REPO,
      }));
    console.log(`✅  Deleted repo ${GITHUB_USER}:${GITHUB_REPO}`);
  } catch (err) {
    // prob 404
  }
  !DRY_RUN &&
    (await github.repos.create({
      name: GITHUB_REPO,
      description: '🐱 Generated by gitkatt',
      homepage: 'https://github.com/KATT/gitkatt',
    }));
  console.log(`✅  Created repo ${GITHUB_USER}:${GITHUB_REPO}..`);
}

function paintingToCoords(art, refDate) {
  const painting = [];
  let x = 0,
    y = 0;
  for (const char of art) {
    if (char === '\n') {
      y++;
      x = 0;
      continue;
    }
    if (y > 6) {
      throw new Error('Too many lines in art (max 7 rows).');
    }

    const date = getMomentForPosition(x, y, refDate);

    painting.push({ date, char });

    x++;
  }

  return painting;
}

async function main() {
  if (!existsSync('./art')) {
    const contents = readFileSync(path.join(__dirname, 'art'));
    writeFileSync('./art', contents);
    const info = [
      'ℹ️  Notied that you didn\'t an "art" file. So we created an example for you.',
      'ℹ️  Have a look and edit it to your liking.',
    ];
    console.log(info.join('\n'));
  }
  const questions = [
    {
      type: 'input',
      name: 'GITHUB_USER',
      message: 'GitHub username',
      default: process.env.GITHUB_USER,
      validate: val => !!val,
    },
    {
      type: 'input',
      name: 'GITHUB_API_TOKEN',
      message: 'GitHub API Token',
      default: process.env.GITHUB_API_TOKEN,
      validate: val => val.length > 10 || 'Enter a valid API TOKEN',
    },
    {
      type: 'input',
      name: 'ART_FILENAME',
      message: 'Filename for art',
      default: process.env.ART_FILENAME || 'art',
      validate: val => existsSync(`./${val}`) || 'Enter an existing file',
    },
    {
      type: 'input',
      name: 'GITHUB_REPO',
      message: 'Repository name',
      default: process.env.GITHUB_REPO || 'gitkatt-child-repo',
      validate: val => !!val,
    },
    {
      type: 'input',
      name: 'DRAW_START_DATE',
      message: 'Start date for drawing',
      default: process.env.DRAW_START_DATE || '2017-03-05',
      validate: val => moment(val).isoWeekday() === 7 || 'Needs to be a Sunday',
    },
    {
      type: 'input',
      name: 'NUM_LAYERS',
      message: 'Number of layers to draw',
      default: process.env.NUM_LAYERS || 30,
      filter: val => parseInt(val),
      validate: val => (val > 0 && val < 100) || 'Needs to be 1-100',
    },
  ];

  const {
    GITHUB_USER,
    GITHUB_API_TOKEN,
    GITHUB_REPO,
    DRAW_START_DATE,
    ART_FILENAME,
    NUM_LAYERS,
  } = await prompt(questions);

  const ART = readFileSync(`./${ART_FILENAME}`).toString();

  console.log(ART);

  const painting = paintingToCoords(ART, DRAW_START_DATE);

  const bar = new ProgressBar('🚧  Creating git history :percent :etas', {
    complete: '=',
    incomplete: ' ',
    width: 20,
    total: NUM_LAYERS * painting.length,
  });
  // recreate repo a few times to have more history (makes it darker)
  await exec(
    `rm -rf ./generated-repo && mkdir ./generated-repo && cd ./generated-repo && git init`,
  );
  for (let i = 0; i < NUM_LAYERS; i++) {
    for (const { date, char } of painting) {
      bar.tick();
      if (char === ' ') {
        continue;
      }
      const d = date
        .clone()
        .add(Math.random() * 60, 'm')
        .add(Math.random() * 60, 's');
      const content = `${d.format('YYYY-MM-DD')} ${Math.random()}`;
      const cmd = `echo '${
        content
      }' >> meow && git add meow && git commit --date='${d.toJSON()}' -m '🐱'`;

      await exec(`cd ./generated-repo && ${cmd}`);
    }
  }

  await recreateRepo({ GITHUB_API_TOKEN, GITHUB_USER, GITHUB_REPO });
  await exec(
    `cd ./generated-repo && git remote add origin git@github.com:${
      GITHUB_USER
    }/${GITHUB_REPO}.git && git push origin main --force`,
  );
}

main()
  .then(() => {
    console.log('😻  - it should be all set and done! ');
  })
  .catch(err => {
    console.error('🙀', err);
  });
