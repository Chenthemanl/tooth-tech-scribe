
import { 
  LayoutDashboard, 
  FileText, 
  Settings, 
  Bot, 
  BarChart3, 
  Zap,
  Award,
  Workflow,
  Clock,
  User
} from 'lucide-react';

export const adminNavLinks = [
  {
    title: 'Dashboard',
    url: '/admin',
    icon: LayoutDashboard,
  },
  {
    title: 'Articles',
    url: '/admin/articles',
    icon: FileText,
  },

  {
    title: 'Reporters',        // 🔧 ADD THIS ENTIRE OBJECT
    url: '/admin/reporters',   // 🔧 ADD THIS
    icon: User,               // 🔧 ADD THIS
  }, 
       
  {
    title: 'Content Queue',
    url: '/admin/content-queue',
    icon: Clock,
  },
  {
    title: 'AI Co-Pilot',
    url: '/admin/ai-copilot',
    icon: Bot,
  },
  {
    title: 'Analytics',
    url: '/admin/analytics',
    icon: BarChart3,
  },
  {
    title: 'Performance Analytics',
    url: '/admin/performance-analytics',
    icon: Award,
  },
  {
    title: 'Automated Workflows',
    url: '/admin/automated-workflows',
    icon: Zap,
  },
  {
    title: 'AI Agent Management',
    url: '/admin/ai-agents',
    icon: Workflow,
  },
  {
    title: 'Workflow Builder',
    url: '/admin/workflow-builder',
    icon: Workflow,
  },
  {
    title: 'Settings',
    url: '/admin/settings',
    icon: Settings,
  },
];
