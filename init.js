const fs = require('fs');
const https = require('https');
const readline = require('readline');
const path = require('path');
const { execSync } = require('child_process');

const toMerge = ['package.json'];
const toAvoid = [...toMerge, '.git', 'node_modules'];

const args = process.argv.slice(2);
let projectName = 'my-app';
let githubUrl = 'https://github.com/matija-radovic/f-test';
let templatePath = undefined;
let branch = 'main';

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (!arg.startsWith('--')) {
    projectName = arg;
  } else if (arg === '--github' && args[i + 1]) {
    githubUrl = args[++i];
  } else if (arg === '--branch' && args[i + 1]) {
    branch = args[++i];
  } else if (arg === '--templatePath' && args[i + 1]) {
    templatePath = path.join(args[++i]);
  }
}

// Default to folder in default link
if (githubUrl === 'https://github.com/matija-radovic/vite-react-ts-template' && templatePath === undefined) {
  templatePath = "template"
}

const main = async () => {
  console.log("Creating directory...");
  while (true) {
    try {
      fs.mkdirSync(path.join(process.cwd(), projectName)); break;
    } catch (error) {
      if (error.code === "EEXIST") {
        let suggestedName = suggestFolderName(path.join(process.cwd(), projectName));
        let answer = (await askQuestion(`Folder "${projectName}" already exists, but "${suggestedName}" is free. Press Enter to use it, or type a new name: `)).trim();
        projectName = answer === '' ? suggestedName : answer; continue;
      } else {
        console.log(first)
      }
    }
  }

  process.chdir(projectName);
  const projectRoot = process.cwd();

  console.log(`Creating Vite project: ${projectName}...`);
  execSync(`npm create vite@latest . -- --t react-ts`, {
    stdio: 'inherit',
    windowsHide: true
  });

  try {
    console.log(`Downloading template from ${githubUrl} (branch: ${branch})...`);
    execSync(`git clone -b ${branch} --depth 1 ${githubUrl} template`, {
      stdio: 'inherit',
      windowsHide: true
    });

  } catch (error) {
    console.log("Couldn't download the template");
    console.error(error); return;
  }

  const templateDir = path.join(projectRoot, 'template', templatePath);

  console.log('\nApplying template...');
  // Overwrite project files and directories
  fs.readdirSync(templateDir).forEach(item => {
    if (toAvoid.includes(item)) return;

    const src = path.join(templateDir, item);
    const dest = path.join(projectRoot, item);

    if (fs.existsSync(dest)) removeDir(dest);
    if (fs.lstatSync(src).isDirectory()) {
      copyDir(src, dest);
    } else {
      fs.copyFileSync(src, dest);
    }
  });

  // Merge .json files
  await mergePackageJson(
    path.join(templateDir, 'package.json'),
    path.join(projectRoot, 'package.json')
  );
  console.log("Template applied!");

  // Cleanup
  let flag = false;
  const cleanupMessage = "Cleanup Completed!";
  console.log("Starting up the cleanup...");
  try {
    removeDir(templateDir);
    console.log(cleanupMessage);
  } catch (error) {
    try {
      await asyncRemoveDir(templateDir);
    } catch (error) {
      console.log('\x1b[31m' + "Couldn't remove the template folder, try doing it manually" + '\x1b[0m', error);
    }
  }

  // Should "npm install"
  try {
    let answer = String(await askQuestion('Install dependencies? (y/n)\n')).trim().toLowerCase();
    if (['y', '1', 'yes', 'sure', 'true', 'why not'].includes(answer)) {
      execSync('npm install', {
        stdio: 'inherit',
        windowsHide: true
      });
    }
  } catch (error) {
    console.log("Couldn't install. Error code: " + error.code);
  }

  console.log(`\n✅ Project ${projectName} created successfully!`);
}

const askQuestion = async (query) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    })
  })
}

const suggestFolderName = (baseDir) => {
  let currentDir = baseDir;
  let counter = 2;
  while (fs.existsSync(currentDir)) {
    currentDir = `${baseDir}${counter++}`;
  }
  return currentDir.split('\\').at(-1);
}

const maxRetries = 5;
const retryDelay = 200;
const removeDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) return;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      fs.rmSync(dirPath, { recursive: true, force: true }); return;
    } catch (error) {
      if (error.code === 'EBUSY' && attempt < maxRetries) {
        const waitTill = new Date(new Date().getTime() + retryDelay);
        while (new Date() < waitTill) { }
      } else {
        throw error;
      }
    }
  }
};

const asyncRemoveDir = async (dirPath) => {
  if (!fs.existsSync(dirPath)) return;
  return new Promise((resolve, reject) => {
    fs.rm(dirPath, { recursive: true, force: true, maxRetries, retryDelay }, (err) => err ? reject(err) : resolve());
  });
}

const copyDir = (src, dest) => {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
};


const mergePackageJson = async (templatePath, projectPath) => {
  const templatePkg = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
  const projectPkg = JSON.parse(fs.readFileSync(projectPath, 'utf8'));

  // Helper function to get latest version from npm registry
  const getLatestVersion = (packageName) => new Promise((resolve, reject) => {
    https.get(`https://registry.npmjs.org/${packageName}/latest`, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to fetch ${packageName}: Status ${res.statusCode}`));
      }

      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data).version);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });

  // Process dependencies
  const processDependencies = async (dependencies) => {
    const result = { ...dependencies };
    const promises = [];
    const packages = [];

    for (const [pkg, version] of Object.entries(result)) {
      if (version === '*') {
        packages.push(pkg);
        promises.push(getLatestVersion(pkg));
      }
    }

    const versions = await Promise.all(promises);
    packages.forEach((pkg, i) => {
      result[pkg] = `^${versions[i]}`;
    });

    return result;
  };

  console.log("Fetching new dependency version");
  templatePkg.dependencies = templatePkg.dependencies
    ? await processDependencies(templatePkg.dependencies)
    : {};

  console.log("Fetching new devDependency version");
  templatePkg.devDependencies = templatePkg.devDependencies
    ? await processDependencies(templatePkg.devDependencies)
    : {};

  projectPkg.scripts = { ...(templatePkg.scripts || {}), ...(projectPkg.scripts || {}) };
  projectPkg.dependencies = { ...(templatePkg.dependencies || {}), ...(projectPkg.dependencies || {}) };
  projectPkg.devDependencies = { ...(templatePkg.devDependencies || {}), ...(projectPkg.devDependencies || {}) };

  fs.writeFileSync(projectPath, JSON.stringify(projectPkg, null, 2));
};

main();