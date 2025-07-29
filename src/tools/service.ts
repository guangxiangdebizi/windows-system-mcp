import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export const serviceManagerTool = {
  name: "service_manager",
  description: "Windows service management including listing services, getting service details, starting/stopping services, and monitoring service status",
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["list_services", "get_service_details", "start_service", "stop_service", "restart_service", "get_service_status", "find_service", "get_running_services", "get_startup_services"],
        description: "The service management action to perform"
      },
      service_name: {
        type: "string",
        description: "Service name for specific service operations"
      },
      status_filter: {
        type: "string",
        enum: ["running", "stopped", "paused", "all"],
        description: "Filter services by status (default: all)",
        default: "all"
      },
      startup_type_filter: {
        type: "string",
        enum: ["automatic", "manual", "disabled", "all"],
        description: "Filter services by startup type (default: all)",
        default: "all"
      },
      search_term: {
        type: "string",
        description: "Search term for finding services"
      },
      limit: {
        type: "number",
        description: "Limit number of results (default: 50)",
        default: 50
      }
    },
    required: ["action"]
  },

  async run(args: {
    action: string;
    service_name?: string;
    status_filter?: string;
    startup_type_filter?: string;
    search_term?: string;
    limit?: number;
  }) {
    try {
      switch (args.action) {
        case "list_services":
          return await this.listServices(args.status_filter, args.startup_type_filter, args.limit);
        case "get_service_details":
          return await this.getServiceDetails(args.service_name!);
        case "start_service":
          return await this.startService(args.service_name!);
        case "stop_service":
          return await this.stopService(args.service_name!);
        case "restart_service":
          return await this.restartService(args.service_name!);
        case "get_service_status":
          return await this.getServiceStatus(args.service_name!);
        case "find_service":
          return await this.findService(args.search_term!);
        case "get_running_services":
          return await this.getRunningServices(args.limit);
        case "get_startup_services":
          return await this.getStartupServices(args.limit);
        default:
          throw new Error(`Unknown action: ${args.action}`);
      }
    } catch (error: any) {
      return {
        content: [{
          type: "text",
          text: `❌ Service management operation failed: ${error.message}`
        }],
        isError: true
      };
    }
  },

  async listServices(statusFilter = "all", startupTypeFilter = "all", limit = 50) {
    try {
      let whereClause = "";
      const conditions: string[] = [];
      
      if (statusFilter !== "all") {
        conditions.push(`$_.Status -eq '${this.mapStatusFilter(statusFilter)}'`);
      }
      
      if (startupTypeFilter !== "all") {
        conditions.push(`$_.StartType -eq '${this.mapStartupTypeFilter(startupTypeFilter)}'`);
      }
      
      if (conditions.length > 0) {
        whereClause = `| Where-Object {${conditions.join(' -and ')}}`;
      }
      
      const command = `Get-Service ${whereClause} | Select-Object -First ${limit} Name, DisplayName, Status, StartType | Sort-Object DisplayName | Format-Table -AutoSize`;
      
      const { stdout } = await execAsync(`powershell -Command "${command}"`);
      
      return {
        content: [{
          type: "text",
          text: `# Windows Services\n\nStatus Filter: ${statusFilter}\nStartup Type Filter: ${startupTypeFilter}\nLimit: ${limit}\n\n\`\`\`\n${stdout}\n\`\`\``
        }]
      };
    } catch (error: any) {
      throw new Error(`Failed to list services: ${error.message}`);
    }
  },

  async getServiceDetails(serviceName: string) {
    try {
      // Get basic service information
      const basicCommand = `Get-Service -Name "${serviceName}" -ErrorAction Stop | Select-Object * | Format-List`;
      const { stdout: basicInfo } = await execAsync(`powershell -Command "${basicCommand}"`);
      
      // Get detailed WMI information
      const wmiCommand = `Get-WmiObject -Class Win32_Service -Filter "Name='${serviceName}'" | Select-Object Name, DisplayName, Description, PathName, StartMode, StartName, State, ProcessId, ServiceType | Format-List`;
      const { stdout: wmiInfo } = await execAsync(`powershell -Command "${wmiCommand}"`);
      
      // Get service dependencies
      const depCommand = `Get-Service -Name "${serviceName}" | Select-Object -ExpandProperty ServicesDependedOn | Select-Object Name, Status | Format-Table -AutoSize`;
      const { stdout: dependencies } = await execAsync(`powershell -Command "${depCommand}"`);
      
      const result = `# Service Details: ${serviceName}\n\n## Basic Information\n\`\`\`\n${basicInfo}\n\`\`\`\n\n## Extended Information\n\`\`\`\n${wmiInfo}\n\`\`\`\n\n## Dependencies\n\`\`\`\n${dependencies}\n\`\`\``;
      
      return {
        content: [{ type: "text", text: result }]
      };
    } catch (error: any) {
      throw new Error(`Failed to get service details for ${serviceName}: ${error.message}`);
    }
  },

  async startService(serviceName: string) {
    try {
      const command = `Start-Service -Name "${serviceName}" -ErrorAction Stop`;
      await execAsync(`powershell -Command "${command}"`);
      
      // Verify the service started
      const statusCommand = `Get-Service -Name "${serviceName}" | Select-Object Name, Status`;
      const { stdout: status } = await execAsync(`powershell -Command "${statusCommand}"`);
      
      return {
        content: [{
          type: "text",
          text: `# Service Start Operation\n\n✅ Attempted to start service: ${serviceName}\n\n## Current Status\n\`\`\`\n${status}\n\`\`\``
        }]
      };
    } catch (error: any) {
      throw new Error(`Failed to start service ${serviceName}: ${error.message}`);
    }
  },

  async stopService(serviceName: string) {
    try {
      const command = `Stop-Service -Name "${serviceName}" -Force -ErrorAction Stop`;
      await execAsync(`powershell -Command "${command}"`);
      
      // Verify the service stopped
      const statusCommand = `Get-Service -Name "${serviceName}" | Select-Object Name, Status`;
      const { stdout: status } = await execAsync(`powershell -Command "${statusCommand}"`);
      
      return {
        content: [{
          type: "text",
          text: `# Service Stop Operation\n\n✅ Attempted to stop service: ${serviceName}\n\n## Current Status\n\`\`\`\n${status}\n\`\`\``
        }]
      };
    } catch (error: any) {
      throw new Error(`Failed to stop service ${serviceName}: ${error.message}`);
    }
  },

  async restartService(serviceName: string) {
    try {
      const command = `Restart-Service -Name "${serviceName}" -Force -ErrorAction Stop`;
      await execAsync(`powershell -Command "${command}"`);
      
      // Verify the service status
      const statusCommand = `Get-Service -Name "${serviceName}" | Select-Object Name, Status`;
      const { stdout: status } = await execAsync(`powershell -Command "${statusCommand}"`);
      
      return {
        content: [{
          type: "text",
          text: `# Service Restart Operation\n\n✅ Attempted to restart service: ${serviceName}\n\n## Current Status\n\`\`\`\n${status}\n\`\`\``
        }]
      };
    } catch (error: any) {
      throw new Error(`Failed to restart service ${serviceName}: ${error.message}`);
    }
  },

  async getServiceStatus(serviceName: string) {
    try {
      const command = `Get-Service -Name "${serviceName}" -ErrorAction Stop | Select-Object Name, DisplayName, Status, StartType | Format-List`;
      const { stdout } = await execAsync(`powershell -Command "${command}"`);
      
      return {
        content: [{
          type: "text",
          text: `# Service Status: ${serviceName}\n\n\`\`\`\n${stdout}\n\`\`\``
        }]
      };
    } catch (error: any) {
      throw new Error(`Failed to get status for service ${serviceName}: ${error.message}`);
    }
  },

  async findService(searchTerm: string) {
    try {
      const command = `Get-Service | Where-Object {$_.Name -like "*${searchTerm}*" -or $_.DisplayName -like "*${searchTerm}*"} | Select-Object Name, DisplayName, Status, StartType | Sort-Object DisplayName | Format-Table -AutoSize`;
      
      const { stdout } = await execAsync(`powershell -Command "${command}"`);
      
      return {
        content: [{
          type: "text",
          text: `# Service Search Results\n\nSearch term: "${searchTerm}"\n\n\`\`\`\n${stdout}\n\`\`\``
        }]
      };
    } catch (error: any) {
      throw new Error(`Failed to search for services: ${error.message}`);
    }
  },

  async getRunningServices(limit = 50) {
    try {
      const command = `Get-Service | Where-Object {$_.Status -eq 'Running'} | Select-Object -First ${limit} Name, DisplayName, Status | Sort-Object DisplayName | Format-Table -AutoSize`;
      
      const { stdout } = await execAsync(`powershell -Command "${command}"`);
      
      return {
        content: [{
          type: "text",
          text: `# Running Services\n\nLimit: ${limit}\n\n\`\`\`\n${stdout}\n\`\`\``
        }]
      };
    } catch (error: any) {
      throw new Error(`Failed to get running services: ${error.message}`);
    }
  },

  async getStartupServices(limit = 50) {
    try {
      const command = `Get-WmiObject -Class Win32_Service | Where-Object {$_.StartMode -eq 'Auto'} | Select-Object -First ${limit} Name, DisplayName, State, StartMode | Sort-Object DisplayName | Format-Table -AutoSize`;
      
      const { stdout } = await execAsync(`powershell -Command "${command}"`);
      
      return {
        content: [{
          type: "text",
          text: `# Automatic Startup Services\n\nLimit: ${limit}\n\n\`\`\`\n${stdout}\n\`\`\``
        }]
      };
    } catch (error: any) {
      throw new Error(`Failed to get startup services: ${error.message}`);
    }
  },

  mapStatusFilter(filter: string): string {
    switch (filter.toLowerCase()) {
      case "running":
        return "Running";
      case "stopped":
        return "Stopped";
      case "paused":
        return "Paused";
      default:
        return "Running";
    }
  },

  mapStartupTypeFilter(filter: string): string {
    switch (filter.toLowerCase()) {
      case "automatic":
        return "Automatic";
      case "manual":
        return "Manual";
      case "disabled":
        return "Disabled";
      default:
        return "Automatic";
    }
  }
};