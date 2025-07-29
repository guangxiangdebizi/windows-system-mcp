import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export const registryTool = {
  name: "registry",
  description: "Windows Registry operations including reading registry keys, values, and searching registry entries",
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["read_key", "read_value", "search_keys", "list_subkeys", "get_startup_programs", "get_installed_programs", "get_system_info_from_registry"],
        description: "The registry operation to perform"
      },
      key_path: {
        type: "string",
        description: "Registry key path (e.g., HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion)"
      },
      value_name: {
        type: "string",
        description: "Registry value name to read"
      },
      search_term: {
        type: "string",
        description: "Search term for finding registry keys or values"
      },
      hive: {
        type: "string",
        enum: ["HKLM", "HKCU", "HKCR", "HKU", "HKCC"],
        description: "Registry hive to search in (default: HKLM)",
        default: "HKLM"
      },
      max_depth: {
        type: "number",
        description: "Maximum depth for recursive operations (default: 2)",
        default: 2
      }
    },
    required: ["action"]
  },

  async run(args: {
    action: string;
    key_path?: string;
    value_name?: string;
    search_term?: string;
    hive?: string;
    max_depth?: number;
  }) {
    try {
      switch (args.action) {
        case "read_key":
          return await this.readKey(args.key_path!);
        case "read_value":
          return await this.readValue(args.key_path!, args.value_name!);
        case "search_keys":
          return await this.searchKeys(args.search_term!, args.hive);
        case "list_subkeys":
          return await this.listSubkeys(args.key_path!, args.max_depth);
        case "get_startup_programs":
          return await this.getStartupPrograms();
        case "get_installed_programs":
          return await this.getInstalledPrograms();
        case "get_system_info_from_registry":
          return await this.getSystemInfoFromRegistry();
        default:
          throw new Error(`Unknown action: ${args.action}`);
      }
    } catch (error: any) {
      return {
        content: [{
          type: "text",
          text: `❌ Registry operation failed: ${error.message}`
        }],
        isError: true
      };
    }
  },

  async readKey(keyPath: string) {
    try {
      const command = `Get-ItemProperty -Path "Registry::${keyPath}" -ErrorAction Stop | Format-List`;
      const { stdout } = await execAsync(`powershell -Command "${command}"`);
      
      return {
        content: [{
          type: "text",
          text: `# Registry Key: ${keyPath}\n\n\`\`\`\n${stdout}\n\`\`\``
        }]
      };
    } catch (error: any) {
      throw new Error(`Failed to read registry key ${keyPath}: ${error.message}`);
    }
  },

  async readValue(keyPath: string, valueName: string) {
    try {
      const command = `Get-ItemPropertyValue -Path "Registry::${keyPath}" -Name "${valueName}" -ErrorAction Stop`;
      const { stdout } = await execAsync(`powershell -Command "${command}"`);
      
      return {
        content: [{
          type: "text",
          text: `# Registry Value\n\n**Key**: ${keyPath}\n**Value Name**: ${valueName}\n**Value**: ${stdout.trim()}`
        }]
      };
    } catch (error: any) {
      throw new Error(`Failed to read registry value ${valueName} from ${keyPath}: ${error.message}`);
    }
  },

  async searchKeys(searchTerm: string, hive = "HKLM") {
    try {
      // Search for keys containing the search term
      const command = `Get-ChildItem -Path "Registry::${hive}\\" -Recurse -ErrorAction SilentlyContinue | Where-Object {$_.Name -like "*${searchTerm}*"} | Select-Object Name -First 20 | Format-Table -AutoSize`;
      const { stdout } = await execAsync(`powershell -Command "${command}"`);
      
      return {
        content: [{
          type: "text",
          text: `# Registry Key Search Results\n\nSearch term: "${searchTerm}"\nHive: ${hive}\nLimit: 20 results\n\n\`\`\`\n${stdout}\n\`\`\``
        }]
      };
    } catch (error: any) {
      throw new Error(`Failed to search registry keys: ${error.message}`);
    }
  },

  async listSubkeys(keyPath: string, maxDepth = 2) {
    try {
      const command = maxDepth > 1 
        ? `Get-ChildItem -Path "Registry::${keyPath}" -Recurse -Depth ${maxDepth - 1} -ErrorAction SilentlyContinue | Select-Object Name, Property | Format-Table -AutoSize`
        : `Get-ChildItem -Path "Registry::${keyPath}" -ErrorAction SilentlyContinue | Select-Object Name, Property | Format-Table -AutoSize`;
      
      const { stdout } = await execAsync(`powershell -Command "${command}"`);
      
      return {
        content: [{
          type: "text",
          text: `# Registry Subkeys\n\nParent Key: ${keyPath}\nMax Depth: ${maxDepth}\n\n\`\`\`\n${stdout}\n\`\`\``
        }]
      };
    } catch (error: any) {
      throw new Error(`Failed to list subkeys for ${keyPath}: ${error.message}`);
    }
  },

  async getStartupPrograms() {
    try {
      const locations = [
        "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run",
        "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run",
        "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\RunOnce",
        "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\RunOnce"
      ];
      
      let result = "# Startup Programs from Registry\n\n";
      
      for (const location of locations) {
        try {
          const command = `Get-ItemProperty -Path "Registry::${location}" -ErrorAction SilentlyContinue | Format-List`;
          const { stdout } = await execAsync(`powershell -Command "${command}"`);
          
          if (stdout.trim()) {
            result += `## ${location}\n\`\`\`\n${stdout}\n\`\`\`\n\n`;
          }
        } catch {
          result += `## ${location}\n*No entries or access denied*\n\n`;
        }
      }
      
      return {
        content: [{ type: "text", text: result }]
      };
    } catch (error: any) {
      throw new Error(`Failed to get startup programs: ${error.message}`);
    }
  },

  async getInstalledPrograms() {
    try {
      const locations = [
        "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
        "HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
        "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall"
      ];
      
      let result = "# Installed Programs from Registry\n\n";
      
      for (const location of locations) {
        try {
          const command = `Get-ChildItem -Path "Registry::${location}" -ErrorAction SilentlyContinue | Get-ItemProperty | Where-Object {$_.DisplayName} | Select-Object DisplayName, DisplayVersion, Publisher, InstallDate | Sort-Object DisplayName | Format-Table -AutoSize`;
          const { stdout } = await execAsync(`powershell -Command "${command}"`);
          
          if (stdout.trim()) {
            result += `## ${location}\n\`\`\`\n${stdout}\n\`\`\`\n\n`;
          }
        } catch {
          result += `## ${location}\n*No entries or access denied*\n\n`;
        }
      }
      
      return {
        content: [{ type: "text", text: result }]
      };
    } catch (error: any) {
      throw new Error(`Failed to get installed programs: ${error.message}`);
    }
  },

  async getSystemInfoFromRegistry() {
    try {
      const systemKeys = [
        {
          name: "Windows Version",
          path: "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion",
          values: ["ProductName", "ReleaseId", "CurrentBuild", "UBR"]
        },
        {
          name: "Computer Info",
          path: "HKLM\\SYSTEM\\CurrentControlSet\\Control\\ComputerName\\ComputerName",
          values: ["ComputerName"]
        },
        {
          name: "Processor Info",
          path: "HKLM\\HARDWARE\\DESCRIPTION\\System\\CentralProcessor\\0",
          values: ["ProcessorNameString", "~MHz"]
        }
      ];
      
      let result = "# System Information from Registry\n\n";
      
      for (const keyInfo of systemKeys) {
        result += `## ${keyInfo.name}\n`;
        
        try {
          for (const valueName of keyInfo.values) {
            try {
              const command = `Get-ItemPropertyValue -Path "Registry::${keyInfo.path}" -Name "${valueName}" -ErrorAction SilentlyContinue`;
              const { stdout } = await execAsync(`powershell -Command "${command}"`);
              
              if (stdout.trim()) {
                result += `- **${valueName}**: ${stdout.trim()}\n`;
              }
            } catch {
              result += `- **${valueName}**: *Not available*\n`;
            }
          }
        } catch {
          result += `*Key not accessible*\n`;
        }
        
        result += "\n";
      }
      
      return {
        content: [{ type: "text", text: result }]
      };
    } catch (error: any) {
      throw new Error(`Failed to get system info from registry: ${error.message}`);
    }
  }
};