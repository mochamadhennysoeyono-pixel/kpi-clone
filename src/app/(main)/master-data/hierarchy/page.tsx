
// src/app/(main)/master-data/hierarchy/page.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useMasterData } from "@/contexts/master-data-context";
import { useAuth } from "@/contexts/auth-context";
import type { Employee, Company } from "@/types";
import { User, Building, Users, Briefcase, Minus, Plus, GitMerge, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


type HierarchicalEmployee = Employee & {
  subordinates: HierarchicalEmployee[];
};

type HierarchicalCompany = Company & {
  children: HierarchicalCompany[];
  employees: HierarchicalEmployee[];
  management: Employee[]; // Add a new field for management users
};


function EmployeeNode({ employee, level }: { employee: HierarchicalEmployee; level: number }) {
  const [isOpen, setIsOpen] = useState(level < 2); // Auto-expand first few levels
  const hasSubordinates = employee.subordinates && employee.subordinates.length > 0;

  return (
    <div className="ml-4 pl-4 border-l border-border">
      <div className="flex items-center gap-4 py-2">
        {hasSubordinates && (
           <button onClick={() => setIsOpen(!isOpen)} className="text-muted-foreground hover:text-foreground">
            {isOpen ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </button>
        )}
        <User className={`h-5 w-5 text-muted-foreground ${!hasSubordinates ? 'ml-8' : ''}`} />
        <div>
          <p className="font-semibold">{employee.name}</p>
          <p className="text-sm text-muted-foreground">{employee.position} / {employee.department}</p>
        </div>
        <Badge variant="outline" className="ml-auto">{employee.level}</Badge>
      </div>
      {isOpen && hasSubordinates && (
        <div>
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
     <Card className="mb-4 bg-muted/20">
      <Accordion type="single" collapsible defaultValue="item-1">
        <AccordionItem value="item-1" className="border-b-0">
          <AccordionTrigger className="p-4 hover:no-underline">
            <div className="flex items-center gap-4">
               {companyNode.isHolding ? <GitMerge className="h-6 w-6 text-primary" /> : <Building className="h-6 w-6 text-primary" />}
              <div>
                <p className="text-lg font-semibold text-left">{companyNode.name}</p>
                <p className="text-sm text-muted-foreground text-left">{companyNode.businessField}</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="p-4 pt-0">
            {companyNode.management.length > 0 && (
                <div className="mb-4 pb-4 border-b">
                    {companyNode.management.map(admin => (
                        <div key={admin.id} className="flex items-center gap-3 p-2 rounded-md">
                            <ShieldCheck className="h-5 w-5 text-green-600"/>
                            <div>
                                <p className="font-semibold">{admin.name}</p>
                                <p className="text-sm text-muted-foreground">{admin.position}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
             {sortedRootEmployees.length > 0 ? (
                <div className="space-y-2">
                  {sortedRootEmployees.map(employee => (
                    <EmployeeNode key={employee.id} employee={employee} level={0} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Tidak ada struktur karyawan untuk perusahaan ini.</p>
              )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      {companyNode.children && companyNode.children.length > 0 && (
        <div className="pl-8 pr-4 pb-4 border-l-4 border-primary/20 ml-6">
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
      
      if(userCompanyNode) {
         const isRoot = rootCompanies.some(rc => rc.id === userCompanyNode.id);
         if (isRoot) {
             return [userCompanyNode];
         } else {
            return [userCompanyNode];
         }
      }
    }

    return [];

  }, [employees, companies, userRole, currentUser, selectedCompanyId]);

  return (
    <div className="space-y-6">
        <Card>
            <CardHeader className="bg-primary text-primary-foreground dark:bg-card dark:text-primary-foreground">
                <div>
                    <CardTitle className="font-headline dark:text-white">Struktur Organisasi</CardTitle>
                    <CardDescription className="text-primary-foreground/80 dark:text-muted-foreground">
                        Visualisasikan hierarki perusahaan dan struktur tim di dalamnya.
                    </CardDescription>
                </div>
                 {userRole === 'superadmin' && (
                  <div className="pt-4">
                      <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                        <SelectTrigger className="w-full sm:w-[300px] bg-background/20 text-primary-foreground hover:bg-background/30 dark:bg-muted dark:text-foreground dark:hover:bg-muted/80">
                          <SelectValue placeholder="Filter Perusahaan" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tampilkan Semua Perusahaan</SelectItem>
                          {companies.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                  </div>
                 )}
            </CardHeader>
        </Card>

        {companyHierarchy.length > 0 ? (
            companyHierarchy.map(companyNode => (
                <CompanyNode key={companyNode.id} companyNode={companyNode} />
            ))
        ) : (
             <Card>
                <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">Tidak ada struktur perusahaan yang bisa ditampilkan.</p>
                </CardContent>
             </Card>
        )}
    </div>
  );
}
