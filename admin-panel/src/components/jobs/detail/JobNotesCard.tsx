import React, { useRef, useEffect } from 'react';
import { Card } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { Textarea } from "@/components/common/Textarea";
import { Save, FileText } from "lucide-react";
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow textarea to content height with smooth clamp
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(68, textareaRef.current.scrollHeight)}px`;
    }
  }, [notes]);

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
      <div className="p-3.5 px-4 border-b border-admin-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-admin-text-muted" />
          <h3 className="text-sm font-semibold leading-none tracking-tight text-admin-text-primary">Technician Work Notes</h3>
        </div>
        <Button onClick={handleSaveNotes} isLoading={notesSaving} leftIcon={<Save size={14} />} variant="outline" size="sm" className="h-8 text-xs font-medium">
          Save Notes
        </Button>
      </div>
      <div className="p-3.5">
        <Textarea
          ref={textareaRef}
          value={notes}
          onChange={e => onUpdateNotes(e.target.value)}
          className="min-h-[68px] text-sm resize-none transition-[height] duration-100 ease-out"
          placeholder="Enter diagnosis, repair steps, or internal remarks..."
        />
      </div>
    </Card>
  );
}
