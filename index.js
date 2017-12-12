const { readFileSync } = require('fs');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const moment = require('moment');
const _ = require('lodash');
const GitHub = require('github');
const ProgressBar = require('progress');

const GITHUB_USER = process.env.GITHUB_USER || 'KATT';
const GITHUB_API_TOKEN = process.env.GITHUB_API_TOKEN || '';
const GITHUB_REPO = process.env.GITHUB_REPO || 'gitkatt-child-repo';

const DRAW_START_DATE = process.env.DRAW_START_DATE || '2017-02-26';
const NUM_COMMITS = 50; // the more the darker
const ART = readFileSync('./art').toString();

function getMomentForPosition(x, y, refDate) {
  return moment(refDate)
    .add(x, 'weeks')
    .add(y, 'days')
    .hour(12);
}

async function recreateRepo() {
  if (!GITHUB_API_TOKEN) {
    throw new Error(`Missing env var 'GITHUB_API_TOKEN'`);
  }
  // removing the repo removes the dots from the graph
  const github = new GitHub();
  github.authenticate({
    type: 'token',
    token: GITHUB_API_TOKEN,
  });
  try {
    await github.repos.delete({
      owner: GITHUB_USER,
      repo: GITHUB_REPO,
    });
  } catch (err) {
    // prob 404
  }

  await github.repos.create({
    name: GITHUB_REPO,
    description: '🐱 Generated by gitkatt',
    homepage: 'https://github.com/KATT/gitkatt',
  });
}

async function main() {
  console.log(ART);

  const painting = [];
  let x = 0,
    y = 0;
  for (const char of ART) {
    if (char === '\n') {
      y++;
      x = 0;
      continue;
    }
    if (y > 6) {
      throw new Error('Too many lines in art (max 7 rows).');
    }

    const date = getMomentForPosition(x, y, DRAW_START_DATE);

    painting.push({ date, char });

    x++;
  }

  const sensible = _.sortBy(painting, 'date');

  const cmds = sensible.reduce((res, { date, char }) => {
    if (char !== ' ') {
      const content = `${date.format('YYYY-MM-DD')} ${Math.random()}`;
      const cmd = `echo '${content}' >> meow && git add meow && git commit --date='${date.toJSON()}' -m '🐱'`;

      return [...res, cmd];
    }
    return res;
  }, []);

  const bar = new ProgressBar('  creating history [:bar] :percent :etas', {
    complete: '=',
    incomplete: ' ',
    width: 20,
    total: NUM_COMMITS * cmds.length,
  });

  await recreateRepo();
  // recreate repo a few times to have more history (makes it darker)
  for (let i = 0; i < NUM_COMMITS; i++) {
    bar.tick();
    await exec(
      'rm -rf ./child-repo && mkdir child-repo && cd child-repo && git init'
    );

    for (const cmd of cmds) {
      bar.tick();
      await exec(`cd child-repo && ${cmd}`);
    }

    await exec(
      `cd child-repo && git remote add origin git@github.com:${GITHUB_USER}/${GITHUB_REPO}.git && git push origin master --force`
    );
  }
}

main()
  .then(() => {
    console.log('😻');
  })
  .catch(err => {
    console.error('🙀', err);
  });
