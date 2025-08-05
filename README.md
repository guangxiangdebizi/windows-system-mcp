# 🖥️ Windows System MCP

[![NPM Version](https://img.shields.io/npm/v/windows-system-mcp.svg)](https://www.npmjs.com/package/windows-system-mcp)
[![NPM Downloads](https://img.shields.io/npm/dm/windows-system-mcp.svg)](https://www.npmjs.com/package/windows-system-mcp)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?logo=node.js&logoColor=white)](https://nodejs.org/)

A comprehensive Model Context Protocol (MCP) server that provides AI models with powerful Windows system management capabilities. This MCP enables AI assistants to interact with Windows systems through a secure, well-structured interface.

<a href="https://glama.ai/mcp/servers/@guangxiangdebizi/windows-system-mcp">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@guangxiangdebizi/windows-system-mcp/badge" alt="Windows System MCP server" />
</a>

## ✨ Features

### 📁 File System Management
- **Directory Browsing**: Navigate and explore directory structures
- **File Operations**: Read files, get file information, and search for files
- **Disk Analysis**: Monitor disk usage and find large files
- **Advanced Search**: Pattern-based file searching with recursive options

### ⚙️ Process Management
- **Process Monitoring**: List and monitor running processes
- **Resource Tracking**: Track CPU and memory usage by process
- **Process Control**: Start, stop, and manage processes
- **Process Tree**: Visualize parent-child process relationships

### 🔧 System Information
- **Hardware Details**: CPU, memory, disk, and network adapter information
- **OS Information**: Windows version, updates, and system configuration
- **Environment**: Environment variables and system paths
- **User Management**: User accounts and current user information

### 📋 Registry Operations
- **Registry Reading**: Access Windows registry keys and values
- **System Configuration**: Retrieve system settings from registry
- **Startup Programs**: List programs that start with Windows
- **Installed Software**: Enumerate installed applications

### 🛠️ Service Management
- **Service Control**: Start, stop, and restart Windows services
- **Service Monitoring**: Monitor service status and dependencies
- **Startup Services**: Manage services that start automatically
- **Service Search**: Find services by name or description

### 🌐 Network Operations
- **Network Diagnostics**: Ping, traceroute, and connectivity testing
- **Port Scanning**: Check open ports and network connections
- **Network Configuration**: View adapters, IP configuration, and routing
- **WiFi Management**: List and manage WiFi profiles

### 📊 Performance Monitoring
- **Real-time Metrics**: CPU, memory, disk, and network performance
- **Resource Analysis**: Identify top resource-consuming processes
- **Performance Counters**: Access Windows performance counters
- **System Health**: Monitor overall system performance

## 📥 Installation

```bash
# Global installation (recommended)
npm install -g windows-system-mcp

# Or use directly with npx
npx windows-system-mcp
```

## 🚀 Quick Start

### Prerequisites
- Windows 10/11
- Node.js 18+ 
- PowerShell 5.1+

### Installation Options

#### Option 1: Install from NPM (Recommended)
```bash
npm install -g windows-system-mcp
```

#### Option 2: Build from Source
1. **Clone the repository:**
   ```bash
   git clone https://github.com/guangxiangdebizi/windows-system-mcp.git
   cd windows-system-mcp
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the project:**
   ```bash
   npm run build
   ```

### Local Development (Stdio)

**If installed globally:**
```bash
windows-system-mcp
```

**If built from source:**
```bash
npm start
```

### Development

For development with auto-rebuild:
```bash
npm run dev
```

### SSE Deployment (Supergateway)

**If installed globally:**
```bash
npx supergateway --stdio "windows-system-mcp" --port 3100
```

**If built from source:**
```bash
npm run sse
```

This will start the server on `http://localhost:3100/sse`

## 🔧 Configuration

### Claude Desktop Integration

#### Stdio Configuration

**If installed globally:**
```json
{
  "mcpServers": {
    "windows-system-mcp": {
      "command": "windows-system-mcp"
    }
  }
}
```

**If built from source:**
```json
{
  "mcpServers": {
    "windows-system-mcp": {
      "command": "node",
      "args": ["path/to/windows-system-mcp/build/index.js"]
    }
  }
}
```

#### SSE Configuration

```json
{
  "mcpServers": {
    "windows-system-mcp": {
      "type": "sse",
      "url": "http://localhost:3100/sse",
      "timeout": 600
    }
  }
}
```

> **Note**: For SSE mode, start the server first using the commands shown in the deployment section above.

## 📖 Usage Examples

### File System Operations

```typescript
// List directory contents
{
  "action": "list_directory",
  "path": "C:\\Users",
  "recursive": true,
  "max_depth": 2
}

// Search for files
{
  "action": "search_files",
  "pattern": "*.log",
  "path": "C:\\Windows\\Logs",
  "recursive": true
}

// Find large files
{
  "action": "find_large_files",
  "path": "C:\\",
  "size_threshold": 500
}
```

### Process Management

```typescript
// List running processes
{
  "action": "list_processes",
  "sort_by": "cpu",
  "limit": 20
}

// Get process details
{
  "action": "get_process_details",
  "process_name": "chrome"
}

// Kill a process
{
  "action": "kill_process",
  "process_id": 1234
}
```

### System Information

```typescript
// Get system overview
{
  "action": "get_system_overview"
}

// Get hardware information
{
  "action": "get_hardware_info",
  "category": "cpu"
}

// Get environment variables
{
  "action": "get_environment_vars",
  "filter": "PATH"
}
```

### Network Operations

```typescript
// Ping a host
{
  "action": "ping_host",
  "host": "google.com",
  "count": 4
}

// Scan ports
{
  "action": "scan_open_ports",
  "host": "localhost",
  "port_range": "80,443,3000-3010"
}

// Get network adapters
{
  "action": "get_network_adapters"
}
```

## 🛡️ Security Considerations

- **Principle of Least Privilege**: Run with minimal required permissions
- **Input Validation**: All inputs are validated and sanitized
- **Safe Operations**: Read-only operations are prioritized
- **Error Handling**: Comprehensive error handling prevents system exposure
- **Audit Trail**: All operations can be logged for security auditing

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Add tests if applicable
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **NPM Package**: [https://www.npmjs.com/package/windows-system-mcp](https://www.npmjs.com/package/windows-system-mcp)
- **GitHub**: [https://github.com/guangxiangdebizi/windows-system-mcp](https://github.com/guangxiangdebizi/windows-system-mcp)
- **Author**: [Xingyu Chen](https://www.linkedin.com/in/xingyu-chen-b5b3b0313/)
- **Email**: guangxiangdebizi@gmail.com
- **NPM Profile**: [https://www.npmjs.com/~xingyuchen](https://www.npmjs.com/~xingyuchen)

## 👨‍💻 Author

**Xingyu Chen**
- 🌐 Website: [GitHub Profile](https://github.com/guangxiangdebizi/)
- 📧 Email: guangxiangdebizi@gmail.com
- 💼 LinkedIn: [Xingyu Chen](https://www.linkedin.com/in/xingyu-chen-b5b3b0313/)
- 📦 NPM: [@xingyuchen](https://www.npmjs.com/~xingyuchen)

## 🙏 Acknowledgments

- [Model Context Protocol](https://github.com/modelcontextprotocol) for the excellent MCP framework
- The Windows PowerShell team for providing powerful system management capabilities
- The TypeScript and Node.js communities for excellent tooling

## 📊 Project Stats

- **NPM Package**: Available as `windows-system-mcp`
- **Language**: TypeScript
- **Runtime**: Node.js
- **Platform**: Windows
- **License**: Apache 2.0
- **MCP Version**: 0.6.0

---

<div align="center">
  <strong>Built with ❤️ for the AI and Windows communities</strong>
</div>