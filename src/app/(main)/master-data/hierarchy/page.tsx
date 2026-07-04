// src/app/(main)/master-data/hierarchy/page.tsx
"use client";

import { useState, useMemo } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useMasterData } from "@/contexts/master-data-context";
import { useAuth } from "@/contexts/auth-context";
import type { Employee, Company } from "@/types";
import { User, Building, GitMerge, ShieldCheck, Plus, Minus, GitFork, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResponsivePage, ResponsiveToolbar } from "@/components/ui/adaptive-layout";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type HierarchicalEmployee = Employee & {
  subordinates: HierarchicalEmployee[];
};

type HierarchicalCompany = Company & {
  children: HierarchicalCompany[];
  employees: HierarchicalEmployee[];
  management: Employee[];
};

function EmployeeNode({ employee, level }: { employee: HierarchicalEmployee; level: number }) {
  const [isOpen, setIsOpen] = useState(level < 1);
  const hasSubordinates = employee.subordinates && employee.subordinates.length > 0;

  return (
    <div className={cn("ml-2 sm:ml-4 pl-3 sm:pl-4 border-l-2 transition-all", isOpen ? "border-primary/20" : "border-transparent")}>
      <div className="flex items-center gap-3 py-2 group">
        <div className="size-8 sm:size-10 rounded-full bg-background border flex items-center justify-center relative shadow-sm">
            {hasSubordinates && (
               <button 
                  onClick={() => setIsOpen(!isOpen)} 
                  className="absolute -left-3 top-1/2 -translate-y-1/2 size-5 rounded-full bg-primary text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform"
               >
                {isOpen ? <Minus size={10} strokeWidth={4} /> : <Plus size={10} strokeWidth={4} />}
              </button>
            )}
            <User className="size-4 sm:size-5 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-xs sm:text-sm text-slate-900 truncate">{employee.name}</p>
          <p className="text-[10px] text-muted-foreground font-medium truncate uppercase">{employee.position}</p>
        </div>
        <Badge variant="outline" className="ml-auto text-[8px] sm:text-[10px] font-black uppercase h-5 shrink-0">{employee.level}</Badge>
      </div>
      {isOpen && hasSubordinates && (
        <div className="animate-in slide-in-from-top-1 duration-200">
          {employee.subordinates.map(sub => (
            <EmployeeNode key={sub.id} employee={sub} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function CompanyNode({ companyNode }: { companyNode: HierarchicalCompany }) {
  const levelOrder: Employee['level'][] = ['Direktur', 'Manager', 'Supervisor', 'Staff'];
  
  const sortedRootEmployees = useMemo(() => {
    return [...companyNode.employees].sort((a,b) => levelOrder.indexOf(a.level) - levelOrder.indexOf(b.level));
  }, [companyNode.employees]);

  return (
     <Card className="border-border/40 shadow-sm overflow-hidden mb-6 bg-background">
      <Accordion type="single" collapsible defaultValue="root" className="w-full">
        <AccordionItem value="root" className="border-none">
          <AccordionTrigger className="p-4 sm:p-6 hover:no-underline bg-muted/30">
            <div className="flex items-center gap-4">
               <div className="size-10 sm:size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
                  {companyNode.isHolding ? <GitMerge size={20} className="sm:size-24" /> : <Building size={20} className="sm:size-24" />}
               </div>
              <div className="text-left min-w-0">
                <p className="text-base sm:text-xl font-black tracking-tight text-slate-900 truncate">{companyNode.name}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground font-bold uppercase tracking-wider">{companyNode.businessField}</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="p-4 sm:p-6 pt-2">
            {companyNode.management.length > 0 && (
                <div className="mb-6 pb-4 border-b border-dashed">
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-3 px-1">Tim Manajemen & Admin</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {companyNode.management.map(admin => (
                            <div key={admin.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-transparent hover:border-primary/20 transition-all">
                                <div className="size-8 rounded-full bg-green-500/10 text-green-600 flex items-center justify-center shrink-0">
                                    <ShieldCheck size={16} />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-bold text-xs truncate">{admin.name}</p>
                                    <p className="text-[9px] text-muted-foreground font-medium truncate uppercase">{admin.position}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
             
            <div className="space-y-4">
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest px-1">Hierarki Karyawan Operasional</p>
                {sortedRootEmployees.length > 0 ? (
                    <div className="space-y-2">
                    {sortedRootEmployees.map(employee => (
                        <EmployeeNode key={employee.id} employee={employee} level={0} />
                    ))}
                    </div>
                ) : (
                    <div className="py-10 text-center text-muted-foreground italic text-xs">
                        Belum ada struktur karyawan untuk perusahaan ini.
                    </div>
                )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      
      {companyNode.children && companyNode.children.length > 0 && (
        <div className="pl-6 sm:pl-10 pr-4 pb-4 border-l-4 border-primary/10 ml-6 sm:ml-10">
          {companyNode.children.map(child => (
            <CompanyNode key={child.id} companyNode={child} />
          ))}
        </div>
      )}
     </Card>
  );
}

export default function HierarchyPage() {
  const { employees, companies } = useMasterData();
  const { currentUser, userRole } = useAuth();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
  
  const companyHierarchy = useMemo((): HierarchicalCompany[] => {
    let allEmployees = employees;
    const allCompanies = companies;

    const companyMap = new Map<string, HierarchicalCompany>();
    allCompanies.forEach(company => {
        companyMap.set(company.id, { ...company, children: [], employees: [], management: [] });
    });

    const rootCompanies: HierarchicalCompany[] = [];
    allCompanies.forEach(company => {
        const companyNode = companyMap.get(company.id);
        if (!companyNode) return;
        if (company.parentId && companyMap.has(company.parentId)) {
            companyMap.get(company.parentId)?.children.push(companyNode);
        } else {
            rootCompanies.push(companyNode);
        }
    });

    const isManager = userRole === 'user' && currentUser && employees.some(e => e.reportsTo === currentUser.id);
    if (isManager) {
        const getSubordinateIdsRecursive = (managerId: string): string[] => {
            const directReports = employees.filter(e => e.reportsTo === managerId).map(e => e.id);
            if (directReports.length === 0) return [];
            return [...directReports, ...directReports.flatMap(id => getSubordinateIdsRecursive(id))];
        };
        const teamIds = [currentUser.id, ...getSubordinateIdsRecursive(currentUser.id)];
        allEmployees = employees.filter(e => teamIds.includes(e.id));
    }


    allEmployees.forEach(employee => {
        const companyNode = Array.from(companyMap.values()).find(c => c.name === employee.company);
        if (companyNode) {
          if (employee.role === 'manajemen') {
            if (!companyNode.management) companyNode.management = [];
            companyNode.management.push(employee);
          } else {
            if (!companyNode.employees) companyNode.employees = [];
            (companyNode.employees as HierarchicalEmployee[]).push({ ...employee, subordinates: [] });
          }
        }
    });
    
    companyMap.forEach(companyNode => {
        const employeeMap = new Map<string, HierarchicalEmployee>();
        companyNode.employees.forEach(emp => employeeMap.set(emp.id, emp));
        
        const companyRootEmployees: HierarchicalEmployee[] = [];
        companyNode.employees.forEach(emp => {
            if (emp.reportsTo && employeeMap.has(emp.reportsTo)) {
                employeeMap.get(emp.reportsTo)?.subordinates.push(emp);
            } else {
                companyRootEmployees.push(emp);
            }
        });
        companyNode.employees = companyRootEmployees;
    });

    if (userRole === 'superadmin') {
      if (selectedCompanyId === 'all') {
        return rootCompanies;
      }
      const selectedCompanyNode = companyMap.get(selectedCompanyId);
      return selectedCompanyNode ? [selectedCompanyNode] : [];
    }

    if (currentUser?.company) {
      const userCompanyName = currentUser.company;
      const userCompanyNode = Array.from(companyMap.values()).find(c => c.name === userCompanyName);
      if(userCompanyNode) return [userCompanyNode];
    }

    return [];
  }, [employees, companies, userRole, currentUser, selectedCompanyId]);

  return (
    <ResponsivePage>
      <PageHeader 
        title="Struktur Organisasi"
        description="Visualisasikan hierarki perusahaan dan jaring-jaring struktur tim di seluruh unit bisnis Anda."
        icon={GitFork}
      />

      {userRole === 'superadmin' && (
        <ResponsiveToolbar>
          <div className="flex flex-1 items-center gap-2 min-w-0">
            <Filter className="size-4 text-muted-foreground hidden sm:block shrink-0" />
            <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                <SelectTrigger className="w-full md:w-[280px] bg-background">
                    <Building className="size-3.5 mr-2 text-primary shrink-0" />
                    <SelectValue placeholder="Semua Perusahaan" />
                </SelectTrigger>
                <SelectContent className="z-[350]">
                    <SelectItem value="all">Tampilkan Semua Perusahaan</SelectItem>
                    {companies.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>
        </ResponsiveToolbar>
      )}

      <div className="space-y-6 pt-4">
        {companyHierarchy.length > 0 ? (
            companyHierarchy.map(companyNode => (
                <CompanyNode key={companyNode.id} companyNode={companyNode} />
            ))
        ) : (
             <Card className="border-dashed">
                <CardContent className="py-20 text-center text-muted-foreground italic text-sm">
                    Tidak ada struktur perusahaan yang bisa ditampilkan untuk filter saat ini.
                </CardContent>
             </Card>
        )}
      </div>
    </ResponsivePage>
  );
}
