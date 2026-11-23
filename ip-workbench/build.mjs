import {readFile,writeFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import {Script} from "node:vm";
const source=await readFile("video-workbench.js","utf8");
new Script(source,{filename:"video-workbench.js"});
let html=await readFile("index.html","utf8");
for(const name of ["video-workbench.js","video-workbench.css"]){
 const version=createHash("sha256").update(await readFile(name)).digest("hex").slice(0,12);
 html=html.replace(new RegExp(name.replace(".","\\.")+"(?:\\?v=[a-zA-Z0-9]+)?","g"),name+"?v="+version);
}
await writeFile("index.html",html);
console.log("Standalone video workbench syntax and version references checked.");
