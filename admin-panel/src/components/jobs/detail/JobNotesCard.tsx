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
    <Card className="flex flex-col">
      <div className="p-4 border-b border-admin-border flex items-center justify-between">
        <h3 className="text-sm font-semibold leading-none tracking-tight text-admin-text-primary">Technician Work Notes</h3>
        <Button onClick={handleSaveNotes} isLoading={notesSaving} leftIcon={<Save size={14} />} variant="outline">
          Save
        </Button>
      </div>
      <div className="p-4">
        <Textarea
          value={notes}
          onChange={e => onUpdateNotes(e.target.value)}
          className="min-h-[64px] text-sm"
          placeholder="Enter diagnosis, repair steps, or internal remarks..."
        />
      </div>
    </Card>
  );
}
