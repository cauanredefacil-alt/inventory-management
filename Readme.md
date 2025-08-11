# Inventory App - Documentação

Este documento descreve a arquitetura, setup, funcionalidades e fluxos principais do sistema, com foco nas áreas de Chips e Tel Sistemas.

## Visão Geral
- Monorepo com `backend/` (Node.js + Express + Mongoose) e `frontend/` (React + Vite + Tailwind + Radix UI).
- Gestão de inventário, chips e Tel Sistemas.
- API configurada em `frontend/src/config/api.js`.

Estrutura principal:
- `backend/src/models/` modelos Mongoose
- `backend/src/routes/` rotas Express
- `frontend/src/components/` componentes React
- `frontend/src/services/` serviços Axios

## Setup Rápido
1. Backend
   - Instalar deps: `npm i` (no diretório `backend/`)
   - Rodar: `npm run dev`
2. Frontend
   - Instalar deps: `npm i` (no diretório `frontend/`)
   - Rodar: `npm run dev`
3. Configurar `.env` conforme necessário (URLs da API, MongoDB, etc.).

## Tel Sistemas
### Requisitos Implementados
- Adicionar número sem tipo/consultor (apenas `number`).
- Atribuir consultor por tipo via modal (um consultor por tipo por número).
- Tipos disponíveis: `Wtt1`, `Wtt2`, `Wtt1 -clone`, `Wtt2 -clone`, `Business`, `Business -clone`.
- Tabela mostra uma linha por número; colunas de tipo exibem o nome do consultor ou `+` para adicionar.
- Exclusão por linha remove todos os registros daquele número, com confirmação e tratamento de erros.

### Backend
- Modelo: `backend/src/models/telsystem.model.js`
  - Campos: `number` (obrigatório), `type` (opcional), `consultant` (opcional).
- Rotas: `backend/src/routes/telsystem.routes.js`
  - CRUD padrão (POST, GET, PUT, DELETE por `:id`).

### Frontend
- Componente principal: `frontend/src/components/PhonePage.jsx`
  - Agrupamento de Tel Sistemas por número em `groupedTels` (normaliza número, ignora tipos vazios, ordena por número).
  - Células de tipo são clicáveis e abrem modal para atribuir/editar/limpar consultor.
  - Botão de lixeira por linha exclui todos os registros do número.
- Modal: `frontend/src/components/phone/AddTelModal.jsx`
  - Modo 1: adicionar apenas Número (campos `Tipo` e `Consultor` ocultos).
  - Modo 2: atribuição/edição (mostra Número + Tipo como read-only e Consultor opcional).

### Fluxos
- Adicionar número: botão “Adicionar Tel” abre modal (apenas campo Número) -> cria registro número-only.
- Atribuir consultor: clicar `+` em uma célula de tipo -> modal de atribuição -> salvar atualiza/insere par (número+tipo).
- Limpar consultor: abrir modal de atribuição e salvar com Consultor vazio.
- Excluir número: botão de lixeira na linha do número (remove todos os IDs daquele número).

## Chips
### Funcionalidades
- Listagem com filtros (busca, operadora, consultor) e cartões de estatísticas.
- Adicionar/editar via `AddChipModal.jsx`.
- Excluir chip com confirmação e error handling.
- Formatação automática do campo Número para padrão brasileiro.

### Formatação de Número (Chips)
- Implementada em `frontend/src/components/phone/AddChipModal.jsx`.
- Digite apenas dígitos e o campo formata para: `(DD) 9 XXXXXXXX` quando aplicável.
  - Ex.: `79981345653` -> `(79) 9 81345653`.
- A formatação acontece ao digitar e ao abrir modal para edição.

## Serviços (API)
- Arquivo: `frontend/src/services/phoneService.js`
- Métodos principais (nomes indicativos):
  - Chips: `getAllChips`, `createChip`, `updateChip`, `deleteChip`
  - Tel Sistemas: `getAllTelSystems`, `createTelSystem`, `updateTelSystem`, `deleteTelSystem`
- Endpoints base em `frontend/src/config/api.js`.

## UI/UX
- Tabelas consistentes e responsivas.
- Tel Sistemas: cabeçalho fixo com colunas de tipos; linhas alinhadas.
- Modais com validações e mensagens de erro.

## Boas Práticas Adotadas
- Estado imutável ao atualizar listas (`setX(prev => ...)`).
- `async/await` com try/catch e mensagens de erro amigáveis.
- Agrupamento em memória via `useMemo` para estabilidade e performance.
- Confirm dialogs antes de ações destrutivas.

## Troubleshooting
- Erros 400 ao criar Tel sem tipo/consultor: garanta que o backend foi reiniciado após mudança do schema.
- Tabela Tel desalinhada:
  - Verifique se `tels` não possui `type` fora do enum esperado.
  - Confirme que `groupedTels` está gerando somente uma linha por número (ver console).
- Acesso LAN com Axios Network Error: validar baseURL e CORS no backend.

## Roadmap (opcional)
- Exclusão por tipo específico além da exclusão por número.
- Normalização de número (somente dígitos) no backend com armazenamento e exibição separadas.
- Paginação/ordenação nos grids.
