import type { ReactNode } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ChatWidget } from "@/components/ChatWidget";
import { SocialSidebar } from "@/components/SocialSidebar";
import { cn } from "@/lib/utils";

interface StoreLayoutProps {
  children: ReactNode;
  /** Show site footer (default: true) */
  footer?: boolean;
  /** Show chat widget (default: true) */
  chat?: boolean;
  /** Transparent navbar on top, solid on scroll — for hero pages */
  transparentNav?: boolean;
  className?: string;
}

export function StoreLayout({
  children,
  footer = true,
  chat = true,
  transparentNav = false,
  className,
}: StoreLayoutProps) {
  return (
    <div className={cn("min-h-screen bg-background text-foreground antialiased", className)}>
      <Navbar transparent={transparentNav} />
      {children}
      {footer && <Footer />}
      {chat && <ChatWidget />}
      <SocialSidebar />
    </div>
  );
}
