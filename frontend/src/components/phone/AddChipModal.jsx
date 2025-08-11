import React, { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const defaultForm = {
  ip: '',
  number: '',
  carrier: '',
  consultant: '',
  status: '',
};

const AddChipModal = ({ open, onOpenChange, onSave, chip }) => {
  const [form, setForm] = useState(defaultForm);
  const [errors, setErrors] = useState({});

  // Format to Brazilian mobile pattern similar to: (79) 9 81345653
  const formatBRMobile = (value) => {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 11); // up to 11 digits
    const ddd = digits.slice(0, 2);
    let rest = digits.slice(2);
    if (!ddd) return '';
    let mid = '';
    if (rest.length > 0) {
      if (rest[0] === '9') {
        mid = ' 9 ' + rest.slice(1);
      } else {
        mid = ' ' + rest;
      }
    }
    return `(${ddd})${mid}`.trim();
  };

  useEffect(() => {
    if (open) {
      if (chip) {
        setForm({
          _id: chip._id,
          ip: chip.ip || '',
          number: formatBRMobile(chip.number || ''),
          carrier: chip.carrier || '',
          consultant: chip.consultant || '',
          status: chip.status || ''
        });
      } else {
        setForm(defaultForm);
      }
      setErrors({});
    }
  }, [open, chip]);

  const validate = () => {
    const e = {};
    if (!/^\d{1,3}$/.test(form.ip)) e.ip = 'IP deve conter de 1 a 3 dígitos';
    if (!form.number) e.number = 'Número é obrigatório';
    if (!form.carrier) e.carrier = 'Operadora é obrigatória';
    if (!form.consultant) e.consultant = 'Consultor é obrigatório';
    if (!form.status) e.status = 'Status é obrigatório';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSave?.({ ...form });
    onOpenChange(false);
  };

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[95vw] max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-lg bg-background text-foreground p-6 shadow-lg border border-border focus:outline-none">
          <Dialog.Title className="text-lg font-semibold mb-1">
            {form._id ? 'Editar Chip' : 'Adicionar Chip'}
          </Dialog.Title>
          <Dialog.Description className="text-sm text-muted-foreground mb-4">
            Preencha os dados do chip
          </Dialog.Description>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">IP *</label>
                <Input value={form.ip} onChange={(e) => setField('ip', e.target.value.replace(/[^0-9]/g, ''))} placeholder="123" />
                {errors.ip && <p className="text-xs text-red-600 mt-1">{errors.ip}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Número *</label>
                <Input 
                  value={form.number} 
                  onChange={(e) => setField('number', formatBRMobile(e.target.value))} 
                  placeholder="(11) 9 9999-9999" 
                />
                {errors.number && <p className="text-xs text-red-600 mt-1">{errors.number}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Operadora *</label>
                <Select value={form.carrier} onValueChange={(v) => setField('carrier', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Vivo">Vivo</SelectItem>
                    <SelectItem value="Tim">Tim</SelectItem>
                    <SelectItem value="Claro">Claro</SelectItem>
                    <SelectItem value="Oi">Oi</SelectItem>
                  </SelectContent>
                </Select>
                {errors.carrier && <p className="text-xs text-red-600 mt-1">{errors.carrier}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Consultor *</label>
                <Input value={form.consultant} onChange={(e) => setField('consultant', e.target.value)} placeholder="Nome do consultor" />
                {errors.consultant && <p className="text-xs text-red-600 mt-1">{errors.consultant}</p>}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Status *</label>
                <Select value={form.status} onValueChange={(v) => setField('status', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Ativo/Aracaju">Ativo/Aracaju</SelectItem>
                    <SelectItem value="Aguardando Análise">Aguardando Análise</SelectItem>
                    <SelectItem value="Banido">Banido</SelectItem>
                    <SelectItem value="Inativo">Inativo</SelectItem>
                    <SelectItem value="Maturado">Maturado</SelectItem>
                    <SelectItem value="Recarga Pendente">Recarga Pendente</SelectItem>
                  </SelectContent>
                </Select>
                {errors.status && <p className="text-xs text-red-600 mt-1">{errors.status}</p>}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">Salvar</Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default AddChipModal;
