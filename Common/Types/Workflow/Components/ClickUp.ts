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
    description: "Create a task in ClickUp from workflow",
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
        id: "list-url",
        name: "List URL",
        description:
          "URL of the ClickUp list where the task will be created. Example: https://app.clickup.com/123456/v/li/987654",
        type: ComponentInputType.URL,
        required: true,
        placeholder: "https://app.clickup.com/123456/v/li/987654",
      },
      {
        id: "task-name",
        name: "Task Name",
        description: "Name of the task to create in ClickUp.",
        type: ComponentInputType.Text,
        required: true,
        placeholder: "Incident: Server Down",
      },
      {
        id: "task-description",
        name: "Task Description",
        description: "Description of the task to create in ClickUp.",
        type: ComponentInputType.LongText,
        required: false,
        placeholder: "Describe the incident details here...",
      },
      {
        id: "status",
        name: "Status",
        description:
          "The status of the task (e.g., 'To do', 'In progress', 'Done'). Leave empty for list default.",
        type: ComponentInputType.Text,
        required: false,
        placeholder: "To do",
      },
      {
        id: "priority",
        name: "Priority",
        description:
          "Task priority: 1 = Urgent, 2 = High, 3 = Normal, 4 = Low. Leave empty for default.",
        type: ComponentInputType.Number,
        required: false,
        placeholder: "3",
      },
    ],
    returnValues: [
      {
        id: "task-id",
        name: "Task ID",
        description: "The ID of the created task in ClickUp.",
        type: ComponentInputType.Text,
        required: false,
      },
      {
        id: "task-url",
        name: "Task URL",
        description: "The URL of the created task in ClickUp.",
        type: ComponentInputType.URL,
        required: false,
      },
      {
        id: "error",
        name: "Error",
        description: "Error, if there is any.",
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
        description: "This is executed when the task is successfully created",
        id: "success",
      },
      {
        title: "Error",
        description: "This is executed when there is an error",
        id: "error",
      },
    ],
  },
  {
    id: ComponentID.ClickUpUpdateTask,
    title: "Update ClickUp Task",
    category: "ClickUp",
    description:
      "Update a task in ClickUp (e.g. change status to resolved/closed)",
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
        id: "task-url",
        name: "Task URL",
        description:
          "URL of the ClickUp task to update. You can use the task-url output from 'Create ClickUp Task' component.",
        type: ComponentInputType.URL,
        required: true,
        placeholder: "https://app.clickup.com/t/86ahk2zrg",
      },
      {
        id: "status",
        name: "Status",
        description:
          "The new status for the task (e.g., 'Done', 'Resolved', 'Closed').",
        type: ComponentInputType.Text,
        required: true,
        placeholder: "Done",
      },
      {
        id: "comment",
        name: "Comment",
        description: "Optional comment to add when updating the task status.",
        type: ComponentInputType.LongText,
        required: false,
        placeholder: "Incident resolved in OneUptime",
      },
    ],
    returnValues: [
      {
        id: "task-id",
        name: "Task ID",
        description: "The ID of the updated task in ClickUp.",
        type: ComponentInputType.Text,
        required: false,
      },
      {
        id: "error",
        name: "Error",
        description: "Error, if there is any.",
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
        description: "This is executed when the task is successfully updated",
        id: "success",
      },
      {
        title: "Error",
        description: "This is executed when there is an error",
        id: "error",
      },
    ],
  },
];

export default components;
