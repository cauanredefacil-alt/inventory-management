import React, { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
// Removed Select imports since Tipo is read-only in assignment mode

const defaultForm = {
  number: '',
  type: '',
  consultant: '',
};

const AddTelModal = ({ open, onOpenChange, onSave, initialData = null }) => {
  const [form, setForm] = useState(initialData || defaultForm);
  const [errors, setErrors] = useState({});
  const isEditMode = !!initialData;
  // Assignment mode = opened from table cell to set consultant for a given number+type
  const assignmentMode = !!(initialData && initialData.type);

  useEffect(() => {
    if (open) {
      setForm(initialData || defaultForm);
      setErrors({});
    }
  }, [open, initialData]);

  const validate = () => {
    const e = {};
    if (!form.number) e.number = 'Número é obrigatório';
    if (assignmentMode) {
      if (!form.type) e.type = 'Tipo é obrigatório';
      // consultant is optional; allow clearing by leaving it empty
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    // In assignment mode, send number+type+consultant. Otherwise, only number.
    const payload = assignmentMode
      ? { number: form.number, type: form.type, consultant: form.consultant }
      : { number: form.number };
    onSave?.(payload);
    onOpenChange(false);
  };

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[95vw] max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-lg bg-background text-foreground p-6 shadow-lg border border-border focus:outline-none">
          <Dialog.Title className="text-lg font-semibold mb-1">
            {assignmentMode ? 'Definir Consultor' : (isEditMode ? 'Editar' : 'Adicionar')} Tel Sistema
          </Dialog.Title>
          <Dialog.Description className="text-sm text-muted-foreground mb-4">
            {assignmentMode
              ? 'Informe o consultor para o número e tipo selecionados.'
              : (isEditMode ? 'Atualize' : 'Preencha')} os dados do Tel Sistema
          </Dialog.Description>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Número - always visible */}
              <div className={assignmentMode ? 'md:col-span-2' : ''}>
                <label className="block text-sm font-medium mb-1">Número *</label>
                <Input 
                  value={form.number} 
                  onChange={(e) => setField('number', e.target.value)} 
                  placeholder="111" 
                  readOnly={assignmentMode}
                />
                {errors.number && <p className="text-xs text-red-600 mt-1">{errors.number}</p>}
              </div>

              {/* Tipo - only in assignment mode (read-only) */}
              {assignmentMode && (
                <div>
                  <label className="block text-sm font-medium mb-1">Tipo</label>
                  <Input value={form.type} readOnly />
                </div>
              )}

              {/* Consultor - only in assignment mode */}
              {assignmentMode && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Consultor</label>
                  <Input 
                    value={form.consultant || ''} 
                    onChange={(e) => setField('consultant', e.target.value)} 
                    placeholder="Deixe em branco para remover" 
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
                {isEditMode ? 'Atualizar' : 'Salvar'}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default AddTelModal;
