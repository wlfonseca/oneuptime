import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBaresipBridgeColumns1781000000000
  implements MigrationInterface
{
  public name = "AddBaresipBridgeColumns1781000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "GlobalConfig" ADD "baresipBridgeUrl" character varying(500)`,
    );
    await queryRunner.query(
      `ALTER TABLE "GlobalConfig" ADD "baresipDefaultCallerId" character varying(500)`,
    );
    await queryRunner.query(
      `ALTER TABLE "GlobalConfig" ADD "baresipTtsEngine" character varying(50)`,
    );
    await queryRunner.query(
      `ALTER TABLE "GlobalConfig" ADD "baresipTtsVoice" character varying(50)`,
    );

    await queryRunner.query(
      `ALTER TABLE "ProjectCallSMSConfig" ADD "baresipBridgeUrl" character varying(500)`,
    );
    await queryRunner.query(
      `ALTER TABLE "ProjectCallSMSConfig" ADD "baresipDefaultCallerId" character varying(500)`,
    );
    await queryRunner.query(
      `ALTER TABLE "ProjectCallSMSConfig" ADD "baresipTtsEngine" character varying(50)`,
    );
    await queryRunner.query(
      `ALTER TABLE "ProjectCallSMSConfig" ADD "baresipTtsVoice" character varying(50)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "GlobalConfig" DROP COLUMN "baresipBridgeUrl"`,
    );
    await queryRunner.query(
      `ALTER TABLE "GlobalConfig" DROP COLUMN "baresipDefaultCallerId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "GlobalConfig" DROP COLUMN "baresipTtsEngine"`,
    );
    await queryRunner.query(
      `ALTER TABLE "GlobalConfig" DROP COLUMN "baresipTtsVoice"`,
    );

    await queryRunner.query(
      `ALTER TABLE "ProjectCallSMSConfig" DROP COLUMN "baresipBridgeUrl"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ProjectCallSMSConfig" DROP COLUMN "baresipDefaultCallerId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ProjectCallSMSConfig" DROP COLUMN "baresipTtsEngine"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ProjectCallSMSConfig" DROP COLUMN "baresipTtsVoice"`,
    );
  }
}
