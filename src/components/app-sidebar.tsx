"use client"

import * as React from "react"
import {
  LayoutDashboard,
  Dumbbell,
  Scale,
  BarChart2,
  Trophy,
  BrainCircuit,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar"
import Link from "next/link"
import { usePathname } from "next/navigation"

const items = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Workout Log",
    url: "/workout",
    icon: Dumbbell,
  },
  {
    title: "Bodyweight",
    url: "/bodyweight",
    icon: Scale,
  },
  {
    title: "Performance",
    url: "/performance",
    icon: BarChart2,
  },
  {
    title: "Standards",
    url: "/standards",
    icon: Trophy,
  },
  {
    title: "AI Insights",
    url: "/insights",
    icon: BrainCircuit,
  },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-16 flex items-center px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
            <Dumbbell className="text-background w-5 h-5" />
          </div>
          <span className="font-headline font-bold text-xl group-data-[collapsible=icon]:hidden">
            LiftVault
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url} tooltip={item.title}>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 group-data-[collapsible=icon]:hidden">
        <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
          Focus & Stability
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
