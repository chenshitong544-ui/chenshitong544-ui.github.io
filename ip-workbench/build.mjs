import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
await build({entryPoints:['src/main.tsx'],bundle:true,minify:true,sourcemap:false,outfile:'app.js',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},target:['es2020']});
let html=await readFile('index.html','utf8');
for(const name of ['app.js','app.css']){
 const hash=createHash('sha256').update(await readFile(name)).digest('hex').slice(0,12);
 html=html.replace(new RegExp('\\./'+name.replace('.','\\.')+'(?:\\?v=[a-f0-9]+)?','g'),'./'+name+'?v='+hash);
}
await writeFile('index.html',html);
