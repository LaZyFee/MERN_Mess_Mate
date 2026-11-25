"use client";

/** Sidebar for the admin ticket view: user context + management controls. */
import { LuUser, LuClipboardList } from "react-icons/lu";
import Avatar from "@/components/shared/Avatar";
import Button from "@/components/shared/Button";
import Card from "@/components/shared/Card";
import Select from "@/components/shared/Select";

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

function formatWhen(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function TicketContextPanel({ owner, memberships, ticket, busy, onPriority, onClearAssignee }) {
  return (
    <aside className="flex min-w-0 flex-col gap-(--space-3)">
      <Card variant="outlined" padding="md" className="min-w-0">
        <h2 className="mb-2 flex items-center gap-1.5 text-xs font-bold text-(--tp)">
          <LuUser size={13} /> User context
        </h2>
        <div className="flex items-center gap-2">
          <Avatar name={owner?.username || "User"} src={owner?.profilePic} size="md" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-(--tp)">{owner?.username || "Unknown user"}</p>
            <p className="text-[10px] text-(--tm)">Email &amp; phone stay in the user directory.</p>
          </div>
        </div>
        {memberships.length > 0 && (
          <ul className="mt-2 list-none space-y-1">
            {memberships.map((m) => (
              <li key={m._id} className="flex items-center justify-between gap-2 rounded-md bg-(--bgm) px-2 py-1 text-[10px] text-(--tm)">
                <span className="font-semibold capitalize text-(--ts)">{m.role}</span>
                <span>{m.endDate ? "left" : "active"}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card variant="outlined" padding="md" className="min-w-0">
        <h2 className="mb-2 flex items-center gap-1.5 text-xs font-bold text-(--tp)">
          <LuClipboardList size={13} /> Manage
        </h2>
        <Select
          label="Priority"
          size="sm"
          value={ticket.priority || "normal"}
          onChange={(event) => onPriority(event.target.value)}
          options={PRIORITY_OPTIONS}
        />
        <p className="mt-2 text-[10px] text-(--tm)">
          Assignee: {ticket.assignedAdminId ? "assigned" : "unassigned"}
        </p>
        <Button size="xs" variant="ghost" className="mt-1" isDisabled={Boolean(busy)} onClick={onClearAssignee}>
          Clear assignment
        </Button>
        {ticket.firstResponseDueAt && (
          <p className="mt-2 text-[10px] text-(--tm)">SLA due {formatWhen(ticket.firstResponseDueAt)}</p>
        )}
      </Card>
    </aside>
  );
}
