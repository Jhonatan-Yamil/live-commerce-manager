#!/usr/bin/env node

/**
 * Doctor Script - Validates development environment setup
 * Usage: node doctor.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset}  ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset}  ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset}  ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset}  ${msg}`),
  section: (msg) => console.log(`\n${colors.blue}${msg}${colors.reset}`),
};

let checksPassed = 0;
let checksFailed = 0;

const runCheck = (label, fn) => {
  try {
    const result = fn();
    if (result.success) {
      log.success(`${label} ${result.details ? `(${result.details})` : ''}`);
      checksPassed++;
    } else {
      log.error(`${label} — ${result.message}`);
      checksFailed++;
    }
  } catch (err) {
    log.error(`${label} — ${err.message}`);
    checksFailed++;
  }
};

const runCommand = (cmd) => {
  try {
    const output = execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' }).trim();
    return { success: true, output };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const fileExists = (filePath) => fs.existsSync(filePath);

// Detect OS
const isWindows = process.platform === 'win32';

log.section('🏥 Development Environment Doctor');

// Node.js version
log.section('Node.js & npm');
runCheck('Node.js version', () => {
  const result = runCommand('node --version');
  if (result.success) {
    const version = result.output.slice(1); // Remove 'v'
    const major = parseInt(version.split('.')[0]);
    if (major >= 16) {
      return { success: true, details: result.output };
    }
    return { success: false, message: `Node ${version} detected, but 16+ required` };
  }
  return { success: false, message: 'Node.js not found in PATH' };
});

runCheck('npm version', () => {
  const result = runCommand('npm --version');
  if (result.success) {
    return { success: true, details: result.output };
  }
  return { success: false, message: 'npm not found in PATH' };
});

// Python (for backend)
log.section('Python & Database');
runCheck('Python 3 version', () => {
  const result = runCommand('python --version') || runCommand('python3 --version');
  if (result.success) {
    return { success: true, details: result.output };
  }
  return { success: false, message: 'Python 3 not found' };
});

runCheck('PostgreSQL client', () => {
  const result = runCommand(isWindows ? 'psql --version' : 'which psql');
  if (result.success) {
    return { success: true, details: 'psql available' };
  }
  return { success: false, message: 'PostgreSQL client (psql) not found' };
});

// Environment files
log.section('Environment Configuration');
runCheck('.env file exists', () => {
  if (fileExists(path.join(__dirname, '.env'))) {
    return { success: true, details: 'root .env found' };
  }
  return { success: false, message: 'Missing root .env file (copy from .env.example)' };
});

runCheck('backend/.env or root .env', () => {
  const hasRoot = fileExists(path.join(__dirname, '.env'));
  const hasBackend = fileExists(path.join(__dirname, 'backend', '.env'));
  if (hasRoot || hasBackend) {
    return { success: true, details: hasRoot ? 'root .env' : 'backend/.env' };
  }
  return { success: false, message: 'No backend environment configuration found' };
});

// Directory structure
log.section('Project Structure');
const requiredDirs = ['backend', 'frontend'];
requiredDirs.forEach((dir) => {
  runCheck(`${dir}/ directory exists`, () => {
    if (fileExists(path.join(__dirname, dir))) {
      return { success: true };
    }
    return { success: false, message: `Missing ${dir}/ directory` };
  });
});

// Dependencies
log.section('Dependencies');
runCheck('frontend/package.json exists', () => {
  if (fileExists(path.join(__dirname, 'frontend', 'package.json'))) {
    return { success: true };
  }
  return { success: false, message: 'Missing frontend/package.json' };
});

runCheck('backend/requirements.txt exists', () => {
  if (fileExists(path.join(__dirname, 'backend', 'requirements.txt'))) {
    return { success: true };
  }
  return { success: false, message: 'Missing backend/requirements.txt' };
});

runCheck('frontend node_modules', () => {
  const nmPath = path.join(__dirname, 'frontend', 'node_modules');
  if (fileExists(nmPath)) {
    return { success: true, details: 'npm dependencies installed' };
  }
  return {
    success: false,
    message: 'npm dependencies not installed. Run: cd frontend && npm install',
  };
});

// Optional: Check if Docker is available
log.section('Docker (Optional)');
runCheck('Docker available', () => {
  const result = runCommand(isWindows ? 'docker --version' : 'which docker');
  if (result.success) {
    return { success: true, details: 'Docker CLI found' };
  }
  return { success: false, message: 'Docker not installed (optional)' };
});

// Summary
log.section('Summary');
console.log(`${colors.green}${checksPassed}${colors.reset} checks passed`);
if (checksFailed > 0) {
  console.log(
    `${colors.red}${checksFailed}${colors.reset} checks failed${checksFailed <= 2 ? ' — review messages above' : ''}`
  );
  console.log(
    `\n${colors.gray}Run this again after fixing issues:${colors.reset} node doctor.js\n`
  );
  process.exit(1);
} else {
  console.log(`${colors.green}✓ Environment ready!${colors.reset}\n`);
  console.log(
    `${colors.gray}Next steps:${colors.reset}`
  );
  console.log('  cd backend && python -m uvicorn app.main:app --reload');
  console.log('  cd frontend && npm start\n');
  process.exit(0);
}
