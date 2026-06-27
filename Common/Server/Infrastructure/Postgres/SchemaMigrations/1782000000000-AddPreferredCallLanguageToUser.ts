import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPreferredCallLanguageToUser1782000000000
  implements MigrationInterface
{
  public name = "AddPreferredCallLanguageToUser1782000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "User" ADD "preferredCallLanguage" character varying(100)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "User" DROP COLUMN "preferredCallLanguage"`,
    );
  }
}
