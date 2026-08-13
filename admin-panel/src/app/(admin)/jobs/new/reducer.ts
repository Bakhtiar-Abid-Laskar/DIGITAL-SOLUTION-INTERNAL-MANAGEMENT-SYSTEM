import { User, Job, JobTypeCatalogItem } from '@repairshop/shared';

export interface CreateJobFormState {
  customer_name: string;
  customer_contact: string;
  customer_email: string;
  customer_gstin: string;
  device_type: 'Laptop' | 'PC' | 'Other';
  reported_issue: string;
  remarks: string;
  job_type: 'Inhouse' | 'Onsite';
  job_type_ref_id: string;
  job_type_title: string;
  customer_charge_amount: number;
  snap_technician_incentive: number;
  priority: 'Normal' | 'High' | 'Urgent';
  technician_ids: string[];
}

export interface CreateJobState {
  loading: boolean;
  technicians: User[];
  catalogItems: JobTypeCatalogItem[];
  catalogLoading: boolean;
  createdJob: Job | null;
  form: CreateJobFormState;
  errors: Record<string, string>;
}

export type CreateJobAction =
  | { type: 'SET_CATALOG_LOADING'; loading: boolean }
  | { type: 'FETCH_SUCCESS'; technicians: User[]; catalogItems: JobTypeCatalogItem[] }
  | { type: 'SET_FORM_FIELD'; field: keyof CreateJobFormState; value: any }
  | { type: 'SET_CATALOG_ITEM'; payload: Partial<CreateJobFormState> }
  | { type: 'SET_ERRORS'; errors: Record<string, string> }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_CREATED_JOB'; job: Job | null }
  | { type: 'RESET_FORM' };

export const initialFormState: CreateJobFormState = {
  customer_name: '',
  customer_contact: '',
  customer_email: '',
  customer_gstin: '',
  device_type: 'Laptop',
  reported_issue: '',
  remarks: '',
  job_type: 'Inhouse',
  job_type_ref_id: '',
  job_type_title: '',
  customer_charge_amount: 0,
  snap_technician_incentive: 0,
  priority: 'Normal',
  technician_ids: [],
};

export const initialState: CreateJobState = {
  loading: false,
  technicians: [],
  catalogItems: [],
  catalogLoading: false,
  createdJob: null,
  form: initialFormState,
  errors: {}
};

export function createJobReducer(state: CreateJobState, action: CreateJobAction): CreateJobState {
  switch (action.type) {
    case 'SET_CATALOG_LOADING':
      return { ...state, catalogLoading: action.loading };
    case 'FETCH_SUCCESS':
      return { ...state, technicians: action.technicians, catalogItems: action.catalogItems, catalogLoading: false };
    case 'SET_FORM_FIELD':
      return { ...state, form: { ...state.form, [action.field]: action.value } };
    case 'SET_CATALOG_ITEM':
      return { ...state, form: { ...state.form, ...action.payload } };
    case 'SET_ERRORS':
      return { ...state, errors: action.errors };
    case 'SET_LOADING':
      return { ...state, loading: action.loading };
    case 'SET_CREATED_JOB':
      return { ...state, createdJob: action.job };
    case 'RESET_FORM':
      return { ...state, form: initialFormState, createdJob: null, errors: {} };
    default:
      return state;
  }
}
