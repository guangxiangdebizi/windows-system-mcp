import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export const networkTool = {
  name: "network",
  description: "Network information and diagnostics including network adapters, connections, ports, routing, and network testing",
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["get_network_adapters", "get_active_connections", "get_listening_ports", "get_routing_table", "ping_host", "trace_route", "get_dns_info", "get_network_statistics", "scan_open_ports", "get_wifi_profiles"],
        description: "The network operation to perform"
      },
      host: {
        type: "string",
        description: "Target host for ping, traceroute, or port scanning"
      },
      port: {
        type: "number",
        description: "Specific port number for port-related operations"
      },
      port_range: {
        type: "string",
        description: "Port range for scanning (e.g., '80-443')"
      },
      protocol: {
        type: "string",
        enum: ["tcp", "udp", "all"],
        description: "Protocol filter for connections and ports (default: all)",
        default: "all"
      },
      count: {
        type: "number",
        description: "Number of ping packets to send (default: 4)",
        default: 4
      },
      timeout: {
        type: "number",
        description: "Timeout in seconds for network operations (default: 5)",
        default: 5
      }
    },
    required: ["action"]
  },

  async run(args: {
    action: string;
    host?: string;
    port?: number;
    port_range?: string;
    protocol?: string;
    count?: number;
    timeout?: number;
  }) {
    try {
      switch (args.action) {
        case "get_network_adapters":
          return await this.getNetworkAdapters();
        case "get_active_connections":
          return await this.getActiveConnections(args.protocol);
        case "get_listening_ports":
          return await this.getListeningPorts(args.protocol);
        case "get_routing_table":
          return await this.getRoutingTable();
        case "ping_host":
          return await this.pingHost(args.host!, args.count);
        case "trace_route":
          return await this.traceRoute(args.host!);
        case "get_dns_info":
          return await this.getDnsInfo();
        case "get_network_statistics":
          return await this.getNetworkStatistics();
        case "scan_open_ports":
          return await this.scanOpenPorts(args.host!, args.port_range);
        case "get_wifi_profiles":
          return await this.getWifiProfiles();
        default:
          throw new Error(`Unknown action: ${args.action}`);
      }
    } catch (error: any) {
      return {
        content: [{
          type: "text",
          text: `❌ Network operation failed: ${error.message}`
        }],
        isError: true
      };
    }
  },

  async getNetworkAdapters() {
    try {
      const command = `Get-NetAdapter | Select-Object Name, InterfaceDescription, Status, LinkSpeed, MediaType, PhysicalMediaType | Format-Table -AutoSize`;
      const { stdout } = await execAsync(`powershell -Command "${command}"`);
      
      // Also get IP configuration
      const ipCommand = `Get-NetIPAddress | Where-Object {$_.AddressFamily -eq 'IPv4'} | Select-Object InterfaceAlias, IPAddress, PrefixLength | Format-Table -AutoSize`;
      const { stdout: ipInfo } = await execAsync(`powershell -Command "${ipCommand}"`);
      
      const result = `# Network Adapters\n\n## Adapter Information\n\`\`\`\n${stdout}\n\`\`\`\n\n## IP Configuration\n\`\`\`\n${ipInfo}\n\`\`\``;
      
      return {
        content: [{ type: "text", text: result }]
      };
    } catch (error: any) {
      throw new Error(`Failed to get network adapters: ${error.message}`);
    }
  },

  async getActiveConnections(protocol = "all") {
    try {
      let protocolFilter = "";
      if (protocol !== "all") {
        protocolFilter = `-Protocol ${protocol.toUpperCase()}`;
      }
      
      const command = `Get-NetTCPConnection ${protocolFilter} | Where-Object {$_.State -eq 'Established'} | Select-Object LocalAddress, LocalPort, RemoteAddress, RemotePort, State, OwningProcess | Format-Table -AutoSize`;
      const { stdout } = await execAsync(`powershell -Command "${command}"`);
      
      return {
        content: [{
          type: "text",
          text: `# Active Network Connections\n\nProtocol: ${protocol}\nState: Established\n\n\`\`\`\n${stdout}\n\`\`\``
        }]
      };
    } catch (error: any) {
      throw new Error(`Failed to get active connections: ${error.message}`);
    }
  },

  async getListeningPorts(protocol = "all") {
    try {
      let result = "# Listening Ports\n\n";
      
      if (protocol === "all" || protocol === "tcp") {
        const tcpCommand = `Get-NetTCPConnection | Where-Object {$_.State -eq 'Listen'} | Select-Object LocalAddress, LocalPort, OwningProcess | Sort-Object LocalPort | Format-Table -AutoSize`;
        const { stdout: tcpPorts } = await execAsync(`powershell -Command "${tcpCommand}"`);
        result += `## TCP Listening Ports\n\`\`\`\n${tcpPorts}\n\`\`\`\n\n`;
      }
      
      if (protocol === "all" || protocol === "udp") {
        const udpCommand = `Get-NetUDPEndpoint | Select-Object LocalAddress, LocalPort, OwningProcess | Sort-Object LocalPort | Format-Table -AutoSize`;
        const { stdout: udpPorts } = await execAsync(`powershell -Command "${udpCommand}"`);
        result += `## UDP Listening Ports\n\`\`\`\n${udpPorts}\n\`\`\``;
      }
      
      return {
        content: [{ type: "text", text: result }]
      };
    } catch (error: any) {
      throw new Error(`Failed to get listening ports: ${error.message}`);
    }
  },

  async getRoutingTable() {
    try {
      const command = `Get-NetRoute | Where-Object {$_.AddressFamily -eq 'IPv4'} | Select-Object DestinationPrefix, NextHop, InterfaceAlias, RouteMetric | Sort-Object RouteMetric | Format-Table -AutoSize`;
      const { stdout } = await execAsync(`powershell -Command "${command}"`);
      
      return {
        content: [{
          type: "text",
          text: `# IPv4 Routing Table\n\n\`\`\`\n${stdout}\n\`\`\``
        }]
      };
    } catch (error: any) {
      throw new Error(`Failed to get routing table: ${error.message}`);
    }
  },

  async pingHost(host: string, count = 4) {
    try {
      const command = `ping -n ${count} ${host}`;
      const { stdout } = await execAsync(command);
      
      return {
        content: [{
          type: "text",
          text: `# Ping Results\n\nTarget: ${host}\nCount: ${count}\n\n\`\`\`\n${stdout}\n\`\`\``
        }]
      };
    } catch (error: any) {
      throw new Error(`Failed to ping ${host}: ${error.message}`);
    }
  },

  async traceRoute(host: string) {
    try {
      const command = `tracert ${host}`;
      const { stdout } = await execAsync(command);
      
      return {
        content: [{
          type: "text",
          text: `# Traceroute Results\n\nTarget: ${host}\n\n\`\`\`\n${stdout}\n\`\`\``
        }]
      };
    } catch (error: any) {
      throw new Error(`Failed to trace route to ${host}: ${error.message}`);
    }
  },

  async getDnsInfo() {
    try {
      const dnsCommand = `Get-DnsClientServerAddress | Where-Object {$_.AddressFamily -eq 2} | Select-Object InterfaceAlias, ServerAddresses | Format-Table -AutoSize`;
      const { stdout: dnsServers } = await execAsync(`powershell -Command "${dnsCommand}"`);
      
      const cacheCommand = `Get-DnsClientCache | Select-Object -First 20 Name, Type, Status, Section, TimeToLive | Format-Table -AutoSize`;
      const { stdout: dnsCache } = await execAsync(`powershell -Command "${cacheCommand}"`);
      
      const result = `# DNS Information\n\n## DNS Servers\n\`\`\`\n${dnsServers}\n\`\`\`\n\n## DNS Cache (First 20 entries)\n\`\`\`\n${dnsCache}\n\`\`\``;
      
      return {
        content: [{ type: "text", text: result }]
      };
    } catch (error: any) {
      throw new Error(`Failed to get DNS info: ${error.message}`);
    }
  },

  async getNetworkStatistics() {
    try {
      const command = `Get-NetAdapterStatistics | Select-Object Name, BytesReceived, BytesSent, PacketsReceived, PacketsSent | Format-Table -AutoSize`;
      const { stdout } = await execAsync(`powershell -Command "${command}"`);
      
      // Also get TCP/UDP statistics
      const tcpStatsCommand = `netstat -s`;
      const { stdout: netStats } = await execAsync(tcpStatsCommand);
      
      const result = `# Network Statistics\n\n## Adapter Statistics\n\`\`\`\n${stdout}\n\`\`\`\n\n## Protocol Statistics\n\`\`\`\n${netStats}\n\`\`\``;
      
      return {
        content: [{ type: "text", text: result }]
      };
    } catch (error: any) {
      throw new Error(`Failed to get network statistics: ${error.message}`);
    }
  },

  async scanOpenPorts(host: string, portRange?: string) {
    try {
      if (!portRange) {
        portRange = "80,443,22,21,25,53,110,993,995";
      }
      
      const ports = portRange.includes('-') 
        ? this.expandPortRange(portRange)
        : portRange.split(',').map(p => p.trim());
      
      const results: string[] = [];
      
      for (const port of ports.slice(0, 20)) { // Limit to 20 ports
        try {
          const command = `Test-NetConnection -ComputerName ${host} -Port ${port} -InformationLevel Quiet`;
          const { stdout } = await execAsync(`powershell -Command "${command}"`, { timeout: 3000 });
          
          if (stdout.trim() === "True") {
            results.push(`✅ Port ${port}: Open`);
          } else {
            results.push(`❌ Port ${port}: Closed/Filtered`);
          }
        } catch {
          results.push(`❌ Port ${port}: Timeout/Error`);
        }
      }
      
      return {
        content: [{
          type: "text",
          text: `# Port Scan Results\n\nTarget: ${host}\nPorts: ${portRange}\n\n${results.join('\n')}`
        }]
      };
    } catch (error: any) {
      throw new Error(`Failed to scan ports on ${host}: ${error.message}`);
    }
  },

  async getWifiProfiles() {
    try {
      const command = `netsh wlan show profiles`;
      const { stdout } = await execAsync(command);
      
      return {
        content: [{
          type: "text",
          text: `# WiFi Profiles\n\n\`\`\`\n${stdout}\n\`\`\``
        }]
      };
    } catch (error: any) {
      throw new Error(`Failed to get WiFi profiles: ${error.message}`);
    }
  },

  expandPortRange(range: string): string[] {
    const [start, end] = range.split('-').map(p => parseInt(p.trim()));
    const ports: string[] = [];
    
    for (let i = start; i <= end && i <= start + 100; i++) { // Limit range expansion
      ports.push(i.toString());
    }
    
    return ports;
  }
};