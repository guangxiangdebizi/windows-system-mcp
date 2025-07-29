import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";

const execAsync = promisify(exec);

export const fileSystemTool = {
  name: "filesystem",
  description: "Comprehensive file system operations including directory browsing, file reading, searching, and basic file operations",
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["list_directory", "read_file", "search_files", "get_file_info", "find_large_files", "get_disk_usage"],
        description: "The file system action to perform"
      },
      path: {
        type: "string",
        description: "File or directory path (required for most actions)"
      },
      pattern: {
        type: "string",
        description: "Search pattern for file searching (supports wildcards)"
      },
      recursive: {
        type: "boolean",
        description: "Whether to search recursively (default: false)",
        default: false
      },
      max_depth: {
        type: "number",
        description: "Maximum depth for recursive operations (default: 3)",
        default: 3
      },
      size_threshold: {
        type: "number",
        description: "Size threshold in MB for finding large files (default: 100)",
        default: 100
      }
    },
    required: ["action"]
  },

  async run(args: {
    action: string;
    path?: string;
    pattern?: string;
    recursive?: boolean;
    max_depth?: number;
    size_threshold?: number;
  }) {
    try {
      switch (args.action) {
        case "list_directory":
          return await this.listDirectory(args.path || "C:\\", args.recursive, args.max_depth);
        case "read_file":
          return await this.readFile(args.path!);
        case "search_files":
          return await this.searchFiles(args.pattern!, args.path, args.recursive);
        case "get_file_info":
          return await this.getFileInfo(args.path!);
        case "find_large_files":
          return await this.findLargeFiles(args.path || "C:\\", args.size_threshold!);
        case "get_disk_usage":
          return await this.getDiskUsage();
        default:
          throw new Error(`Unknown action: ${args.action}`);
      }
    } catch (error: any) {
      return {
        content: [{
          type: "text",
          text: `❌ File system operation failed: ${error.message}`
        }],
        isError: true
      };
    }
  },

  async listDirectory(dirPath: string, recursive = false, maxDepth = 3) {
    try {
      const items = await fs.readdir(dirPath, { withFileTypes: true });
      let result = `# Directory Listing: ${dirPath}\n\n`;
      
      const directories: string[] = [];
      const files: string[] = [];
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item.name);
        try {
          const stats = await fs.stat(fullPath);
          const size = item.isFile() ? this.formatFileSize(stats.size) : "";
          const modified = stats.mtime.toISOString().split('T')[0];
          
          if (item.isDirectory()) {
            directories.push(`📁 ${item.name}/ (${modified})`);
          } else {
            files.push(`📄 ${item.name} (${size}, ${modified})`);
          }
        } catch {
          if (item.isDirectory()) {
            directories.push(`📁 ${item.name}/ (access denied)`);
          } else {
            files.push(`📄 ${item.name} (access denied)`);
          }
        }
      }
      
      result += "## Directories:\n" + directories.join("\n") + "\n\n";
      result += "## Files:\n" + files.join("\n");
      
      if (recursive && maxDepth > 0) {
        result += "\n\n## Subdirectories (recursive):\n";
        for (const item of items) {
          if (item.isDirectory()) {
            try {
              const subPath = path.join(dirPath, item.name);
              const subResult = await this.listDirectory(subPath, true, maxDepth - 1);
              result += `\n### ${item.name}/\n${subResult.content[0].text}\n`;
            } catch {
              result += `\n### ${item.name}/ (access denied)\n`;
            }
          }
        }
      }
      
      return {
        content: [{ type: "text", text: result }]
      };
    } catch (error: any) {
      throw new Error(`Cannot list directory ${dirPath}: ${error.message}`);
    }
  },

  async readFile(filePath: string) {
    try {
      const stats = await fs.stat(filePath);
      if (stats.isDirectory()) {
        throw new Error("Path is a directory, not a file");
      }
      
      if (stats.size > 1024 * 1024) { // 1MB limit
        throw new Error("File too large (>1MB). Use file info to check size first.");
      }
      
      const content = await fs.readFile(filePath, 'utf-8');
      return {
        content: [{
          type: "text",
          text: `# File Content: ${filePath}\n\n\`\`\`\n${content}\n\`\`\``
        }]
      };
    } catch (error: any) {
      throw new Error(`Cannot read file ${filePath}: ${error.message}`);
    }
  },

  async searchFiles(pattern: string, searchPath = "C:\\", recursive = false) {
    try {
      const command = recursive 
        ? `Get-ChildItem -Path "${searchPath}" -Filter "${pattern}" -Recurse -ErrorAction SilentlyContinue | Select-Object FullName, Length, LastWriteTime | Format-Table -AutoSize`
        : `Get-ChildItem -Path "${searchPath}" -Filter "${pattern}" -ErrorAction SilentlyContinue | Select-Object FullName, Length, LastWriteTime | Format-Table -AutoSize`;
      
      const { stdout } = await execAsync(`powershell -Command "${command}"`);
      
      return {
        content: [{
          type: "text",
          text: `# File Search Results\n\nPattern: ${pattern}\nPath: ${searchPath}\nRecursive: ${recursive}\n\n\`\`\`\n${stdout}\n\`\`\``
        }]
      };
    } catch (error: any) {
      throw new Error(`File search failed: ${error.message}`);
    }
  },

  async getFileInfo(filePath: string) {
    try {
      const stats = await fs.stat(filePath);
      const result = `# File Information: ${filePath}\n\n` +
        `- **Type**: ${stats.isDirectory() ? 'Directory' : 'File'}\n` +
        `- **Size**: ${this.formatFileSize(stats.size)}\n` +
        `- **Created**: ${stats.birthtime.toISOString()}\n` +
        `- **Modified**: ${stats.mtime.toISOString()}\n` +
        `- **Accessed**: ${stats.atime.toISOString()}\n` +
        `- **Permissions**: ${stats.mode.toString(8)}`;
      
      return {
        content: [{ type: "text", text: result }]
      };
    } catch (error: any) {
      throw new Error(`Cannot get file info for ${filePath}: ${error.message}`);
    }
  },

  async findLargeFiles(searchPath: string, sizeThresholdMB: number) {
    try {
      const command = `Get-ChildItem -Path "${searchPath}" -Recurse -File -ErrorAction SilentlyContinue | Where-Object {$_.Length -gt ${sizeThresholdMB * 1024 * 1024}} | Sort-Object Length -Descending | Select-Object FullName, @{Name="SizeMB";Expression={[math]::Round($_.Length/1MB,2)}}, LastWriteTime | Format-Table -AutoSize`;
      
      const { stdout } = await execAsync(`powershell -Command "${command}"`);
      
      return {
        content: [{
          type: "text",
          text: `# Large Files (>${sizeThresholdMB}MB)\n\nSearch Path: ${searchPath}\n\n\`\`\`\n${stdout}\n\`\`\``
        }]
      };
    } catch (error: any) {
      throw new Error(`Large file search failed: ${error.message}`);
    }
  },

  async getDiskUsage() {
    try {
      const command = `Get-WmiObject -Class Win32_LogicalDisk | Select-Object DeviceID, @{Name="SizeGB";Expression={[math]::Round($_.Size/1GB,2)}}, @{Name="FreeSpaceGB";Expression={[math]::Round($_.FreeSpace/1GB,2)}}, @{Name="UsedSpaceGB";Expression={[math]::Round(($_.Size-$_.FreeSpace)/1GB,2)}}, @{Name="PercentFree";Expression={[math]::Round(($_.FreeSpace/$_.Size)*100,2)}} | Format-Table -AutoSize`;
      
      const { stdout } = await execAsync(`powershell -Command "${command}"`);
      
      return {
        content: [{
          type: "text",
          text: `# Disk Usage Information\n\n\`\`\`\n${stdout}\n\`\`\``
        }]
      };
    } catch (error: any) {
      throw new Error(`Disk usage query failed: ${error.message}`);
    }
  },

  formatFileSize(bytes: number): string {
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