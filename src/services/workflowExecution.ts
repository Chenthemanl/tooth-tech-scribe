import { supabase } from '@/integrations/supabase/client';
import { WorkflowNode } from '@/types/WorkflowTypes';

export interface WorkflowExecution {
  id: string;
  workflow_rule_id: string;
  suggestion_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: string;
  completed_at?: string;
  result?: any;
  error_message?: string;
}

export interface WorkflowExecutionContext {
  executionId: string;
  data: any;
  metadata: Record<string, any>;
}

// Execute a complete workflow
export async function executeWorkflow(
  workflowId: string, 
  nodes: WorkflowNode[], 
  triggerData?: any
): Promise<WorkflowExecution[]> {
  console.log(`🚀 Starting workflow execution for workflow ${workflowId}`);
  
  // Create initial execution record
  const { data: execution, error } = await supabase
    .from('workflow_executions')
    .insert({
      workflow_rule_id: workflowId,
      suggestion_id: crypto.randomUUID(), // Generate a unique suggestion ID
      status: 'running',
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create workflow execution:', error);
    throw error;
  }

  try {
    // Sort nodes by execution order (trigger first, then connected nodes)
    const sortedNodes = topologicalSort(nodes);
    
    // Start with trigger data or empty context
    let executionContexts: WorkflowExecutionContext[] = [{
      executionId: execution.id,
      data: triggerData || {},
      metadata: {}
    }];

    // Execute each node in sequence
    for (const node of sortedNodes) {
      console.log(`📋 Executing node: ${node.label} (${node.type}) with ${executionContexts.length} context(s)`);
      
      const newContexts: WorkflowExecutionContext[] = [];
      
      // Process each execution context (handles multiple results)
      for (let i = 0; i < executionContexts.length; i++) {
        const context = executionContexts[i];
        console.log(`🔄 Processing context ${i + 1}/${executionContexts.length} for node ${node.label}`);
        
        try {
          const nodeResults = await executeNode(node, context);
          
          // Handle multiple results - each result becomes a new execution context
          if (Array.isArray(nodeResults)) {
            console.log(`🔄 Node ${node.label} returned ${nodeResults.length} results for context ${i + 1}`);
            nodeResults.forEach((result, index) => {
              newContexts.push({
                executionId: `${context.executionId}-${node.id}-${index}`,
                data: result,
                metadata: { ...context.metadata, [`${node.type}_${node.id}`]: result }
              });
            });
          } else if (nodeResults !== null && nodeResults !== undefined) {
            console.log(`🔄 Node ${node.label} returned single result for context ${i + 1}`);
            newContexts.push({
              executionId: context.executionId,
              data: nodeResults,
              metadata: { ...context.metadata, [`${node.type}_${node.id}`]: nodeResults }
            });
          } else {
            console.warn(`⚠️ Node ${node.label} returned null/undefined for context ${i + 1}, skipping`);
          }
        } catch (error) {
          console.error(`❌ Error processing context ${i + 1} for node ${node.label}:`, error);
          // Continue with other contexts even if one fails
        }
      }
      
      executionContexts = newContexts;
      console.log(`✅ Node ${node.label} completed with ${executionContexts.length} result(s)`);
      
      // Exit early if no contexts remain
      if (executionContexts.length === 0) {
        console.warn(`⚠️ No execution contexts remaining after node ${node.label}, stopping workflow`);
        break;
      }
    }

    // Update execution as completed
    await supabase
      .from('workflow_executions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        result: {
          contexts: executionContexts.length,
          final_results: executionContexts.map(ctx => ctx.data)
        }
      })
      .eq('id', execution.id);

    console.log(`🎉 Workflow execution completed with ${executionContexts.length} result(s)`);
    return [{ ...execution, status: 'completed' as const }];

  } catch (error) {
    console.error('Workflow execution failed:', error);
    
    // Update execution as failed
    await supabase
      .from('workflow_executions')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: error instanceof Error ? error.message : 'Unknown error'
      })
      .eq('id', execution.id);

    throw error;
  }
}

// Execute a single node with context
async function executeNode(node: WorkflowNode, context: WorkflowExecutionContext): Promise<any> {
  console.log(`🔧 Executing node ${node.type} with config:`, node.config);
  
  switch (node.type) {
    case 'trigger':
      return executeTriggerNode(node, context);
    
    case 'news-discovery':
      return executeNewsDiscoveryNode(node, context);
    
    case 'rss-aggregator':
      return executeRssAggregatorNode(node, context);
    
    case 'google-scholar-search':
      return executeGoogleScholarNode(node, context);
    
    case 'perplexity-research':
      return executePerplexityResearchNode(node, context);
    
    case 'multi-source-synthesizer':
      return executeMultiSourceSynthesizerNode(node, context);
    
    case 'ai-processor':
      return executeAiProcessorNode(node, context);
    
    case 'filter':
      return executeFilterNode(node, context);
    
    case 'publisher':
      return executePublisherNode(node, context);
    
    default:
      console.warn(`⚠️ Unknown node type: ${node.type}`);
      return context.data;
  }
}

// Node execution functions
async function executeTriggerNode(node: WorkflowNode, context: WorkflowExecutionContext): Promise<any> {
  // Trigger nodes just pass through their initial data
  return context.data;
}

async function executeNewsDiscoveryNode(node: WorkflowNode, context: WorkflowExecutionContext): Promise<any[]> {
  console.log('🔍 Executing News Discovery node');
  
  try {
    // Calculate fromDate / toDate based on preset
    let fromDate: string | undefined;
    let toDate: string | undefined;
    const now = new Date();
    
    if (node.config.timeRange === 'custom') {
      fromDate = node.config.fromDate;
      toDate = node.config.toDate;
      console.log('📅 Using custom date range:', { fromDate, toDate });
    } else {
      switch (node.config.timeRange) {
      case 'hour':
        fromDate = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
        break;
      case 'day':
        fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
        break;
      case 'week':
        fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case 'month':
        fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        break;
      default:
        break;
      }
      console.log('📅 Using preset date range:', { timeRange: node.config.timeRange, fromDate });
    }

    console.log('🔧 News Discovery config:', {
      keywords: node.config.keywords,
      source: node.config.source,
      timeRange: node.config.timeRange,
      fromDate,
      toDate
    });

    const { data, error } = await supabase.functions.invoke('news-discovery', {
      body: {
        keywords: node.config.keywords || ['AI', 'technology'],
        source: node.config.source || node.config.sources || 'all',
        maxResults: node.config.maxResults || 10,
        timeRange: node.config.timeRange || 'day',
        fromDate,
        toDate,
        saveToQueue: true
      }
    });

    if (error) {
      console.error('News discovery error:', error);
      throw error;
    }

    const articles = data.articles || [];
    console.log(`📰 News discovery found ${articles.length} articles`);
    
    if (articles.length === 0) {
      console.warn('⚠️ No articles found by news discovery');
      return [];
    }
    
    // Return each article as a separate result - THIS FIXES THE MULTIPLE RESULTS ISSUE
    const results = articles.map((article: any) => ({
      ...article,
      source_type: 'news_discovery',
      execution_context: context.executionId
    }));
    
    console.log(`🔄 News discovery returning ${results.length} separate articles for processing`);
    return results;
    
  } catch (error) {
    console.error('News discovery node execution failed:', error);
    throw error;
  }
}

async function executeRssAggregatorNode(node: WorkflowNode, context: WorkflowExecutionContext): Promise<any[]> {
  console.log('📡 Executing RSS Aggregator node');
  
  try {
    const { data, error } = await supabase.functions.invoke('rss-aggregator', {
      body: {
        feeds: node.config.feeds || [],
        maxItemsPerFeed: node.config.maxItemsPerFeed || 5
      }
    });

    if (error) throw error;
    
    const items = data.items || [];
    console.log(`📡 RSS aggregator found ${items.length} items`);
    
    // Return each RSS item as a separate result
    return items.map((item: any) => ({
      ...item,
      source_type: 'rss',
      execution_context: context.executionId
    }));
    
  } catch (error) {
    console.error('RSS aggregator node execution failed:', error);
    throw error;
  }
}

async function executeGoogleScholarNode(node: WorkflowNode, context: WorkflowExecutionContext): Promise<any[]> {
  console.log('🎓 Executing Google Scholar node');
  
  try {
    const { data, error } = await supabase.functions.invoke('google-scholar-search', {
      body: {
        query: node.config.query || context.data.keywords || 'AI research',
        maxResults: node.config.maxResults || 10,
        yearFrom: node.config.yearFrom,
        yearTo: node.config.yearTo,
        sort: node.config.sort || 'relevance',
        language: node.config.language || 'en',
        includeAbstracts: node.config.includeAbstracts !== false,
        includeCitations: node.config.includeCitations || false
      }
    });

    if (error) throw error;
    
    const papers = data.papers || [];
    console.log(`🎓 Google Scholar found ${papers.length} papers`);
    
    if (papers.length === 0) {
      console.warn('⚠️ No papers found by Google Scholar search');
      return [];
    }
    
    // Return each paper as a separate result - THIS FIXES THE MULTIPLE RESULTS ISSUE
    const results = papers.map((paper: any) => ({
      title: paper.title,
      content: paper.abstract || '',
      description: paper.abstract || '',
      url: paper.url || '',
      source_type: 'academic',
      source_url: paper.url || '',
      published_date: new Date().toISOString(), // Use current processing date
      authors: Array.isArray(paper.authors) ? paper.authors : [],
      citations: paper.citations || 0,
      venue: paper.venue || '',
      execution_context: context.executionId
    }));
    
    console.log(`🔄 Google Scholar returning ${results.length} separate papers for processing`);
    return results;
    
  } catch (error) {
    console.error('Google Scholar node execution failed:', error);
    throw error;
  }
}

async function executePerplexityResearchNode(node: WorkflowNode, context: WorkflowExecutionContext): Promise<any> {
  console.log('🔬 Executing Perplexity Research node');
  
  try {
    const { data, error } = await supabase.functions.invoke('perplexity-research', {
      body: {
        query: node.config.query || context.data.title || 'research query',
        mode: node.config.mode || 'comprehensive'
      }
    });

    if (error) throw error;
    
    return {
      ...context.data,
      research_data: data,
      source_type: 'research',
      execution_context: context.executionId
    };
    
  } catch (error) {
    console.error('Perplexity research node execution failed:', error);
    throw error;
  }
}

async function executeMultiSourceSynthesizerNode(node: WorkflowNode, context: WorkflowExecutionContext): Promise<any> {
  console.log('🔗 Executing Multi-Source Synthesizer node');
  
  try {
    const { data, error } = await supabase.functions.invoke('multi-source-synthesizer', {
      body: {
        sources: [context.data],
        synthesisType: node.config.synthesisType || 'comprehensive',
        tone: node.config.tone || 'professional'
      }
    });

    if (error) throw error;
    
    return {
      ...context.data,
      synthesized_content: data,
      execution_context: context.executionId
    };
    
  } catch (error) {
    console.error('Multi-source synthesizer node execution failed:', error);
    throw error;
  }
}

async function executeAiProcessorNode(node: WorkflowNode, context: WorkflowExecutionContext): Promise<any> {
  console.log('🤖 Executing AI Processor node');
  
  try {
    const { data, error } = await supabase.functions.invoke('ai-content-generator', {
      body: {
        prompt: node.config.prompt || 'Generate article content',
        content: context.data.content || context.data.description || '',
        tone: node.config.tone || 'professional',
        length: node.config.length || 'medium'
      }
    });

    if (error) throw error;
    
    return {
      ...context.data,
      ai_content: data,
      execution_context: context.executionId
    };
    
  } catch (error) {
    console.error('AI processor node execution failed:', error);
    throw error;
  }
}

async function executeFilterNode(node: WorkflowNode, context: WorkflowExecutionContext): Promise<any> {
  console.log('🔍 Executing Filter node');
  
  // Apply filters based on node configuration
  const filters = node.config.filters || [];
  let data = context.data;
  
  for (const filter of filters) {
    switch (filter.type) {
      case 'keyword':
        if (!data.title?.toLowerCase().includes(filter.value.toLowerCase()) &&
            !data.content?.toLowerCase().includes(filter.value.toLowerCase())) {
          return null; // Filtered out
        }
        break;
      case 'date':
        const articleDate = new Date(data.publishedAt || data.published_date);
        const filterDate = new Date(filter.value);
        if (filter.operator === 'after' && articleDate <= filterDate) {
          return null;
        }
        if (filter.operator === 'before' && articleDate >= filterDate) {
          return null;
        }
        break;
      case 'score':
        const score = data.priority_score || 0;
        if (filter.operator === 'gt' && score <= filter.value) {
          return null;
        }
        if (filter.operator === 'lt' && score >= filter.value) {
          return null;
        }
        break;
    }
  }
  
  return data;
}

async function executePublisherNode(node: WorkflowNode, context: WorkflowExecutionContext): Promise<any> {
  console.log('📢 Executing Publisher node with context:', context);
  console.log('📢 Publisher node config:', node.config);
  
  try {
    // Prepare content for the create-article-from-ai function
    const articleContent = context.data.ai_content?.content || context.data.content || context.data.description || '';
    const title = context.data.title || 'Generated Article';
    
    console.log('Publisher node - preparing content:', {
      title,
      contentLength: articleContent.length,
      hasAiContent: !!context.data.ai_content,
      category: node.config.category,
      reporterId: node.config.reporterId,
      hasReporterId: !!node.config.reporterId
    });

    const fullContent = `# ${title}

${context.data.summary || context.data.description || ''}

${articleContent}`;

    // Create article from the workflow result using the correct interface
    const { data, error } = await supabase.functions.invoke('create-article-from-ai', {
      body: {
        content: fullContent,
        category: node.config.category || 'AI Generated',
        provider: 'AI Processor',
        status: node.config.autoPublish ? 'published' : 'draft',
        reporterId: node.config.reporterId || null
      }
    });

    if (error) {
      console.error('Publisher node - create-article-from-ai error:', error);
      throw error;
    }

    console.log('Publisher node - article created successfully:', data);
    
    return {
      ...context.data,
      published_article: data,
      execution_context: context.executionId
    };
    
  } catch (error) {
    console.error('Publisher node execution failed:', error);
    throw error;
  }
}

// Utility function to sort nodes in execution order
function topologicalSort(nodes: WorkflowNode[]): WorkflowNode[] {
  const sorted: WorkflowNode[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();
  
  function visit(nodeId: string) {
    if (visiting.has(nodeId)) {
      throw new Error('Circular dependency detected in workflow');
    }
    if (visited.has(nodeId)) {
      return;
    }
    
    visiting.add(nodeId);
    
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      // Visit connected nodes first
      for (const connectedId of node.connected) {
        visit(connectedId);
      }
      
      sorted.push(node);
      visited.add(nodeId);
    }
    
    visiting.delete(nodeId);
  }
  
  // Start with trigger nodes
  const triggerNodes = nodes.filter(n => n.type === 'trigger');
  for (const trigger of triggerNodes) {
    visit(trigger.id);
  }
  
  // Visit any remaining nodes
  for (const node of nodes) {
    if (!visited.has(node.id)) {
      visit(node.id);
    }
  }
  
  return sorted;
}