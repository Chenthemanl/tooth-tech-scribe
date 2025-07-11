import { BaseAgent, AgentConfig } from './BaseAgent';
import { TrendingContentAgent } from './TrendingContentAgent';
import { SummarizationAgent } from './SummarizationAgent';
import { ContentGapAgent } from './ContentGapAgent';
import { EnhancedTrendingAgent } from './EnhancedTrendingAgent';
import { ContentQualityAgent } from './ContentQualityAgent';
import { SeoOptimizationAgent } from './SeoOptimizationAgent';
import { EngagementPredictionAgent } from './EngagementPredictionAgent';

type AgentConstructor = new (name: string, type: string, config: AgentConfig) => BaseAgent;

export class AgentRegistry {
  private static instance: AgentRegistry;
  private agents: Map<string, BaseAgent> = new Map();
  private agentTypes: Map<string, AgentConstructor> = new Map();

  private constructor() {
    this.registerAgentTypes();
  }

  static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }

  private registerAgentTypes(): void {
    // Original agents
    this.agentTypes.set('trending-content-agent', TrendingContentAgent);
    this.agentTypes.set('trending', TrendingContentAgent);
    this.agentTypes.set('summarization-agent', SummarizationAgent);
    this.agentTypes.set('content', SummarizationAgent);
    this.agentTypes.set('summarization', SummarizationAgent);
    this.agentTypes.set('content-gap-agent', ContentGapAgent);
    
    // Enhanced agents
    this.agentTypes.set('enhanced-trending-agent', EnhancedTrendingAgent);
    this.agentTypes.set('enhanced-trending', EnhancedTrendingAgent);

    // New Google-powered agents
    this.agentTypes.set('content-quality-agent', ContentQualityAgent);
    this.agentTypes.set('content_quality', ContentQualityAgent);
    this.agentTypes.set('quality', ContentQualityAgent); // Re-mapping 'quality' to the new, more appropriate agent
    this.agentTypes.set('seo-optimization-agent', SeoOptimizationAgent);
    this.agentTypes.set('seo_optimization', SeoOptimizationAgent);
    this.agentTypes.set('engagement-prediction-agent', EngagementPredictionAgent);
    this.agentTypes.set('engagement_prediction', EngagementPredictionAgent);
    
    // Legacy mapping for content_gap
    this.agentTypes.set('content_gap', ContentGapAgent);
  }

  createAgent(name: string, type: string, config: AgentConfig = {}): BaseAgent | null {
    const AgentClass = this.agentTypes.get(type);
    if (!AgentClass) {
      console.error(`Agent type ${type} not found`);
      return null;
    }

    const agent = new AgentClass(name, type, config);
    this.agents.set(name, agent);
    return agent;
  }

  getAgent(name: string): BaseAgent | undefined {
    return this.agents.get(name);
  }

  getAllAgents(): BaseAgent[] {
    return Array.from(this.agents.values());
  }

  removeAgent(name: string): boolean {
    return this.agents.delete(name);
  }

  getAvailableAgentTypes(): string[] {
    return Array.from(this.agentTypes.keys());
  }

  getEnhancedAgentTypes(): string[] {
    return Array.from(this.agentTypes.keys()).filter(type => type.includes('enhanced'));
  }

  createCollaborativeAgentGroup(agentConfigs: Array<{name: string; type: string; config?: AgentConfig}>): BaseAgent[] {
    const agents: BaseAgent[] = [];
    
    for (const agentConfig of agentConfigs) {
      const agent = this.createAgent(agentConfig.name, agentConfig.type, {
        collaboration_enabled: true,
        ...agentConfig.config
      });
      if (agent) agents.push(agent);
    }

    return agents;
  }
}
