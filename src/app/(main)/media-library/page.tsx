// src/app/(main)/media-library/page.tsx
"use client";

import { useState, useMemo, useRef } from "react";
import { useMasterData } from "@/contexts/master-data-context";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { storage } from "@/lib/firebase/client";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import type { MediaFile, MediaCategory } from "@/types";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

export default function MediaLibraryPage() {
  const { mediaFiles, addMediaFile, deleteMediaFile, companies } = useMasterData();
  const { currentUser, userRole } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<MediaCategory | "all">("all");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // --- Logic for visibility scoping ---
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

  const filteredMedia = useMemo(() => {
    let files = mediaFiles || [];

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
        const dateA = a.uploadedAt?.toDate?.() || new Date(0);
        const dateB = b.uploadedAt?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
    });
  }, [mediaFiles, searchTerm, categoryFilter, selectedCompanyId, companies]);

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
        toast({
          variant: "destructive",
          title: "Gagal Mengunggah",
          description: error.message,
        });
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
          uploadedAt: new Date(), // MasterDataProvider will use serverTimestamp
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
      case 'image': return <ImageIcon className="h-10 w-10 text-blue-500" />;
      case 'video': return <Video className="h-10 w-10 text-purple-500" />;
      case 'document': return <FileText className="h-10 w-10 text-amber-500" />;
      default: return <File className="h-10 w-10 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-lg border-t-4 border-primary">
        <CardHeader className="bg-primary text-primary-foreground dark:bg-card">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="font-headline text-2xl flex items-center gap-2">
                <ImageIcon />
                Media Library
              </CardTitle>
              <CardDescription className="text-primary-foreground/80 dark:text-muted-foreground">
                Kelola semua aset digital perusahaan Anda di satu tempat terpusat.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
              <Button 
                onClick={handleUploadClick} 
                disabled={isUploading}
                className="bg-background text-foreground hover:bg-background/90"
              >
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                Unggah File Baru
              </Button>
            </div>
          </div>
        </CardHeader>
        {isUploading && (
            <div className="px-6 py-4 bg-muted/20 border-b">
                <div className="flex justify-between items-center text-xs mb-2">
                    <span>Sedang mengunggah file...</span>
                    <span className="font-bold">{uploadProgress?.toFixed(0)}%</span>
                </div>
                <Progress value={uploadProgress || 0} className="h-1.5" />
            </div>
        )}
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama file..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
                <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as any)}>
                    <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Tipe File" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Semua Tipe</SelectItem>
                        <SelectItem value="image">Gambar</SelectItem>
                        <SelectItem value="video">Video</SelectItem>
                        <SelectItem value="document">Dokumen</SelectItem>
                        <SelectItem value="other">Lainnya</SelectItem>
                    </SelectContent>
                </Select>
                {(userRole === 'superadmin' || isHoldingAdmin) && (
                    <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Filter Perusahaan" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Perusahaan</SelectItem>
                            {manageableCompanies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                )}
            </div>
          </div>

          {filteredMedia.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredMedia.map((file) => (
                <Card key={file.id} className="group overflow-hidden flex flex-col border-muted hover:border-primary transition-colors">
                  <div className="relative aspect-video bg-muted/50 flex items-center justify-center overflow-hidden border-b">
                    {file.category === 'image' ? (
                      <img 
                        src={file.url} 
                        alt={file.name} 
                        className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        {getFileIcon(file.category)}
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">{file.type.split('/')[1]}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full" onClick={() => window.open(file.url, '_blank')}>
                            <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full" onClick={() => copyToClipboard(file.url)}>
                            <Copy className="h-4 w-4" />
                        </Button>
                    </div>
                  </div>
                  <CardHeader className="p-3 pb-0 space-y-1">
                    <CardTitle className="text-sm truncate" title={file.name}>
                      {file.name}
                    </CardTitle>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>{formatSize(file.size)}</span>
                        <span>{file.uploadedAt?.toDate ? format(file.uploadedAt.toDate(), "d MMM yyyy", { locale: localeId }) : ''}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 pt-2 flex-grow">
                     <div className="flex items-center gap-1.5 mt-1">
                        <Badge variant="outline" className="text-[9px] px-1.5 h-4">{file.category}</Badge>
                        {(userRole === 'superadmin' || isHoldingAdmin) && (
                            <Badge variant="secondary" className="text-[9px] px-1.5 h-4 truncate max-w-[100px]">{file.company}</Badge>
                        )}
                     </div>
                  </CardContent>
                  <CardFooter className="p-3 pt-0 border-t bg-muted/10">
                    <div className="flex items-center justify-between w-full">
                        <span className="text-[9px] text-muted-foreground">Oleh: {file.uploadedByName || 'System'}</span>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => window.open(file.url, '_blank')}>
                                    <ExternalLink className="h-4 w-4 mr-2" /> Buka File
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => copyToClipboard(file.url)}>
                                    <Copy className="h-4 w-4 mr-2" /> Salin URL
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                    className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                                    onClick={() => handleDeleteFile(file)}
                                >
                                    <Trash2 className="h-4 w-4 mr-2" /> Hapus File
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-xl">
              <ImageIcon className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground font-medium">Belum ada file media yang ditemukan.</p>
              <p className="text-sm text-muted-foreground/60">Gunakan tombol unggah untuk menambahkan aset pertama Anda.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
