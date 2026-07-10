import { describe, it, expect } from "vitest";
import {
  normalizeStructuredPayload,
  rawTableToDataset,
  datasetsToVerifiedTables,
} from "../unstructuredDocumentStructurer";

function mockFile(name: string): File {
  return { name, type: "text/plain", size: 100 } as File;
}

describe("unstructuredDocumentStructurer", () => {
  it("normalizes meeting-notes style tables", () => {
    const file = mockFile("standup-notes.docx");
    const datasets = normalizeStructuredPayload(
      {
        documentSummary: "Weekly team standup",
        tables: [
          {
            name: "Action Items",
            category: "Action Items",
            columns: [
              { key: "col0", label: "Owner", type: "string" },
              { key: "col1", label: "Task", type: "string" },
            ],
            rows: [
              { values: { col0: "Alice", col1: "Email client" } },
              { values: { col0: "Bob", col1: "Update deck" } },
            ],
          },
          {
            name: "Decisions",
            category: "Decisions",
            columns: [
              { key: "col0", label: "Decision", type: "string" },
            ],
            rows: [{ values: { col0: "Ship MVP Friday" } }],
          },
        ],
      },
      file,
      "unstructured-llm"
    );

    expect(datasets).toHaveLength(2);
    expect(datasets[0].tableCategory).toBe("Action Items");
    expect(datasets[0].rows).toHaveLength(2);
    expect(datasets[1].name).toContain("Decisions");
  });

  it("builds verified table metadata", () => {
    const file = mockFile("notes.txt");
    const dataset = rawTableToDataset(
      {
        name: "Attendees",
        category: "Attendees & Participants",
        columns: [{ key: "col0", label: "Name", type: "string" }],
        rows: [{ values: { col0: "Jane" } }],
      },
      file,
      0,
      "unstructured-llm"
    );
    expect(dataset).not.toBeNull();
    const verified = datasetsToVerifiedTables([dataset!]);
    expect(verified[0].category).toBe("Attendees & Participants");
  });

  it("skips empty tables", () => {
    const file = mockFile("empty.txt");
    const datasets = normalizeStructuredPayload(
      {
        tables: [{ name: "Empty", columns: [], rows: [] }],
      },
      file,
      "unstructured-llm"
    );
    expect(datasets).toHaveLength(0);
  });
});
