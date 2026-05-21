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
      {
        id: "dedup-key",
        name: "Deduplication Key",
        description:
          "Unique key to identify duplicate events (e.g. {{Incident.id}}). If same key exists, a new task is NOT created — the counter is incremented instead.",
        type: ComponentInputType.Text,
        required: false,
        placeholder: "{{Incident.id}}",
      },
      {
        id: "dedup-field-id",
        name: "Dedup Hash Field ID",
        description:
          "ID of the ClickUp custom text field where the deduplication key is stored. Required if Deduplication Key is set.",
        type: ComponentInputType.Text,
        required: false,
        placeholder: "3435ed4d-40c2-45a5-ad7c-da3647557d2c",
      },
      {
        id: "counter-field-id",
        name: "Event Counter Field ID",
        description:
          "ID of the ClickUp custom number field for the event counter (incremented on each duplicate).",
        type: ComponentInputType.Text,
        required: false,
        placeholder: "4cebf685-35e9-4908-b8d1-f539da082718",
      },
      {
        id: "custom-fields",
        name: "Custom Fields (JSON)",
        description:
          'Additional custom fields in JSON format: {"field_id": "value", ...}. Field IDs are in the ClickUp list URL when editing custom fields.',
        type: ComponentInputType.LongText,
        required: false,
        placeholder: '{"ec7b4451-060e-42d2-a515-e65f0294f9d1": "OneUptime"}',
      },
    ],
    returnValues: [
      {
        id: "task-id",
        name: "Task ID",
        description: "The ID of the created or existing task in ClickUp.",
        type: ComponentInputType.Text,
        required: false,
      },
      {
        id: "task-url",
        name: "Task URL",
        description: "The URL of the created or existing task in ClickUp.",
        type: ComponentInputType.URL,
        required: false,
      },
      {
        id: "duplicate",
        name: "Duplicate",
        description:
          "True if an existing task was found and no new task was created.",
        type: ComponentInputType.Boolean,
        required: false,
      },
      {
        id: "event-count",
        name: "Event Count",
        description: "Current event count for this deduplication key.",
        type: ComponentInputType.Number,
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
        title: "Created",
        description: "A new task was created",
        id: "success",
      },
      {
        title: "Duplicate",
        description: "Task already exists, only counter was incremented",
        id: "duplicate",
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
      {
        id: "dedup-key",
        name: "Deduplication Key",
        description:
          "Alternative to Task URL: find the task by dedup key and close it.",
        type: ComponentInputType.Text,
        required: false,
        placeholder: "{{Incident.id}}",
      },
      {
        id: "dedup-field-id",
        name: "Dedup Hash Field ID",
        description:
          "Custom field ID where the dedup key is stored. Required if using Deduplication Key.",
        type: ComponentInputType.Text,
        required: false,
        placeholder: "3435ed4d-40c2-45a5-ad7c-da3647557d2c",
      },
      {
        id: "list-url",
        name: "List URL",
        description:
          "ClickUp list URL. Required if using Deduplication Key to find the task.",
        type: ComponentInputType.URL,
        required: false,
        placeholder: "https://app.clickup.com/123456/v/li/987654",
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
        id: "task-url",
        name: "Task URL",
        description: "The URL of the updated task in ClickUp.",
        type: ComponentInputType.URL,
        required: false,
      },
      {
        id: "not-found",
        name: "Not Found",
        description: "True if the task was not found.",
        type: ComponentInputType.Boolean,
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
        title: "Not Found",
        description: "This is executed when the task was not found",
        id: "not-found",
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
