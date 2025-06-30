import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useAuth } from "@/contexts/AuthContext"
import { useCategories } from "@/hooks/use-categories"
import { cn } from "@/lib/utils"
import { 
  Home, Info, LayoutGrid, LogIn, LogOut, Mail, User, Briefcase, Laptop, Syringe, Sparkles, Newspaper, Microscope, Brain} from "lucide-react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { Skeleton } from "./ui/skeleton"

export function AppSidebar() {
  const { data: categories, isLoading: isLoadingCategories } = useCategories();
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile, setOpenMobile } = useSidebar();

  const getCategoryIcon = (category) => {
    switch (category.toLowerCase()) {
      case 'general':
        return <Brain className="w-8 h-8" />;
      case 'industry':
        return <Briefcase className="w-8 h-8" />;
      case 'tools':
        return <Syringe className="w-8 h-8" />;
      case 'tech':
        return <Laptop className="w-8 h-8" />;
      case 'ai generated':
        return <Sparkles className="w-8 h-8" />;
      case 'news':
        return <Newspaper className="w-8 h-8" />;
      case 'research':
        return <Microscope className="w-8 h-8" />;
      default:
        return <LayoutGrid className="w-8 h-8" />;
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };
  
  const mainNav = [
    { title: 'Home', href: '/', icon: Home },
    { title: 'About', href: '/about', icon: Info },
    { title: 'Contact', href: '/contact', icon: Mail },
  ];

  const buttonClasses = cn(!isMobile && "justify-center gap-0 group-hover:justify-start group-hover:gap-3");
  const textClasses = cn(isMobile ? "inline-block" : "hidden group-hover:inline-block", "font-light");
  
  const headerClasses = cn(
    "flex items-center gap-2 text-xl font-light", // FIX #2: Removed `text-foreground` to allow inheritance
    isMobile 
      ? "justify-start px-4" 
      : "justify-center px-2 group-hover:justify-start group-hover:px-5"
  );

  return (
    <Sidebar 
      collapsible="icon" 
      className={cn(
        "border-none", 
        "text-blue-900", // FIX #1: Set global dark blue color for all icons and text
        "[&_[data-sidebar='sidebar']]:rounded-tr-3xl", 
        "[&_[data-sidebar='sidebar']]:shadow-none",   
        "[&_[data-sidebar='sidebar']]:bg-blue-50",    
        "[&_svg]:stroke-[1.5]"
      )}
    >
      <SidebarHeader className="p-4">
        <Link to="/" onClick={handleLinkClick} className={headerClasses}>
          <img 
            src="/sidebar-icon.png"
            alt="DentAI logo"
            className="w-8 h-8"
          />
            {/* FIX #2: Removed inline style to allow inheritance */ }
            <span className={textClasses}>DentAI</span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="p-4">
        <SidebarGroup>
          <SidebarMenu>
            {mainNav.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname === item.href}
                  className={buttonClasses}
                >
                    <Link to={item.href} onClick={handleLinkClick}>
                      <item.icon className="w-8 h-8" /> 
                      <span className={textClasses}>{item.title}</span>
                    </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup>
            {!isMobile && (
              <div className="mb-5 border-t border-gray-300 group-hover:hidden" />
            )}
            <SidebarGroupLabel className={textClasses}>Categories</SidebarGroupLabel>
            <SidebarMenu>
            {isLoadingCategories ? (
              [...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)
            ) : (
              categories?.map((category) => (
                <SidebarMenuItem key={category}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === `/category/${category}`}
                    className={buttonClasses}
                  >
                    <Link to={`/category/${category}`} onClick={handleLinkClick}>
                      {getCategoryIcon(category)}
                      <span className={textClasses}>{category}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))
            )}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 flex flex-col gap-2">
        {user ? (
          <>
            {isAdmin && (
              <SidebarMenuButton asChild className={cn("w-full", buttonClasses)}>
                <Link to="/admin" onClick={handleLinkClick}>
                  <User className="w-8 h-8" />
                  <span className={textClasses}>Admin</span>
                </Link>
              </SidebarMenuButton>
            )}
            <SidebarMenuButton asChild className={cn("w-full", buttonClasses)}>
              <button onClick={() => { handleLogout(); handleLinkClick(); }} className="w-full">
                <LogOut className="w-8 h-8" />
                <span className={textClasses}>Logout</span>
              </button>
            </SidebarMenuButton>
          </>
        ) : (
          <SidebarMenuButton asChild className={cn("w-full", buttonClasses)}>
            <Link to="/auth" onClick={handleLinkClick}>
              <LogIn className="w-8 h-8" />
              <span className={textClasses}>Login</span>
            </Link>
          </SidebarMenuButton>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}