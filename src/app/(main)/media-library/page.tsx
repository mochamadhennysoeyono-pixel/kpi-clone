// src/app/(main)/media-library/page.tsx
"use client";

import { useState, useMemo, useRef } from "react";
import { useMasterData } from "@/contexts/master-data-context";
import { useAuth } from "@/contexts/auth-context";
import { 
  Upload, 
  Search, 
  MoreHorizontal, 
  FileText, 
  Image as ImageIcon, 
  Video, 
  File, 
  Trash2, 
  Copy, 
  ExternalLink, 
  Loader2, 
  Filter, 
  Eye,
  Building,
  History
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { storage } from "@/lib/firebase/client";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import type { MediaFile, MediaCategory, Company } from "@/types";
import { Progress } from "@/components/ui/progress";
import { format, isValid } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { 
    ResponsivePage, 
    ResponsiveToolbar 
} from "@/components/ui/adaptive-layout";
import { PageHeader } from "@/components/ui/page-header";
import { 
    AdaptiveCardGrid, 
} from "@/components/ui/adaptive-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { cn } from "@/lib/utils";

export default function MediaLibraryPage() {
  const { mediaFiles, addMediaFile, deleteMediaFile, companies } = useMasterData();
  const { currentUser, userRole } = useAuth();
  const { toast } = useToast();
  const { isMobile } = useBreakpoint();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<MediaCategory | "all">("all");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const userCompany = useMemo(() => companies.find(c => c.name === currentUser?.company), [companies, currentUser]);
  const isHoldingAdmin = useMemo(() => userRole === 'manajemen' && !!userCompany?.isHolding, [userRole, userCompany]);

  const manageableCompanies = useMemo(() => {
    if (userRole === 'superadmin') return companies.filter(c => c.status === 'Aktif');
    if (isHoldingAdmin && userCompany) {
      const getChildCompanies = (parentId: string): any[] => {
        const children = companies.filter(c => c.parentId === parentId);
        return [...children, ...children.flatMap(c => getChildCompanies(c.id))];
      };
      return [userCompany, ...getChildCompanies(userCompany.id)];
    }
    if (userCompany) return [userCompany];
    return [];
  }, [userRole, isHoldingAdmin, userCompany, companies]);

  // --- STRICT DATA ISOLATION ---
  const manageableCompanyNames = useMemo(() => {
    return new Set(manageableCompanies.map(c => c.name));
  }, [manageableCompanies]);

  const filteredMedia = useMemo(() => {
    let files = mediaFiles || [];

    // FILTER: Hanya tampilkan data milik perusahaan yang dikelola (Sembunyikan GLOBAL untuk non-superadmin)
    if (userRole !== 'superadmin') {
      files = files.filter(f => manageableCompanyNames.has(f.company));
    }

    if (searchTerm) {
      files = files.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (categoryFilter !== "all") {
      files = files.filter(f => f.category === categoryFilter);
    }
    if (selectedCompanyId !== "all") {
        const companyName = companies.find(c => c.id === selectedCompanyId)?.name;
        files = files.filter(f => f.company === companyName);
    }

    return files.sort((a, b) => {
        const dateA = a.uploadedAt?.toDate ? a.uploadedAt.toDate() : (a.uploadedAt ? new Date(a.uploadedAt) : new Date(0));
        const dateB = b.uploadedAt?.toDate ? b.uploadedAt.toDate() : (b.uploadedAt ? new Date(b.uploadedAt) : new Date(0));
        return dateB.getTime() - dateA.getTime();
    });
  }, [mediaFiles, searchTerm, categoryFilter, selectedCompanyId, companies, userRole, manageableCompanyNames]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const getCategoryFromMime = (type: string): MediaCategory => {
    if (type.startsWith('image/')) return 'image';
    if (type.startsWith('video/')) return 'video';
    if (type.includes('pdf') || type.includes('word') || type.includes('excel') || type.includes('spreadsheet') || type.includes('presentation')) return 'document';
    return 'other';
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    setIsUploading(true);
    setUploadProgress(0);

    const storagePath = `media_library/${currentUser.company}/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        console.error("Upload error:", error);
        toast({ variant: "destructive", title: "Gagal Mengunggah", description: error.message });
        setIsUploading(false);
        setUploadProgress(null);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        const mediaFileData: Omit<MediaFile, 'id'> = {
          name: file.name,
          url: downloadURL,
          storagePath: storagePath,
          type: file.type,
          size: file.size,
          category: getCategoryFromMime(file.type),
          company: currentUser.company,
          uploadedBy: currentUser.id,
          uploadedByName: currentUser.name,
          uploadedAt: new Date(),
        };

        try {
          await addMediaFile(mediaFileData);
          toast({ title: "Berhasil", description: "File telah diunggah ke pustaka media." });
        } catch (err: any) {
          toast({ variant: "destructive", title: "Gagal Menyimpan Metadata", description: err.message });
        } finally {
          setIsUploading(false);
          setUploadProgress(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      }
    );
  };

  const handleDeleteFile = async (mediaFile: MediaFile) => {
    try {
      const storageRef = ref(storage, mediaFile.storagePath);
      await deleteObject(storageRef).catch(e => console.warn("File not found in storage, deleting metadata only."));
      await deleteMediaFile(mediaFile.id);
      toast({ title: "Dihapus", description: "File telah dihapus dari pustaka." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Gagal Menghapus", description: error.message });
    }
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: "Link Disalin", description: "URL media telah disalin ke clipboard." });
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (category: MediaCategory) => {
    switch (category) {
      case 'image': return <ImageIcon className="size-8 sm:size-10 text-blue-500" />;
      case 'video': return <Video className="size-8 sm:size-10 text-purple-500" />;
      case 'document': return <FileText className="size-8 sm:size-10 text-amber-500" />;
      default: return <File className="size-8 sm:size-10 text-slate-500" />;
    }
  };

  return (
    <ResponsivePage>
      <PageHeader 
        title="Media Library"
        description="Kelola seluruh aset digital perusahaan Anda di satu tempat terpusat yang terorganisir."
        icon={ImageIcon}
        actions={
          <>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            <Button 
                onClick={handleUploadClick} 
                disabled={isUploading}
                className="font-bold shadow-lg h-9 sm:h-10"
            >
                {isUploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                Unggah File Baru
            </Button>
          </>
        }
      />

      {isUploading && (
        <Card className="border-primary/20 bg-primary/5 animate-pulse overflow-hidden">
            <CardContent className="p-4 sm:p-6">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-primary mb-2">
                    <span>Sedang mengunggah berkas...</span>
                    <span>{uploadProgress?.toFixed(0)}%</span>
                </div>
                <Progress value={uploadProgress || 0} className="h-1.5" />
            </CardContent>
        </Card>
      )}

      <ResponsiveToolbar>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama file..."
            className="pl-9 h-10 border-none shadow-none bg-background/50 focus-visible:ring-primary/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
            <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as any)}>
                <SelectTrigger className="w-full sm:w-[160px] h-10 bg-background border-none">
                    <Filter className="size-4 mr-2 text-primary" />
                    <SelectValue placeholder="Tipe File" />
                </SelectTrigger>
                <SelectContent className="z-[350]">
                    <SelectItem value="all">Semua Tipe</SelectItem>
                    <SelectItem value="image">Gambar</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="document">Dokumen</SelectItem>
                    <SelectItem value="other">Lainnya</SelectItem>
                </SelectContent>
            </Select>
            {(userRole === 'superadmin' || isHoldingAdmin) && (
                <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                    <SelectTrigger className="w-full sm:w-[200px] h-10 bg-background border-none">
                        <Building className="size-4 mr-2 text-primary" />
                        <SelectValue placeholder="Perusahaan" />
                    </SelectTrigger>
                    <SelectContent className="z-[350]">
                        <SelectItem value="all">Semua Klien</SelectItem>
                        {manageableCompanies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            )}
        </div>
      </ResponsiveToolbar>

      <div className="pt-4">
        {filteredMedia.length > 0 ? (
            <AdaptiveCardGrid complexity="medium">
              {filteredMedia.map((file) => (
                <Card key={file.id} className="group overflow-hidden flex flex-col border-border/40 hover:shadow-md transition-all bg-background animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="relative aspect-video bg-muted/30 flex items-center justify-center overflow-hidden border-b border-border/40">
                    {file.category === 'image' ? (
                      <img 
                        src={file.url} 
                        alt={file.name} 
                        className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        {getFileIcon(file.category)}
                        <span className="text-[8px] font-black uppercase text-muted-foreground bg-muted p-1 px-2 rounded-full border">{file.type.split('/')[1] || 'FILE'}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[2px]">
                        <Button size="icon" variant="secondary" className="h-9 w-9 rounded-xl shadow-xl active:scale-90 transition-all" onClick={() => window.open(file.url, '_blank')}>
                            <Eye className="size-4" />
                        </Button>
                        <Button size="icon" variant="secondary" className="h-9 w-9 rounded-xl shadow-xl active:scale-90 transition-all" onClick={() => copyToClipboard(file.url)}>
                            <Copy className="size-4" />
                        </Button>
                    </div>
                  </div>
                  <CardHeader className={isMobile ? "p-3 pb-1" : "p-4 pb-1"}>
                    <CardTitle className="text-xs font-black truncate text-slate-800" title={file.name}>
                      {file.name}
                    </CardTitle>
                    <div className="flex items-center justify-between text-[9px] font-bold text-muted-foreground uppercase tracking-tight">
                        <span className="flex items-center gap-1"><History size={10} className="opacity-40" /> {file.uploadedAt?.toDate ? format(file.uploadedAt.toDate(), "d MMM yy", { locale: localeId }) : ''}</span>
                        <span>{formatSize(file.size)}</span>
                    </div>
                  </CardHeader>
                  <CardContent className={cn("flex-grow pt-2", isMobile ? "p-3" : "p-4")}>
                     <div className="flex flex-wrap gap-1">
                        <Badge variant="outline" className="text-[8px] font-black uppercase h-4 px-1.5 border-none bg-primary/5 text-primary">{file.category}</Badge>
                        {(userRole === 'superadmin' || isHoldingAdmin) && (
                            <Badge variant="outline" className="text-[8px] font-bold h-4 px-1.5 border-none bg-muted/50 max-w-[120px] truncate">{file.company}</Badge>
                        )}
                     </div>
                  </CardContent>
                  <CardFooter className={cn("border-t bg-muted/5 flex items-center justify-between", isMobile ? "p-2 px-3" : "p-3 px-4")}>
                    <span className="text-[8px] font-black text-muted-foreground uppercase tracking-tighter truncate max-w-[150px]">Oleh: {file.uploadedByName || 'System'}</span>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full"><MoreHorizontal size={14} /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="z-[350]">
                            <DropdownMenuLabel className="text-[10px] font-black uppercase opacity-60">Aset Media</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => window.open(file.url, '_blank')}>
                                <ExternalLink className="size-3.5 mr-2" /> Buka Berkas
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => copyToClipboard(file.url)}>
                                <Copy className="size-3.5 mr-2" /> Salin URL
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                                className="text-destructive font-bold focus:bg-destructive/10 focus:text-destructive"
                                onClick={() => handleDeleteFile(file)}
                            >
                                <Trash2 className="size-3.5 mr-2" /> Hapus Permanen
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                  </CardFooter>
                </Card>
              ))}
            </AdaptiveCardGrid>
        ) : (
            <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed rounded-3xl bg-muted/10">
              <div className="p-4 bg-muted rounded-2xl mb-4 opacity-20">
                 <ImageIcon size={48} />
              </div>
              <p className="text-slate-900 font-black uppercase text-[10px] tracking-[0.2em]">Pustaka Kosong</p>
              <p className="text-xs text-muted-foreground mt-2 max-w-[250px] text-center font-medium">Belum ada berkas media yang diunggah untuk kriteria pencarian ini.</p>
            </div>
        )}
      </div>
    </ResponsivePage>
  );
}
