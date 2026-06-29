// src/app/(main)/document-management/templates/[templateId]/page.tsx
"use client";

import * as React from 'react';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useMasterData } from '@/contexts/master-data-context';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { DocumentTemplate, DocumentPage } from '@/types';
import { doc, getDoc } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase/client';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Skeleton } from '@/components/ui/skeleton';
import { TableCustomizationDialog } from '@/components/documents/table-customization-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Slider } from '@/components/ui/slider';
import NextLink from 'next/link';
import {
    Loader2, ChevronLeft, Save, Bold, Italic, Underline as UnderlineIcon, AlignLeft, AlignCenter, AlignRight, RectangleHorizontal, RectangleVertical, Search, Image as ImageIcon, Table as TableIcon, History, X, Strikethrough, Highlighter, Palette, List, ListOrdered, Pilcrow, Heading, Heading1, Heading2, Heading3, Link as LinkIcon, Code, Baseline, Pin, Book, AlignJustify, WrapText, PanelLeft, PanelRight, ZoomIn, ZoomOut, PlusCircle, ExternalLink
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

// Dynamically import Tiptap editor components only on the client-side
const EditorContent = dynamic(() => import('@tiptap/react').then(mod => mod.EditorContent), { ssr: false, loading: () => <Skeleton className="w-full h-full" /> });
const useEditor = dynamic(() => import('@tiptap/react').then(mod => mod.useEditor), { ssr: false });

const StarterKit = dynamic(() => import('@tiptap/starter-kit'), { ssr: false });
const Color = dynamic(() => import('@tiptap/extension-color').then(mod => mod.Color), { ssr: false });
const TextStyle = dynamic(() => import('@tiptap/extension-text-style'), { ssr: false });
const Table = dynamic(() => import('@tiptap/extension-table'), { ssr: false });
const TableCell = dynamic(() => import('@tiptap/extension-table-cell'), { ssr: false });
const TableHeader = dynamic(() => import('@tiptap/extension-table-header'), { ssr: false });
const TableRow = dynamic(() => import('@tiptap/extension-table-row'), { ssr: false });
const TextAlign = dynamic(() => import('@tiptap/extension-text-align'), { ssr: false });
const Underline = dynamic(() => import('@tiptap/extension-underline'), { ssr: false });
const Highlight = dynamic(() => import('@tiptap/extension-highlight'), { ssr: false });
const LinkExtension = dynamic(() => import('@tiptap/extension-link'), { ssr: false });
const FontFamily = dynamic(() => import('@tiptap/extension-font-family').then(mod => mod.FontFamily), { ssr: false });


const paperSizes = {
  A4: { width: 794, height: 1123 },
  Letter: { width: 816, height: 1056 },
  Legal: { width: 816, height: 1344 },
};

type PaperSize = keyof typeof paperSizes;
type Orientation = "portrait" | "landscape";
type HeaderLayout = 'standard' | 'minimalist' | 'headerFocus';

// --- Left Sidebar ---
function LeftSidebar({ paperSize, setPaperSize, orientation, setOrientation, activeLayout, setActiveLayout, className }: { paperSize: PaperSize, setPaperSize: (s: PaperSize) => void, orientation: Orientation, setOrientation: (o: Orientation) => void, activeLayout: HeaderLayout, setActiveLayout: (l: HeaderLayout) => void, className?: string }) {

    const layouts = [
        { id: 'standard', name: 'Standard' },
        { id: 'minimalist', name: 'Minimalist' },
        { id: 'headerFocus', name: 'Header Focus' }
    ];

    const LayoutPreview = ({ isActive, type }: { isActive: boolean, type: HeaderLayout }) => {
      const standardLayout = ( // Logo Left, Info Right
        <>
          <div className={cn("h-4 w-full rounded-sm flex justify-between items-start", isActive ? "bg-primary/10" : "bg-muted")}>
            <div className={cn("h-3 w-4 rounded-sm", isActive ? "bg-primary" : "bg-muted-foreground/50")}></div>
             <div className="w-1/2 h-full space-y-0.5 text-right flex flex-col items-end">
                <div className={cn("h-1 w-full rounded-full", isActive ? "bg-primary/50" : "bg-muted-foreground/30")}></div>
                <div className={cn("h-1 w-2/3 rounded-full", isActive ? "bg-primary/50" : "bg-muted-foreground/30")}></div>
            </div>
          </div>
          <div className="space-y-1 pt-2">
            {[...Array(4)].map((_, i) => <div key={i} className="h-1 bg-muted-foreground/30 w-full rounded-full"></div>)}
            <div className="h-1 bg-muted-foreground/30 w-3/4 rounded-full"></div>
          </div>
        </>
      );
      const minimalLayout = ( // Logo Right, Info Left
         <>
          <div className={cn("h-4 w-full rounded-sm flex justify-between items-start", isActive ? "bg-primary/10" : "bg-muted")}>
            <div className="w-1/2 h-full space-y-0.5">
                <div className={cn("h-1 w-full rounded-full", isActive ? "bg-primary/50" : "bg-muted-foreground/30")}></div>
                <div className={cn("h-1 w-2/3 rounded-full", isActive ? "bg-primary/50" : "bg-muted-foreground/30")}></div>
            </div>
            <div className={cn("h-3 w-4 rounded-sm", isActive ? "bg-primary" : "bg-muted-foreground/50")}></div>
          </div>
          <div className="space-y-1 pt-2">
            {[...Array(4)].map((_, i) => <div key={i} className="h-1 bg-muted-foreground/30 w-full rounded-full"></div>)}
            <div className="h-1 bg-muted-foreground/30 w-3/4 rounded-full"></div>
          </div>
        </>
      );
      const headerFocusLayout = ( // Centered logo
         <>
          <div className={cn("h-8 w-full rounded-sm flex flex-col items-center justify-center space-y-1 p-1", isActive ? "bg-primary/10" : "bg-muted")}>
            <div className={cn("h-3 w-5 rounded-sm", isActive ? "bg-primary" : "bg-muted-foreground/50")}></div>
            <div className={cn("h-1 w-3/4 rounded-full", isActive ? "bg-primary/50" : "bg-muted-foreground/30")}></div>
          </div>
          <div className="space-y-1 pt-2">
            {[...Array(3)].map((_, i) => <div key={i} className="h-1 bg-muted-foreground/30 w-full rounded-full"></div>)}
            <div className="h-1 bg-muted-foreground/30 w-1/2 rounded-full"></div>
          </div>
        </>
      );

      const getLayout = () => {
          switch(type) {
              case 'minimalist': return minimalLayout;
              case 'headerFocus': return headerFocusLayout;
              default: return standardLayout;
          }
      }

      return (
        <div className={cn("bg-background border rounded p-1.5 space-y-1 w-20 h-28 cursor-pointer flex flex-col justify-start", isActive ? "border-primary ring-2 ring-primary" : "border-border")} onClick={() => setActiveLayout(type)}>
          {getLayout()}
        </div>
      );
    };

    return (
        <aside className={cn("w-72 bg-background border-r flex flex-col p-4 space-y-6", className)}>
            <div>
                <h3 className="text-base font-semibold mb-3">Insert Elements</h3>
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search elements..." className="pl-8" />
                </div>
            </div>
            <div className="space-y-4">
                <div>
                    <h4 className="text-xs font-semibold text-muted-foreground mb-2">PLACEHOLDERS</h4>
                    <div className="space-y-1 text-sm">
                        <div className="p-2 hover:bg-muted rounded-md cursor-pointer">[Employee Name]</div>
                        <div className="p-2 hover:bg-muted rounded-md cursor-pointer">[Start Date]</div>
                    </div>
                </div>
                 <div>
                    <h4 className="text-xs font-semibold text-muted-foreground mb-2">COMPONENTS</h4>
                    <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2 p-2 hover:bg-muted rounded-md cursor-pointer"><ImageIcon className="h-4 w-4" /> Image/Logo</div>
                        <div className="flex items-center gap-2 p-2 hover:bg-muted rounded-md cursor-pointer"><TableIcon className="h-4 w-4" /> Table</div>
                    </div>
                </div>
            </div>

            <div className="mt-auto space-y-4">
                 <div className='space-y-2'>
                    <h3 className="text-base font-semibold">Document layout</h3>
                     <div className="flex justify-between items-center gap-2">
                        {layouts.map(layout => (
                            <div key={layout.id}>
                                <LayoutPreview isActive={activeLayout === layout.id} type={layout.id as HeaderLayout}/>
                            </div>
                        ))}
                    </div>
                 </div>

                 <h3 className="text-base font-semibold">Document Settings</h3>
                 <div>
                    <Label htmlFor="paper-size" className="text-xs font-semibold text-muted-foreground">Paper Size</Label>
                    <Select value={paperSize} onValueChange={(v) => setPaperSize(v as PaperSize)}>
                        <SelectTrigger id="paper-size" className="w-full mt-1">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="A4">A4</SelectItem>
                            <SelectItem value="Letter">Letter</SelectItem>
                            <SelectItem value="Legal">Legal</SelectItem>
                        </SelectContent>
                    </Select>
                 </div>
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground">Orientation</Label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                        <Button variant={orientation === 'portrait' ? 'secondary' : 'outline'} onClick={() => setOrientation('portrait')}>
                            <RectangleVertical className="mr-2 h-4 w-4" /> Portrait
                        </Button>
                         <Button variant={orientation === 'landscape' ? 'secondary' : 'outline'} onClick={() => setOrientation('landscape')}>
                            <RectangleHorizontal className="mr-2 h-4 w-4" /> Landscape
                         </Button>
                    </div>
                 </div>
            </div>
        </aside>
    )
}

// --- Right Sidebar ---
function RightSidebar({ isHistoryOpen, setIsHistoryOpen, className }: { isHistoryOpen: boolean, setIsHistoryOpen: (open: boolean) => void, className?: string }) {
    const revisionHistory = [
        { version: 'v3 (Current)', editor: 'Budi', time: '2023-10-27 10:30 AM', avatar: '/avatars/01.png' },
        { version: 'v2', editor: 'Ani', time: '2023-10-26 03:45 PM', avatar: '/avatars/02.png' },
        { version: 'v1', editor: 'Citra', time: '2023-10-25 09:15 AM', avatar: '/avatars/03.png' }
    ];
    
    return (
        <aside className={cn("w-72 bg-background border-l flex flex-col", className)}>
            <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-base font-semibold">Revision History</h3>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsHistoryOpen(false)}>
                    <X className="h-4 w-4" />
                </Button>
            </div>
            <div className="flex-1 p-4 space-y-3">
                {revisionHistory.map(rev => (
                    <div key={rev.version} className={cn("p-3 rounded-lg border cursor-pointer", rev.version.includes('Current') && "bg-primary/10 border-primary")}>
                        <div className="flex justify-between items-center text-sm font-semibold">
                            <p>{rev.version}</p>
                            <p className="text-xs text-muted-foreground font-normal">{rev.time}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs">
                            <Avatar className="h-5 w-5">
                                <AvatarImage src={rev.avatar} alt={rev.editor} />
                                <AvatarFallback>{rev.editor.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <p>Edited by {rev.editor}</p>
                        </div>
                    </div>
                ))}
            </div>
            <div className="p-4 border-t space-y-4">
                 <div className="text-sm">
                    <p className="font-semibold">Comparing v2 with v3</p>
                    <Button variant="link" className="p-0 h-auto text-primary">Clear Selection</Button>
                 </div>
                 <Button className="w-full" variant="outline">
                    <History className="mr-2 h-4 w-4" />
                    Restore to this version
                 </Button>
            </div>
        </aside>
    )
}

const fonts = [
    { name: 'Inter', value: 'Inter' },
    { name: 'Arial', value: 'Arial' },
    { name: 'Jost', value: 'Jost' },
    { name: 'Poppins', value: 'Poppins' },
    { name: 'Roboto', value: 'Roboto' },
    { name: 'Open Sans', value: 'Open Sans' },
    { name: 'Times New Roman', value: 'Times New Roman' },
];

const fontSizes = ['10', '12', '14', '16', '18', '24', '30', '36', '48'];

// --- Main Editor Page ---
export default function EditTemplatePage() {
  const params = useParams();
  const router = useRouter();
  const { updateDocumentTemplate } = useMasterData();
  const templateId = params.templateId as string;
  
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [template, setTemplate] = useState<DocumentTemplate | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // States for header/footer and layout
  const [headerLayout, setHeaderLayout] = useState<HeaderLayout>('standard');
  const [logoUrl, setLogoUrl] = useState('');
  const [companyInfo, setCompanyInfo] = useState('');
  const [footerContent, setFooterContent] = useState('');

  const [orientation, setOrientation] = useState<Orientation>("portrait");
  const [paperSize, setPaperSize] = useState<PaperSize>("A4");
  const [isTableDialogVisible, setTableDialogVisible] = useState(false);
  
  const [isLeftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [isHistoryOpen, setHistoryOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pages, setPages] = useState<DocumentPage[]>([]);
  const [activePageIndex, setActivePageIndex] = useState<number | null>(0);
  const prevPageCount = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editorExtensions, setEditorExtensions] = React.useState<any[]>([]);
  
  const editor = useEditor({
    extensions: editorExtensions,
    content: '',
     editorProps: {
      attributes: {
        class: 'prose dark:prose-invert max-w-none prose-sm sm:prose-base focus:outline-none h-full',
      },
    },
    onUpdate: ({ editor }) => {
      if (activePageIndex !== null && pages[activePageIndex]) {
        handleContentChange(pages[activePageIndex].id, editor.getHTML());
      }
    },
    onBlur: ({ editor }) => {
      if (activePageIndex !== null && pages[activePageIndex]) {
        handleContentChange(pages[activePageIndex].id, editor.getHTML());
      }
    },
  });

  // Load extensions dynamically
  useEffect(() => {
    async function loadExtensions() {
      const [
        StarterKitModule,
        ColorModule,
        TextStyleModule,
        TableModule,
        TableCellModule,
        TableHeaderModule,
        TableRowModule,
        TextAlignModule,
        UnderlineModule,
        HighlightModule,
        LinkExtensionModule,
        FontFamilyModule
      ] = await Promise.all([
        import('@tiptap/starter-kit'),
        import('@tiptap/extension-color'),
        import('@tiptap/extension-text-style'),
        import('@tiptap/extension-table'),
        import('@tiptap/extension-table-cell'),
        import('@tiptap/extension-table-header'),
        import('@tiptap/extension-table-row'),
        import('@tiptap/extension-text-align'),
        import('@tiptap/extension-underline'),
        import('@tiptap/extension-highlight'),
        import('@tiptap/extension-link'),
        import('@tiptap/extension-font-family'),
      ]);

      setEditorExtensions([
        StarterKitModule.default,
        UnderlineModule.default,
        TextStyleModule.default.extend({
          addAttributes() {
              return {
                  ...this.parent?.(),
                  fontSize: {
                      default: null,
                      parseHTML: element => element.style.fontSize.replace(/pt$/, ""),
                      renderHTML: attributes => {
                          if (!attributes.fontSize) {
                              return {};
                          }
                          return { style: `font-size: ${attributes.fontSize}pt` };
                      },
                  },
              };
          },
        }),
        FontFamilyModule.FontFamily,
        ColorModule.Color,
        HighlightModule.default.configure({ multicolor: true }),
        LinkExtensionModule.default.configure({ openOnClick: false }),
        TextAlignModule.default.configure({ types: ['heading', 'paragraph'] }),
        TableModule.default.configure({ resizable: true }),
        TableRowModule.default,
        TableHeaderModule.default,
        TableCellModule.default,
      ]);
    }
    loadExtensions();
  }, []);

  useEffect(() => {
    if (!templateId) {
        setIsLoading(false);
        return;
    };

    const fetchTemplate = async () => {
      setIsLoading(true);
      try {
        const docRef = doc(db, 'documentTemplates', templateId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as DocumentTemplate;
          const initialPages = (data.pages && data.pages.length > 0) 
            ? data.pages.map(p => ({ ...p, contentHtml: p.contentHtml || '<p><br></p>' }))
            : [{ id: `page_${Date.now()}`, name: "Halaman 1", contentHtml: data.contentHtml || '<p><br></p>' }];
          
          setTemplate(data);
          setTemplateName(data.name);

          // Set header, footer, and layout states
          setHeaderLayout(data.headerLayout || 'standard');
          setLogoUrl(data.logoUrl || '');
          setCompanyInfo(data.companyInfo || 'Nama Perusahaan\nAlamat Perusahaan\nTelepon & Email');
          setFooterContent(data.footerContent || `© ${new Date().getFullYear()} {{nama_perusahaan}}`);
          
          setPages(initialPages);
          prevPageCount.current = initialPages.length;

          if (data.sourceType === 'external') {
             if (editor && !editor.isDestroyed) editor.setEditable(false);
          } else {
             setActivePageIndex(0);
             if (editor && !editor.isDestroyed) {
                editor.commands.setContent(initialPages[0].contentHtml);
             }
          }
        } else {
          toast({ variant: 'destructive', title: 'Template Tidak Ditemukan' });
          router.replace('/document-management/templates');
        }
      } catch (error) {
        console.error("Error fetching template:", error);
        toast({ variant: 'destructive', title: 'Gagal Memuat Template' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchTemplate();
  }, [templateId, router, toast, editor]);
  
  const handleContentChange = (pageId: string, newContent: string) => {
    setPages(prevPages => 
        prevPages.map(p => 
            p.id === pageId ? { ...p, contentHtml: newContent } : p
        )
    );
  };
  
  const handlePageFocus = useCallback((index: number) => {
    if (editor && activePageIndex !== index && pages[index]) {
      // Save current content before switching
      if(activePageIndex !== null && pages[activePageIndex]) {
          handleContentChange(pages[activePageIndex].id, editor.getHTML());
      }
      // Load new content
      setActivePageIndex(index);
      editor.commands.setContent(pages[index].contentHtml, false);
    }
  }, [editor, activePageIndex, pages]);

  // Effect to focus the new page after it has been added to the state
  useEffect(() => {
    if (pages.length > prevPageCount.current) {
      const newPageIndex = pages.length - 1;
      handlePageFocus(newPageIndex);
    }
    prevPageCount.current = pages.length;
  }, [pages, handlePageFocus]);
  
  const addNewPage = () => {
    const newPage: DocumentPage = {
      id: `page_${Date.now()}`,
      name: `Halaman ${pages.length + 1}`,
      contentHtml: '<p><br></p>',
    };
    // Save current content before adding a new page
    if (activePageIndex !== null && pages[activePageIndex] && editor) {
      handleContentChange(pages[activePageIndex].id, editor.getHTML());
    }
    setPages(prev => [...prev, newPage]);
  };
  
  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !template) return;

    setIsUploadingLogo(true);
    toast({ title: 'Mengunggah logo...' });

    const storageRef = ref(storage, `document_logos/${template.id}/${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed', 
        (snapshot) => {
            // Optional: handle progress
        },
        (error) => {
            console.error("Upload failed:", error);
            toast({ variant: "destructive", title: "Gagal mengunggah logo", description: error.message });
            setIsUploadingLogo(false);
        },
        async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            setLogoUrl(downloadURL);
            setIsUploadingLogo(false);
            toast({ title: 'Logo berhasil diunggah!' });
        }
    );
  };

  const onSubmit = async () => {
    if (!template) return;
    
    // For external templates, only save name changes.
    if (template.sourceType === 'external') {
       if (templateName !== template.name) {
           setIsProcessing(true);
           try {
               await updateDocumentTemplate(template.id, { name: templateName });
               toast({ title: 'Nama Template Disimpan!' });
           } catch (error) {
               toast({ variant: 'destructive', title: 'Gagal Menyimpan Nama Template' });
           } finally {
               setIsProcessing(false);
           }
       }
       return;
    }
    
    if (!editor) return;
    setIsProcessing(true);
    
    // Save the content of the currently active page before submitting
    if (activePageIndex !== null && pages[activePageIndex]) {
      const finalActiveContent = editor.getHTML();
      const updatedPages = pages.map((p, index) => 
        index === activePageIndex ? { ...p, contentHtml: finalActiveContent } : p
      );
       const dataToSave: Partial<DocumentTemplate> = {
        name: templateName,
        pages: updatedPages,
        contentHtml: updatedPages.map(p => p.contentHtml).join('<div style="page-break-after:always;"></div>'),
        headerLayout: headerLayout,
        logoUrl: logoUrl,
        companyInfo: companyInfo,
        footerContent: footerContent,
        sourceType: 'internal'
      };
      
      try {
          await updateDocumentTemplate(template.id, dataToSave);
          toast({ title: 'Template Disimpan!' });
      } catch (error) {
           toast({ variant: 'destructive', title: 'Gagal Menyimpan Template' });
      } finally {
          setIsProcessing(false);
      }
    } else {
         setIsProcessing(false);
    }
  };

  const paperDimensions = React.useMemo(() => {
    const size = paperSizes[paperSize];
    return orientation === "portrait" 
      ? { width: size.width, height: size.height } 
      : { width: size.height, height: size.width };
  }, [paperSize, orientation]);

  const insertTable = ({ rows, cols }: { rows: number; cols: number }) => {
    if (!editor) return;
    editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
  };
  
  if (isLoading || !editor) {
    return (
        <div className="flex items-center justify-center h-screen">
             <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    )
  }

  if (!template) {
    return <div className="p-4">Template tidak ditemukan. Mengarahkan...</div>;
  }
  
  const activeFont = fonts.find(f => editor.isActive('textStyle', { fontFamily: f.value }))?.name || 'Inter';
  const activeFontSize = editor.getAttributes('textStyle').fontSize?.replace('pt', '') || '12';

  const isExternalTemplate = template.sourceType === 'external';

  const headerAlignmentClasses = {
      standard: 'justify-between items-start', // logo left, info right
      minimalist: 'justify-between items-start flex-row-reverse', // logo right, info left
      headerFocus: 'justify-center items-center flex-col gap-2', // logo top, info bottom
  };
  
  const infoAlignmentClasses = {
      standard: 'text-right',
      minimalist: 'text-left',
      headerFocus: 'text-center',
  };

  return (
    <>
      <div className="flex h-screen bg-muted/30">
          <input type="file" ref={fileInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
          {/* Desktop Left Sidebar */}
          <LeftSidebar 
            paperSize={paperSize} 
            setPaperSize={setPaperSize}
            orientation={orientation}
            setOrientation={setOrientation}
            activeLayout={headerLayout}
            setActiveLayout={setHeaderLayout}
            className="hidden lg:flex"
          />

          {/* Mobile Left Sidebar Overlay */}
          {isLeftSidebarOpen && (
              <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setLeftSidebarOpen(false)} />
          )}
           <LeftSidebar 
            paperSize={paperSize} 
            setPaperSize={setPaperSize}
            orientation={orientation}
            setOrientation={setOrientation}
            activeLayout={headerLayout}
            setActiveLayout={setHeaderLayout}
            className={cn(
                "fixed top-0 left-0 h-full z-50 transform transition-transform duration-300 ease-in-out lg:hidden",
                isLeftSidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}
          />

          <div className="flex-1 flex flex-col h-screen">
              <header className="flex-shrink-0 flex items-center justify-between p-3 border-b bg-background z-20">
                    <div className="flex items-center gap-2">
                       <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setLeftSidebarOpen(true)}>
                           <PanelLeft />
                       </Button>
                       <div className="flex flex-col">
                            <div className="flex flex-wrap gap-2 items-center">
                                <NextLink href="/document-management/templates" className="text-muted-foreground text-sm font-medium">Templates</NextLink>
                                <span className="text-muted-foreground text-sm">/</span>
                                <span className="text-sm font-medium">{template.category}</span>
                            </div>
                             <Input
                                value={templateName}
                                onChange={(e) => setTemplateName(e.target.value)}
                                className="text-base sm:text-lg font-bold h-auto p-0 border-none focus-visible:ring-0 bg-transparent"
                             />
                        </div>
                    </div>
                  <div className="flex items-center gap-2">
                       <Avatar className="h-8 w-8 hidden sm:flex"><AvatarImage src="/avatars/01.png" /></Avatar>
                       <Avatar className="h-8 w-8 hidden sm:flex"><AvatarImage src="/avatars/02.png" /></Avatar>
                       <Button variant="ghost" onClick={() => setHistoryOpen(true)}>
                         <History className="mr-0 sm:mr-2 h-4 w-4"/> 
                         <span className="hidden sm:inline">History</span>
                       </Button>
                       <p className="text-sm text-muted-foreground hidden xl:block">Saved 2 mins ago</p>
                      <Button variant="outline" size="sm">Preview</Button>
                      <Button onClick={onSubmit} disabled={isProcessing} size="sm">
                      {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save
                      </Button>
                  </div>
              </header>
              <main className="flex-1 overflow-y-auto relative">
                  <div className="flex flex-col items-center gap-8 py-8">
                       {!isExternalTemplate && (
                        <div className="bg-background border rounded-lg p-2 flex items-center flex-wrap justify-center gap-1 sticky top-4 z-10">
                            <Select value={activeFont} onValueChange={value => editor.chain().focus().setFontFamily(value).run()}>
                                <SelectTrigger className="w-28 sm:w-32 h-8 text-xs"><SelectValue placeholder="Font" /></SelectTrigger>
                                <SelectContent>
                                    {fonts.map(font => <SelectItem key={font.value} value={font.value} style={{fontFamily: font.value}}>{font.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Select value={activeFontSize} onValueChange={(value) => editor.chain().focus().setMark('textStyle', { fontSize: `${value}pt` }).run()}>
                                <SelectTrigger className="w-16 sm:w-20 h-8 text-xs"><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    {fontSizes.map(size => <SelectItem key={size} value={size}>{size}pt</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Separator orientation="vertical" className="h-5 mx-1" />
                            <Button type="button" variant={editor.isActive('bold') ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></Button>
                            <Button type="button" variant={editor.isActive('italic') ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></Button>
                            <Button type="button" variant={editor.isActive('underline') ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon className="h-4 w-4" /></Button>
                            <Button type="button" variant={editor.isActive('strike') ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough className="h-4 w-4" /></Button>
                            <Separator orientation="vertical" className="h-5 mx-1" />
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="Text Color"><Palette className="h-4 w-4" /></Button>
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="Highlight Color"><Highlighter className="h-4 w-4" /></Button>
                            <Separator orientation="vertical" className="h-5 mx-1" />
                            <Button type="button" variant={editor.isActive({ textAlign: 'left' }) ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().setTextAlign('left').run()}><AlignLeft className="h-4 w-4" /></Button>
                            <Button type="button" variant={editor.isActive({ textAlign: 'center' }) ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().setTextAlign('center').run()}><AlignCenter className="h-4 w-4" /></Button>
                            <Button type="button" variant={editor.isActive({ textAlign: 'right' }) ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().setTextAlign('right').run()}><AlignRight className="h-4 w-4" /></Button>
                            <Button type="button" variant={editor.isActive({ textAlign: 'justify' }) ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().setTextAlign('justify').run()}><AlignJustify className="h-4 w-4" /></Button>
                            <Separator orientation="vertical" className="h-5 mx-1" />
                            <Button type="button" variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="h-4 w-4" /></Button>
                            <Button type="button" variant={editor.isActive('orderedList') ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="h-4 w-4" /></Button>
                            <Separator orientation="vertical" className="h-5 mx-1" />
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setTableDialogVisible(true)}><TableIcon className="h-4 w-4" /></Button>
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8"><ImageIcon className="h-4 w-4" /></Button>
                            <Separator orientation="vertical" className="h-5 mx-1 hidden sm:block" />
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 hidden sm:flex" title="Header & Footer"><WrapText className="h-4 w-4" /></Button>
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 hidden sm:flex" title="Page Numbers"><Pin className="h-4 w-4" /></Button>
                            <Separator orientation="vertical" className="h-5 mx-1" />
                             <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="Spell Check"><Book className="h-4 w-4 text-green-600" /></Button>
                        </div>
                       )}

                      {isExternalTemplate ? (
                          <div className="p-8 text-center bg-background rounded-lg shadow-lg max-w-lg">
                            <h3 className="text-lg font-semibold">Template Eksternal</h3>
                            <p className="text-muted-foreground mt-2">Template ini dikelola melalui Google Docs. Anda tidak bisa mengeditnya di sini.</p>
                             <Button asChild className="mt-4">
                                <a href={template.externalUrl} target="_blank" rel="noopener noreferrer">
                                   <ExternalLink className="mr-2 h-4 w-4" /> Buka di Google Docs
                                </a>
                            </Button>
                          </div>
                      ) : (
                        <>
                          {pages.map((page, index) => (
                              <div
                                  key={page.id}
                                  className={cn(
                                    "page-canvas-container relative bg-white shadow-2xl transition-shadow duration-300 origin-top flex flex-col",
                                    "overflow-hidden",
                                    activePageIndex === index && "ring-2 ring-primary shadow-primary/20"
                                  )}
                                  style={{ 
                                      transform: `scale(${zoom})`, 
                                      transformOrigin: 'top',
                                      width: `${paperDimensions.width}px`,
                                      height: `${paperDimensions.height}px`,
                                  }}
                                  onClick={() => handlePageFocus(index)}
                              >
                                  {/* Header Section */}
                                    <header className={cn("p-12 pb-8 flex-shrink-0 flex", headerAlignmentClasses[headerLayout])}>
                                        <div className="logo-container w-1/3 flex items-center justify-center">
                                            {isUploadingLogo ? (
                                                <div className="w-32 h-16 bg-muted rounded-md flex items-center justify-center text-muted-foreground text-sm"><Loader2 className="h-6 w-6 animate-spin" /></div>
                                            ) : logoUrl ? (
                                                <img src={logoUrl} alt="Logo" className="max-h-16 cursor-pointer" onClick={() => fileInputRef.current?.click()} />
                                            ) : (
                                                <button type="button" className="w-32 h-16 bg-muted rounded-md flex items-center justify-center text-muted-foreground text-sm cursor-pointer hover:bg-muted/80" onClick={() => fileInputRef.current?.click()}>
                                                    Upload Logo
                                                </button>
                                            )}
                                        </div>
                                        <Textarea 
                                        className={cn("info-container w-2/3 border-none focus-visible:ring-0 text-sm whitespace-pre-wrap resize-none bg-transparent", infoAlignmentClasses[headerLayout])}
                                        value={companyInfo}
                                        onChange={e => setCompanyInfo(e.target.value)}
                                        />
                                    </header>

                                  {/* Main Content (Tiptap Editor) */}
                                  <div
                                    className={cn(
                                        "page-content-wrapper flex-grow w-full px-12 overflow-y-auto",
                                        activePageIndex !== index && "pointer-events-none"
                                    )}
                                  >
                                        {activePageIndex === index ? (
                                            <EditorContent
                                                editor={editor}
                                                className="h-full"
                                            />
                                        ) : (
                                            <div 
                                                className="prose dark:prose-invert max-w-none prose-sm sm:prose-base h-full focus:outline-none"
                                                dangerouslySetInnerHTML={{ __html: page.contentHtml }} 
                                            />
                                        )}
                                  </div>
                                   {/* Footer Section */}
                                    <footer className="p-12 pt-8 border-t text-center text-xs text-muted-foreground flex-shrink-0">
                                        <Input 
                                            className="border-none text-center h-auto p-0 bg-transparent"
                                            value={footerContent}
                                            onChange={(e) => setFooterContent(e.target.value)}
                                        />
                                    </footer>
                              </div>
                          ))}
                          <div className="text-center" style={{ transform: `scale(${zoom})`, transformOrigin: 'top' }}>
                              <Button onClick={addNewPage} variant="outline" className="mt-4 bg-background">
                                  <PlusCircle className="mr-2 h-4 w-4" />
                                  Tambah Halaman
                              </Button>
                          </div>
                        </>
                      )}
                  </div>
                  <div className="sticky bottom-6 right-6 flex justify-end p-4">
                      <div className="flex items-center gap-2 bg-background border rounded-full shadow-lg p-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom(prev => Math.max(0.25, prev - 0.1))}><ZoomOut className="h-4 w-4"/></Button>
                        <Slider
                            defaultValue={[1]}
                            value={[zoom]}
                            max={2}
                            min={0.25}
                            step={0.05}
                            className="w-32"
                            onValueChange={(value) => setZoom(value[0])}
                        />
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom(prev => Math.min(2, prev + 0.1))}><ZoomIn className="h-4 w-4"/></Button>
                        <span className="text-xs font-semibold w-12 text-center">{(zoom * 100).toFixed(0)}%</span>
                      </div>
                  </div>
              </main>
          </div>
            {/* Desktop Right Sidebar */}
            {isHistoryOpen && (
                 <RightSidebar isHistoryOpen={isHistoryOpen} setIsHistoryOpen={setHistoryOpen} className="hidden lg:flex" />
            )}

            {/* Mobile Right Sidebar Overlay */}
            {isHistoryOpen && (
                 <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setHistoryOpen(false)} />
            )}
            <RightSidebar
                isHistoryOpen={isHistoryOpen}
                setIsHistoryOpen={setHistoryOpen}
                className={cn(
                    "fixed top-0 right-0 h-full z-50 transform transition-transform duration-300 ease-in-out lg:hidden",
                    isHistoryOpen ? "translate-x-0" : "translate-x-full"
                )}
            />
      </div>
      <TableCustomizationDialog
        isOpen={isTableDialogVisible}
        onOpenChange={setTableDialogVisible}
        onConfirm={insertTable}
      />
    </>
  );
}
