// src/app/(main)/master-data/employees/page.tsx
"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PlusCircle,
  MoreHorizontal,
  Upload,
  Download,
  User,
  ChevronDown,
  Trash2,
  Send,
  FileSpreadsheet,
  AlertCircle,
  Users,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  Zap,
  Pencil
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { Employee, LoginStatus, Company, SubscriptionPlan, ModuleId } from "@/types";
import { EmployeeFormSheet } from "@/components/master-data/employees/employee-form-sheet";
import { DeleteConfirmationDialog } from "@/components/master-data/delete-confirmation-dialog";
import { useToast } from "@/hooks/use-toast";
import { useMasterData } from "@/contexts/master-data-context";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { id as localeId } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { isValid } from "date-fns";

// --- Assignment Slot Dialog ---
function ModuleAccessDialog({ 
    isOpen, 
    onOpenChange, 
    employee, 
    company, 
    allEmployees,
    onSave 
}: { 
    isOpen: boolean, 
    onOpenChange: (o: boolean) => void, 
    employee: Employee | null, 
    company: Company | null,
    allEmployees: Employee[],
    onSave: (id: string, access: Record<string, boolean>) => Promise<void>
}) {
    const [localAccess, setLocalAccess] = useState<Record<string, boolean>>({});
    const [isSaving, setIsSaving] = useState(false);
    
    useEffect(() => {
        if (employee) {
            setLocalAccess(employee.moduleAccess || {});
        }
    }, [employee]);

    const activeModules = useMemo(() => {
        if (!company?.moduleSubscriptions) return [];
        return Object.entries(company.moduleSubscriptions)
            .filter(([_, sub]) => sub.status === 'active')
            .map(([id, sub]) => ({ id, ...sub }));
    }, [company]);

    const getUsage = (moduleId: string) => {
        return allEmployees.filter(e => e.company === company?.name && e.moduleAccess?.[moduleId]).length;
    };

    const handleToggle = (moduleId: string, enabled: boolean) => {
        const usage = getUsage(moduleId);
        const sub = company?.moduleSubscriptions?.[moduleId as ModuleId];
        const limit = sub?.quota ?? 0;

        if (enabled && limit !== -1 && usage >= limit) {
            alert(`Kuota modul ini sudah penuh (${usage}/${limit}).`);
            return;
        }

        setLocalAccess(prev => ({ ...prev, [moduleId]: enabled }));
    };

    const handleConfirm = async () => {
        if (!employee) return;
        setIsSaving(true);
        await onSave(employee.id, localAccess);
        setIsSaving(false);
        onOpenChange(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Zap className="size-5 text-primary" />
                        Kelola Akses Modul (Slotting)
                    </DialogTitle>
                    <DialogDescription>
                        Tentukan modul apa saja yang dapat diakses oleh <strong>{employee?.name}</strong>.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="py-6 space-y-4">
                    {activeModules.length > 0 ? activeModules.map(mod => {
                        const usage = getUsage(mod.id);
                        
                        return (
                            <div key={mod.id} className="flex items-center justify-between p-4 rounded-xl border bg-muted/20">
                                <div className="space-y-1">
                                    <p className="text-sm font-bold uppercase tracking-tight">{mod.id}</p>
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase">
                                        <Users size={10} />
                                        Kuota: <span className={cn(usage >= mod.quota && mod.quota !== -1 ? "text-destructive" : "text-primary")}>
                                            {usage} / {mod.quota === -1 ? '∞' : mod.quota}
                                        </span>
                                    </div>
                                </div>
                                <Switch 
                                    checked={!!localAccess[mod.id]} 
                                    onCheckedChange={(val) => handleToggle(mod.id, val)}
                                />
                            </div>
                        );
                    }) : (
                        <div className="text-center py-10 opacity-40 italic text-sm">
                            Perusahaan belum berlangganan modul apa pun.
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Batal</Button>
                    <Button onClick={handleConfirm} disabled={isSaving || activeModules.length === 0}>
                        {isSaving && <Loader2 className="size-4 animate-spin mr-2" />}
                        Simpan Hak Akses
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default function EmployeesPage() {
  const { currentUser, userRole, updateUserProfile, sendPasswordReset, addUserAsAdmin, setIsLoading } = useAuth();
  const { 
    employees,
    deleteEmployees,
    companies,
    departments,
    positions,
    fetchData,
    subscriptionPlans,
    updateEmployee
  } = useMasterData();

  const [isSheetOpen, setSheetOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | undefined>(undefined);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeesToDelete, setEmployeesToDelete] = useState<Employee[] | null>(null);
  
  const [isAccessDialogOpen, setIsAccessDialogOpen] = useState(false);
  const [employeeForAccess, setEmployeeForAccess] = useState<Employee | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [isSendingInvitation, setIsSendingInvitation] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    company: "all",
    position: "all",
    department: "all",
  });
  
  const userCompany = useMemo(() => {
    return companies.find(c => c.name === currentUser?.company);
  }, [companies, currentUser]);
  
  const isHoldingAdmin = useMemo(() => userRole === 'manajemen' && !!userCompany?.isHolding, [userRole, userCompany]);
  
  useEffect(() => {
    if (userRole === 'manajemen' && !isHoldingAdmin && currentUser) {
      setFilters(prev => ({ ...prev, company: currentUser.company, department: 'all', position: 'all' }));
    }
     if (userRole === 'manajemen' && isHoldingAdmin) {
      setFilters(prev => ({ ...prev, company: "all", department: 'all', position: 'all' }));
    }
  }, [userRole, currentUser, isHoldingAdmin]);

  const quotaInfo = useMemo(() => {
    if (!currentUser || !userRole || userRole === 'superadmin' || !userCompany) return null;
    
    let relevantCompany: Company | null = userCompany;
    if (userCompany.parentId) {
        relevantCompany = companies.find(c => c.id === userCompany.parentId) || null;
    }

    const DEFAULT_USER_LIMIT = 5;
    const DEFAULT_MGMT_LIMIT = 2;

    const plan = subscriptionPlans.find(p => p.id === relevantCompany?.subscriptionPlanId);
    
    const userLimit = relevantCompany?.customUserLimit ?? plan?.userLimit ?? DEFAULT_USER_LIMIT;
    const mgmtLimit = relevantCompany?.customManagementUserLimit ?? plan?.managementUserLimit ?? DEFAULT_MGMT_LIMIT;

    const groupCompanyNames = relevantCompany?.isHolding 
        ? [relevantCompany.name, ...companies.filter(c => c.parentId === relevantCompany?.id).map(c => c.name)]
        : [relevantCompany?.name || currentUser.company];
        
    const groupEmployees = employees.filter(e => groupCompanyNames.includes(e.company));

    const userCount = groupEmployees.filter(e => e.role === 'user').length;
    const managementCount = groupEmployees.filter(e => e.role === 'manajemen').length;

    const userLimitReached = userLimit !== -1 && userCount >= userLimit;
    const managementLimitReached = mgmtLimit !== -1 && managementCount >= mgmtLimit;

    let message = "";
    if (userLimitReached && managementLimitReached) {
        message = "Kuota akun telah penuh (Staff & Manajemen). Hubungi pusat untuk upgrade.";
    } else if (userLimitReached) {
        message = `Kuota Staff (User) penuh (${userCount}/${userLimit === -1 ? '∞' : userLimit}). Anda hanya dapat menambah Admin.`;
    } else if (managementLimitReached) {
        message = `Kuota Manajemen penuh (${managementCount}/${mgmtLimit === -1 ? '∞' : mgmtLimit}). Anda hanya dapat menambah Staff.`;
    }

    return { 
        userLimitReached, 
        managementLimitReached, 
        message,
        currentUsage: { user: userCount, mgmt: managementCount },
        limits: { user: userLimit, mgmt: mgmtLimit }
    };

  }, [currentUser, userRole, userCompany, companies, subscriptionPlans, employees]);


  const handleFilterChange = (filterType: keyof typeof filters, value: string) => {
     setFilters(prev => {
      const newFilters = { ...prev, [filterType]: value };
      if (filterType === 'company') {
        newFilters.department = 'all';
        newFilters.position = 'all';
      }
      if (filterType === 'department') {
        newFilters.position = 'all';
      }
      return newFilters;
    });
  };

  const manageableCompanies = useMemo(() => {
    if (userRole === 'superadmin') return companies;
    if (isHoldingAdmin && userCompany) {
      const getChildCompanies = (parentId: string): Company[] => {
        const children = companies.filter(c => c.parentId === parentId);
        return [...children, ...children.flatMap(c => getChildCompanies(c.id))];
      };
      return [userCompany, ...getChildCompanies(userCompany.id)];
    }
    if (userCompany) return [userCompany];
    return [];
  }, [userRole, isHoldingAdmin, userCompany, companies]);
  
  const filteredEmployees = useMemo(() => {
    let baseEmployees = employees.filter(e => e.role !== 'superadmin');
    
    if (userRole === 'manajemen') {
        if (isHoldingAdmin) {
            const manageableCompanyNames = manageableCompanies.map(c => c.name?.toLowerCase() || '');
            baseEmployees = baseEmployees.filter(e => manageableCompanyNames.includes(e.company?.toLowerCase() || ''));
        } else if (currentUser) {
            baseEmployees = baseEmployees.filter(e => e.company?.toLowerCase() === currentUser.company?.toLowerCase());
        }
    } else if (userRole === 'user') {
        const isManager = employees.some(e => e.reportsTo === currentUser?.id);
        if (isManager && currentUser) {
            const getSubordinateIdsRecursive = (managerId: string): string[] => {
                const directReports = employees.filter(e => e.reportsTo === managerId).map(e => e.id);
                if (directReports.length === 0) return [];
                return [...directReports, ...directReports.flatMap(id => getSubordinateIdsRecursive(id))];
            };
            const teamIds = [currentUser.id, ...getSubordinateIdsRecursive(currentUser.id)];
            baseEmployees = baseEmployees.filter(e => teamIds.includes(e.id));
        }
    }

    return baseEmployees.filter(employee => {
      const companyMatch = filters.company === 'all' || employee.company?.toLowerCase() === filters.company.toLowerCase();
      const departmentMatch = filters.department === 'all' || employee.department?.toLowerCase() === filters.department.toLowerCase();
      const positionMatch = filters.position === 'all' || employee.position?.toLowerCase() === filters.position.toLowerCase();
      return companyMatch && departmentMatch && positionMatch;
    });
  }, [employees, filters, userRole, currentUser, isHoldingAdmin, manageableCompanies]);


  const uniqueDepartmentOptions = useMemo(() => {
    let relevantDepartments = departments;
    if(filters.company !== 'all') {
        relevantDepartments = relevantDepartments.filter(d => d.company?.toLowerCase() === filters.company.toLowerCase());
    } else if (userRole !== 'superadmin' && isHoldingAdmin) {
        const managedCompanyNames = manageableCompanies.map(c => c.name?.toLowerCase() || '');
        relevantDepartments = relevantDepartments.filter(d => managedCompanyNames.includes(d.company?.toLowerCase() || ''));
    } else if (userRole !== 'superadmin' && !isHoldingAdmin && currentUser) {
        relevantDepartments = relevantDepartments.filter(d => d.company?.toLowerCase() === currentUser.company?.toLowerCase());
    }
    return [...new Set(relevantDepartments.map(d => d.name))];
  }, [departments, filters.company, isHoldingAdmin, manageableCompanies, userRole, currentUser]);
  
  const uniquePositionOptions = useMemo(() => {
    let relevantPositions = positions;
    
    if(filters.company !== 'all') {
        relevantPositions = relevantPositions.filter(p => p.company?.toLowerCase() === filters.company.toLowerCase());
    } else if (userRole !== 'superadmin' && isHoldingAdmin) {
        const managedCompanyNames = manageableCompanies.map(c => c.name?.toLowerCase() || '');
        relevantPositions = relevantPositions.filter(p => managedCompanyNames.includes(p.company?.toLowerCase() || ''));
    } else if (userRole !== 'superadmin' && !isHoldingAdmin && currentUser) {
        relevantPositions = relevantPositions.filter(p => p.company?.toLowerCase() === currentUser.company?.toLowerCase());
    }
    
    if (filters.department !== 'all') {
      relevantPositions = relevantPositions.filter(p => p.department?.toLowerCase() === filters.department.toLowerCase());
    }
    return [...new Set(relevantPositions.map(p => p.name))];
  }, [positions, filters.company, filters.department, isHoldingAdmin, manageableCompanies, userRole, currentUser]);
  
  const handleSelectAll = (checked: boolean | "indeterminate") => {
    if (checked) {
      const allSelectableIds = filteredEmployees
        .filter(emp => emp.id !== currentUser?.id)
        .map(emp => emp.id);
      setSelectedRowIds(allSelectableIds);
    } else {
      setSelectedRowIds([]);
    }
  };

  const handleRowSelect = (rowId: string) => {
    if (rowId === currentUser?.id) return;

    setSelectedRowIds(prev =>
      prev.includes(rowId) ? prev.filter(id => id !== rowId) : [...prev, rowId]
    );
  };
  
  const openBulkDeleteDialog = () => {
    const itemsToDelete = employees.filter(e => selectedRowIds.includes(e.id));
    setEmployeesToDelete(itemsToDelete);
    setDeleteDialogOpen(true);
  };

  const handleBulkStatusChange = async (status: 'Aktif' | 'Tidak Aktif') => {
      setIsLoading(true);
      try {
          await Promise.all(selectedRowIds.map(id => updateUserProfile(id, { status })));
          toast({
              title: "Aksi Massal Berhasil",
              description: `Status ${selectedRowIds.length} karyawan telah berhasil diubah.`,
          });
          await fetchData();
          setSelectedRowIds([]);
      } finally {
          setIsLoading(false);
      }
  };

  const handleBulkSendInvitation = async () => {
    if (selectedRowIds.length === 0) {
      toast({ variant: 'destructive', title: 'Tidak ada karyawan dipilih.' });
      return;
    }
  
    setIsLoading(true);
    const employeesToSend = employees.filter(e => selectedRowIds.includes(e.id));
    let successCount = 0;
    let errorCount = 0;
  
    try {
        for (const employee of employeesToSend) {
            const result = await sendPasswordReset(employee.email, employee.name, true); 
            if (result.success) successCount++; else errorCount++;
            await sleep(2000); 
        }
        
        toast({
            title: "Proses Selesai",
            description: `${successCount} email pembaruan sandi / aktivasi terkirim. ${errorCount} gagal.`,
        });
    } finally {
        setIsLoading(false);
        setSelectedRowIds([]);
        await fetchData();
    }
  };

  const handleAddEmployee = () => {
    if (quotaInfo?.userLimitReached && quotaInfo?.managementLimitReached) {
        toast({ variant: "destructive", title: "Kuota Penuh", description: quotaInfo.message });
        return;
    }
    setSelectedEmployee(undefined);
    setSheetOpen(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setSheetOpen(true);
  };

  const handleSaveEmployee = async (id: string, employeeData: Omit<Employee, 'id' | 'loginStatus' | 'password'>) => {
    setIsLoading(true);
    try {
        await updateUserProfile(id, employeeData);
        await fetchData();
        toast({ title: "Data Karyawan Diperbarui" });
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleAdd = async (employeeData: Omit<Employee, 'id' | 'loginStatus'>) => {
    if (employeeData.role === 'user' && quotaInfo?.userLimitReached) {
        toast({ variant: "destructive", title: "Kuota Penuh", description: "Batas maksimal akun Staff telah tercapai." });
        return;
    }
    if (employeeData.role === 'manajemen' && quotaInfo?.managementLimitReached) {
        toast({ variant: "destructive", title: "Kuota Penuh", description: "Batas maksimal akun Manajemen telah tercapai." });
        return;
    }

    setIsLoading(true);
    try {
        const result = await addUserAsAdmin(employeeData, false, true); 
        if(result.success){
            await fetchData();
            toast({ title: "Karyawan Ditambahkan", description: `Akun untuk ${employeeData.name} telah dibuat dengan status No Login.` });
        } else {
            toast({ variant: "destructive", title: "Gagal Menambah Karyawan", description: result.error });
        }
    } finally {
        setIsLoading(false);
    }
  };

  const openDeleteDialog = (employee: Employee) => {
    if (employee.id === currentUser?.id) {
        toast({
            variant: "destructive",
            title: "Tindakan Ditolak",
            description: "Anda tidak dapat menghapus akun Anda sendiri.",
        });
        return;
    }
    setEmployeesToDelete([employee]);
    setDeleteDialogOpen(true);
  };
  
  const handleDelete = async () => {
    if (employeesToDelete && employeesToDelete.length > 0) {
      setIsLoading(true);
      try {
          const idsToDelete = employeesToDelete.map(e => e.id);
          await deleteEmployees(idsToDelete);
          setEmployeesToDelete(null);
          setSelectedRowIds([]);
          await fetchData();
      } finally {
          setIsLoading(false);
      }
    }
  };

  const handleSendInvitation = async (email: string, name: string) => {
    setIsSendingInvitation(email);
    setIsLoading(true);
    try {
        const result = await sendPasswordReset(email, name);
        if (result.success) {
          toast({ title: 'Undangan Terkirim', description: `Email pembaruan sandi / aktivasi telah dikirim ke ${email}.` });
          await fetchData();
        } else {
          toast({ variant: 'destructive', title: 'Gagal Mengirim Undangan', description: result.error });
        }
    } finally {
        setIsSendingInvitation(null);
        setIsLoading(false);
    }
  };

  const handleSaveModuleAccess = async (id: string, moduleAccess: Record<string, boolean>) => {
      try {
          await updateEmployee(id, { moduleAccess });
          toast({ title: "Akses Modul Diperbarui" });
          await fetchData(true);
      } catch (e: any) {
          toast({ variant: 'destructive', title: "Gagal Update", description: e.message });
      }
  };

  const handleImportClick = () => {
    if (quotaInfo?.userLimitReached && quotaInfo?.managementLimitReached) {
        toast({ variant: "destructive", title: "Kuota Penuh", description: quotaInfo.message });
        return;
    }
    fileInputRef.current?.click();
  };

  const handleDownloadExample = async () => {
    const XLSX = await import('xlsx');
    const headers = [
      'Nama Lengkap', 'Email', 'No. Telepon', 'Perusahaan', 'Departemen', 'Jabatan',
      'Level Jabatan', 'ID Atasan', 'Tanggal Bergabung (YYYY-MM-DD)', 'Role'
    ];
    const exampleData = [
        headers,
        ['Budi Santoso', 'budi.s@contoh.com', '081234567890', 'PT. Contoh Jaya', 'Teknologi', 'Software Engineer', 'Staff', '', '2023-01-15', 'user'],
        ['Ani Yudhoyono', 'ani.y@contoh.com', '089876543210', 'PT. Contoh Jaya', 'Marketing', 'Digital Marketer', 'Staff', '', '2023-03-20', 'user']
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(exampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
    XLSX.writeFile(workbook, "Contoh_Format_Karyawan.xlsx");
  };

  const handleExport = async () => {
    setIsLoading(true);
    try {
        const XLSX = await import('xlsx');
        const dataToExport = filteredEmployees.map(emp => ({
        'ID': emp.id,
        'Nama Lengkap': emp.name,
        'Email': emp.email,
        'No. Telepon': emp.phone,
        'Perusahaan': emp.company,
        'Departemen': emp.department,
        'Jabatan': emp.position,
        'Level Jabatan': emp.level,
        'ID Atasan': emp.reportsTo,
        'Tanggal Bergabung': emp.joinDate,
        'Status Akun': emp.status,
        'Status Login': emp.loginStatus,
        'Role': emp.role
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Data Karyawan");
        XLSX.writeFile(workbook, "Data_Karyawan.xlsx");
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const XLSX = await import('xlsx');
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        let successCount = 0;
        let failCount = 0;

        for (const row of jsonData) {
            const rawCompany = String(row['Perusahaan'] || '').trim();
            const normalizedCompany = manageableCompanies.find(c => c.name.toLowerCase() === rawCompany.toLowerCase())?.name || rawCompany;

            let joinDate = new Date().toISOString().split('T')[0];
            if (row['Tanggal Bergabung (YYYY-MM-DD)']) {
                const rawDate = row['Tanggal Bergabung (YYYY-MM-DD)'];
                if (typeof rawDate === 'number') {
                    const date = new Date((rawDate - 25569) * 86400 * 1000);
                    if (isValid(date)) joinDate = date.toISOString().split('T')[0];
                } else {
                    const date = new Date(rawDate);
                    if (isValid(date)) joinDate = date.toISOString().split('T')[0];
                }
            }

            const employeeData: Omit<Employee, 'id' | 'loginStatus'> = {
                name: row['Nama Lengkap'],
                email: row['Email']?.toLowerCase().trim(),
                phone: String(row['No. Telepon'] || ''),
                company: normalizedCompany,
                department: String(row['Departemen'] || ''),
                position: String(row['Jabatan'] || ''),
                level: row['Level Jabatan'] || 'Staff',
                reportsTo: row['ID Atasan'] || '',
                joinDate: joinDate,
                status: 'Aktif',
                role: (row['Role']?.toLowerCase() === 'manajemen' ? 'manajemen' : 'user'),
            };

            if (!employeeData.name || !employeeData.email || !employeeData.company) {
                failCount++;
                continue;
            }
            
            if (employeeData.role === 'user' && quotaInfo && quotaInfo.userLimitReached) {
                failCount++;
                continue;
            }
            if (employeeData.role === 'manajemen' && quotaInfo && quotaInfo.managementLimitReached) {
                failCount++;
                continue;
            }

            const result = await addUserAsAdmin(employeeData, false, true); 
            if (result.success) {
                successCount++;
            } else {
                failCount++;
            }
            await sleep(1500); 
        }
        
        await fetchData(true);

        toast({
            title: `Impor Selesai`,
            description: `${successCount} data berhasil diimpor. ${failCount} gagal (cek kuota atau data tidak lengkap).`,
        });
    } catch (e: any) {
        console.error("Import error:", e);
        toast({
            variant: "destructive",
            title: "Gagal Mengimpor",
            description: e.message || 'Terjadi kesalahan saat memproses file.'
        });
    } finally {
        setIsLoading(false);
        if (event.target) event.target.value = '';
    }
  };


  const getLoginStatusBadge = (status: LoginStatus) => {
    switch (status) {
        case "Active": return "bg-green-100 text-green-800 border-green-200";
        case "Invited": return "bg-yellow-100 text-yellow-800 border-yellow-200";
        case "No Login": return "bg-gray-100 text-gray-800 border-gray-200";
        default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  }

  const showCompanyFilter = userRole === 'superadmin' || isHoldingAdmin;

  return (
    <div className="space-y-6">
      <Card className="shadow-lg border-t-4 border-primary mb-6 overflow-hidden">
        <CardHeader className="bg-primary text-primary-foreground dark:bg-card">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
                <CardTitle className="font-headline text-lg sm:text-2xl flex items-center gap-3">
                    <Users className="h-6 w-6 text-primary-foreground" />
                    Data Karyawan
                </CardTitle>
                <CardDescription className="text-primary-foreground/80 dark:text-muted-foreground text-xs sm:text-sm">
                    Kelola data karyawan di perusahaan Anda. Menampilkan {filteredEmployees.length} data.
                </CardDescription>
            </div>
             <div className="flex flex-wrap items-center gap-2 shrink-0">
                {selectedRowIds.length > 0 && (
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-9 gap-1 bg-background/20 text-primary-foreground hover:bg-background/30 dark:bg-muted dark:text-foreground dark:hover:bg-muted/80">
                            <ChevronDown className="ml-1 h-3.5 w-3.5" />
                            Aksi Massal ({selectedRowIds.length})
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Pilih Aksi</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleBulkSendInvitation}>
                            <Send className="mr-2 h-4 w-4" />
                            Kirim Pembaruan Sandi / Aktivasi
                        </DropdownMenuItem>
                         <DropdownMenuItem onClick={() => handleBulkStatusChange("Aktif")}>Ubah Status ke Aktif</DropdownMenuItem>
                         <DropdownMenuItem onClick={() => handleBulkStatusChange("Tidak Aktif")}>Ubah Status ke Tidak Aktif</DropdownMenuItem>
                         <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive font-bold" onClick={openBulkDeleteDialog}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Hapus Pilihan
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                )}
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-9 gap-1 bg-background/20 text-primary-foreground hover:bg-background/30 dark:bg-muted dark:text-foreground dark:hover:bg-muted/80" disabled={quotaInfo?.userLimitReached && quotaInfo?.managementLimitReached}>
                             <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Impor/Ekspor</span>
                             <ChevronDown className="h-3.5 w-3.5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={handleImportClick}>
                            <Upload className="mr-2 h-4 w-4" /> Impor dari Excel
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleExport}>
                            <Download className="mr-2 h-4 w-4" /> Ekspor ke Excel
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleDownloadExample}>
                          <FileSpreadsheet className="mr-2 h-4 w-4" /> Unduh Contoh Format
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                 <input type="file" ref={fileInputRef} onChange={handleImport} accept=".xlsx, .xls" style={{ display: 'none' }} />

                <Button size="sm" className="h-9 gap-1 font-bold shadow-md" onClick={handleAddEmployee} disabled={quotaInfo?.userLimitReached && quotaInfo?.managementLimitReached}>
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Tambah Karyawan
                  </span>
                </Button>
             </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
            {quotaInfo?.message && (
                <Alert variant={quotaInfo.userLimitReached && quotaInfo.managementLimitReached ? "destructive" : "default"} className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs sm:text-sm">{quotaInfo.message}</AlertDescription>
                </Alert>
            )}
            <div className={cn(
              "grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 p-4 border rounded-lg bg-muted/30",
              showCompanyFilter ? "md:grid-cols-3" : "md:grid-cols-2"
            )}>
              {showCompanyFilter && (
                <Select value={filters.company} onValueChange={(value) => handleFilterChange('company', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter Perusahaan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Perusahaan</SelectItem>
                    {manageableCompanies.map(company => (
                      <SelectItem key={company.id} value={company.name}>{company.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Select value={filters.department} onValueChange={(value) => handleFilterChange('department', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter Departemen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Departemen</SelectItem>
                   {uniqueDepartmentOptions.map(department => (
                    <SelectItem key={department} value={department}>{department}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filters.position} onValueChange={(value) => handleFilterChange('position', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter Jabatan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Jabatan</SelectItem>
                  {uniquePositionOptions.map(position => (
                    <SelectItem key={position} value={position}>{position}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                      <Checkbox
                          checked={selectedRowIds.length > 0 && selectedRowIds.length === filteredEmployees.filter(e => e.id !== currentUser?.id).length && filteredEmployees.length > 1}
                          onCheckedChange={(checked) => handleSelectAll(checked)}
                          aria-label="Pilih semua"
                      />
                  </TableHead>
                  <TableHead>Karyawan</TableHead>
                  <TableHead className="hidden md:table-cell">Jabatan</TableHead>
                  <TableHead className="hidden lg:table-cell">Akses Modul</TableHead>
                  <TableHead className="hidden lg:table-cell">Status Akun</TableHead>
                  <TableHead className="hidden lg:table-cell">Status Login</TableHead>
                  <TableHead>
                    <span className="sr-only">Aksi</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((employee) => {
                  const accessedModules = Object.entries(employee.moduleAccess || {})
                      .filter(([_, enabled]) => enabled)
                      .map(([id]) => id);

                  return (
                    <TableRow key={employee.id} data-state={selectedRowIds.includes(employee.id) && "selected"}>
                        <TableCell>
                            <Checkbox
                                checked={selectedRowIds.includes(employee.id)}
                                onCheckedChange={() => handleRowSelect(employee.id)}
                                aria-label={`Pilih ${employee.name}`}
                                disabled={employee.id === currentUser?.id}
                            />
                        </TableCell>
                        <TableCell className="font-medium py-4">
                        <div className="flex items-center gap-3">
                            <div className="hidden h-9 w-9 sm:flex items-center justify-center rounded-full bg-muted">
                            <User className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div className="grid gap-0.5">
                            <span className="font-bold text-slate-900">{employee.name}</span>
                            <span className="text-xs text-muted-foreground sm:hidden font-medium">{employee.position}</span>
                            <span className="text-[10px] text-muted-foreground hidden sm:inline uppercase font-bold tracking-tight">{employee.email}</span>
                            </div>
                        </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-slate-600">{employee.position}</TableCell>
                        <TableCell className="hidden lg:table-cell">
                            <div className="flex flex-wrap gap-1">
                                {accessedModules.length > 0 ? accessedModules.map(m => (
                                    <Badge key={m} variant="secondary" className="text-[8px] h-4 uppercase font-bold px-1">{m}</Badge>
                                )) : <span className="text-[10px] text-muted-foreground italic">No Access</span>}
                            </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                        <Badge variant={employee.status === "Aktif" ? "default" : "outline"} className="text-[10px] uppercase font-black">
                            {employee.status}
                        </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                        <Badge variant="outline" className={cn("font-bold text-[10px] uppercase", getLoginStatusBadge(employee.loginStatus))}>
                            {employee.loginStatus}
                        </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost" className="rounded-full" disabled={isSendingInvitation === employee.email}>
                                {isSendingInvitation === employee.email ? <Loader2 className="size-4 animate-spin" /> : <MoreHorizontal className="size-4" />}
                                <span className="sr-only">Buka menu</span>
                            </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                            <DropdownMenuLabel className="text-[10px] uppercase font-black opacity-60">Aksi Karyawan</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => { setEmployeeForAccess(employee); setIsAccessDialogOpen(true); }}>
                                <Zap className="mr-2 h-4 w-4" /> Kelola Akses Modul
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditEmployee(employee)}>
                                <Pencil size={16} className="mr-2" /> Ubah Profil
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={async () => await handleSendInvitation(employee.email, employee.name)}>
                                <Send className="mr-2 h-4 w-4" />
                                Kirim Pembaruan Sandi / Aktivasi
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive font-bold" onClick={() => openDeleteDialog(employee)} disabled={employee.id === currentUser?.id}>
                                <Trash2 size={16} className="mr-2" /> Hapus Akun
                            </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <EmployeeFormSheet 
        isOpen={isSheetOpen} 
        onOpenChange={setSheetOpen} 
        employee={selectedEmployee} 
        onSave={handleSaveEmployee}
        onAdd={handleAdd}
        quotaInfo={quotaInfo as any}
      />

      <ModuleAccessDialog 
        isOpen={isAccessDialogOpen} 
        onOpenChange={setIsAccessDialogOpen} 
        employee={employeeForAccess} 
        company={userCompany || null} 
        allEmployees={employees} 
        onSave={handleSaveModuleAccess} 
      />

      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        itemName={employeesToDelete?.length === 1 ? employeesToDelete[0].name : `${employeesToDelete?.length} item`}
        itemType="karyawan"
      />
    </div>
  );
}
