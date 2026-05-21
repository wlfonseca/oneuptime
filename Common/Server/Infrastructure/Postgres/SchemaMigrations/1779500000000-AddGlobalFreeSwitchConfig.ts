import { MigrationInterface, QueryRunner } from "typeorm";

export class AddGlobalFreeSwitchConfig1779500000000 implements MigrationInterface {
  public name = "AddGlobalFreeSwitchConfig1779500000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "GlobalConfig" ADD "freeSwitchEventSocketHost" character varying(500)`,
    );
    await queryRunner.query(
      `ALTER TABLE "GlobalConfig" ADD "freeSwitchEventSocketPort" integer DEFAULT 8021`,
    );
    await queryRunner.query(
      `ALTER TABLE "GlobalConfig" ADD "freeSwitchEventSocketPassword" character varying(500)`,
    );
    await queryRunner.query(
      `ALTER TABLE "GlobalConfig" ADD "freeSwitchGatewayName" character varying(500)`,
    );
    await queryRunner.query(
      `ALTER TABLE "GlobalConfig" ADD "freeSwitchDefaultCallerId" character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "GlobalConfig" ADD "freeSwitchTtsEngine" character varying(50) DEFAULT 'flite'`,
    );
    await queryRunner.query(
      `ALTER TABLE "GlobalConfig" ADD "freeSwitchTtsVoice" character varying(50) DEFAULT 'slt'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "GlobalConfig" DROP COLUMN "freeSwitchEventSocketHost"`,
    );
    await queryRunner.query(
      `ALTER TABLE "GlobalConfig" DROP COLUMN "freeSwitchEventSocketPort"`,
    );
    await queryRunner.query(
      `ALTER TABLE "GlobalConfig" DROP COLUMN "freeSwitchEventSocketPassword"`,
    );
    await queryRunner.query(
      `ALTER TABLE "GlobalConfig" DROP COLUMN "freeSwitchGatewayName"`,
    );
    await queryRunner.query(
      `ALTER TABLE "GlobalConfig" DROP COLUMN "freeSwitchDefaultCallerId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "GlobalConfig" DROP COLUMN "freeSwitchTtsEngine"`,
    );
    await queryRunner.query(
      `ALTER TABLE "GlobalConfig" DROP COLUMN "freeSwitchTtsVoice"`,
    );
  }
}
