#!/usr/bin/env node
/**
 * TS2339 Pattern Analyzer
 * Scans codebase for prop naming mismatches (snake_case interface vs camelCase destructuring)
 */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

// Configuration
const SRC_DIR = path.join(__dirname, 'src');
const EXCLUDE_PATTERNS = ['archived_components', '_BACKUP', '_ORIGINAL', 'test-3d', '/archive/'];

// Results storage
const results = {
  propMismatches: [],
  summary: {
    totalFilesScanned: 0,
    filesWithIssues: 0,
    totalMismatches: 0,
    highConfidence: 0,
    mediumConfidence: 0,
    lowConfidence: 0
  }
};

// Helper: Check if string is snake_case
function isSnakeCase(str) {
  return /^[a-z][a-z0-9_]*$/.test(str);
}

// Helper: Check if string is camelCase
function isCamelCase(str) {
  return /^[a-z][a-zA-Z0-9]*$/.test(str) && /[A-Z]/.test(str);
}

// Helper: Convert snake_case to camelCase
function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

// Helper: Should exclude file?
function shouldExclude(filePath) {
  return EXCLUDE_PATTERNS.some(pattern => filePath.includes(pattern));
}

// Helper: Get all .ts and .tsx files recursively
function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);

    if (shouldExclude(filePath)) {
      return;
    }

    if (fs.statSync(filePath).isDirectory()) {
      getAllFiles(filePath, fileList);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

// Main analyzer
function analyzeFile(filePath) {
  const sourceCode = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceCode,
    ts.ScriptTarget.Latest,
    true
  );

  const interfaces = new Map(); // interface name -> snake_case props
  const components = []; // components with their destructured props

  // Visit all nodes in the AST
  function visit(node) {
    // Find interfaces with snake_case properties
    if (ts.isInterfaceDeclaration(node) && node.name) {
      const interfaceName = node.name.text;
      const snakeProps = [];

      node.members.forEach(member => {
        if (ts.isPropertySignature(member) && member.name) {
          const propName = member.name.text;
          if (isSnakeCase(propName)) {
            snakeProps.push(propName);
          }
        }
      });

      if (snakeProps.length > 0) {
        interfaces.set(interfaceName, snakeProps);
      }
    }

    // Find React components with destructured props
    if (ts.isFunctionDeclaration(node) || ts.isVariableStatement(node)) {
      const componentInfo = extractComponentInfo(node);
      if (componentInfo) {
        components.push(componentInfo);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  // Match interfaces with components
  return matchInterfacesWithComponents(filePath, interfaces, components);
}

// Extract component information
function extractComponentInfo(node) {
  let funcDecl = null;
  let componentName = null;

  if (ts.isFunctionDeclaration(node)) {
    funcDecl = node;
    componentName = node.name?.text;
  } else if (ts.isVariableStatement(node)) {
    const declaration = node.declarationList.declarations[0];
    if (declaration.initializer && ts.isArrowFunction(declaration.initializer)) {
      funcDecl = declaration.initializer;
      componentName = declaration.name.text;
    }
  }

  if (!funcDecl || !funcDecl.parameters || funcDecl.parameters.length === 0) {
    return null;
  }

  const param = funcDecl.parameters[0];

  // Check if parameter is destructured
  if (ts.isObjectBindingPattern(param.name)) {
    const destructuredProps = [];
    param.name.elements.forEach(element => {
      if (ts.isBindingElement(element) && element.name) {
        destructuredProps.push(element.name.text);
      }
    });

    // Check if parameter has a type annotation
    let typeName = null;
    if (param.type && ts.isTypeReferenceNode(param.type)) {
      typeName = param.type.typeName.text;
    }

    return {
      componentName,
      typeName,
      destructuredProps,
      lineNumber: ts.getLineAndCharacterOfPosition(param.getSourceFile(), param.getStart()).line + 1
    };
  }

  return null;
}

// Match interfaces with components to find mismatches
function matchInterfacesWithComponents(filePath, interfaces, components) {
  const mismatches = [];

  components.forEach(comp => {
    if (!comp.typeName || !interfaces.has(comp.typeName)) {
      return;
    }

    const interfaceProps = interfaces.get(comp.typeName);
    const camelCaseProps = comp.destructuredProps.filter(isCamelCase);

    const propMismatches = [];

    camelCaseProps.forEach(camelProp => {
      // Check if there's a corresponding snake_case prop
      const expectedSnake = camelProp.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

      if (interfaceProps.includes(expectedSnake)) {
        propMismatches.push({
          interface: expectedSnake,
          destructured: camelProp,
          match: 'exact'
        });
      }
    });

    if (propMismatches.length > 0) {
      mismatches.push({
        file: path.relative(process.cwd(), filePath),
        component: comp.componentName,
        interface: comp.typeName,
        lineNumber: comp.lineNumber,
        mismatches: propMismatches,
        confidence: propMismatches.length >= 3 ? 'high' : propMismatches.length >= 2 ? 'medium' : 'low'
      });
    }
  });

  return mismatches;
}

// Generate report
function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 TS2339 PATTERN ANALYSIS REPORT');
  console.log('='.repeat(80) + '\n');

  // Summary
  console.log('📊 SUMMARY');
  console.log('-'.repeat(80));
  console.log(`Total Files Scanned:    ${results.summary.totalFilesScanned}`);
  console.log(`Files with Issues:      ${results.summary.filesWithIssues}`);
  console.log(`Total Prop Mismatches:  ${results.summary.totalMismatches}`);
  console.log(`  High Confidence:      ${results.summary.highConfidence} files`);
  console.log(`  Medium Confidence:    ${results.summary.mediumConfidence} files`);
  console.log(`  Low Confidence:       ${results.summary.lowConfidence} files`);
  console.log('');

  if (results.propMismatches.length === 0) {
    console.log('✅ No prop naming mismatches found!\n');
    return;
  }

  // Group by confidence
  const byConfidence = {
    high: results.propMismatches.filter(m => m.confidence === 'high'),
    medium: results.propMismatches.filter(m => m.confidence === 'medium'),
    low: results.propMismatches.filter(m => m.confidence === 'low')
  };

  // Print high confidence first
  ['high', 'medium', 'low'].forEach(confidence => {
    if (byConfidence[confidence].length === 0) return;

    console.log(`\n${'='.repeat(80)}`);
    console.log(`🎯 ${confidence.toUpperCase()} CONFIDENCE MISMATCHES (${byConfidence[confidence].length} files)`);
    console.log('='.repeat(80) + '\n');

    byConfidence[confidence].forEach((item, index) => {
      console.log(`${index + 1}. ${item.file}:${item.lineNumber}`);
      console.log(`   Component: ${item.component}`);
      console.log(`   Interface: ${item.interface}`);
      console.log(`   Mismatches (${item.mismatches.length}):`);

      item.mismatches.forEach(m => {
        console.log(`      ${m.interface} → ${m.destructured} ❌`);
      });

      console.log('');
    });
  });

  // Generate fix recommendations
  console.log('\n' + '='.repeat(80));
  console.log('💡 RECOMMENDED FIX ORDER');
  console.log('='.repeat(80) + '\n');

  const sorted = [...results.propMismatches].sort((a, b) => {
    // Sort by confidence then by number of mismatches
    const confidenceOrder = { high: 0, medium: 1, low: 2 };
    if (confidenceOrder[a.confidence] !== confidenceOrder[b.confidence]) {
      return confidenceOrder[a.confidence] - confidenceOrder[b.confidence];
    }
    return b.mismatches.length - a.mismatches.length;
  });

  sorted.forEach((item, index) => {
    console.log(`${index + 1}. ${item.file}`);
    console.log(`   Priority: ${item.confidence.toUpperCase()} | Props to fix: ${item.mismatches.length}`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('✅ Analysis complete! Ready to fix files using 6-Step Protocol.');
  console.log('='.repeat(80) + '\n');
}

// Main execution
function main() {
  console.log('🚀 Starting TS2339 pattern analysis...\n');

  const files = getAllFiles(SRC_DIR);
  results.summary.totalFilesScanned = files.length;

  console.log(`📁 Scanning ${files.length} files...\n`);

  files.forEach(file => {
    const mismatches = analyzeFile(file);

    if (mismatches.length > 0) {
      results.propMismatches.push(...mismatches);
      results.summary.filesWithIssues++;
      results.summary.totalMismatches += mismatches.reduce((sum, m) => sum + m.mismatches.length, 0);

      mismatches.forEach(m => {
        if (m.confidence === 'high') results.summary.highConfidence++;
        else if (m.confidence === 'medium') results.summary.mediumConfidence++;
        else results.summary.lowConfidence++;
      });
    }
  });

  generateReport();
}

// Run the analyzer
main();
