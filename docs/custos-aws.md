# Estimativa de Custos AWS - OneUptime

Região: us-east-1
Preços on-demand (sem reserva)
Atualizado em: Maio 2026

---

## Cenário 1: Docker Compose em VPS (recomendado)

1 x t3.xlarge (4vCPU, 16GB) roda tudo: app + postgres + redis + clickhouse + nginx + probes

| Item          | Config               | Custo/mês     |
| ------------- | -------------------- | ------------- |
| EC2 t3.xlarge | 4vCPU, 16GB, Linux   | $167,76       |
| EBS gp3       | 100GB                | $8,00         |
| Elastic IP    | 1 IP (com instância) | $3,65         |
| Route53       | 1 hosted zone        | $0,50         |
| **Total**     |                      | **~$180/mês** |

---

## Cenário 2: ECS Fargate (tudo serverless)

### Compute (Fargate)

| Serviço | vCPU | RAM   | Tasks  | Cálculo                | Custo/mês  |
| ------- | ---- | ----- | ------ | ---------------------- | ---------- |
| App     | 1    | 2GB   | 2 (HA) | (1×29,55 + 2×3,24) × 2 | **$72,06** |
| Nginx   | 0,25 | 0,5GB | 1      | 0,25×29,55 + 0,5×3,24  | **$9,01**  |
| Probe   | 0,5  | 1GB   | 1      | 0,5×29,55 + 1×3,24     | **$18,02** |

**Subtotal Fargate: ~$99/mês**

### Banco e Cache

| Serviço           | Config                              | Custo/mês |
| ----------------- | ----------------------------------- | --------- |
| RDS PostgreSQL    | db.t3.medium (2vCPU, 4GB, 25GB gp3) | $44,09    |
| ElastiCache Redis | cache.t3.small (1,5GB)              | $27,77    |
| ClickHouse EC2    | t3.medium (2vCPU, 4GB) + 50GB gp3   | $47,11    |

**Subtotal bancos: ~$119/mês**

### Infraestrutura

| Item                 | Custo/mês |
| -------------------- | --------- |
| ALB                  | $22,27    |
| NAT Gateway (1)      | $32,85    |
| VPC (endpoints, IPs) | $7,30     |
| Route53              | $0,50     |

**Subtotal infra: ~$63/mês**

### Total Geral ECS Fargate

| Componente             | Custo/mês     |
| ---------------------- | ------------- |
| Fargate                | $99,09        |
| Bancos                 | $118,97       |
| Infra                  | $62,92        |
| Data transfer (~100GB) | $10,00        |
| **Total**              | **~$291/mês** |

---

## Preços Unitários (Fargate)

| Recurso        | Preço/hora | Preço/mês (730h) |
| -------------- | ---------- | ---------------- |
| vCPU Fargate   | $0,04048   | $29,55           |
| GB RAM Fargate | $0,004445  | $3,24            |

---

## Alternativas ao ClickHouse

ClickHouse não tem serviço gerenciado na AWS. Opções:

| Opção            | Custo/mês | Prós                   | Contras                      |
| ---------------- | --------- | ---------------------- | ---------------------------- |
| EC2 t3.medium    | ~$47      | Controle total         | Gerir você mesmo             |
| ClickHouse Cloud | $50-150   | Gerenciado, auto-scale | Mais caro, dados saem da AWS |
| Altinity.managed | ~$100     | K8s-native             | Requer EKS                   |

---

## Como calcular o link compartilhável

1. Acesse https://calculator.aws
2. Clique em **Create estimate**
3. Adicione cada serviço manualmente:
   - **ECS Fargate**: App (1vCPU/2GB × 2), Nginx (0,25vCPU/0,5GB), Probe (0,5vCPU/1GB)
   - **RDS**: PostgreSQL, db.t3.medium, 25GB gp3, Single-AZ
   - **ElastiCache**: Redis, cache.t3.small
   - **EC2**: t3.medium (ClickHouse)
   - **ALB**: 1 Application Load Balancer
   - **NAT Gateway**: 1 por AZ
4. Clique em **Save and share** → copie o link gerado

---

## Observações

- Reserva EC2/RDS (1 ano) reduz ~40% do custo
- Spot instances para EC2 reduzem ~60-70%
- ECS Fargate tem free tier: 1vCPU + 3GB RAM (primeiros 12 meses)
- Data transfer: first 100GB/mês grátis da AWS
- ClickHouse Cloud tem free tier de $0 até certos limites
