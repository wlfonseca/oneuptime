# OneUptime — Arquitetura AWS (Custo Otimizado)

## Visão Geral

Arquitetura enxuta para implantar o OneUptime em produção na AWS,
priorizando custo mínimo com serviços gerenciados. Tudo roda em **ECS Fargate**,
sem instâncias EC2 dedicadas. Single-AZ, adequado para ambientes que toleram
pequenas janelas de indisponibilidade em troca de redução de ~85% no custo.

---

## Diagrama de Componentes

```
                          Route 53 ( DNS ───→ ALB )
                                    │
                         ALB (público, 1 AZ)
                                    │
           ┌────────────────────────┼────────────────────────┐
           ▼                        ▼                        ▼
   ┌──────────────┐    ┌──────────────────┐    ┌──────────────────┐
   │ App+Home     │    │    API           │    │  AIAgent+Probe   │
   │ ECS Fargate  │    │ ECS Fargate      │    │ ECS Fargate      │
   │ 512/1024  ×1 │    │ 1024/2048  ×2    │    │ 512/1024    ×1   │
   └──────┬───────┘    └────────┬─────────┘    └────────┬─────────┘
          │                     │                       │
          └─────────────────────┼───────────────────────┘
                                │
                    Subnet Privada (1 AZ)
                                │
     ┌──────────────────────────┼──────────────────────────┐
     ▼                          ▼                          ▼
┌──────────┐   ┌───────────────────────┐   ┌────────────────────────┐
│   RDS    │   │   ElastiCache Redis   │   │  ClickHouse            │
│PostgreSQL│   │   cache.t4g.micro     │   │  ECS Fargate + EFS     │
│t4g.medium│   │   single node         │   │  1024/2048  ×1         │
└──────────┘   └───────────────────────┘   └────────────────────────┘

                      ┌───────────────────────┐
                      │     S3 + ECR          │
                      │  (assets, backups)    │
                      └───────────────────────┘
```

---

## Mapeamento de Serviços

### 1. Container Orchestration — ECS Fargate + ECR (tudo gerenciado, zero EC2)

| Serviço ECS            | CPU  | Memória | Tasks | Função                         |
| ---------------------- | ---- | ------- | ----- | ------------------------------ |
| `oneuptime-api`        | 1024 | 2048    | 2     | Backend principal (API)        |
| `oneuptime-app`        | 512  | 1024    | 1     | Dashboard + Contas + Home      |
| `oneuptime-ai-probe`   | 512  | 1024    | 1     | AI Agent + Probe (juntos)      |
| `oneuptime-clickhouse` | 1024 | 2048    | 1     | ClickHouse com EFS persistente |

**Detalhes:**

- **ECR** armazena as imagens Docker. Sem custo adicional além do armazenamento.
- **ECS Fargate** — sem gerenciamento de instâncias EC2.
- ClickHouse persiste dados em **EFS** (`/var/lib/clickhouse` montado via volume).
- App+Home consolidados em uma única task (baixo tráfego inicial).
- AIAgent + Probe consolidados (execução sob demanda).

### 2. Banco de Dados Relacional — RDS PostgreSQL (single-AZ)

| Propriedade   | Valor                            |
| ------------- | -------------------------------- |
| Engine        | PostgreSQL 16                    |
| Instância     | **db.t4g.medium** (2 vCPU, 4 GB) |
| Armazenamento | 20 GB gp3                        |
| Multi-AZ      | **Não** (custo reduzido em ~50%) |
| Backup        | 7 dias (gratuito)                |
| Encryption    | Padrão AWS                       |

### 3. Cache — ElastiCache Redis (single node)

| Propriedade  | Valor               |
| ------------ | ------------------- |
| Engine       | Redis 7             |
| Node Type    | **cache.t4g.micro** |
| Multi-AZ     | Não                 |
| Custo mensal | ~USD 12             |

### 4. Analytics / Time-Series — ClickHouse em ECS Fargate + EFS

| Propriedade    | Valor                                   |
| -------------- | --------------------------------------- |
| Execução       | ECS Fargate (1024 CPU, 2048 MB)         |
| Persistência   | EFS Standard (`/var/lib/clickhouse`)    |
| Armazenamento  | EFS 20 GB (cresce sob demanda)          |
| Alta Disponib. | Single task (basta para dev/small prod) |

**Por que EFS em vez de EC2?**

- EC2 c6a.4xlarge custa ~USD 1.500/mês (3 nós). ECS Fargate + EFS custa ~USD 50/mês.
- Para volumes de dados até ~100 GB, EFS é suficiente.
- Se o volume crescer, migrar para EC2 dedicado posteriormente.

### 5. Load Balancer — ALB + Route 53

| Serviço        | Função                          | Custo/mês |
| -------------- | ------------------------------- | --------- |
| **Route 53**   | A record → ALB                  | ~$0.50    |
| **ALB**        | Roteamento HTTP/HTTPS           | ~$22      |
| **ACM**        | Certificado TLS gratuito        | $0        |
| ~~CloudFront~~ | Removido (não essencial)        | $0        |
| ~~WAF~~        | Removido (não essencial em POC) | $0        |

### 6. Logs e Monitoramento — CloudWatch

| Serviço                | Função                  | Custo/mês |
| ---------------------- | ----------------------- | --------- |
| **CloudWatch Logs**    | Logs dos containers ECS | ~$5       |
| **CloudWatch Metrics** | CPU, memória            | $0        |

### 7. Rede — VPC (1 AZ, 1 NAT Gateway)

| Recurso             | Especificação                           | Custo/mês |
| ------------------- | --------------------------------------- | --------- |
| VPC                 | 1 AZ, subnets pública + privada         | $0        |
| NAT Gateway ×1      | Acesso à internet para subnets privadas | ~$32      |
| Internet Gateway ×1 | Tráfego de entrada                      | $0        |

### 8. Armazenamento — S3 + ECR

| Recurso | Função                    | Custo/mês |
| ------- | ------------------------- | --------- |
| ECR     | Imagens Docker            | ~$2       |
| S3      | Assets estáticos, backups | ~$3       |
| EFS     | Dados do ClickHouse       | ~$3       |

---

## Estimativa de Custo Mensal

| Serviço                           | Custo (USD)  |
| --------------------------------- | ------------ |
| ECS Fargate (4 services, 5 tasks) | ~$120        |
| RDS PostgreSQL db.t4g.medium      | ~$50         |
| ElastiCache Redis cache.t4g.micro | ~$12         |
| EFS (ClickHouse, 20 GB)           | ~$6          |
| ALB                               | ~$22         |
| NAT Gateway                       | ~$32         |
| Route 53                          | ~$1          |
| CloudWatch Logs                   | ~$5          |
| S3 + ECR                          | ~$5          |
| Secrets Manager                   | ~$1          |
| **Total**                         | **~USD 256** |

---

## Comparação com Arquitetura Multi-AZ Completa

| Item                 | Multi-AZ HA        | Custo Otimizado     |
| -------------------- | ------------------ | ------------------- |
| PostgreSQL           | db.r6g.large × 2   | db.t4g.medium × 1   |
| Redis                | Cluster Multi-AZ   | cache.t4g.micro × 1 |
| ClickHouse           | 3× EC2 c6a.4xlarge | ECS Fargate + EFS   |
| NAT Gateways         | 3                  | 1                   |
| CloudFront + WAF     | Sim                | Não                 |
| Alta Disponibilidade | 99.95%             | 99.5%               |
| **Custo mensal**     | **~USD 3.300**     | **~USD 256**        |
| **Economia**         | —                  | **~92%**            |

---

## Infraestrutura como Código — AWS CDK (TypeScript)

```typescript
// lib/oneuptime-budget-stack.ts
import * as cdk from "aws-cdk-lib";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecs_patterns from "aws-cdk-lib/aws-ecs-patterns";
import * as rds from "aws-cdk-lib/aws-rds";
import * as elasticache from "aws-cdk-lib/aws-elasticache";
import * as ec2 from "aws-cdk/lib/aws-ec2";
import * as efs from "aws-cdk/lib/aws-efs";
import * as ecr from "aws-cdk/lib/aws-ecr";
import * as route53 from "aws-cdk/lib/aws-route53";
import * as targets from "aws-cdk/lib/aws-route53-targets";
import * as acm from "aws-cdk/lib/aws-certificatemanager";
import * as s3 from "aws-cdk/lib/aws-s3";
import * as secretsmanager from "aws-cdk/lib/aws-secretsmanager";

export class OneUptimeBudgetStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ── VPC (1 AZ, 1 NAT) ──
    const vpc = new ec2.Vpc(this, "Vpc", {
      maxAzs: 1,
      natGateways: 1,
      subnetConfiguration: [
        {
          name: "public",
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: "private",
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
      ],
    });

    // ── ECS Cluster ──
    const cluster = new ecs.Cluster(this, "Cluster", { vpc });

    // ── ECR Repositories ──
    const apiRepo = new ecr.Repository(this, "ApiRepo");
    const appRepo = new ecr.Repository(this, "AppRepo");
    const aiRepo = new ecr.Repository(this, "AiRepo");
    const chRepo = new ecr.Repository(this, "ClickHouseRepo");

    // ── S3 (assets) ──
    const assetsBucket = new s3.Bucket(this, "Assets", {
      publicReadAccess: false,
      versioned: false,
    });

    // ── Secrets Manager (DB + Redis + API keys) ──
    const dbSecret = new secretsmanager.Secret(this, "DbSecret", {
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: "oneuptime" }),
        generateStringKey: "password",
        excludePunctuation: true,
      },
    });
    const redisSecret = new secretsmanager.Secret(this, "RedisSecret", {
      generateSecretString: {
        secretStringTemplate: JSON.stringify({}),
        generateStringKey: "authToken",
        excludePunctuation: true,
      },
    });

    // ── RDS PostgreSQL (single-AZ, budget) ──
    const db = new rds.DatabaseInstance(this, "Postgres", {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16,
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T4G,
        ec2.InstanceSize.MEDIUM,
      ),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      multiAz: false,
      allocatedStorage: 20,
      storageType: rds.StorageType.GP3,
      backupRetention: cdk.Duration.days(7),
      credentials: rds.Credentials.fromSecret(dbSecret),
      removalPolicy: cdk.RemovalPolicy.SNAPSHOT,
    });

    // ── ElastiCache Redis (single node) ──
    const redisSg = new ec2.SecurityGroup(this, "RedisSg", { vpc });
    const redisSubnetGroup = new elasticache.CfnSubnetGroup(
      this,
      "RedisSubnet",
      {
        description: "Subnet for Redis",
        subnetIds: vpc.privateSubnets.map((s) => s.subnetId),
      },
    );
    const redis = new elasticache.CfnCacheCluster(this, "Redis", {
      engine: "redis",
      cacheNodeType: "cache.t4g.micro",
      numCacheNodes: 1,
      vpcSecurityGroupIds: [redisSg.securityGroupId],
      cacheSubnetGroupName: redisSubnetGroup.ref,
    });

    // ── EFS para ClickHouse ──
    const chFileSystem = new efs.FileSystem(this, "ClickHouseEfs", {
      vpc,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      performanceMode: efs.PerformanceMode.GENERAL_PURPOSE,
    });

    // ── Serviço API (público via ALB) ──
    const apiService = new ecs_patterns.ApplicationLoadBalancedFargateService(
      this,
      "Api",
      {
        cluster,
        cpu: 1024,
        memoryLimitMiB: 2048,
        desiredCount: 2,
        taskImageOptions: {
          image: ecs.ContainerImage.fromEcrRepository(apiRepo, "latest"),
          containerPort: 3002,
          secrets: {
            DATABASE_PASSWORD: ecs.Secret.fromSecretsManager(
              dbSecret,
              "password",
            ),
            REDIS_AUTH_TOKEN: ecs.Secret.fromSecretsManager(
              redisSecret,
              "authToken",
            ),
          },
          environment: {
            DATABASE_HOST: db.dbInstanceEndpointAddress,
            DATABASE_PORT: db.dbInstanceEndpointPort,
            REDIS_HOST: redis.attrRedisEndpointAddress,
            REDIS_PORT: redis.attrRedisEndpointPort,
            NODE_ENV: "production",
          },
        },
        publicLoadBalancer: true,
      },
    );

    // ── Serviço App+Home ──
    const appService = new ecs_patterns.ApplicationLoadBalancedFargateService(
      this,
      "App",
      {
        cluster,
        cpu: 512,
        memoryLimitMiB: 1024,
        desiredCount: 1,
        taskImageOptions: {
          image: ecs.ContainerImage.fromEcrRepository(appRepo, "latest"),
          containerPort: 3000,
          secrets: {
            DATABASE_PASSWORD: ecs.Secret.fromSecretsManager(
              dbSecret,
              "password",
            ),
          },
          environment: {
            DATABASE_HOST: db.dbInstanceEndpointAddress,
            API_URL: `https://${apiService.loadBalancer.loadBalancerDnsName}`,
            NODE_ENV: "production",
          },
        },
        publicLoadBalancer: true,
      },
    );

    // ── Serviço AI Agent + Probe ──
    const aiProbeService = new ecs.FargateService(this, "AiProbe", {
      cluster,
      cpu: 512,
      memoryLimitMiB: 1024,
      desiredCount: 1,
      taskDefinition: new ecs.FargateTaskDefinition(this, "AiProbeTask", {
        cpu: 512,
        memoryLimitMiB: 1024,
      }),
      assignPublicIp: false,
    });

    // ── Serviço ClickHouse com EFS ──
    const chTaskDef = new ecs.FargateTaskDefinition(this, "ClickHouseTask", {
      cpu: 1024,
      memoryLimitMiB: 2048,
    });

    chTaskDef.addVolume({
      name: "clickhouse-data",
      efsVolumeConfiguration: {
        fileSystemId: chFileSystem.fileSystemId,
        transitEncryption: "ENABLED",
      },
    });

    chTaskDef
      .addContainer("ClickHouse", {
        image: ecs.ContainerImage.fromEcrRepository(chRepo, "latest"),
        memoryLimitMiB: 2048,
        portMappings: [{ containerPort: 8123 }, { containerPort: 9000 }],
      })
      .addMountPoints({
        sourceVolume: "clickhouse-data",
        containerPath: "/var/lib/clickhouse",
        readOnly: false,
      });

    const chService = new ecs.FargateService(this, "ClickHouse", {
      cluster,
      taskDefinition: chTaskDef,
      desiredCount: 1,
      assignPublicIp: false,
      enableExecuteCommand: true,
    });

    // ── DNS (opcional: apontar domínio real) ──
    // const zone = route53.HostedZone.fromLookup(this, 'Zone', {
    //   domainName: 'example.com',
    // });
    // const cert = new acm.Certificate(this, 'Cert', { domainName: 'oneuptime.example.com', validation: acm.CertificateValidation.fromDns(zone) });
    // apiService.loadBalancer.addListener('Https', { port: 443, certificates: [cert] });
  }
}
```

---

## Checklist de Implantação

- [ ] Criar VPC com 1 AZ, 1 NAT Gateway
- [ ] Provisionar RDS PostgreSQL db.t4g.medium (single-AZ)
- [ ] Provisionar ElastiCache Redis cache.t4g.micro
- [ ] Criar EFS para dados do ClickHouse
- [ ] Criar repositórios ECR e fazer push das imagens Docker
- [ ] Criar ECS Cluster e Task Definitions
- [ ] Deploy dos 4 serviços ECS Fargate
- [ ] Criar ALB com regras de roteamento para API e App
- [ ] Configurar Route 53 (A record → ALB)
- [ ] Configurar ACM para certificado TLS
- [ ] Rodar migrações PostgreSQL
- [ ] Rodar migrações ClickHouse
- [ ] Configurar backups S3 (export script + cronjob ECS)
- [ ] Validar fluxo completo

---

## Escalonamento Futuro (quando o custo for viável)

| Melhoria                  | Impacto                        | Custo adicional |
| ------------------------- | ------------------------------ | --------------- |
| RDS Multi-AZ              | HA para banco                  | +~$50/mês       |
| ElastiCache Multi-AZ      | HA para cache                  | +~$12/mês       |
| ClickHouse → EC2 dedicado | Performance para >100 GB dados | +~$120/mês      |
| CloudFront + WAF          | CDN + proteção DDoS            | +~$40/mês       |
| 2ª AZ para ECS            | HA para aplicação              | +~$120/mês      |
| NAT Gateway adicional     | HA para rede                   | +~$32/mês       |
