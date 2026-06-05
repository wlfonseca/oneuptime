import "@testing-library/jest-dom/extend-expect";
import React from "react";
import { describe, expect, test } from "@jest/globals";

jest.mock("../../../../UI/Components/Modal/Modal", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="modal">{children}</div>
  ),
  ModalWidth: { Large: "large" as const },
}));

jest.mock("../../../../UI/Components/ErrorMessage/ErrorMessage", () => ({
  __esModule: true,
  default: () => <div data-testid="error-message" />,
}));

jest.mock("../../../../UI/Components/Input/Input", () => ({
  __esModule: true,
  default: (props: any) => <input data-testid="input" {...props} />,
}));

jest.mock("../../../../UI/Components/TextArea/TextArea", () => ({
  __esModule: true,
  default: (props: any) => <textarea data-testid="textarea" {...props} />,
}));

jest.mock("../../../../UI/Components/Pill/Pill", () => ({
  __esModule: true,
  default: ({ text }: { text: string }) => (
    <span data-testid="pill">{text}</span>
  ),
}));

jest.mock("../../../../UI/Utils/JSONFieldFlattener", () => ({
  __esModule: true,
  flattenJSONFields: jest.fn((val: any) => {
    if (!val || typeof val !== "object") return [];
    if (Array.isArray(val)) return [];
    return Object.entries(val).map(([key, value]) => ({
      path: key,
      key,
      type:
        typeof value === "object" && value !== null ? "object" : typeof value,
    }));
  }),
  JSONFieldNode: null as any,
}));

import ComponentValuePickerModal from "../../../../UI/Components/Workflow/ComponentValuePickerModal";
import { render, screen } from "@testing-library/react";

describe("ComponentValuePickerModal", () => {
  test("should render the modal", () => {
    render(
      <ComponentValuePickerModal
        onClose={jest.fn()}
        onSave={jest.fn()}
        components={[]}
      />,
    );
    expect(screen.getByTestId("modal")).toBeInTheDocument();
  });

  test("should render with empty components list", () => {
    render(
      <ComponentValuePickerModal
        onClose={jest.fn()}
        onSave={jest.fn()}
        components={[]}
      />,
    );
    expect(screen.getByTestId("modal")).toBeInTheDocument();
  });

  test("should render with multiple components", () => {
    const components = [
      { id: "comp-1", metadata: { title: "Component 1" }, returnValues: [] },
      { id: "comp-2", metadata: { title: "Component 2" }, returnValues: [] },
    ] as any;
    render(
      <ComponentValuePickerModal
        onClose={jest.fn()}
        onSave={jest.fn()}
        components={components}
      />,
    );
    expect(screen.getByTestId("modal")).toBeInTheDocument();
  });
});
