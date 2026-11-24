import type { AgentId } from './types';

export interface AgentInfo {
  id: AgentId;
  name: string;
  folder: string;
  language: string;
  framework: string;
  decidesSteps: string;
}

// From the repo README's comparison table.
export const AGENTS: Record<AgentId, AgentInfo> = {
  langgraph: {
    id: 'langgraph',
    name: 'LangGraph',
    folder: 'agent/',
    language: 'Python 3.12',
    framework: 'LangGraph + langchain-anthropic',
    decidesSteps: 'Code (graph edges)',
  },
  'semantic-kernel': {
    id: 'semantic-kernel',
    name: 'Semantic Kernel',
    folder: 'semantic-kernel-agent/',
    language: 'C# (.NET 10)',
    framework: 'Semantic Kernel',
    decidesSteps: 'Claude (automatic function calling)',
  },
  'agent-framework': {
    id: 'agent-framework',
    name: 'Agent Framework',
    folder: 'agent-framework-agent/',
    language: 'C# (.NET 10)',
    framework: 'Microsoft Agent Framework',
    decidesSteps: 'Claude (default tool calling)',
  },
};

export const AGENT_IDS = Object.keys(AGENTS) as AgentId[];
