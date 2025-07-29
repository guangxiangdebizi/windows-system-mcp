import { exec } from "child_process";
import { promisify } from "util";
import * as os from "os";

const execAsync = promisify(exec);

export const performanceTool = {
  name: "performance",
  description: "System performance monitoring including CPU usage, memory usage, disk I/O, network I/O, and system performance counters",
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["get_cpu_usage", "get_memory_usage", "get_disk_usage", "get_disk_io", "get_network_io", "get_system_performance", "get_top_processes_by_cpu", "get_top_processes_by_memory", "get_performance_counters", "monitor_real_time"],
        description: "The performance monitoring action to perform"
      },
      duration: {
        type: "number",
        description: "Duration in seconds for monitoring (default: 10)",
        default: 10
      },
      interval: {
        type: "number",
        description: "Interval in seconds between measurements (default: 1)",
        default: 1
      },
      process_count: {
        type: "number",
        description: "Number of top processes to show (default: 10)",
        default: 10
      },
      counter_name: {
        type: "string",
        description: "Specific performance counter name to query"
      }
    },
    required: ["action"]
  },

  async run(args: {
    action: string;
    duration?: number;
    interval?: number;
    process_count?: number;
    counter_name?: string;
  }) {
    try {
      switch (args.action) {
        case "get_cpu_usage":
          return await this.getCpuUsage(args.duration);
        case "get_memory_usage":
          return await this.getMemoryUsage();
        case "get_disk_usage":
          return await this.getDiskUsage();
        case "get_disk_io":
          return await this.getDiskIO();
        case "get_network_io":
          return await this.getNetworkIO();
        case "get_system_performance":
          return await this.getSystemPerformance();
        case "get_top_processes_by_cpu":
          return await this.getTopProcessesByCpu(args.process_count);
        case "get_top_processes_by_memory":
          return await this.getTopProcessesByMemory(args.process_count);
        case "get_performance_counters":
          return await this.getPerformanceCounters(args.counter_name);
        case "monitor_real_time":
          return await this.monitorRealTime(args.duration, args.interval);
        default:
          throw new Error(`Unknown action: ${args.action}`);
      }
    } catch (error: any) {
      return {
        content: [{
          type: "text",
          text: `❌ Performance monitoring operation failed: ${error.message}`
        }],
        isError: true
      };
    }
  },

  async getCpuUsage(duration = 10) {
    try {
      // Get current CPU info
      const cpus = os.cpus();
      const cpuCount = cpus.length;
      const cpuModel = cpus[0].model;
      
      // Get CPU usage using PowerShell
      const command = `Get-Counter "\\Processor(_Total)\\% Processor Time" -SampleInterval 1 -MaxSamples ${duration} | Select-Object -ExpandProperty CounterSamples | Select-Object CookedValue | Measure-Object -Property CookedValue -Average -Maximum -Minimum`;
      const { stdout } = await execAsync(`powershell -Command "${command}"`);
      
      // Get per-core usage
      const coreCommand = `Get-Counter "\\Processor(*)\\% Processor Time" -MaxSamples 1 | Select-Object -ExpandProperty CounterSamples | Where-Object {$_.InstanceName -ne '_total'} | Select-Object InstanceName, CookedValue | Format-Table -AutoSize`;
      const { stdout: coreUsage } = await execAsync(`powershell -Command "${coreCommand}"`);
      
      const result = `# CPU Usage Analysis\n\n## CPU Information\n` +
        `- **Model**: ${cpuModel}\n` +
        `- **Cores**: ${cpuCount}\n` +
        `- **Monitoring Duration**: ${duration} seconds\n\n` +
        `## Overall CPU Usage Statistics\n\`\`\`\n${stdout}\n\`\`\`\n\n` +
        `## Per-Core Usage (Current)\n\`\`\`\n${coreUsage}\n\`\`\``;
      
      return {
        content: [{ type: "text", text: result }]
      };
    } catch (error: any) {
      throw new Error(`Failed to get CPU usage: ${error.message}`);
    }
  },

  async getMemoryUsage() {
    try {
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const usagePercent = ((usedMem / totalMem) * 100).toFixed(2);
      
      // Get detailed memory info using PowerShell
      const command = `Get-Counter "\\Memory\\Available MBytes", "\\Memory\\Committed Bytes", "\\Memory\\Pool Nonpaged Bytes", "\\Memory\\Pool Paged Bytes" | Select-Object -ExpandProperty CounterSamples | Select-Object Path, CookedValue | Format-Table -AutoSize`;
      const { stdout } = await execAsync(`powershell -Command "${command}"`);
      
      // Get memory usage by process
      const processCommand = `Get-Process | Sort-Object WorkingSet -Descending | Select-Object -First 10 Name, @{Name="MemoryMB";Expression={[math]::Round($_.WorkingSet/1MB,2)}} | Format-Table -AutoSize`;
      const { stdout: processMemory } = await execAsync(`powershell -Command "${processCommand}"`);
      
      const result = `# Memory Usage Analysis\n\n## Overall Memory Status\n` +
        `- **Total Memory**: ${this.formatBytes(totalMem)}\n` +
        `- **Used Memory**: ${this.formatBytes(usedMem)}\n` +
        `- **Free Memory**: ${this.formatBytes(freeMem)}\n` +
        `- **Usage Percentage**: ${usagePercent}%\n\n` +
        `## Detailed Memory Counters\n\`\`\`\n${stdout}\n\`\`\`\n\n` +
        `## Top 10 Processes by Memory Usage\n\`\`\`\n${processMemory}\n\`\`\``;
      
      return {
        content: [{ type: "text", text: result }]
      };
    } catch (error: any) {
      throw new Error(`Failed to get memory usage: ${error.message}`);
    }
  },

  async getDiskUsage() {
    try {
      const command = `Get-WmiObject -Class Win32_LogicalDisk | Select-Object DeviceID, @{Name="SizeGB";Expression={[math]::Round($_.Size/1GB,2)}}, @{Name="FreeSpaceGB";Expression={[math]::Round($_.FreeSpace/1GB,2)}}, @{Name="UsedSpaceGB";Expression={[math]::Round(($_.Size-$_.FreeSpace)/1GB,2)}}, @{Name="PercentFree";Expression={[math]::Round(($_.FreeSpace/$_.Size)*100,2)}} | Format-Table -AutoSize`;
      const { stdout } = await execAsync(`powershell -Command "${command}"`);
      
      return {
        content: [{
          type: "text",
          text: `# Disk Usage Analysis\n\n\`\`\`\n${stdout}\n\`\`\``
        }]
      };
    } catch (error: any) {
      throw new Error(`Failed to get disk usage: ${error.message}`);
    }
  },

  async getDiskIO() {
    try {
      const command = `Get-Counter "\\PhysicalDisk(_Total)\\Disk Reads/sec", "\\PhysicalDisk(_Total)\\Disk Writes/sec", "\\PhysicalDisk(_Total)\\Disk Read Bytes/sec", "\\PhysicalDisk(_Total)\\Disk Write Bytes/sec", "\\PhysicalDisk(_Total)\\% Disk Time" | Select-Object -ExpandProperty CounterSamples | Select-Object Path, CookedValue | Format-Table -AutoSize`;
      const { stdout } = await execAsync(`powershell -Command "${command}"`);
      
      // Get per-disk statistics
      const diskCommand = `Get-Counter "\\PhysicalDisk(*)\\% Disk Time" | Select-Object -ExpandProperty CounterSamples | Where-Object {$_.InstanceName -ne '_total'} | Select-Object InstanceName, CookedValue | Format-Table -AutoSize`;
      const { stdout: diskStats } = await execAsync(`powershell -Command "${diskCommand}"`);
      
      const result = `# Disk I/O Performance\n\n## Overall Disk I/O\n\`\`\`\n${stdout}\n\`\`\`\n\n## Per-Disk Usage\n\`\`\`\n${diskStats}\n\`\`\``;
      
      return {
        content: [{ type: "text", text: result }]
      };
    } catch (error: any) {
      throw new Error(`Failed to get disk I/O: ${error.message}`);
    }
  },

  async getNetworkIO() {
    try {
      const command = `Get-Counter "\\Network Interface(*)\\Bytes Total/sec" | Select-Object -ExpandProperty CounterSamples | Where-Object {$_.CookedValue -gt 0} | Select-Object InstanceName, CookedValue | Format-Table -AutoSize`;
      const { stdout } = await execAsync(`powershell -Command "${command}"`);
      
      // Get detailed network statistics
      const detailCommand = `Get-Counter "\\Network Interface(*)\\Bytes Received/sec", "\\Network Interface(*)\\Bytes Sent/sec" | Select-Object -ExpandProperty CounterSamples | Where-Object {$_.CookedValue -gt 0} | Select-Object InstanceName, Path, CookedValue | Format-Table -AutoSize`;
      const { stdout: detailStats } = await execAsync(`powershell -Command "${detailCommand}"`);
      
      const result = `# Network I/O Performance\n\n## Total Network Traffic\n\`\`\`\n${stdout}\n\`\`\`\n\n## Detailed Network Statistics\n\`\`\`\n${detailStats}\n\`\`\``;
      
      return {
        content: [{ type: "text", text: result }]
      };
    } catch (error: any) {
      throw new Error(`Failed to get network I/O: ${error.message}`);
    }
  },

  async getSystemPerformance() {
    try {
      const command = `Get-Counter "\\Processor(_Total)\\% Processor Time", "\\Memory\\Available MBytes", "\\PhysicalDisk(_Total)\\% Disk Time", "\\System\\Processor Queue Length", "\\System\\Context Switches/sec" | Select-Object -ExpandProperty CounterSamples | Select-Object Path, CookedValue | Format-Table -AutoSize`;
      const { stdout } = await execAsync(`powershell -Command "${command}"`);
      
      // Get system uptime and boot time
      const uptimeCommand = `Get-CimInstance -ClassName Win32_OperatingSystem | Select-Object LastBootUpTime, @{Name="UptimeHours";Expression={(Get-Date) - $_.LastBootUpTime | Select-Object -ExpandProperty TotalHours}} | Format-List`;
      const { stdout: uptimeInfo } = await execAsync(`powershell -Command "${uptimeCommand}"`);
      
      const result = `# System Performance Overview\n\n## Key Performance Indicators\n\`\`\`\n${stdout}\n\`\`\`\n\n## System Uptime\n\`\`\`\n${uptimeInfo}\n\`\`\``;
      
      return {
        content: [{ type: "text", text: result }]
      };
    } catch (error: any) {
      throw new Error(`Failed to get system performance: ${error.message}`);
    }
  },

  async getTopProcessesByCpu(count = 10) {
    try {
      const command = `Get-Process | Sort-Object CPU -Descending | Select-Object -First ${count} Name, Id, @{Name="CPU%";Expression={$_.CPU}}, @{Name="MemoryMB";Expression={[math]::Round($_.WorkingSet/1MB,2)}}, StartTime | Format-Table -AutoSize`;
      const { stdout } = await execAsync(`powershell -Command "${command}"`);
      
      return {
        content: [{
          type: "text",
          text: `# Top ${count} Processes by CPU Usage\n\n\`\`\`\n${stdout}\n\`\`\``
        }]
      };
    } catch (error: any) {
      throw new Error(`Failed to get top processes by CPU: ${error.message}`);
    }
  },

  async getTopProcessesByMemory(count = 10) {
    try {
      const command = `Get-Process | Sort-Object WorkingSet -Descending | Select-Object -First ${count} Name, Id, @{Name="MemoryMB";Expression={[math]::Round($_.WorkingSet/1MB,2)}}, @{Name="CPU%";Expression={$_.CPU}}, StartTime | Format-Table -AutoSize`;
      const { stdout } = await execAsync(`powershell -Command "${command}"`);
      
      return {
        content: [{
          type: "text",
          text: `# Top ${count} Processes by Memory Usage\n\n\`\`\`\n${stdout}\n\`\`\``
        }]
      };
    } catch (error: any) {
      throw new Error(`Failed to get top processes by memory: ${error.message}`);
    }
  },

  async getPerformanceCounters(counterName?: string) {
    try {
      if (counterName) {
        const command = `Get-Counter "${counterName}" | Select-Object -ExpandProperty CounterSamples | Select-Object Path, CookedValue, RawValue | Format-List`;
        const { stdout } = await execAsync(`powershell -Command "${command}"`);
        
        return {
          content: [{
            type: "text",
            text: `# Performance Counter: ${counterName}\n\n\`\`\`\n${stdout}\n\`\`\``
          }]
        };
      } else {
        // List available counter categories
        const command = `Get-Counter -ListSet * | Select-Object CounterSetName, Description | Sort-Object CounterSetName | Format-Table -AutoSize`;
        const { stdout } = await execAsync(`powershell -Command "${command}"`);
        
        return {
          content: [{
            type: "text",
            text: `# Available Performance Counter Categories\n\n\`\`\`\n${stdout}\n\`\`\``
          }]
        };
      }
    } catch (error: any) {
      throw new Error(`Failed to get performance counters: ${error.message}`);
    }
  },

  async monitorRealTime(duration = 10, interval = 1) {
    try {
      const command = `$samples = @(); for($i=1; $i -le ${duration}; $i++) { $cpu = Get-Counter "\\Processor(_Total)\\% Processor Time" -MaxSamples 1; $mem = Get-Counter "\\Memory\\Available MBytes" -MaxSamples 1; $samples += "Sample $i - CPU: $([math]::Round($cpu.CounterSamples.CookedValue,2))% Memory Available: $([math]::Round($mem.CounterSamples.CookedValue,2))MB"; Start-Sleep ${interval} }; $samples`;
      const { stdout } = await execAsync(`powershell -Command "${command}"`);
      
      return {
        content: [{
          type: "text",
          text: `# Real-time Performance Monitoring\n\nDuration: ${duration} seconds\nInterval: ${interval} second(s)\n\n\`\`\`\n${stdout}\n\`\`\``
        }]
      };
    } catch (error: any) {
      throw new Error(`Failed to monitor real-time performance: ${error.message}`);
    }
  },

  formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
};