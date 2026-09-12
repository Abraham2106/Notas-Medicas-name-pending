import {spawn,execFileSync} from 'node:child_process'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
const self=fileURLToPath(import.meta.url)
if(!process.versions.electron){
 const child=spawn(createRequire(import.meta.url)('electron'),[self,...process.argv.slice(2)],{stdio:'inherit',windowsHide:true,env:{...process.env,ELECTRON_RUN_AS_NODE:'1'}})
 child.on('exit',code=>process.exit(code??1))
}else{
 const sdk=await import('@qvac/sdk')
 const requested=process.argv[2]==='dedicated'?'dedicated':Number(process.argv[2]??1)
 const mark=(event,value)=>process.stdout.write(JSON.stringify({event,value})+'\n')
 const sample=()=>execFileSync('nvidia-smi',['--query-gpu=index,name,memory.used,memory.total,utilization.gpu','--format=csv'],{encoding:'utf8',windowsHide:true}).trim()
 const stop=sdk.subscribeServerLogs(entry=>mark('native',entry))
 let id
 try{
  mark('before',sample());mark('requested',requested)
  id=await sdk.loadModel({modelSrc:sdk.QWEN3_4B_Q4_K_M,modelConfig:{ctx_size:4096,gpu_layers:99,device:'gpu','main-gpu':requested,'split-mode':'none',reasoning_budget:0,verbosity:3}})
  mark('loaded',sample())
  const result=await sdk.completion({modelId:id,history:[{role:'user',content:'Reply with the word OK.'}],generationParams:{temp:0,predict:8},stream:true,captureThinking:false}).final
  mark('stats',result.stats);mark('after-completion',sample())
 }catch(error){mark('error',String(error));process.exitCode=1}
 finally{if(id)await sdk.unloadModel({modelId:id});stop();await sdk.close();mark('unloaded',sample())}
}
