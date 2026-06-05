import Project from "../../Models/DatabaseModels/Project";
import { describe, expect, test } from "@jest/globals";
import BaseModel from "../../Models/DatabaseModels/DatabaseBaseModel/DatabaseBaseModel";

describe("Project — enableCallNotifications", () => {
  test("should be an instance of BaseModel", () => {
    const project: Project = new Project();
    expect(project).toBeInstanceOf(BaseModel);
  });

  test("should have enableCallNotifications property with default undefined", () => {
    const project: Project = new Project();
    expect(project.enableCallNotifications).toBeUndefined();
  });

  test("should accept enableCallNotifications = true", () => {
    const project: Project = new Project();
    project.enableCallNotifications = true;
    expect(project.enableCallNotifications).toBe(true);
  });

  test("should accept enableCallNotifications = false", () => {
    const project: Project = new Project();
    project.enableCallNotifications = false;
    expect(project.enableCallNotifications).toBe(false);
  });

  test("should persist boolean value correctly", () => {
    const project: Project = new Project();
    project.enableCallNotifications = true;
    expect(typeof project.enableCallNotifications).toBe("boolean");
    project.enableCallNotifications = false;
    expect(typeof project.enableCallNotifications).toBe("boolean");
  });
});
