import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProjectCallSMSFreeSwitchConfig1780000000000 implements MigrationInterface {
  public name = "AddProjectCallSMSFreeSwitchConfig1780000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "ProjectCallSMSConfig" ADD "callProviderType" character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "ProjectCallSMSConfig" ADD "freeSwitchEventSocketHost" character varying(500)`,
    );
    await queryRunner.query(
      `ALTER TABLE "ProjectCallSMSConfig" ADD "freeSwitchEventSocketPort" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "ProjectCallSMSConfig" ADD "freeSwitchEventSocketPassword" character varying(500)`,
    );
    await queryRunner.query(
      `ALTER TABLE "ProjectCallSMSConfig" ADD "freeSwitchGatewayName" character varying(500)`,
    );
    await queryRunner.query(
      `ALTER TABLE "ProjectCallSMSConfig" ADD "freeSwitchDefaultCallerId" character varying(500)`,
    );
    await queryRunner.query(
      `ALTER TABLE "ProjectCallSMSConfig" ADD "freeSwitchTtsEngine" character varying(50)`,
    );
    await queryRunner.query(
      `ALTER TABLE "ProjectCallSMSConfig" ADD "freeSwitchTtsVoice" character varying(50)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "ProjectCallSMSConfig" DROP COLUMN "callProviderType"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ProjectCallSMSConfig" DROP COLUMN "freeSwitchEventSocketHost"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ProjectCallSMSConfig" DROP COLUMN "freeSwitchEventSocketPort"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ProjectCallSMSConfig" DROP COLUMN "freeSwitchEventSocketPassword"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ProjectCallSMSConfig" DROP COLUMN "freeSwitchGatewayName"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ProjectCallSMSConfig" DROP COLUMN "freeSwitchDefaultCallerId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ProjectCallSMSConfig" DROP COLUMN "freeSwitchTtsEngine"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ProjectCallSMSConfig" DROP COLUMN "freeSwitchTtsVoice"`,
    );
  }
}
