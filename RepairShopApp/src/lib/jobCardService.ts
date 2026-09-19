// jobCardService.ts — Mobile App Job Card Service
// Uses expo-print to produce an operational Job Card document
// with native AirPrint / Android Print Spooler and Sharing support.

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { supabase } from './supabase';
import { generateJobCardHtml, JobCardData, JobCardMaterialItem } from '@repairshop/shared';

export type JobCardProgressCallback = (percent: number, message: string) => void;

export interface MobilePrintJobCardOptions {
  jobId?: string;
  preloadedJob?: any;
  materials?: any[];
  onProgress?: JobCardProgressCallback;
}

/**
 * Prepares the Job Card data payload.
 */
async function prepareJobCardData({
  jobId,
  preloadedJob,
  materials,
  onProgress,
}: MobilePrintJobCardOptions): Promise<JobCardData> {
  onProgress?.(20, 'Preparing Job Card data...');

  let job = preloadedJob;
  let jobMaterials = materials;

  const targetId = jobId || job?.id;
  if (!targetId) {
    throw new Error('Cannot generate Job Card: Missing Job ID');
  }

  // If complete job details or materials are missing, or if relations are unpopulated, fetch them
  const lacksRelations =
    !job ||
    !job.receptionist?.name ||
    (!job.device_type && !job.device_type_id) ||
    (!job.technician?.name && !job.job_technicians);

  if (lacksRelations || !jobMaterials) {
    onProgress?.(45, 'Loading details from database...');
    try {
      const [jobRes, matRes] = await Promise.all([
        supabase
          .from('jobs')
          .select(
            '*, technician:users!jobs_technician_id_fkey(name, phone), job_technicians(*, technician:users!job_technicians_technician_id_fkey(name, phone)), job_type_ref:job_types!jobs_job_type_ref_id_fkey(id, title), receptionist:users!jobs_receptionist_id_fkey(name)'
          )
          .eq('id', targetId)
          .single(),
        !jobMaterials
          ? supabase.from('job_materials').select('*').eq('job_id', targetId)
          : Promise.resolve({ data: jobMaterials || [], error: null }),
      ]);

      if (!jobRes.error && jobRes.data) {
        job = { ...jobRes.data, ...(job || {}) };
        if (jobRes.data.receptionist) job.receptionist = jobRes.data.receptionist;
        if (jobRes.data.technician) job.technician = jobRes.data.technician;
        if (jobRes.data.job_technicians && jobRes.data.job_technicians.length > 0) {
          job.job_technicians = jobRes.data.job_technicians;
        }
        if (jobRes.data.device_type_id && !job.device_type) {
          job.device_type = jobRes.data.device_type_id;
        }
      }
      if (matRes.data) jobMaterials = matRes.data;
    } catch (e) {
      console.warn('Mobile Job details hydration notice:', e);
    }
  }

  onProgress?.(70, 'Compiling Job Card layout...');

  // 1. Resolve Intake Staff Name (Actual user name, NEVER generic 'Counter Staff')
  let intakeStaffName = job?.receptionist?.name || null;
  if (!intakeStaffName && job?.receptionist_id) {
    try {
      const { data: staffUser } = await supabase
        .from('users')
        .select('name')
        .eq('id', job.receptionist_id)
        .maybeSingle();
      if (staffUser?.name) intakeStaffName = staffUser.name;
    } catch {
      // non-critical
    }
  }
  if (!intakeStaffName) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: currentUser } = await supabase
          .from('users')
          .select('name')
          .eq('id', session.user.id)
          .maybeSingle();
        if (currentUser?.name) intakeStaffName = currentUser.name;
      }
    } catch {
      // non-critical
    }
  }

  // 2. Combine assigned technician names
  const techNames: string[] = [];
  if (job?.technician?.name) techNames.push(job.technician.name);
  if (job?.technician_name && typeof job.technician_name === 'string') {
    techNames.push(job.technician_name);
  }
  if (job?.job_technicians && Array.isArray(job?.job_technicians)) {
    job.job_technicians.forEach((jt: any) => {
      const tName = jt.technician?.name;
      if (tName && !techNames.includes(tName)) {
        techNames.push(tName);
      }
    });
  }

  // Also query job_technicians directly to guarantee we have all assigned staff
  if (targetId) {
    try {
      const { data: dbTechs } = await supabase
        .from('job_technicians')
        .select('technician_id, removed_at, technician:users!job_technicians_technician_id_fkey(name)')
        .eq('job_id', targetId)
        .is('removed_at', null);
      if (dbTechs && dbTechs.length > 0) {
        dbTechs.forEach((jt: any) => {
          const tName = jt.technician?.name;
          if (tName && !techNames.includes(tName)) {
            techNames.push(tName);
          }
        });
      }
    } catch {
      // non-critical
    }
  }

  if (techNames.length === 0 && job?.technician_id) {
    try {
      const { data: singleTech } = await supabase
        .from('users')
        .select('name')
        .eq('id', job.technician_id)
        .maybeSingle();
      if (singleTech?.name) techNames.push(singleTech.name);
    } catch {
      // non-critical
    }
  }

  const uniqueTechNames = Array.from(new Set(techNames.filter(Boolean)));

  // 3. Resolve Actual Device Type (NEVER generic 'Other')
  const resolvedDeviceType = (
    job?.device_type ||
    job?.device_type_ref?.label ||
    job?.device_type_ref?.id ||
    job?.device_type_id ||
    ''
  ).trim();

  // Format materials (names and quantities only, zero pricing)
  const formattedMaterials: JobCardMaterialItem[] = (jobMaterials || []).map((m: any) => ({
    name: m.material_name || 'Material Item',
    quantity: Number(m.quantity) || 1,
  }));

  return {
    jobCode: job?.job_code || 'DS-JOB',
    createdAt: job?.created_at || new Date().toISOString(),
    jobType: job?.job_type || 'Inhouse',
    priority: job?.priority || 'Normal',
    status: job?.status || 'Received',
    serviceTitle: job?.job_type_ref?.title || null,
    intakeStaffName: intakeStaffName || '—',
    technicianName: uniqueTechNames.length > 0 ? uniqueTechNames.join(', ') : 'Unassigned',

    customerName: job?.customer_name || 'Walk-in Customer',
    customerContact: job?.customer_contact || '—',
    customerEmail: job?.customer_email || null,
    customerAddress: job?.customer_address || null,
    customerGstin: job?.customer_gstin || null,

    deviceType: resolvedDeviceType || '—',
    serialNumber: null,
    reportedIssue: job?.reported_issue || 'No issue description provided',
    remarks: job?.remarks || null,
    workNotes: job?.work_notes || null,

    materials: formattedMaterials,
  };
}

/**
 * Opens the native system print sheet (iOS AirPrint / Android Print Spooler)
 * for the operational Job Card.
 */
export async function printJobCard(options: MobilePrintJobCardOptions): Promise<void> {
  const jobCardData = await prepareJobCardData(options);
  const html = generateJobCardHtml(jobCardData);

  options.onProgress?.(90, 'Rendering document preview...');
  await Print.printAsync({ html, useMarkupFormatter: false });
  options.onProgress?.(100, 'Print preview ready');
}

/**
 * Exports the Job Card to PDF and opens the system Share Sheet.
 */
export async function shareJobCard(options: MobilePrintJobCardOptions): Promise<void> {
  const jobCardData = await prepareJobCardData(options);
  const html = generateJobCardHtml(jobCardData);

  options.onProgress?.(85, 'Rendering PDF file...');
  const { uri } = await Print.printToFileAsync({ html });

  const safeCode = (jobCardData.jobCode || 'JobCard').replace(/[^a-zA-Z0-9_-]/g, '_');
  const destUri = uri.replace(/[^/]+$/, `JobCard-${safeCode}.pdf`);

  options.onProgress?.(95, 'Opening share sheet...');
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(destUri, {
      mimeType: 'application/pdf',
      dialogTitle: `Share Job Card ${jobCardData.jobCode}`,
    });
  } else {
    await Print.printAsync({ html });
  }

  options.onProgress?.(100, 'Document shared');
}
