
// src/app/api/cron/notifications/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/server';
import type { AppraisalSetup, NotificationTemplate, Employee, KpiSetup } from '@/types';
import { sendEmail } from '@/lib/services/notification-service';
import { format, lastDayOfMonth, addDays, parse } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

// Memastikan rute ini tidak di-pre-render saat build
export const dynamic = 'force-dynamic';

function renderTemplate(template: string, context: Record<string, string>): string {
  let rendered = template;
  for (const [key, value] of Object.entries(context)) {
    const placeholder = `{{${key}}}`;
    rendered = rendered.replace(new RegExp(placeholder, 'g'), value || '');
  }
  return rendered;
}

function getKpiDeadlineForMonth(kpiSetup: KpiSetup, referenceDate: Date): Date | null {
    if (!kpiSetup.kpiInputDeadline) return null;

    const { type, value } = kpiSetup.kpiInputDeadline;
    const year = referenceDate.getFullYear();
    const month = referenceDate.getMonth();

    switch (type) {
        case 'specific_date':
            if (value === undefined || value < 1 || value > 31) return null;
            return new Date(year, month, value);
        case 'last_day':
            return lastDayOfMonth(referenceDate);
        case 'relative_to_end':
            if (value === undefined) return null;
            return addDays(lastDayOfMonth(referenceDate), value);
        default:
            return null;
    }
}


export async function GET(req: Request) {
  try {
    console.log("CRON JOB: Starting scheduled notification processing...");
    
    const [
      appraisalSetupsSnap,
      kpiSetupsSnap,
      templatesSnap,
      employeesSnap
    ] = await Promise.all([
      db.collection('appraisalSetups').get(),
      db.collection('kpiSetups').get(),
      db.collection('notificationTemplates').get(),
      db.collection('employees').get()
    ]);

    const allTemplates = templatesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as NotificationTemplate[];
    const allEmployees = employeesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Employee[];
    const allAppraisalSetups = appraisalSetupsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AppraisalSetup[];
    const allKpiSetups = kpiSetupsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as KpiSetup[];
    
    const today = new Date();
    const emailsToSend: { to: string[], subject: string, html: string }[] = [];

    for (const template of allTemplates.filter(t => t.status === 'Active')) {
        switch (template.triggerEventId) {
            case 'appraisal_cycle_starts': {
                const triggeredSetups = allAppraisalSetups.filter(s => {
                    const startDateStr = s.periodStart || s.period || '';
                    if (!startDateStr) return false;
                    const startDate = parse(startDateStr, 'yyyy-MM', new Date());
                    return s.status === 'Aktif' && startDate.toDateString() === today.toDateString();
                });

                for (const setup of triggeredSetups) {
                    const targetEmployees = allEmployees.filter(e => e.status === 'Aktif' && e.company === setup.company && setup.activeLevels.includes(e.level));
                    for (const employee of targetEmployees) {
                         const context = {
                            nama_pengguna: employee.name,
                            nama_event: setup.period || `${setup.periodStart} - ${setup.periodEnd}`,
                            tanggal_mulai_event: format(new Date(setup.periodStart || setup.period || ''), "d MMMM yyyy", { locale: localeId }),
                            tanggal_selesai_event: format(new Date(setup.periodEnd || setup.period || ''), "d MMMM yyyy", { locale: localeId }),
                        };
                        emailsToSend.push({
                            to: [employee.email],
                            subject: renderTemplate(template.subject, context),
                            html: renderTemplate(template.message, context),
                        });
                    }
                }
                break;
            }
            case 'kpi_input_deadline': {
                const triggeredSetups = allKpiSetups.filter(s => {
                    if (s.status !== 'Aktif') return false;
                    const deadline = getKpiDeadlineForMonth(s, today);
                    return deadline?.toDateString() === today.toDateString();
                });

                for (const setup of triggeredSetups) {
                     const targetEmployees = allEmployees.filter(e => 
                        e.status === 'Aktif' &&
                        e.company === setup.company &&
                        e.department === setup.department &&
                        e.position === setup.position &&
                        e.level === setup.level
                    );
                    for (const employee of targetEmployees) {
                        const context = {
                            nama_pengguna: employee.name,
                            nama_event: `Deadline Pengisian KPI ${format(today, 'LLLL yyyy', {locale: localeId})}`,
                            tanggal_mulai_event: format(today, "d MMMM yyyy", { locale: localeId }),
                            tanggal_selesai_event: format(today, "d MMMM yyyy", { locale: localeId }),
                        };
                         emailsToSend.push({
                            to: [employee.email],
                            subject: renderTemplate(template.subject, context),
                            html: renderTemplate(template.message, context),
                        });
                    }
                }
                break;
            }
        }
    }

    if (emailsToSend.length > 0) {
      console.log(`CRON JOB: Preparing to send ${emailsToSend.length} emails.`);
      const sendPromises = emailsToSend.map(email => sendEmail(email.to, email.subject, email.html));
      await Promise.all(sendPromises);
      console.log(`CRON JOB: Successfully queued ${emailsToSend.length} emails.`);
    }

    return NextResponse.json({ success: true, message: `Cron job processed ${emailsToSend.length} notifications.` });
  } catch (error: any) {
    console.error("CRON JOB FAILED:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { targetEmployeeIds, templateId } = body;

    if (!Array.isArray(targetEmployeeIds) || targetEmployeeIds.length === 0 || !templateId) {
      return NextResponse.json({ success: false, error: 'Invalid parameters.' }, { status: 400 });
    }

    const templateDoc = await db.collection('notificationTemplates').doc(templateId).get();
    if (!templateDoc.exists) {
      return NextResponse.json({ success: false, error: `Template not found.` }, { status: 404 });
    }
    const template = { id: templateDoc.id, ...templateDoc.data() } as NotificationTemplate;

    // Firebase Admin query for multiple IDs using where field 'id' or documentId()
    // However, Admin SDK doesn't have documentId() as a top level import like client SDK.
    // It's FieldPath.documentId()
    const admin = await import('firebase-admin');
    const employeesSnap = await db.collection('employees')
      .where(admin.firestore.FieldPath.documentId(), 'in', targetEmployeeIds)
      .get();
    const targetEmployees = employeesSnap.docs.map(d => ({ ...d.data(), id: d.id } as Employee));

    for (const employee of targetEmployees) {
        const context = {
            nama_pengguna: employee.name,
            nama_event: "Event Simulasi Tes",
            tanggal_mulai_event: format(new Date(), "d MMMM yyyy", { locale: localeId }),
            tanggal_selesai_event: format(new Date(), "d MMMM yyyy", { locale: localeId }),
        };
        const subject = renderTemplate(template.subject, context);
        const html = renderTemplate(template.message, context);
        await sendEmail([employee.email], subject, html);
    }
    
    return NextResponse.json({ success: true, message: `Manual job processed ${targetEmployees.length} notifications.` });
  } catch (error: any) {
    console.error("MANUAL JOB FAILED:", error);
    return NextResponse.json({ success: false, error: error.message || 'An unknown error occurred.' }, { status: 500 });
  }
}
