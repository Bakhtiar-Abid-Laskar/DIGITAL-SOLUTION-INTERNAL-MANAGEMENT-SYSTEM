import React from 'react';
import { Card } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { Textarea } from "@/components/common/Textarea";
import { Save } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/common/ToastProvider";

interface JobNotesCardProps {
  jobId: string;
  notes: string;
  notesSaving: boolean;
  onUpdateNotes: (notes: string) => void;
  onSetNotesSaving: (saving: boolean) => void;
  onJobNotesSaved: (notes: string) => void;
}

export function JobNotesCard({
  jobId, notes, notesSaving, onUpdateNotes, onSetNotesSaving, onJobNotesSaved
}: JobNotesCardProps) {
  const { showToast } = useToast();

  const handleSaveNotes = async () => {
    onSetNotesSaving(true);
    try {
      const { error } = await supabase.from('jobs').update({ work_notes: notes }).eq('id', jobId);
      if (error) throw error;
      onJobNotesSaved(notes);
      showToast('Notes saved successfully', "success");
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      onSetNotesSaving(false);
    }
  };

  return (
    <Card className="flex flex-col h-full">
      <div className="p-6 border-b border-admin-border">
        <h3 className="text-lg font-semibold leading-none tracking-tight">Technician Work Notes</h3>
      </div>
      <div className="flex-1 flex flex-col p-6 pt-0 mt-4">
        <Textarea 
          value={notes}
          onChange={e => onUpdateNotes(e.target.value)}
          className="flex-1 min-h-[150px]"
          placeholder="Enter diagnosis, repair steps, or internal remarks..."
        />
      </div>
      <div className="bg-admin-bg-subtle border-t border-admin-border p-4 flex justify-end rounded-b-xl">
        <Button onClick={handleSaveNotes} isLoading={notesSaving} leftIcon={<Save size={16} />}>
          Save Notes
        </Button>
      </div>
    </Card>
  );
}
