import os from 'os';

export async function getRealtimeMetrics() {
    const freeRam = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
    const totalRam = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
    console.log(`   [Metrics] RAM: ${freeRam}GB Free / ${totalRam}GB Total`);
}
