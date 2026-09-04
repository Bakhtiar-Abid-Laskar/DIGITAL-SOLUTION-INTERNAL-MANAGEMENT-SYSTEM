const fs = require('fs');
const path = require('path');

const sql = fs.readFileSync('all_migrations_combined.sql', 'utf8');

// Find all CREATE TABLE statements
const tableMatches = [...sql.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\);/gi)];
console.log('--- TABLES CREATED IN MIGRATIONS ---');
const tables = new Set();
tableMatches.forEach(m => {
  tables.add(m[1].toLowerCase());
  console.log('-', m[1].toLowerCase());
});

// Find all CREATE TYPE / ENUM
const typeMatches = [...sql.matchAll(/CREATE\s+TYPE\s+(?:public\.)?([a-zA-Z0-9_]+)\s+AS\s+ENUM\s*\(([\s\S]*?)\);/gi)];
console.log('\n--- ENUMS CREATED ---');
typeMatches.forEach(m => {
  console.log('-', m[1], ':', m[2].replace(/\s+/g, ' ').trim());
});

// Find all CREATE OR REPLACE FUNCTION
const fnMatches = [...sql.matchAll(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\)\s*RETURNS\s+([\s\S]*?)(?:LANGUAGE|\$\$|AS)/gi)];
console.log('\n--- FUNCTIONS CREATED ---');
const functions = new Map();
fnMatches.forEach(m => {
  const name = m[1];
  const args = m[2].replace(/\s+/g, ' ').trim();
  const returns = m[3].replace(/\s+/g, ' ').trim();
  functions.set(name, { args, returns });
});
for (const [name, meta] of functions.entries()) {
  console.log(`- ${name}(${meta.args}) -> ${meta.returns}`);
}

// Find all RLS policies
const policyMatches = [...sql.matchAll(/CREATE\s+POLICY\s+["']?([^"'\n]+)["']?\s+ON\s+(?:public\.)?([a-zA-Z0-9_]+)([\s\S]*?);/gi)];
console.log('\n--- TOTAL POLICIES FOUND ---', policyMatches.length);

// Find all Triggers
const triggerMatches = [...sql.matchAll(/CREATE\s+(?:OR\s+REPLACE\s+)?TRIGGER\s+([a-zA-Z0-9_]+)\s+([\s\S]*?)\s+ON\s+([a-zA-Z0-9_]+)\s+([\s\S]*?);/gi)];
console.log('\n--- TRIGGERS FOUND ---', triggerMatches.length);
triggerMatches.forEach(m => {
  console.log(`- Trigger: ${m[1]} ON ${m[3]}`);
});
