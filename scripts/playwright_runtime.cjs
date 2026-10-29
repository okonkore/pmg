// Resolve an installed Playwright, or the runtime explicitly selected by the caller.
const {chromium}=require(process.env.PMG_PLAYWRIGHT_MODULE||'playwright');
function launchOptions(options={}) {
 const channel=process.env.PMG_BROWSER_CHANNEL;
 const executablePath=process.env.PMG_BROWSER_EXECUTABLE;
 if(channel&&executablePath)throw new Error('Set only one of PMG_BROWSER_CHANNEL and PMG_BROWSER_EXECUTABLE');
 return {...options,...(channel?{channel}:{}),...(executablePath?{executablePath}:{})};
}
module.exports={chromium,launchOptions};
