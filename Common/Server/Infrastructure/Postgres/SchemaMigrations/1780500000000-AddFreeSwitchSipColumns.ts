import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFreeSwitchSipColumns1780500000000
  implements MigrationInterface
{
  public name = "AddFreeSwitchSipColumns1780500000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // GlobalConfig table
    await queryRunner.query(
      `ALTER TABLE "GlobalConfig" ADD "freeSwitchSipServer" character varying(500)`,
    );
    await queryRunner.query(
      `ALTER TABLE "GlobalConfig" ADD "freeSwitchSipPort" integer DEFAULT 5060`,
    );
    await queryRunner.query(
      `ALTER TABLE "GlobalConfig" ADD "freeSwitchSipUser" character varying(500)`,
    );
    await queryRunner.query(
      `ALTER TABLE "GlobalConfig" ADD "freeSwitchSipPassword" character varying(500)`,
    );
    await queryRunner.query(
      `ALTER TABLE "GlobalConfig" ADD "freeSwitchSipTransport" character varying(100) DEFAULT 'udp'`,
    );

    // ProjectCallSMSConfig table
    await queryRunner.query(
      `ALTER TABLE "ProjectCallSMSConfig" ADD "freeSwitchSipServer" character varying(500)`,
    );
    await queryRunner.query(
      `ALTER TABLE "ProjectCallSMSConfig" ADD "freeSwitchSipPort" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "ProjectCallSMSConfig" ADD "freeSwitchSipUser" character varying(500)`,
    );
    await queryRunner.query(
      `ALTER TABLE "ProjectCallSMSConfig" ADD "freeSwitchSipPassword" character varying(500)`,
    );
    await queryRunner.query(
      `ALTER TABLE "ProjectCallSMSConfig" ADD "freeSwitchSipTransport" character varying(100)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "GlobalConfig" DROP COLUMN "freeSwitchSipServer"`,
    );
    await queryRunner.query(
      `ALTER TABLE "GlobalConfig" DROP COLUMN "freeSwitchSipPort"`,
    );
    await queryRunner.query(
      `ALTER TABLE "GlobalConfig" DROP COLUMN "freeSwitchSipUser"`,
    );
    await queryRunner.query(
      `ALTER TABLE "GlobalConfig" DROP COLUMN "freeSwitchSipPassword"`,
    );
    await queryRunner.query(
      `ALTER TABLE "GlobalConfig" DROP COLUMN "freeSwitchSipTransport"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ProjectCallSMSConfig" DROP COLUMN "freeSwitchSipServer"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ProjectCallSMSConfig" DROP COLUMN "freeSwitchSipPort"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ProjectCallSMSConfig" DROP COLUMN "freeSwitchSipUser"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ProjectCallSMSConfig" DROP COLUMN "freeSwitchSipPassword"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ProjectCallSMSConfig" DROP COLUMN "freeSwitchSipTransport"`,
    );
  }
}
