# Plano: Renomear baresip* para freeSwitchSip* + Migration + Deploy SIP Trunk

## 1. Renomear campos nos modelos TypeScript

### Common/Models/DatabaseModels/GlobalConfig.ts
- `baresipSipServer`  → `freeSwitchSipServer`   (VeryLongText)
- `baresipSipPort`    → `freeSwitchSipPort`     (Number)
- `baresipSipUser`    → `freeSwitchSipUser`     (VeryLongText)
- `baresipSipPassword`→ `freeSwitchSipPassword` (VeryLongText)
- Atualizar `@TableColumn` title/description

### Common/Models/DatabaseModels/ProjectCallSMSConfig.ts
- Mesmo rename — procurar e renomear todos `baresipSip*`

### App/FeatureSet/Notification/Config.ts
- `select: { baresipSipServer: true }` → `freeSwitchSipServer`
- Mapeamento: `globalConfig.freeSwitchSipServer` em vez de `baresipSipServer`

### App/FeatureSet/AdminDashboard/src/Pages/Settings/CallSMS/Index.tsx
- `field: { baresipSipServer: true }` → `field: { freeSwitchSipServer: true }`
- Atualizar labels mantendo "SIP Trunk Server/Port/Username/Password"

## 2. Gerar migration

```bash
npm run generate-postgres-migration
```
- Arquivo em `Common/Server/Infrastructure/Postgres/SchemaMigrations/`
- ALTER TABLE GlobalConfig ADD COLUMN freeSwitchSipServer TEXT
- ALTER TABLE GlobalConfig ADD COLUMN freeSwitchSipPort INTEGER
- ALTER TABLE GlobalConfig ADD COLUMN freeSwitchSipUser TEXT
- ALTER TABLE GlobalConfig ADD COLUMN freeSwitchSipPassword TEXT
- ALTER TABLE ProjectCallSMSConfig ADD COLUMN (mesmas colunas)

## 3. Registrar migration

Em `Common/Server/Infrastructure/Postgres/SchemaMigrations/Index.ts`:
- Importar nova classe
- Adicionar ao array default export

## 4. Inserir dados do SIP trunk no banco

```sql
UPDATE "GlobalConfig" SET
  "freeSwitchSipServer" = 'sip.setevoip.com',
  "freeSwitchSipPort" = 5060,
  "freeSwitchSipUser" = 'B552922',
  "freeSwitchSipPassword" = 'yAitVL',
  "callProviderType" = 'freeswitch'
WHERE "_id" = '00000000-0000-0000-0000-000000000000';
```

## 5. Deploy no container

- Copiar arquivos alterados para oneuptime-app-1
- Rebuild frontend Admin Dashboard

## 6. Verificar

- `fs_cli -x "sofia profile external gw list"` → mostrar `setevoip`
- Log do app sem erros
- Chamada de teste via interface
