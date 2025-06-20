import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, Settings, Target, Clock, Sparkles, Zap } from 'lucide-react';
import { createAIAgent, updateAIAgent, AIAgent } from '@/services/aiAgents';
import { AVAILABLE_MODELS } from '@/services/aiModelService';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import AdvancedAgentConfig from './AdvancedAgentConfig';

interface AgentManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  agent?: AIAgent | null;
  mode: 'create' | 'edit';
}

const AGENT_TYPES = [
  { value: 'trending', label: 'Trending Content Agent', description: 'Identifies trending articles and content opportunities' },
  { value: 'content_gap', label: 'Content Gap Agent', description: 'Finds content gaps and suggests new topics' },
  { value: 'summarization', label: 'Summarization Agent', description: 'Creates summaries and extracts key insights' },
  { value: 'enhanced_trending', label: 'Enhanced Trending Agent', description: 'Advanced trending analysis with ML predictions' },
  { value: 'content_quality', label: 'Content Quality Agent', description: 'Analyzes content quality, readability, and engagement.' },
  { value: 'seo_optimization', label: 'SEO Optimization Agent', description: 'Provides SEO recommendations and keyword analysis.' },
  { value: 'engagement_prediction', label: 'Engagement Prediction Agent', description: 'Predicts social media performance and reader engagement.' },
];

const AgentManagementDialog = ({ isOpen, onClose, agent, mode }: AgentManagementDialogProps) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: agent?.name || '',
    type: agent?.type || '',
    description: agent?.description || '',
    is_active: agent?.is_active !== undefined ? agent.is_active : true,
    config: agent?.config || {}
  });

  const [configJson, setConfigJson] = useState(JSON.stringify(agent?.config || {}, null, 2));
  const [selectedModel, setSelectedModel] = useState(agent?.config?.ai_model || 'gemini-1.5-flash-latest');
  const [promptTemplate, setPromptTemplate] = useState(agent?.config?.prompt_template || '');
  const [isSuggestingConfig, setIsSuggestingConfig] = useState(false);

  useEffect(() => {
    // Sync dedicated fields with the main config JSON
    try {
      const currentConfig = JSON.parse(configJson || '{}');
      const newConfig = { ...currentConfig, ai_model: selectedModel, prompt_template: promptTemplate };
      
      // Avoid feedback loop if JSON is manually edited
      if (JSON.stringify(currentConfig, null, 2) !== JSON.stringify(newConfig, null, 2)) {
         setConfigJson(JSON.stringify(newConfig, null, 2));
      }
    } catch (e) {
      // Ignore parse errors while user is typing in textarea
    }
  }, [selectedModel, promptTemplate]);

  useEffect(() => {
    // Update dedicated fields if configJson changes (e.g., manual edit)
    try {
      const config = JSON.parse(configJson);
      if (config.ai_model && config.ai_model !== selectedModel) {
        setSelectedModel(config.ai_model);
      }
      if (config.prompt_template && config.prompt_template !== promptTemplate) {
        setPromptTemplate(config.prompt_template);
      }
    } catch (e) {
      // Ignore
    }
  }, [configJson]);

  const createMutation = useMutation({
    mutationFn: createAIAgent,
    onSuccess: () => {
      toast({ title: "Agent Created", description: "The AI agent has been created successfully." });
      queryClient.invalidateQueries({ queryKey: ['ai-agents'] });
      onClose();
    },
    onError: (error) => {
      toast({ title: "Creation Failed", description: error.message, variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: Partial<AIAgent> }) => updateAIAgent(id, data),
    onSuccess: () => {
      toast({ title: "Agent Updated", description: "The AI agent has been updated successfully." });
      queryClient.invalidateQueries({ queryKey: ['ai-agents'] });
      onClose();
    },
    onError: (error) => {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    }
  });

  const suggestConfigMutation = useMutation({
    mutationFn: async ({ name, type, description }: { name: string, type: string, description: string }) => {
      setIsSuggestingConfig(true);
      const { data, error } = await supabase.functions.invoke('suggest-agent-config', {
        body: { name, type, description },
      });

      if (error) {
        throw new Error(error.message);
      }
      
      return data;
    },
    onSuccess: (data) => {
      const { suggestedConfig } = data;
      if (suggestedConfig) {
        const prettyConfig = JSON.stringify(suggestedConfig, null, 2);
        setConfigJson(prettyConfig);
        toast({ title: "Configuration Suggested", description: "AI has generated a configuration for you." });
      } else {
        throw new Error("AI did not return a valid configuration.");
      }
    },
    onError: (error) => {
      toast({ title: "Suggestion Failed", description: error.message, variant: "destructive" });
    },
    onSettled: () => {
        setIsSuggestingConfig(false);
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const parsedConfig = JSON.parse(configJson);
      const agentData = {
        ...formData,
        config: parsedConfig
      };

      if (mode === 'create') {
        createMutation.mutate(agentData);
      } else if (agent) {
        updateMutation.mutate({ id: agent.id, data: agentData });
      }
    } catch (error) {
      toast({ 
        title: "Invalid Configuration", 
        description: "Please check your JSON configuration format.",
        variant: "destructive"
      });
    }
  };

  const selectedAgentType = AGENT_TYPES.find(type => type.value === formData.type);

  const getDefaultConfig = (type: string) => {
    switch (type) {
      case 'trending':
        return {
          ai_model: 'gemini-1.5-flash-latest',
          prompt_template: 'Analyze the provided articles based on views and creation date to identify the top 3 trending ones. Return a JSON object with a key "trending_articles", containing an array of objects. Each object must include "article_id", "reasoning", and "confidence_score". If none are trending, return an empty array.',
          min_views_threshold: 100,
          trending_window_hours: 24,
        };
      case 'content_gap':
        return {
          ai_model: 'gemini-1.5-flash-latest',
          prompt_template: 'Analyze the following content to find gaps and suggest new topics. Format the response as a JSON object.',
          analysis_depth: 'medium',
          topic_similarity_threshold: 0.6,
        };
      case 'summarization':
        return {
          ai_model: 'gemini-1.5-flash-latest',
          prompt_template: 'Summarize the provided text into a concise overview. Format the response as a JSON object with a "summary" key.',
          max_summary_length: 200,
          key_points_count: 5,
        };
      case 'enhanced_trending':
        return {
          ai_model: 'gemini-1.5-pro-latest',
          prompt_template: `As an expert data scientist, perform an advanced trend analysis on the provided articles. Consider metrics like engagement, freshness, quality, and trending scores. Identify up to 3 articles with the highest potential to go viral or become top performers. Also, provide one high-level "future_prediction" about content trends based on the data.

Return a JSON object with two keys:
1. "trending_articles": An array of objects, each with "article_id", "reasoning" (explain why it's trending), "confidence_score" (0-1), and "suggested_action" (e.g., "Feature in hero section", "Promote on social media").
2. "future_predictions": An array with a single object containing "prediction_text" and "confidence_score".

If no articles are trending and no predictions can be made, return empty arrays for both keys.

Article data: {articles_data}`,
        };
      case 'content_quality':
        return {
          ai_model: 'gemini-1.5-pro-latest',
          prompt_template: `Analyze the provided articles for content quality based on clarity, depth, and engagement potential. For each article, provide a quality score (0-100) and specific, actionable suggestions for improvement.

Return a JSON object with a key "quality_analysis", containing an array of objects. Each object must include "article_id", "quality_score" (number), "reasoning" (string), and an array of "suggestions" (strings).

Article data: {articles_data}`,
        };
      case 'seo_optimization':
        return {
          ai_model: 'gemini-1.5-flash-latest',
          prompt_template: `Analyze the provided articles for SEO optimization. For each article, suggest a list of relevant keywords, a meta description, and other on-page SEO improvements.

Return a JSON object with a key "seo_analysis", containing an array of objects. Each object must include "article_id", "suggested_keywords" (array of strings), "suggested_meta_description" (string), and "on_page_improvements" (array of strings).

Article data: {articles_data}`,
        };
      case 'engagement_prediction':
        return {
          ai_model: 'gemini-1.5-flash-latest',
          prompt_template: `Predict the social media and reader engagement for the provided articles. For each article, provide a predicted engagement score (low, medium, high) and suggest a social media post to maximize reach.

Return a JSON object with a key "engagement_prediction", containing an array of objects. Each object must include "article_id", "predicted_engagement" (string: 'low', 'medium', or 'high'), "reasoning" (string), and "suggested_social_post" (string).

Article data: {articles_data}`,
        };
      default:
        return {
          ai_model: 'gemini-1.5-flash-latest',
          prompt_template: ''
        };
    }
  };

  const handleTypeChange = (newType: string) => {
    setFormData(prev => ({ ...prev, type: newType }));
    const defaultConfig = getDefaultConfig(newType);
    setConfigJson(JSON.stringify(defaultConfig, null, 2));
    setSelectedModel(defaultConfig.ai_model);
    setPromptTemplate(defaultConfig.prompt_template);
  };

  const handleSuggestConfig = () => {
    if (!formData.name || !formData.type) {
        toast({
            title: "Missing Information",
            description: "Please provide an Agent Name and Type before suggesting a configuration.",
            variant: "destructive"
        });
        return;
    }
    suggestConfigMutation.mutate({
        name: formData.name,
        type: formData.type,
        description: formData.description
    });
  };

  const handleAdvancedConfigChange = (newConfig: Record<string, any>) => {
    setFormData(prev => ({ ...prev, config: newConfig }));
    setConfigJson(JSON.stringify(newConfig, null, 2));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            {mode === 'create' ? 'Create New AI Agent' : 'Edit AI Agent'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' 
              ? 'Configure a new AI agent with advanced behavior settings to analyze your content and generate suggestions.'
              : 'Modify the configuration and advanced settings of your AI agent.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic Settings</TabsTrigger>
              <TabsTrigger value="config">Configuration</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Agent Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Content Trending Analyzer"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Agent Type</Label>
                  <Select value={formData.type} onValueChange={handleTypeChange} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select agent type" />
                    </SelectTrigger>
                    <SelectContent>
                      {AGENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedAgentType && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">{selectedAgentType.label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{selectedAgentType.description}</p>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>AI Model</Label>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select AI model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Google</SelectLabel>
                        {AVAILABLE_MODELS.filter(m => m.provider === 'Google').map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>OpenAI</SelectLabel>
                        {AVAILABLE_MODELS.filter(m => m.provider === 'OpenAI').map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Anthropic</SelectLabel>
                        {AVAILABLE_MODELS.filter(m => m.provider === 'Anthropic').map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this agent does and its purpose..."
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="is_active">Agent is active</Label>
              </div>
            </TabsContent>

            <TabsContent value="config" className="space-y-4">
              <div className="flex justify-end">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSuggestConfig}
                    disabled={isSuggestingConfig || suggestConfigMutation.isPending}
                >
                    <Sparkles className="mr-2 h-4 w-4" />
                    {isSuggestingConfig || suggestConfigMutation.isPending ? 'Generating...' : 'Suggest Configuration with AI'}
                </Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="prompt_template">Prompt Template</Label>
                <Textarea
                  id="prompt_template"
                  value={promptTemplate}
                  onChange={(e) => setPromptTemplate(e.target.value)}
                  placeholder="Enter the prompt template for the AI..."
                  rows={8}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  This template will be used to instruct the AI. Use it to define the analysis task and desired JSON output format.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="config">Full Configuration (JSON)</Label>
                <Textarea
                  id="config"
                  value={configJson}
                  onChange={(e) => setConfigJson(e.target.value)}
                  placeholder="Enter JSON configuration..."
                  rows={12}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Advanced agent parameters. Changes to the fields above will be reflected here.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Advanced Agent Configuration
                  </CardTitle>
                  <CardDescription>
                    Fine-tune agent behavior, scheduling, triggers, and collaboration settings for optimal performance.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AdvancedAgentConfig
                    config={formData.config}
                    onChange={handleAdvancedConfigChange}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="preview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Brain className="h-4 w-4" />
                      {formData.name || 'Unnamed Agent'}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={formData.is_active ? "default" : "secondary"}>
                        {formData.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <Badge variant="outline">{selectedAgentType?.label || formData.type}</Badge>
                      {formData.config.auto_run_enabled && (
                        <Badge variant="secondary">Auto-Run</Badge>
                      )}
                      {formData.config.collaboration_enabled && (
                        <Badge variant="outline">Collaborative</Badge>
                      )}
                    </div>
                  </CardTitle>
                  <CardDescription>
                    {formData.description || 'No description provided'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Configuration Summary
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">Confidence Threshold</p>
                          <p className="text-sm font-medium">{((formData.config.confidence_threshold || 0.7) * 100).toFixed(0)}%</p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">Max Suggestions</p>
                          <p className="text-sm font-medium">{formData.config.max_suggestions || 5}</p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">Run Frequency</p>
                          <p className="text-sm font-medium">{formData.config.run_frequency || 'Manual'}</p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">Analysis Window</p>
                          <p className="text-sm font-medium">{formData.config.analysis_window_hours || 24}h</p>
                        </div>
                      </div>
                      <div className="bg-muted p-3 rounded text-xs max-h-40 overflow-y-auto">
                        <pre>{configJson}</pre>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {mode === 'create' ? 'Will be created' : 'Last updated'}: {new Date().toLocaleString()}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending 
                ? (mode === 'create' ? 'Creating...' : 'Updating...') 
                : (mode === 'create' ? 'Create Agent' : 'Update Agent')
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AgentManagementDialog;
