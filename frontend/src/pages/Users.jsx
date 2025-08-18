import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import userService from '../services/userService';

const Users = () => {
  const [users, setUsers] = React.useState([]);
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [message, setMessage] = React.useState('');

  const loadUsers = React.useCallback(async () => {
    try {
      const list = await userService.list();
      setUsers(list);
    } catch (e) {
      setError(e?.message || 'Falha ao carregar usuários');
    }
  }, []);

  React.useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleAdd = async () => {
    setError('');
    setMessage('');
    if (!name.trim()) {
      setError('Informe o nome do usuário');
      return;
    }
    setLoading(true);
    try {
      await userService.create({ name: name.trim(), email: email.trim() || undefined });
      setMessage('Usuário criado com sucesso');
      setName('');
      setEmail('');
      await loadUsers();
    } catch (e) {
      setError(e?.message || 'Erro ao criar usuário');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Usuários</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
              <div>
                <label className="text-sm text-muted-foreground">Nome</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do usuário" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Email (opcional)</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" />
              </div>
              <div>
                <Button onClick={handleAdd} disabled={loading} className="w-full">{loading ? 'Salvando...' : 'Adicionar'}</Button>
              </div>
            </div>

            {message && <div className="text-sm text-green-600">{message}</div>}
            {error && <div className="text-sm text-red-600">{error}</div>}

            <div className="mt-2">
              <div className="text-sm font-medium mb-2">Lista de usuários</div>
              {users.length === 0 ? (
                <div className="text-sm text-muted-foreground">Nenhum usuário cadastrado.</div>
              ) : (
                <div className="space-y-2">
                  {users.map((u) => (
                    <div key={u._id || u.name} className="flex items-center justify-between border rounded px-3 py-2">
                      <div>
                        <div className="text-sm font-medium">{u.name}</div>
                        {u.email && <div className="text-xs text-muted-foreground">{u.email}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Users;
