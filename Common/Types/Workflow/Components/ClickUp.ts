import IconProp from "../../Icon/IconProp";
import ComponentID from "../ComponentID";
import ComponentMetadata, {
  ComponentInputType,
  ComponentType,
} from "./../Component";

const components: Array<ComponentMetadata> = [
  {
    id: ComponentID.ClickUpCreateTask,
    title: "Create ClickUp Task",
    category: "ClickUp",
    description: "Create a task in ClickUp when a workflow is triggered.",
    iconProp: IconProp.Bookmark,
    componentType: ComponentType.Component,
    arguments: [
      {
        id: "api-token",
        name: "ClickUp API Token",
        description:
          "Your ClickUp personal API token. Generate one from ClickUp Settings > Apps > API Token.",
        type: ComponentInputType.Password,
        required: true,
        placeholder: "pk_1234567890_ABCDEFGHIJKLMNOPQRSTUVWXYZ",
      },
      {
        id: "list-id",
        name: "List ID",
        description:
          "The ClickUp list ID where the task will be created. Find it in the list URL: https://app.clickup.com/{workspace}/v/li/{listId}",
        type: ComponentInputType.Text,
        required: true,
        placeholder: "901234567890",
      },
      {
        id: "task-name",
        name: "Task Name",
        description: "Name of the task to create.",
        type: ComponentInputType.Text,
        required: true,
        placeholder: "Incident: {{trigger.name}}",
      },
      {
        id: "task-description",
        name: "Task Description",
        description: "Markdown description for the task.",
        type: ComponentInputType.LongText,
        required: false,
        placeholder: "Incident details...",
      },
      {
        id: "status",
        name: "Status",
        description:
          "Initial task status (e.g., 'To Do', 'In Progress'). Leave empty for list default.",
        type: ComponentInputType.Text,
        required: false,
        placeholder: "To Do",
      },
      {
        id: "priority",
        name: "Priority",
        description:
          "Task priority: 1 = Urgent, 2 = High, 3 = Normal, 4 = Low.",
        type: ComponentInputType.Number,
        required: false,
        placeholder: "3",
      },
    ],
    returnValues: [
      {
        id: "task-id",
        name: "Task ID",
        description: "The ID of the created task.",
        type: ComponentInputType.Text,
        required: false,
      },
      {
        id: "task-url",
        name: "Task URL",
        description: "The URL of the created task.",
        type: ComponentInputType.URL,
        required: false,
      },
      {
        id: "error",
        name: "Error",
        description: "Error message if the request failed.",
        type: ComponentInputType.Text,
        required: false,
      },
    ],
    inPorts: [
      {
        title: "In",
        description:
          "Please connect components to this port for this component to work.",
        id: "in",
      },
    ],
    outPorts: [
      {
        title: "Success",
        description: "Task was created successfully.",
        id: "success",
      },
      {
        title: "Error",
        description: "An error occurred while creating the task.",
        id: "error",
      },
    ],
  },
  {
    id: ComponentID.ClickUpUpdateTask,
    title: "Update ClickUp Task",
    category: "ClickUp",
    description: "Update a task status in ClickUp.",
    iconProp: IconProp.Bookmark,
    componentType: ComponentType.Component,
    arguments: [
      {
        id: "api-token",
        name: "ClickUp API Token",
        description:
          "Your ClickUp personal API token. Generate one from ClickUp Settings > Apps > API Token.",
        type: ComponentInputType.Password,
        required: true,
        placeholder: "pk_1234567890_ABCDEFGHIJKLMNOPQRSTUVWXYZ",
      },
      {
        id: "task-id",
        name: "Task ID",
        description:
          "The ClickUp task ID to update. You can use the task-id output from the Create ClickUp Task component.",
        type: ComponentInputType.Text,
        required: true,
        placeholder: "86ahk2zrg",
      },
      {
        id: "status",
        name: "Status",
        description: "The new status for the task.",
        type: ComponentInputType.Text,
        required: true,
        placeholder: "Done",
      },
      {
        id: "comment",
        name: "Comment",
        description: "Optional comment to add when updating the task.",
        type: ComponentInputType.LongText,
        required: false,
        placeholder: "Incident resolved automatically.",
      },
    ],
    returnValues: [
      {
        id: "task-id",
        name: "Task ID",
        description: "The ID of the updated task.",
        type: ComponentInputType.Text,
        required: false,
      },
      {
        id: "task-url",
        name: "Task URL",
        description: "The URL of the updated task.",
        type: ComponentInputType.URL,
        required: false,
      },
      {
        id: "error",
        name: "Error",
        description: "Error message if the request failed.",
        type: ComponentInputType.Text,
        required: false,
      },
    ],
    inPorts: [
      {
        title: "In",
        description:
          "Please connect components to this port for this component to work.",
        id: "in",
      },
    ],
    outPorts: [
      {
        title: "Success",
        description: "Task was updated successfully.",
        id: "success",
      },
      {
        title: "Error",
        description: "An error occurred while updating the task.",
        id: "error",
      },
    ],
  },
];

export default components;
