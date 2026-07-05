// src/components/master-data/employees/employee-form-sheet.tsx
"use client";

import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import type { Employee, LoginStatus, Company } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMasterData } from '@/contexts/master-data-context';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';

const employeeSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Nama harus diisi"),
  email: z.string().email("Format email tidak valid"),
  phone: z.string().optional(),
  company: z.string().optional(),
  position: z.string().optional(),
  department: z.string().optional(),
  level: z.enum(['Staff', 'Supervisor', 'Manager', 'Direktur']).optional(),
  reportsTo: z.string().optional().nullable(),
  joinDate: z.string().optional(),
  status: z.enum(['Aktif', 'Tidak Aktif']),
  role: z.enum(['user', 'manajemen', 'superadmin']).default('user'),
});

type EmployeeFormValues = z.infer<typeof employeeSchema>;

interface EmployeeFormSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  employee?: Partial<Employee>;
  onSave: (id: string, data: Omit<Employee, 'id' | 'loginStatus' | 'password'>) => void;
  onAdd: (data: Omit<Employee, 'id' | 'loginStatus'>) => void;
  quotaInfo?: { 
    userLimitReached: boolean; 
    managementLimitReached: boolean; 
    message: string;
    limits: { user: number; mgmt: number };
    currentUsage: { user: number; mgmt: number };
  } | null;
}

export function EmployeeFormSheet({ 
  isOpen, 
  onOpenChange, 
  employee, 
  onSave,
  onAdd,
  quotaInfo,
}: EmployeeFormSheetProps) {
  const { companies, departments, positions, employees: allEmployees } = useMasterData();
  const { currentUser, userRole } = useAuth();
  
  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      id: '',
      name: '',
      email: '',
      phone: '',
      company: '',
      position: '',
      department: '',
      level: 'Staff',
      reportsTo: '',
      joinDate: '',
      status: 'Aktif',
      role: 'user',
    },
  });

  const watchedRole = form.watch('role');
  const companyForForm = form.watch('company');
  const departmentForForm = form.watch('department');
  const levelForForm = form.watch('level');

  const isManagementForm = watchedRole === 'manajemen';
  const isSuperadminForm = watchedRole === 'superadmin';

  const userCompany = useMemo(() => {
    return companies.find(c => c.name === currentUser?.company);
  }, [companies, currentUser]);
  
  const isHoldingAdmin = useMemo(() => userRole === 'manajemen' && !!userCompany?.isHolding, [userRole, userCompany]);

  const manageableCompanies = useMemo(() => {
    if (userRole === 'superadmin') {
      return companies.filter(c => c.status === 'Aktif');
    }
    if (!userCompany) return [];
    
    if (userCompany.isHolding) {
      const getChildCompanies = (parentId: string): Company[] => {
        const children = companies.filter(c => c.parentId === parentId);
        return [...children, ...children.flatMap(c => getChildCompanies(c.id))];
      };
      return [userCompany, ...getChildCompanies(userCompany.id)].filter(c => c.status === 'Aktif');
    }
    return [userCompany].filter(c => c.status === 'Aktif');
  }, [userRole, companies, userCompany]);
  
  const canChangeCompany = useMemo(() => {
    if (userRole === 'superadmin') return true;
    if (userRole === 'manajemen' && isHoldingAdmin) return true;
    return false;
  }, [userRole, isHoldingAdmin]);

  const departmentOptions = useMemo(() => {
    if (!companyForForm) return [];
    return departments.filter(d => d.company === companyForForm);
  }, [departments, companyForForm]);

  const positionOptions = useMemo(() => {
    if (!departmentForForm) return [];
    return positions.filter(p => p.company === companyForForm && p.department === departmentForForm);
  }, [positions, companyForForm, departmentForForm]);

  const supervisorOptions = useMemo(() => {
    if (!companyForForm || isManagementForm || isSuperadminForm) return [];
    
    let superiorLevels: Array<Employee['level']> = [];
    if (levelForForm === 'Staff') superiorLevels = ['Supervisor', 'Manager', 'Direktur'];
    else if (levelForForm === 'Supervisor') superiorLevels = ['Manager', 'Direktur'];
    else if (levelForForm === 'Manager') superiorLevels = ['Direktur'];
    
    if (superiorLevels.length === 0) return [];

    return allEmployees.filter(e => {
        const isSameCompany = e.company === companyForForm;
        const isSuperior = superiorLevels.includes(e.level);
        const isActive = e.status === 'Aktif';
        const isNotSelf = e.id !== employee?.id;

        if (levelForForm === 'Manager') {
            return isSameCompany && isSuperior && isActive && isNotSelf;
        } else {
            const isSameDepartment = e.department === departmentForForm;
            return isSameCompany && isSameDepartment && isSuperior && isActive && isNotSelf;
        }
    });
  }, [allEmployees, companyForForm, departmentForForm, levelForForm, employee, isManagementForm, isSuperadminForm]);
  
  useEffect(() => {
    if (isOpen) {
      if (employee) {
        form.reset({
          ...employee,
          phone: employee.phone || '',
          role: employee.role || 'user',
        } as any);
      } else {
        const defaultCompany = (userRole !== 'superadmin' && currentUser) ? currentUser?.company || '' : '';
        form.reset({
          id: undefined,
          name: '',
          email: '',
          phone: '',
          company: defaultCompany,
          position: '',
          department: '',
          level: 'Staff',
          reportsTo: '',
          joinDate: new Date().toISOString().split('T')[0],
          status: 'Aktif',
          role: 'user',
        });
      }
    }
  }, [employee, form, isOpen, userRole, currentUser]);

  const onSubmit = (data: EmployeeFormValues) => {
    const dataToSave = { 
        ...data,
        reportsTo: data.reportsTo || '',
    } as Omit<Employee, 'id' | 'loginStatus'> & { id?: string };
    
    if (data.id) {
      onSave(data.id, dataToSave);
    } else {
       delete (dataToSave as Partial<EmployeeFormValues>).id;
       onAdd(dataToSave);
    }
    onOpenChange(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg w-full flex flex-col h-full z-[250]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
            <SheetHeader>
              <SheetTitle>
                  {isSuperadminForm 
                    ? (employee?.id ? 'Ubah Data Superadmin' : 'Tambah Superadmin Baru')
                    : isManagementForm 
                    ? (employee?.id ? 'Ubah Akun Manajemen' : 'Tambah Admin Baru')
                    : (employee?.id ? 'Ubah Data Karyawan' : 'Tambah Karyawan Baru')
                  }
              </SheetTitle>
              <SheetDescription>
                {isSuperadminForm
                  ? "Menambahkan akun dengan otoritas penuh ke seluruh sistem dan data klien."
                  : isManagementForm 
                  ? "Lengkapi formulir ini untuk menambahkan rekan tim Manajemen yang akan membantu mengelola dashboard perusahaan."
                  : "Lengkapi formulir di bawah ini. Akun yang dibuat melalui menu ini otomatis memiliki peran Staff (User)."
                }
              </SheetDescription>
            </SheetHeader>
            <ScrollArea className="flex-1 py-4 px-1 -mx-1">
              <div className="space-y-4 px-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Lengkap</FormLabel>
                      <FormControl>
                        <Input placeholder="cth., Budi Santoso" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input 
                              type="email" 
                              placeholder="cth., budi@contoh.com" 
                              {...field} 
                              disabled={!!employee?.id}
                              className={!!employee?.id ? "bg-muted/50 cursor-not-allowed" : ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nomor WhatsApp</FormLabel>
                          <FormControl>
                            <Input placeholder="cth., 08123456789" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </div>
                
                {!isSuperadminForm && (
                  <FormField
                    control={form.control}
                    name="company"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Perusahaan</FormLabel>
                        <Select 
                            onValueChange={(val) => {
                                field.onChange(val);
                                form.setValue('department', '');
                                form.setValue('position', '');
                                form.setValue('reportsTo', '');
                            }} 
                            value={field.value} 
                            disabled={!canChangeCompany && !!employee?.id}
                        >
                            <FormControl>
                              <SelectTrigger className={(!canChangeCompany && !!employee?.id) ? "bg-muted/50 cursor-not-allowed" : ""}>
                                <SelectValue placeholder="Pilih perusahaan" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {manageableCompanies.map(c => (
                                  <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {!isManagementForm && !isSuperadminForm && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                        control={form.control}
                        name="department"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Departemen</FormLabel>
                            <Select 
                                onValueChange={(value) => {
                                    field.onChange(value);
                                    form.setValue('position', '');
                                    form.setValue('reportsTo', '');
                                }}
                                value={field.value}
                                disabled={!companyForForm}
                            >
                                <FormControl>
                                    <SelectTrigger>
                                    <SelectValue placeholder="Pilih departemen" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {departmentOptions.map(d => (
                                        <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                                    ))}
                                </SelectContent>
                                </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="position"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Jabatan</FormLabel>
                            <Select 
                                onValueChange={field.onChange} 
                                value={field.value}
                                disabled={!departmentForForm}
                            >
                                <FormControl>
                                    <SelectTrigger>
                                    <SelectValue placeholder="Pilih jabatan" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {positionOptions.map(p => (
                                        <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                                </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    </div>
                    <FormField
                    control={form.control}
                    name="level"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Level Jabatan</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Pilih level jabatan" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            <SelectItem value="Staff">Staff</SelectItem>
                            <SelectItem value="Supervisor">Supervisor</SelectItem>
                            <SelectItem value="Manager">Manager</SelectItem>
                            <SelectItem value="Direktur">Direktur</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    {levelForForm !== 'Direktur' && (
                        <FormField
                            control={form.control}
                            name="reportsTo"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Melapor Kepada (Atasan)</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value ?? ""} disabled={supervisorOptions.length === 0}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder={supervisorOptions.length > 0 ? "Pilih atasan" : "Tidak ada atasan tersedia"} />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {supervisorOptions.map(sup => (
                                            <SelectItem key={sup.id} value={sup.id}>{sup.name} ({sup.level})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}
                    <FormField
                    control={form.control}
                    name="joinDate"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Tanggal Bergabung</FormLabel>
                        <FormControl>
                            <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                  </>
                )}

                 <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status Akun</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Pilih status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Aktif">Aktif</SelectItem>
                              <SelectItem value="Tidak Aktif">Tidak Aktif</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
              </div>
            </ScrollArea>
            <SheetFooter className="mt-auto pt-6">
              <SheetClose asChild>
                <Button type="button" variant="outline">
                  Batal
                </Button>
              </SheetClose>
              <Button type="submit">
                  {employee?.id ? 'Simpan Perubahan' : 'Simpan Data'}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
