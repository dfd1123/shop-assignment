/* eslint-disable @typescript-eslint/no-require-imports */

const path = require('path');
const { readdir, writeFile } = require('fs').promises;
const chokidar = require('chokidar');
const _debounce = require('lodash/debounce');
const _startCase = require('lodash/startCase');

const svgFileDir = path.resolve(__dirname, './src/shared/components/icon');

const parseSvgListForType = (list) => {
  const fileList = list.map((file) => `${file.replace('.svg', '')}`);

  const staticSvgIconName = fileList.map(item => `'${item}'`).join(' | ');
  const particalSvgObj = fileList.filter(item => item.includes('/')).reduce((acc, cur) => {
    let arr = cur.split('/');
    const fileName = arr.pop();

    const directoryPascalName = _startCase(arr.join('-')).replace(/ /gi, '');

    return {
      ...acc,
      [directoryPascalName]: acc[directoryPascalName] ? `${acc[directoryPascalName]} | '${fileName}'` : `'${fileName}'`
    };
  }, {});

  const particalSvgIconName = Object.entries(particalSvgObj).map(([key, value]) => `export type ${key}IconType = ${value};\n`).join('');

  return {staticSvgIconName, particalSvgIconName};
}

const parseSvgListForFile = (list) => {
  const fileObject =  list.reduce((acc, cur) => {
    const fileName = `Svg${_startCase(cur.replace(/\//gi, '-').replace('.svg', '')).replace(/ /gi, '')}`;
    acc = {
      ...acc,
      [fileName]: cur
    }

    return acc;
  }, {})
  const importString = Object.entries(fileObject).reduce((acc, [key, value]) => acc += `import ${key} from './${value}';\n`, '')
  const exportString = Object.entries(fileObject).reduce((acc, [key], index) => {
    if(index === 0) acc = 'export {\n';
    acc += `  ${key},\n`;
    if(index === Object.entries(fileObject).length - 1) acc += '};';

    return acc;
  }, '');

  return {importString, exportString};
}

const filterSvgFileNameList = (list) => {
  return list
  .filter((name) => name.endsWith('.svg'));
}

const readSvgFileList = async (dir, dirName = '') => {
  const dirents = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    dirents.map((dirent) => {
      const newDirName = `${dirName ? `${dirName}/` : ``}${dirent.name}`;
      const res = path.resolve(dir, dirent.name);
      return dirent.isDirectory() && dirent.name !== 'types'
        ? readSvgFileList(res, newDirName)
        : newDirName;
    })
  );
  const concatList = Array.prototype.concat(...files);

  return concatList;
};

const writeSvgTypeFile = async (list) => {
  const {staticSvgIconName, particalSvgIconName} = parseSvgListForType(list)

  return writeFile(
    `${svgFileDir}/types/index.d.ts`,
    `/* eslint-disable prettier/prettier */\n
    export type StaticSvgIconName = ${staticSvgIconName};\n
    ${particalSvgIconName}
    `,
    { flag: 'w' }
  )
    .then(() => console.log(`✨[Static Svg Type File] is Generated!`))
    .catch(console.error);
};

const writeStaticSvgExportFile = async (list) => {
  const {importString, exportString} = parseSvgListForFile(list)

  return writeFile(
    `${svgFileDir}/index.ts`,
    `/* eslint-disable prettier/prettier */\n
    ${importString}
    ${exportString}
    `,
    { flag: 'w' }
  )
    .then(() => console.log(`✨[Static Svg Export File] is Generated!`))
    .catch(console.error);
}

const generate = _debounce(async () => {
  const fileNameList = await readSvgFileList(svgFileDir);
  const svgFileList = filterSvgFileNameList(fileNameList);
  await writeSvgTypeFile(svgFileList);
  await writeStaticSvgExportFile(svgFileList);
}, 1500);

(async () => {
  if (process.env.NEXT_PUBLIC_ENV === 'local') {
    const watcher = chokidar.watch(svgFileDir, { persistent: true, ignored: /\/svg\/types\// });

    watcher.on('add', generate);
    watcher.on('unlink', generate);

    process.on('SIGINT', function () {
      watcher.close();
      process.exit(0);
    });
  } else {
    generate();
  }
})();
