import { Job, JobMaterial, User } from '@repairshop/shared';

export interface JobDetailState {
  job: Job | null;
  materials: JobMaterial[];
  technicians: User[];
  billing: any;
  loading: boolean;
  error: string | null;
  deviceTypes: string[];
  onsiteVisits: any[];
  
  // Edit State
  isEditing: boolean;
  editForm: Partial<Job>;
  
  // Modals
  confirmModal: any | null;
  isReassignModalOpen: boolean;
  
  // Billing State
  billingForm: {
    labour_charge: number;
    tax_percent: number;
    discount: number;
    is_paid: boolean;
  };
  billingSaving: boolean;
  
  // Notes State
  notes: string;
  notesSaving: boolean;
  
  // Materials State
  newMaterial: { name: string; qty: number; unitCost: number };
  addingMaterial: boolean;
}

export type JobDetailAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: { job: Job; materials: JobMaterial[]; technicians: User[]; billing: any; deviceTypes: string[]; onsiteVisits: any[] } }
  | { type: 'FETCH_ERROR'; error: string }
  | { type: 'SET_EDITING'; isEditing: boolean }
  | { type: 'UPDATE_EDIT_FORM'; payload: Partial<Job> }
  | { type: 'UPDATE_JOB'; job: Job }
  | { type: 'UPDATE_MATERIALS'; materials: JobMaterial[] }
  | { type: 'UPDATE_BILLING'; billing: any }
  | { type: 'SET_CONFIRM_MODAL'; modal: any }
  | { type: 'UPDATE_BILLING_FORM'; payload: Partial<JobDetailState['billingForm']> }
  | { type: 'SET_BILLING_SAVING'; saving: boolean }
  | { type: 'UPDATE_NOTES'; notes: string }
  | { type: 'SET_NOTES_SAVING'; saving: boolean }
  | { type: 'UPDATE_NEW_MATERIAL'; payload: Partial<JobDetailState['newMaterial']> }
  | { type: 'RESET_NEW_MATERIAL' }
  | { type: 'SET_ADDING_MATERIAL'; adding: boolean }
  | { type: 'SET_REASSIGN_MODAL'; isOpen: boolean };

export const initialState: JobDetailState = {
  job: null,
  materials: [],
  technicians: [],
  billing: null,
  loading: true,
  error: null,
  deviceTypes: [],
  onsiteVisits: [],
  
  isEditing: false,
  editForm: {},
  confirmModal: null,
  
  billingForm: { labour_charge: 0, tax_percent: 0, discount: 0, is_paid: false },
  billingSaving: false,
  
  notes: '',
  notesSaving: false,
  
  newMaterial: { name: '', qty: 1, unitCost: 0 },
  addingMaterial: false,
  isReassignModalOpen: false,
};

export function jobDetailReducer(state: JobDetailState, action: JobDetailAction): JobDetailState {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };
    case 'FETCH_SUCCESS':
      return {
        ...state,
        loading: false,
        job: action.payload.job,
        editForm: action.payload.job,
        materials: action.payload.materials,
        technicians: action.payload.technicians,
        billing: action.payload.billing,
        deviceTypes: action.payload.deviceTypes,
        onsiteVisits: action.payload.onsiteVisits,
        notes: action.payload.job.work_notes || '',
        billingForm: {
          labour_charge: (() => {
            const items = action.payload.billing?.invoice_items || [];
            const labourItem = items.find((i: any) => i.item_name === 'Labour Charge');
            return labourItem ? Number(labourItem.selling_rate) : 0;
          })(),
          tax_percent: 18, // Default or computed from invoice
          discount: action.payload.billing?.discount || 0,
          is_paid: action.payload.billing?.status === 'paid',
        }
      };
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.error };
    case 'SET_EDITING':
      return { ...state, isEditing: action.isEditing, editForm: action.isEditing ? state.editForm : (state.job || {}) };
    case 'UPDATE_EDIT_FORM':
      return { ...state, editForm: { ...state.editForm, ...action.payload } };
    case 'UPDATE_JOB':
      return { ...state, job: action.job };
    case 'UPDATE_MATERIALS':
      return { ...state, materials: action.materials };
    case 'UPDATE_BILLING':
      return { ...state, billing: action.billing };
    case 'SET_CONFIRM_MODAL':
      return { ...state, confirmModal: action.modal };
    case 'UPDATE_BILLING_FORM':
      return { ...state, billingForm: { ...state.billingForm, ...action.payload } };
    case 'SET_BILLING_SAVING':
      return { ...state, billingSaving: action.saving };
    case 'UPDATE_NOTES':
      return { ...state, notes: action.notes };
    case 'SET_NOTES_SAVING':
      return { ...state, notesSaving: action.saving };
    case 'UPDATE_NEW_MATERIAL':
      return { ...state, newMaterial: { ...state.newMaterial, ...action.payload } };
    case 'RESET_NEW_MATERIAL':
      return { ...state, newMaterial: initialState.newMaterial };
    case 'SET_ADDING_MATERIAL':
      return { ...state, addingMaterial: action.adding };
    case 'SET_REASSIGN_MODAL':
      return { ...state, isReassignModalOpen: action.isOpen };
    default:
      return state;
  }
}
