import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export const processManagerTool = {
  name: "process_manager",
  description: "Comprehensive process management including listing processes, getting process details, killing processes, and monitoring resource usage",
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["list_processes", "get_process_details", "kill_process", "find_process", "get_top_processes", "get_process_tree"],
        description: "The process management action to perform"
      },
      process_id: {
        type: "number",
        description: "Process ID for specific process operations"
      },
      process_name: {
        type: "string",
        description: "Process name for searching or filtering"
      },
      sort_by: {
        type: "string",
        enum: ["cpu", "memory", "name", "pid"],
        description: "Sort processes by specified criteria (default: cpu)",
        default: "cpu"
      },
      limit: {
        type: "number",
        description: "Limit number of results (default: 20)",
        default: 20
      },
      include_system: {
        type: "boolean",
        description: "Include system processes (default: true)",
        default: true
      }
    },
    required: ["action"]
  },

  async run(args: {
    action: string;
    process_id?: number;
    process_name?: string;
    sort_by?: string;
    limit?: number;
    include_system?: boolean;
  }) {
    try {
      switch (args.action) {
        case "list_processes":
          return await this.listProcesses(args.sort_by, args.limit, args.include_system);
        case "get_process_details":
          return await this.getProcessDetails(args.process_id, args.process_name);
        case "kill_process":
          return await this.killProcess(args.process_id, args.process_name);
        case "find_process":
          return await this.findProcess(args.process_name!);
        case "get_top_processes":
          return await this.getTopProcesses(args.sort_by, args.limit);
        case "get_process_tree":
          return await this.getProcessTree();
        default:
          throw new Error(`Unknown action: ${args.action}`);
      }
    } catch (error: any) {
      return {
        content: [{
          type: "text",
          text: `❌ Process management operation failed: ${error.message}`
        }],
        isError: true
      };
    }
  },

  async listProcesses(sortBy = "cpu", limit = 20, includeSystem = true) {
    try {
      const sortProperty = this.getSortProperty(sortBy);
      const systemFilter = includeSystem ? "" : "| Where-Object {$_.SessionId -ne 0}";
      
      const command = `Get-Process ${systemFilter} | Sort-Object ${sortProperty} -Descending | Select-Object -First ${limit} Name, Id, CPU, WorkingSet, VirtualMemorySize, SessionId, StartTime | Format-Table -AutoSize`;
      
      const { stdout } = await execAsync(`powershell -Command "${command}"`);
      
      return {
        content: [{
          type: "text",
          text: `# Process List\n\nSorted by: ${sortBy}\nLimit: ${limit}\nInclude System: ${includeSystem}\n\n\`\`\`\n${stdout}\n\`\`\``
        }]
      };
    } catch (error: any) {
      throw new Error(`Failed to list processes: ${error.message}`);
    }
  },

  async getProcessDetails(processId?: number, processName?: string) {
    try {
      let command: string;
      
      if (processId) {
        command = `Get-Process -Id ${processId} -ErrorAction Stop | Select-Object *`;
      } else if (processName) {
        command = `Get-Process -Name "${processName}" -ErrorAction Stop | Select-Object *`;
      } else {
        throw new Error("Either process_id or process_name must be provided");
      }
      
      const { stdout } = await execAsync(`powershell -Command "${command}"`);
      
      // Also get additional details using WMI
      const wmiCommand = processId 
        ? `Get-WmiObject -Class Win32_Process -Filter "ProcessId=${processId}" | Select-Object CommandLine, CreationDate, ExecutablePath, PageFileUsage, ThreadCount`
        : `Get-WmiObject -Class Win32_Process -Filter "Name='${processName}.exe'" | Select-Object CommandLine, CreationDate, ExecutablePath, PageFileUsage, ThreadCount`;
      
      const { stdout: wmiOutput } = await execAsync(`powershell -Command "${wmiCommand}"`);
      
      return {
        content: [{
          type: "text",
          text: `# Process Details\n\n## Basic Information\n\`\`\`\n${stdout}\n\`\`\`\n\n## Extended Information\n\`\`\`\n${wmiOutput}\n\`\`\``
        }]
      };
    } catch (error: any) {
      throw new Error(`Failed to get process details: ${error.message}`);
    }
  },

  async killProcess(processId?: number, processName?: string) {
    try {
      let command: string;
      let identifier: string;
      
      if (processId) {
        command = `Stop-Process -Id ${processId} -Force -ErrorAction Stop`;
        identifier = `PID ${processId}`;
      } else if (processName) {
        command = `Stop-Process -Name "${processName}" -Force -ErrorAction Stop`;
        identifier = `process "${processName}"`;
      } else {
        throw new Error("Either process_id or process_name must be provided");
      }
      
      await execAsync(`powershell -Command "${command}"`);
      
      return {
        content: [{
          type: "text",
          text: `# Process Terminated\n\n✅ Successfully terminated ${identifier}`
        }]
      };
    } catch (error: any) {
      throw new Error(`Failed to kill process: ${error.message}`);
    }
  },

  async findProcess(processName: string) {
    try {
      const command = `Get-Process | Where-Object {$_.Name -like "*${processName}*"} | Select-Object Name, Id, CPU, WorkingSet, StartTime | Format-Table -AutoSize`;
      
      const { stdout } = await execAsync(`powershell -Command "${command}"`);
      
      return {
        content: [{
          type: "text",
          text: `# Process Search Results\n\nSearch term: "${processName}"\n\n\`\`\`\n${stdout}\n\`\`\``
        }]
      };
    } catch (error: any) {
      throw new Error(`Failed to find process: ${error.message}`);
    }
  },

  async getTopProcesses(sortBy = "cpu", limit = 10) {
    try {
      const sortProperty = this.getSortProperty(sortBy);
      
      const command = `Get-Process | Sort-Object ${sortProperty} -Descending | Select-Object -First ${limit} Name, Id, @{Name="CPU%";Expression={$_.CPU}}, @{Name="MemoryMB";Expression={[math]::Round($_.WorkingSet/1MB,2)}}, @{Name="ThreadCount";Expression={$_.Threads.Count}}, StartTime | Format-Table -AutoSize`;
      
      const { stdout } = await execAsync(`powershell -Command "${command}"`);
      
      return {
        content: [{
          type: "text",
          text: `# Top ${limit} Processes\n\nSorted by: ${sortBy}\n\n\`\`\`\n${stdout}\n\`\`\``
        }]
      };
    } catch (error: any) {
      throw new Error(`Failed to get top processes: ${error.message}`);
    }
  },

  async getProcessTree() {
    try {
      const command = `Get-WmiObject -Class Win32_Process | Select-Object Name, ProcessId, ParentProcessId, CommandLine | Sort-Object ParentProcessId, ProcessId | Format-Table -AutoSize`;
      
      const { stdout } = await execAsync(`powershell -Command "${command}"`);
      
      return {
        content: [{
          type: "text",
          text: `# Process Tree\n\n\`\`\`\n${stdout}\n\`\`\``
        }]
      };
    } catch (error: any) {
      throw new Error(`Failed to get process tree: ${error.message}`);
    }
  },

  getSortProperty(sortBy: string): string {
    switch (sortBy) {
      case "cpu":
        return "CPU";
      case "memory":
        return "WorkingSet";
      case "name":
        return "Name";
      case "pid":
        return "Id";
      default:
        return "CPU";
    }
  }
};