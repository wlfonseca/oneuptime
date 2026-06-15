# Sessão OneUptime — Deploy e FreeSwitch SIP Trunk

**Data:** 15 Jun 2026
**Servidor produção:** `89.167.99.112` (`oneuptime.cw2tecnologia.com.br`)
**Bancos externos:** PostgreSQL e Redis em `10.0.0.3`
**Clickhouse:** Container local (`oneuptime-clickhouse-1`)

---

## Estrutura de deploy

- Código em `/root/oneuptime/` no servidor
- Fork: `github.com/wlfonseca/oneuptime`
- Build local → transferir imagem via scp → `docker compose up`
- APP_TAG=10.4.3 (no config.env)

---

## Alterações principais no código

### 1. ESL via TCP nativo (`FreeSwitchCallProvider.ts`)

- Substituiu `fs_cli` (binário ausente) por conexão TCP via módulo `net` do Node.js
- Fluxo: conecta porta 8021 → `auth ClueCon` → `api COMANDO`
- Aceita `api/response` e `command/reply` como respostas (bgapi)
- `ensureGatewayConfigured()` usa `sofia status` (não `gw list/add`)

### 2. E.164 automático (`toE164`)

- Formata caller ID e destino com `+55` se não tiver prefixo
- Caller ID do banco: `3131577797` → `+553131577797`

### 3. TTS fallback em cascata (`generateTtsAudio`)

- Piper (HTTP `oneuptime-piper-tts:5002/api/tts`) → espeak (local, pt-BR) → say (FreeSwitch)
- espeak instalado no container app via `apk add espeak`
- WAV gerado em `/tmp/oneuptime_audio/` (volume compartilhado `tts_audio`)

### 4. Volume compartilhado `tts_audio`

- Docker volume `oneuptime_tts_audio` montado em `/tmp/oneuptime_audio` no app e freeswitch

### 5. Frontend CallSMS com abas SIP/Twilio

- `AdminDashboard/src/Pages/Settings/CallSMS/Index.tsx` — abas separadas
- CALL_PROVIDER injetado no container via `docker-compose.base.yml`
- Bundle `public/dist/` rebuildado e copiado para o container

### 6. Removido User-Agent do frontend

- `Common/UI/Utils/API/API.ts` — `getDefaultHeaders()` sobrescrito

---

## Configuração FreeSwitch

### Contêiner

- Imagem: `safarov/freeswitch:latest`
- Volumes montados:
  - `./FreeSwitch/event_socket.conf.xml`
  - `./FreeSwitch/acl.conf.xml`
  - `./FreeSwitch/sip_profiles/external` → gateways SIP
  - `./FreeSwitch/modules.conf.xml` → módulos (mod_flite, mod_say_pt)
  - `tts_audio:/tmp/oneuptime_audio`

### Gateway Zadarma

- Username: `537939-106`
- Realm: `pbx.zadarma.com`
- Caller ID: `3131577797` (formatado E.164: `+553131577797`)
- Configurado em `FreeSwitch/sip_profiles/external/zadarma.xml`

### Módulos TTS

- `mod_flite` e `mod_say_pt` carregados no `modules.conf.xml`
- `mod_shout` disponível para playback HTTP (não usado)

---

## Docker Compose (servidor)

### Variáveis de rede

- `extra_hosts`: postgres→10.0.0.3, redis→10.0.0.3
- Clickhouse: container local
- PostgreSQL e Redis: externos em 10.0.0.3

### Serviços

- `app`, `probe-1`, `ingress`, `freeswitch`, `backup`, `ai-agent`, `traefik`
- `docker-agent` (imagem separada, `oneuptime/docker-agent:release`)

---

## Comandos úteis

### Deploy

```bash
# Build local
docker build -t oneuptime/app:release -f App/Dockerfile .

# Transferir imagem
docker save oneuptime/app:release | gzip | ssh oneuptime.cw2tecnologia.com.br "gunzip | docker load && docker tag oneuptime/app:release oneuptime/app:10.4.3"

# Deploy
ssh oneuptime.cw2tecnologia.com.br "cd /root/oneuptime && git pull origin master && docker compose up -d app"
```

### Injeção rápida de arquivo (sem rebuild)

```bash
scp FreeSwitchCallProvider.ts oneuptime.cw2tecnologia.com.br:/tmp/
ssh oneuptime.cw2tecnologia.com.br "docker cp /tmp/...ts oneuptime-app-1:/usr/src/app/... && docker restart oneuptime-app-1"
```

### ESL via app

```bash
ssh oneuptime.cw2tecnologia.com.br 'docker exec oneuptime-app-1 node -e "..."'
```

### FreeSwitch CLI

```bash
docker exec oneuptime-freeswitch-1 fs_cli -x 'comando'
# Ex: sofia status, sofia status gateway zadarma, show channels
```

### Banco de dados

```bash
PGPASSWORD=... psql -h 10.0.0.3 -U postgres -d oneuptimedb -c "..."
```

### Limpeza de disco

```bash
ssh oneuptime.cw2tecnologia.com.br "docker system prune -af"
```

---

## Próximos passos

1. **Build da imagem com espeak** — O Dockerfile do App precisa de `apk add espeak` para builds futuros
2. **Subir serviço Piper TTS** — Para qualidade de áudio superior (opcional)
3. **Persistir módulos FreeSwitch no boot** — `modules.conf.xml` já montado como volume
4. **Gateway `setevoip`** — Remover do XML (está dando erro de registro no log)
