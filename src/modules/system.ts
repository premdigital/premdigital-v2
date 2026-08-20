import os from 'os';

export async function getRealtimeMetrics(): Promise<any> {
    const totalRam = Math.round(os.totalmem() / 1024 / 1024);
    const usedRam = Math.round((os.totalmem() - os.freemem()) / 1024 / 1024);
    
    return {
        ip: "Otomatis",
        city: "Singapura",
        isp: "VPS Provider",
        usedRamMb: usedRam,
        totalRamMb: totalRam,
        storageUsed: "10GB",
        storageTotal: "50GB",
        osName: os.type() + " " + os.release(),
        cpuCore: os.cpus().length.toString() + " Cores"
    };
}