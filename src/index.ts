#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

// Import business tools
import { fileSystemTool } from "./tools/filesystem.js";
import { processManagerTool } from "./tools/process.js";
import { systemInfoTool } from "./tools/system.js";
import { registryTool } from "./tools/registry.js";
import { serviceManagerTool } from "./tools/service.js";
import { networkTool } from "./tools/network.js";
import { performanceTool } from "./tools/performance.js";

// Create MCP server
const server = new Server({
  name: "windows-system-mcp",
  version: "1.0.0",
}, {
  capabilities: { tools: {} }
});

// Tool registration
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: fileSystemTool.name,
        description: fileSystemTool.description,
        inputSchema: fileSystemTool.parameters
      },
      {
        name: processManagerTool.name,
        description: processManagerTool.description,
        inputSchema: processManagerTool.parameters
      },
      {
        name: systemInfoTool.name,
        description: systemInfoTool.description,
        inputSchema: systemInfoTool.parameters
      },
      {
        name: registryTool.name,
        description: registryTool.description,
        inputSchema: registryTool.parameters
      },
      {
        name: serviceManagerTool.name,
        description: serviceManagerTool.description,
        inputSchema: serviceManagerTool.parameters
      },
      {
        name: networkTool.name,
        description: networkTool.description,
        inputSchema: networkTool.parameters
      },
      {
        name: performanceTool.name,
        description: performanceTool.description,
        inputSchema: performanceTool.parameters
      }
    ]
  };
});

// Tool call handling
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const args = request.params.arguments || {};
  
  switch (request.params.name) {
    case "filesystem":
      return await fileSystemTool.run(args as any);
    case "process_manager":
      return await processManagerTool.run(args as any);
    case "system_info":
      return await systemInfoTool.run(args as any);
    case "registry":
      return await registryTool.run(args as any);
    case "service_manager":
      return await serviceManagerTool.run(args as any);
    case "network":
      return await networkTool.run(args as any);
    case "performance":
      return await performanceTool.run(args as any);
    default:
      throw new Error(`Unknown tool: ${request.params.name}`);
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Windows System MCP Server running on stdio");
}

main().catch(console.error);