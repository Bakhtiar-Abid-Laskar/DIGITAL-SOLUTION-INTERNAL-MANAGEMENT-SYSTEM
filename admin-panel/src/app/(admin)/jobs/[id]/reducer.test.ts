import { jobDetailReducer, initialState, JobDetailState } from './reducer';
import { Job, JobMaterial, User } from '@repairshop/shared';

const mockJob: Job = {
  id: 'job-123',
  job_code: 'RS-2026-0001',
  customer_name: 'Rahul Sharma',
  customer_contact: '9876543210',
  device_type: 'Laptop',
  reported_issue: 'Screen flickering',
  priority: 'High',
  status: 'In Progress',
  job_type: 'Inhouse',
  created_at: '2026-08-14T10:00:00Z',
  work_notes: 'Initial inspection done',
};

describe('Job Detail State Machine Reducer (jobs/[id]/reducer.ts)', () => {
  it('handles FETCH_START correctly by resetting error and setting loading to true', () => {
    const state = jobDetailReducer({ ...initialState, error: 'Previous error' }, { type: 'FETCH_START' });
    expect(state.loading).toBe(true);
    expect(state.error).toBeNull();
  });

  it('handles FETCH_SUCCESS by populating job, materials, technicians, and billing form', () => {
    const materials: JobMaterial[] = [
      { id: 'mat-1', job_id: 'job-123', material_name: 'Display Cable', quantity: 1, unit_cost: 450, total_cost: 450 },
    ];
    const technicians: User[] = [
      { id: 'tech-1', name: 'Arshad Ali', email: 'arshad@repairshop.com', role: 'technician', is_active: true, created_at: '2026-08-14T09:00:00Z' },
    ];
    const billing = {
      invoice_items: [{ item_name: 'Labour Charge', selling_rate: 350 }],
      tax_percent: 18,
      discount: 50,
      status: 'unpaid',
    };

    const state = jobDetailReducer(initialState, {
      type: 'FETCH_SUCCESS',
      payload: {
        job: mockJob,
        materials,
        technicians,
        billing,
        deviceTypes: ['Laptop', 'PC'],
        onsiteVisits: [],
      },
    });

    expect(state.loading).toBe(false);
    expect(state.job).toEqual(mockJob);
    expect(state.materials).toHaveLength(1);
    expect(state.technicians).toHaveLength(1);
    expect(state.billingForm.labour_charge).toBe(350);
    expect(state.billingForm.discount).toBe(50);
    expect(state.notes).toBe('Initial inspection done');
  });

  it('handles FETCH_ERROR by setting error message and loading to false', () => {
    const state = jobDetailReducer(initialState, {
      type: 'FETCH_ERROR',
      error: 'Job not found in database',
    });
    expect(state.loading).toBe(false);
    expect(state.error).toBe('Job not found in database');
  });

  it('handles SET_EDITING (true and false) and UPDATE_EDIT_FORM transitions', () => {
    const populatedState = { ...initialState, job: mockJob, editForm: mockJob };
    const editingState = jobDetailReducer(populatedState, { type: 'SET_EDITING', isEditing: true });
    expect(editingState.isEditing).toBe(true);

    const updatedState = jobDetailReducer(editingState, {
      type: 'UPDATE_EDIT_FORM',
      payload: { priority: 'Urgent', reported_issue: 'Complete power failure' },
    });
    expect(updatedState.editForm.priority).toBe('Urgent');
    expect(updatedState.editForm.reported_issue).toBe('Complete power failure');

    const canceledState = jobDetailReducer(updatedState, { type: 'SET_EDITING', isEditing: false });
    expect(canceledState.isEditing).toBe(false);
    expect(canceledState.editForm).toEqual(mockJob);
  });

  it('handles UPDATE_JOB, UPDATE_MATERIALS, and UPDATE_BILLING', () => {
    const newJob: Job = { ...mockJob, status: 'Completed' };
    const updatedJobState = jobDetailReducer(initialState, { type: 'UPDATE_JOB', job: newJob });
    expect(updatedJobState.job?.status).toBe('Completed');

    const newMaterials: JobMaterial[] = [
      { id: 'm-2', job_id: 'job-123', material_name: 'Battery', quantity: 1, unit_cost: 1200, total_cost: 1200 },
    ];
    const updatedMatState = jobDetailReducer(initialState, { type: 'UPDATE_MATERIALS', materials: newMaterials });
    expect(updatedMatState.materials).toEqual(newMaterials);

    const newBilling = { labour_charge: 500, is_paid: true };
    const updatedBillingState = jobDetailReducer(initialState, { type: 'UPDATE_BILLING', billing: newBilling });
    expect(updatedBillingState.billing).toEqual(newBilling);
  });

  it('handles SET_CONFIRM_MODAL and SET_REASSIGN_MODAL', () => {
    const modalPayload = { title: 'Delete Material', onConfirm: jest.fn() };
    const stateWithModal = jobDetailReducer(initialState, { type: 'SET_CONFIRM_MODAL', modal: modalPayload });
    expect(stateWithModal.confirmModal).toEqual(modalPayload);

    const stateWithReassign = jobDetailReducer(initialState, { type: 'SET_REASSIGN_MODAL', isOpen: true });
    expect(stateWithReassign.isReassignModalOpen).toBe(true);
  });

  it('handles UPDATE_BILLING_FORM and SET_BILLING_SAVING', () => {
    const state = jobDetailReducer(initialState, {
      type: 'UPDATE_BILLING_FORM',
      payload: { labour_charge: 500, discount: 100, is_paid: true },
    });
    expect(state.billingForm.labour_charge).toBe(500);
    expect(state.billingForm.discount).toBe(100);
    expect(state.billingForm.is_paid).toBe(true);

    const savingState = jobDetailReducer(state, { type: 'SET_BILLING_SAVING', saving: true });
    expect(savingState.billingSaving).toBe(true);
  });

  it('handles UPDATE_NOTES and SET_NOTES_SAVING', () => {
    const state = jobDetailReducer(initialState, { type: 'UPDATE_NOTES', notes: 'Replaced thermal paste' });
    expect(state.notes).toBe('Replaced thermal paste');

    const savingState = jobDetailReducer(state, { type: 'SET_NOTES_SAVING', saving: true });
    expect(savingState.notesSaving).toBe(true);
  });

  it('handles material creation form state, SET_ADDING_MATERIAL, and RESET_NEW_MATERIAL', () => {
    const fillingState = jobDetailReducer(initialState, {
      type: 'UPDATE_NEW_MATERIAL',
      payload: { name: 'Thermal Paste', qty: 2, unitCost: 120 },
    });
    expect(fillingState.newMaterial.name).toBe('Thermal Paste');
    expect(fillingState.newMaterial.qty).toBe(2);

    const addingState = jobDetailReducer(fillingState, { type: 'SET_ADDING_MATERIAL', adding: true });
    expect(addingState.addingMaterial).toBe(true);

    const resetState = jobDetailReducer(addingState, { type: 'RESET_NEW_MATERIAL' });
    expect(resetState.newMaterial.name).toBe('');
    expect(resetState.newMaterial.qty).toBe(1);
    expect(resetState.newMaterial.unitCost).toBe(0);
  });

  it('returns unchanged state for unhandled action types', () => {
    const state = jobDetailReducer(initialState, { type: 'UNHANDLED_ACTION' } as any);
    expect(state).toBe(initialState);
  });
});
