import { exec } from "child_process";
import { promisify } from "util";
import * as os from "os";

const execAsync = promisify(exec);

export const systemInfoTool = {
  name: "system_info",
  description: "Comprehensive system information including hardware details, OS info, environment variables, and system configuration",
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["get_system_overview", "get_hardware_info", "get_os_info", "get_environment_vars", "get_installed_software", "get_system_uptime", "get_user_info", "get_system_paths"],
        description: "The system information action to perform"
      },
      category: {
        type: "string",
        enum: ["cpu", "memory", "disk", "network", "all"],
        description: "Hardware category to focus on (for hardware_info action)",
        default: "all"
      },
      filter: {
        type: "string",
        description: "Filter for environment variables or software (supports wildcards)"
      }
    },
    required: ["action"]
  },

  async run(args: {
    action: string;
    category?: string;
    filter?: string;
  }) {
    try {
      switch (args.action) {
        case "get_system_overview":
          return await this.getSystemOverview();
        case "get_hardware_info":
          return await this.getHardwareInfo(args.category);
        case "get_os_info":
          return await this.getOSInfo();
        case "get_environment_vars":
          return await this.getEnvironmentVars(args.filter);
        case "get_installed_software":
          return await this.getInstalledSoftware(args.filter);
        case "get_system_uptime":
          return await this.getSystemUptime();
        case "get_user_info":
          return await this.getUserInfo();
        case "get_system_paths":
          return await this.getSystemPaths();
        default:
          throw new Error(`Unknown action: ${args.action}`);
      }
    } catch (error: any) {
      return {
        content: [{
          type: "text",
          text: `❌ System information operation failed: ${error.message}`
        }],
        isError: true
      };
    }
  },

  async getSystemOverview() {
    try {
      const nodeInfo = {
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        totalMemory: this.formatBytes(os.totalmem()),
        freeMemory: this.formatBytes(os.freemem()),
        cpuCount: os.cpus().length,
        uptime: this.formatUptime(os.uptime())
      };

      const command = `Get-ComputerInfo | Select-Object WindowsProductName, WindowsVersion, TotalPhysicalMemory, CsProcessors, CsSystemType, TimeZone | Format-List`;
      const { stdout } = await execAsync(`powershell -Command "${command}"`);

      const result = `# System Overview\n\n## Basic Information\n` +
        `- **Hostname**: ${nodeInfo.hostname}\n` +
        `- **Platform**: ${nodeInfo.platform}\n` +
        `- **Architecture**: ${nodeInfo.arch}\n` +
        `- **CPU Cores**: ${nodeInfo.cpuCount}\n` +
        `- **Total Memory**: ${nodeInfo.totalMemory}\n` +
        `- **Free Memory**: ${nodeInfo.freeMemory}\n` +
        `- **System Uptime**: ${nodeInfo.uptime}\n\n` +
        `## Windows Details\n\`\`\`\n${stdout}\n\`\`\``;

      return {
        content: [{ type: "text", text: result }]
      };
    } catch (error: any) {
      throw new Error(`Failed to get system overview: ${error.message}`);
    }
  },

  async getHardwareInfo(category = "all") {
    try {
      let result = `# Hardware Information\n\n`;

      if (category === "all" || category === "cpu") {
        const cpuCommand = `Get-WmiObject -Class Win32_Processor | Select-Object Name, Manufacturer, MaxClockSpeed, NumberOfCores, NumberOfLogicalProcessors, Architecture | Format-List`;
        const { stdout: cpuInfo } = await execAsync(`powershell -Command "${cpuCommand}"`);
        result += `## CPU Information\n\`\`\`\n${cpuInfo}\n\`\`\`\n\n`;
      }

      if (category === "all" || category === "memory") {
        const memCommand = `Get-WmiObject -Class Win32_PhysicalMemory | Select-Object Manufacturer, Capacity, Speed, MemoryType, FormFactor | Format-Table -AutoSize`;
        const { stdout: memInfo } = await execAsync(`powershell -Command "${memCommand}"`);
        result += `## Memory Information\n\`\`\`\n${memInfo}\n\`\`\`\n\n`;
      }

      if (category === "all" || category === "disk") {
        const diskCommand = `Get-WmiObject -Class Win32_DiskDrive | Select-Object Model, Size, MediaType, InterfaceType | Format-Table -AutoSize`;
        const { stdout: diskInfo } = await execAsync(`powershell -Command "${diskCommand}"`);
        result += `## Disk Information\n\`\`\`\n${diskInfo}\n\`\`\`\n\n`;
      }

      if (category === "all" || category === "network") {
        const netCommand = `Get-WmiObject -Class Win32_NetworkAdapter | Where-Object {$_.NetConnectionStatus -eq 2} | Select-Object Name, MACAddress, Speed, AdapterType | Format-Table -AutoSize`;
        const { stdout: netInfo } = await execAsync(`powershell -Command "${netCommand}"`);
        result += `## Network Adapters\n\`\`\`\n${netInfo}\n\`\`\``;
      }

      return {
        content: [{ type: "text", text: result }]
      };
    } catch (error: any) {
      throw new Error(`Failed to get hardware info: ${error.message}`);
    }
  },

  async getOSInfo() {
    try {
      const command = `Get-ComputerInfo | Select-Object WindowsProductName, WindowsVersion, WindowsBuildLabEx, WindowsInstallationType, WindowsRegisteredOwner, TimeZone, BootupState, ThermalState, PowerPlatformRole | Format-List`;
      const { stdout } = await execAsync(`powershell -Command "${command}"`);

      const hotfixCommand = `Get-HotFix | Sort-Object InstalledOn -Descending | Select-Object -First 10 HotFixID, Description, InstalledOn | Format-Table -AutoSize`;
      const { stdout: hotfixInfo } = await execAsync(`powershell -Command "${hotfixCommand}"`);

      const result = `# Operating System Information\n\n## System Details\n\`\`\`\n${stdout}\n\`\`\`\n\n## Recent Updates\n\`\`\`\n${hotfixInfo}\n\`\`\``;

      return {
        content: [{ type: "text", text: result }]
      };
    } catch (error: any) {
      throw new Error(`Failed to get OS info: ${error.message}`);
    }
  },

  async getEnvironmentVars(filter?: string) {
    try {
      const filterClause = filter ? `| Where-Object {$_.Name -like "*${filter}*" -or $_.Value -like "*${filter}*"}` : "";
      const command = `Get-ChildItem Env: ${filterClause} | Sort-Object Name | Format-Table Name, Value -AutoSize`;
      
      const { stdout } = await execAsync(`powershell -Command "${command}"`);
      
      const result = `# Environment Variables\n\n${filter ? `Filter: "${filter}"\n\n` : ""}\`\`\`\n${stdout}\n\`\`\``;
      
      return {
        content: [{ type: "text", text: result }]
      };
    } catch (error: any) {
      throw new Error(`Failed to get environment variables: ${error.message}`);
    }
  },

  async getInstalledSoftware(filter?: string) {
    try {
      const filterClause = filter ? `| Where-Object {$_.DisplayName -like "*${filter}*"}` : "";
      const command = `Get-WmiObject -Class Win32_Product ${filterClause} | Select-Object Name, Version, Vendor, InstallDate | Sort-Object Name | Format-Table -AutoSize`;
      
      const { stdout } = await execAsync(`powershell -Command "${command}"`);
      
      const result = `# Installed Software\n\n${filter ? `Filter: "${filter}"\n\n` : ""}\`\`\`\n${stdout}\n\`\`\``;
      
      return {
        content: [{ type: "text", text: result }]
      };
    } catch (error: any) {
      throw new Error(`Failed to get installed software: ${error.message}`);
    }
  },

  async getSystemUptime() {
    try {
      const command = `Get-CimInstance -ClassName Win32_OperatingSystem | Select-Object LastBootUpTime, LocalDateTime | Format-List`;
      const { stdout } = await execAsync(`powershell -Command "${command}"`);
      
      const uptimeSeconds = os.uptime();
      const formattedUptime = this.formatUptime(uptimeSeconds);
      
      const result = `# System Uptime\n\n**Current Uptime**: ${formattedUptime}\n\n## Boot Information\n\`\`\`\n${stdout}\n\`\`\``;
      
      return {
        content: [{ type: "text", text: result }]
      };
    } catch (error: any) {
      throw new Error(`Failed to get system uptime: ${error.message}`);
    }
  },

  async getUserInfo() {
    try {
      const command = `Get-WmiObject -Class Win32_UserAccount | Select-Object Name, FullName, Description, Disabled, LocalAccount, SID | Format-Table -AutoSize`;
      const { stdout } = await execAsync(`powershell -Command "${command}"`);
      
      const currentUserCommand = `whoami /all`;
      const { stdout: currentUserInfo } = await execAsync(currentUserCommand);
      
      const result = `# User Information\n\n## Current User Details\n\`\`\`\n${currentUserInfo}\n\`\`\`\n\n## All User Accounts\n\`\`\`\n${stdout}\n\`\`\``;
      
      return {
        content: [{ type: "text", text: result }]
      };
    } catch (error: any) {
      throw new Error(`Failed to get user info: ${error.message}`);
    }
  },

  async getSystemPaths() {
    try {
      const pathInfo = {
        systemRoot: process.env.SystemRoot || "N/A",
        programFiles: process.env.ProgramFiles || "N/A",
        programFilesX86: process.env["ProgramFiles(x86)"] || "N/A",
        userProfile: process.env.USERPROFILE || "N/A",
        appData: process.env.APPDATA || "N/A",
        localAppData: process.env.LOCALAPPDATA || "N/A",
        temp: process.env.TEMP || "N/A",
        winDir: process.env.windir || "N/A"
      };
      
      const pathEnv = process.env.PATH?.split(';').slice(0, 20).join('\n') || "N/A";
      
      const result = `# System Paths\n\n## Important Directories\n` +
        `- **System Root**: ${pathInfo.systemRoot}\n` +
        `- **Program Files**: ${pathInfo.programFiles}\n` +
        `- **Program Files (x86)**: ${pathInfo.programFilesX86}\n` +
        `- **User Profile**: ${pathInfo.userProfile}\n` +
        `- **AppData**: ${pathInfo.appData}\n` +
        `- **Local AppData**: ${pathInfo.localAppData}\n` +
        `- **Temp**: ${pathInfo.temp}\n` +
        `- **Windows Directory**: ${pathInfo.winDir}\n\n` +
        `## PATH Environment (First 20 entries)\n\`\`\`\n${pathEnv}\n\`\`\``;
      
      return {
        content: [{ type: "text", text: result }]
      };
    } catch (error: any) {
      throw new Error(`Failed to get system paths: ${error.message}`);
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
  },

  formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
  }
};