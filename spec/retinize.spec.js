const fs = require('fs');
const gulp = require('gulp');
const glob = require('glob');
const path = require('path');
const expect = require('expect');
const Retinize = require('..');
const looksSame = require('looks-same');

const TESTCASE_DIR  = path.join(__dirname, 'testcases');
const EXPECTED_DIR  = path.join(__dirname, 'expected');
const ACTUAL_DIR    = path.join(__dirname, 'actual');

describe('retinize#gulp', () => {
  glob.sync(path.join(TESTCASE_DIR, '**', 'options.json')).forEach(filePath => {
    const TEST_NAME = path.basename(path.dirname(filePath));
    const TEST_CASE_DIR = path.join(TESTCASE_DIR, TEST_NAME);
    const TEST_EXPECTED_DIR = path.join(EXPECTED_DIR, TEST_NAME);
    const TEST_ACTUAL_DIR = path.join(ACTUAL_DIR, TEST_NAME);

    it(TEST_NAME, done => {
      const options = JSON.parse(fs.readFileSync(filePath));

      function generate() {
        return new Promise((resolve) => {
          gulp.src(path.join(TEST_CASE_DIR, '**.png'))
            .pipe(Retinize(options))
            .pipe(gulp.dest(TEST_ACTUAL_DIR))
            .on('end', () => { resolve(); });
        });
      }

      function compare() {
        return Promise.all(
          glob.sync(path.join(TEST_EXPECTED_DIR, '*.png')).map(filePath => {
            const FILE_NAME = path.basename(filePath);
            const FILE_EXPECTED = path.join(TEST_EXPECTED_DIR, FILE_NAME);
            const FILE_ACTUAL = path.join(ACTUAL_DIR, TEST_NAME, FILE_NAME);

            return new Promise((resolve, reject) => {
              looksSame(
                fs.readFileSync(FILE_EXPECTED),
                fs.readFileSync(FILE_ACTUAL),
                { tolerance: 0.2, ignoreAntialiasing: true },
                (error, match) => {
                  if (error) reject(error);

                  expect(match).toEqual(true);
                  resolve();
                }
              );
            });
          })
        );
      }

      generate()
        .then(compare)
        .then(() => done());
    });
  });
});
