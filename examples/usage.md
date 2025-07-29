# Windows MCP Usage Examples

This document provides practical examples of how to use the Windows MCP server with Claude Desktop or other MCP-compatible clients.

## 📋 Prerequisites

1. **Build the project:**
   ```bash
   npm run build
   ```

2. **Configure Claude Desktop** (see README.md for detailed setup)

## 🔧 Basic Usage Examples

### File System Operations

#### Browse Directory Structure
```
Show me the contents of C:\Users directory
```
*Uses: `filesystem` tool with `browse_directory` action*

#### Search for Files
```
Find all .txt files in C:\Documents that are larger than 1MB
```
*Uses: `filesystem` tool with `search_files` action*

#### Get Disk Usage
```
Show me disk usage for all drives
```
*Uses: `filesystem` tool with `disk_usage` action*

### Process Management

#### List Running Processes
```
Show me all running processes sorted by CPU usage
```
*Uses: `process` tool with `list_processes` action*

#### Find Specific Process
```
Find all Chrome processes and show their memory usage
```
*Uses: `process` tool with `find_process` action*

#### Process Tree
```
Show me the process tree for explorer.exe
```
*Uses: `process` tool with `process_tree` action*

### System Information

#### System Overview
```
Give me a complete system overview including hardware specs
```
*Uses: `system` tool with `overview` action*

#### Environment Variables
```
Show me all environment variables containing "PATH"
```
*Uses: `system` tool with `environment` action*

#### Installed Software
```
List all installed programs on this system
```
*Uses: `system` tool with `installed_software` action*

### Registry Operations

#### Read Registry Key
```
Show me the Windows version information from the registry
```
*Uses: `registry` tool with `read_key` action*

#### Startup Programs
```
List all programs that start with Windows
```
*Uses: `registry` tool with `startup_programs` action*

### Service Management

#### List Services
```
Show me all Windows services and their current status
```
*Uses: `service` tool with `list_services` action*

#### Service Details
```
Get detailed information about the Windows Update service
```
*Uses: `service` tool with `service_details` action*

### Network Operations

#### Network Adapters
```
Show me all network adapters and their configuration
```
*Uses: `network` tool with `adapters` action*

#### Active Connections
```
List all active network connections
```
*Uses: `network` tool with `connections` action*

#### Port Scan
```
Scan for open ports on localhost from 80 to 443
```
*Uses: `network` tool with `port_scan` action*

### Performance Monitoring

#### CPU Usage
```
Show me current CPU usage by core
```
*Uses: `performance` tool with `cpu_usage` action*

#### Memory Usage
```
Display detailed memory usage information
```
*Uses: `performance` tool with `memory_usage` action*

#### Top Processes
```
Show me the top 10 processes by memory usage
```
*Uses: `performance` tool with `top_processes` action*

## 🎯 Advanced Use Cases

### System Diagnostics
```
I'm experiencing slow performance. Can you help me diagnose the issue?
```
*This would trigger multiple tools:*
- Performance monitoring for CPU/Memory
- Process analysis for resource-heavy applications
- Disk usage analysis
- Network connection analysis

### Security Audit
```
Perform a basic security audit of my system
```
*This would include:*
- Listing all running processes
- Checking startup programs
- Reviewing active network connections
- Analyzing listening ports

### System Cleanup
```
Help me identify large files and temporary directories for cleanup
```
*This would use:*
- File system tools to find large files
- Directory analysis for temp folders
- Disk usage analysis

## 🔒 Security Considerations

- **Read-Only Operations**: Most tools are designed for information gathering
- **No Destructive Actions**: The MCP server doesn't perform file deletion or system modifications
- **Process Termination**: Only the `process` tool can terminate processes (use with caution)
- **Service Management**: Service start/stop operations require administrator privileges

## 🐛 Troubleshooting

### Common Issues

1. **Permission Denied**
   - Some operations require administrator privileges
   - Run Claude Desktop as administrator if needed

2. **PowerShell Execution Policy**
   - Ensure PowerShell execution policy allows script execution
   - Run: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

3. **Tool Not Found**
   - Ensure the MCP server is properly configured in Claude Desktop
   - Check the server logs for errors

### Debug Mode

To enable debug logging, set the environment variable:
```bash
set DEBUG=windows-mcp:*
node build/index.js
```

## 📞 Support

For issues and questions:
- **GitHub**: [https://github.com/guangxiangdebizi/windows-mcp](https://github.com/guangxiangdebizi/windows-mcp)
- **Email**: guangxiangdebizi@gmail.com
- **LinkedIn**: [Xingyu Chen](https://www.linkedin.com/in/xingyu-chen-b5b3b0313/)