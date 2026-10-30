#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { convert } = require('../converter.js');

const casesPath = path.join(__dirname, 'cases.json');
const { cases } = JSON.parse(fs.readFileSync(casesPath, 'utf8'));

let passed = 0;
const failures = [];

for (const testCase of cases) {
  const actual = convert(testCase.input, testCase.direction);
  if (actual === testCase.expected) {
    passed += 1;
  } else {
    failures.push({
      direction: testCase.direction,
      input: testCase.input,
      expected: testCase.expected,
      actual,
      note: testCase.note
    });
  }
}

for (const failure of failures) {
  console.error(`FAIL [${failure.direction}] ${failure.note}`);
  console.error(`  input:    ${JSON.stringify(failure.input)}`);
  console.error(`  expected: ${JSON.stringify(failure.expected)}`);
  console.error(`  actual:   ${JSON.stringify(failure.actual)}`);
}

console.log(`\nconverter.js: ${passed}/${cases.length} passed`);
process.exit(failures.length === 0 ? 0 : 1);
