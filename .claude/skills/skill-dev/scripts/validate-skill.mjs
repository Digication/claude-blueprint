#!/usr/bin/env node
/**
 * Skill Validator - Validates skills against the specification.
 *
 * Usage:
 *   node validate-skill.mjs /path/to/skill/
 *   node validate-skill.mjs /path/to/skill/SKILL.md
 */

import fs from 'node:fs';
import path from 'node:path';

class ValidationResult {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.info = [];
  }

  addError(msg) {
    this.errors.push(`ERROR: ${msg}`);
  }

  addWarning(msg) {
    this.warnings.push(`WARNING: ${msg}`);
  }

  addInfo(msg) {
    this.info.push(`INFO: ${msg}`);
  }

  get passed() {
    return this.errors.length === 0;
  }

  printReport() {
    console.log('\n' + '='.repeat(60));
    console.log('SKILL VALIDATION REPORT');
    console.log('='.repeat(60));

    if (this.errors.length > 0) {
      console.log('\nERRORS (must fix):');
      this.errors.forEach(e => console.log(`  ${e}`));
    }

    if (this.warnings.length > 0) {
      console.log('\nWARNINGS (should fix):');
      this.warnings.forEach(w => console.log(`  ${w}`));
    }

    if (this.info.length > 0) {
      console.log('\nINFO:');
      this.info.forEach(i => console.log(`  ${i}`));
    }

    console.log('\n' + '-'.repeat(60));
    console.log(this.passed ? 'VALIDATION PASSED' : 'VALIDATION FAILED');
    console.log('-'.repeat(60) + '\n');
  }
}

function parseFrontmatter(content) {
  if (!content.startsWith('---')) {
    return [null, content];
  }

  const endMatch = content.slice(3).match(/\n---\s*\n/);
  if (!endMatch) {
    return [null, content];
  }

  const frontmatterText = content.slice(3, endMatch.index + 3);
  const body = content.slice(endMatch.index + endMatch[0].length + 3);

  const frontmatter = {};
  let currentParent = null;
  frontmatterText.split('\n').forEach(line => {
    if (line.startsWith('#') || line.trim() === '') {
      currentParent = null;
      return;
    }

    const indented = line.match(/^(\s+)(\S.*)$/);
    if (indented && currentParent) {
      // Nested key under current parent (e.g., metadata.allowed-tools)
      const nested = indented[2];
      if (nested.includes(':')) {
        const colonIndex = nested.indexOf(':');
        const key = nested.slice(0, colonIndex).trim();
        let value = nested.slice(colonIndex + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        if (typeof frontmatter[currentParent] !== 'object') {
          frontmatter[currentParent] = {};
        }
        frontmatter[currentParent][key] = value;
      }
      return;
    }

    line = line.trim();
    if (line.includes(':') && !line.startsWith('#')) {
      const colonIndex = line.indexOf(':');
      const key = line.slice(0, colonIndex).trim();
      let value = line.slice(colonIndex + 1).trim();

      if (value === '') {
        // Parent key with nested children (e.g., metadata:)
        currentParent = key;
        frontmatter[key] = {};
        return;
      }

      currentParent = null;
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      frontmatter[key] = value;
    }
  });

  return [frontmatter, body];
}

function validateName(name, dirName, result) {
  if (!name) {
    result.addError('name field is required but missing');
    return;
  }

  if (name.length > 64) {
    result.addError(`name exceeds 64 characters (has ${name.length})`);
  }

  if (!/^[a-z0-9-]+$/.test(name)) {
    result.addError('name must contain only lowercase letters, numbers, and hyphens');
  }

  if (name.startsWith('-')) result.addError('name cannot start with a hyphen');
  if (name.endsWith('-')) result.addError('name cannot end with a hyphen');
  if (name.includes('--')) result.addError('name cannot contain consecutive hyphens');

  if (name !== dirName) {
    result.addError(`name '${name}' must match parent directory '${dirName}'`);
  }
}

function validateDescription(description, result) {
  if (!description) {
    result.addError('description field is required but missing');
    return;
  }

  if (description.length > 1024) {
    result.addError(`description exceeds 1024 characters (has ${description.length})`);
  }

  if (description.length < 50) {
    result.addWarning('description seems too short - consider adding more detail');
  }

  const descLower = description.toLowerCase();

  for (const phrase of ['i can', 'i will', 'i help', "i'm"]) {
    if (descLower.includes(phrase)) {
      result.addWarning(`description uses first person ('${phrase}') - prefer third person`);
      break;
    }
  }

  const triggerPhrases = ['use when', 'use for', 'use this', 'when the user', 'if the user', 'when asked', 'trigger on'];
  if (!triggerPhrases.some(phrase => descLower.includes(phrase))) {
    result.addWarning("description should include 'when to use' indicators for discovery");
  }

  // Check if description reads like a summary vs trigger phrases
  const sentences = description.split(/[.!]/).filter(s => s.trim().length > 0);
  const avgSentenceLen = sentences.reduce((sum, s) => sum + s.trim().split(/\s+/).length, 0) / sentences.length;
  if (sentences.length <= 2 && avgSentenceLen > 15) {
    result.addWarning('description may be a summary rather than trigger phrases - consider listing specific phrases users might say');
  }
}

function validateBody(body, result) {
  const lineCount = body.split('\n').length;
  result.addInfo(`SKILL.md body has ${lineCount} lines`);

  if (lineCount > 500) {
    result.addWarning(`SKILL.md has ${lineCount} lines - consider keeping under 500`);
  }

  // Check for Gotchas section
  if (/^##\s+Gotchas/m.test(body)) {
    result.addInfo('Gotchas section found');
  } else {
    result.addWarning('No ## Gotchas section found - consider adding real failure patterns Claude has hit');
  }
}

function validateAllowedTools(frontmatter, result) {
  // Check in both top-level and nested metadata
  const tools = frontmatter['allowed-tools']
    || (frontmatter.metadata && frontmatter.metadata['allowed-tools'])
    || '';

  if (!tools) return;

  // Flag bare "Bash" without command restriction
  const toolList = tools.split(',').map(t => t.trim());
  for (const tool of toolList) {
    if (tool === 'Bash') {
      result.addWarning('allowed-tools includes bare "Bash" (too permissive) - use Bash(command:*) for specific commands');
    }
  }
}

function validateReferencedFiles(body, skillDir, result) {
  // Find markdown links like [text](path) and check if files exist
  const linkPattern = /\[([^\]]*)\]\(([^)]+)\)/g;
  let match;
  while ((match = linkPattern.exec(body)) !== null) {
    const linkPath = match[2];
    // Skip URLs and anchors
    if (linkPath.startsWith('http') || linkPath.startsWith('#') || linkPath.startsWith('$')) continue;

    const resolved = path.resolve(skillDir, linkPath);
    if (!fs.existsSync(resolved)) {
      result.addError(`Referenced file not found: ${linkPath}`);
    }
  }
}

function validateStructure(skillDir, result) {
  for (const dirName of ['scripts', 'references', 'assets']) {
    const dirPath = path.join(skillDir, dirName);
    if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
      result.addInfo(`Found ${dirName}/ directory`);
    }
  }
}

function validateSkill(skillPath) {
  const result = new ValidationResult();
  let resolvedPath = path.resolve(skillPath);

  const stat = fs.existsSync(resolvedPath) ? fs.statSync(resolvedPath) : null;
  let skillDir, skillMd;

  if (stat && stat.isFile() && path.basename(resolvedPath) === 'SKILL.md') {
    skillDir = path.dirname(resolvedPath);
    skillMd = resolvedPath;
  } else if (stat && stat.isDirectory()) {
    skillDir = resolvedPath;
    skillMd = path.join(resolvedPath, 'SKILL.md');
  } else {
    result.addError(`Invalid path: ${skillPath}`);
    return result;
  }

  if (!fs.existsSync(skillMd)) {
    result.addError(`SKILL.md not found in ${skillDir}`);
    return result;
  }

  result.addInfo(`Validating: ${skillDir}`);

  let content;
  try {
    content = fs.readFileSync(skillMd, 'utf-8');
  } catch (e) {
    result.addError(`Failed to read SKILL.md: ${e.message}`);
    return result;
  }

  const [frontmatter, body] = parseFrontmatter(content);

  if (frontmatter === null) {
    result.addError('SKILL.md must start with YAML frontmatter (---)');
    return result;
  }

  const dirName = path.basename(skillDir);
  validateName(frontmatter.name || '', dirName, result);
  validateDescription(frontmatter.description || '', result);
  validateAllowedTools(frontmatter, result);
  validateBody(body, result);
  validateReferencedFiles(body, skillDir, result);
  validateStructure(skillDir, result);

  return result;
}

function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log('Usage: node validate-skill.mjs /path/to/skill/');
    process.exit(1);
  }

  const result = validateSkill(args[0]);
  result.printReport();
  process.exit(result.passed ? 0 : 1);
}

main();
