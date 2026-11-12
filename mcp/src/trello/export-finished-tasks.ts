type Api = (path: string) => Promise<any>;

type Completion = {
  id: string;
  type: string;
  date: string;
  data: {
    card?: { id: string };
    list?: { id: string };
    listAfter?: { id: string };
    listBefore?: { id: string };
  };
};

const timeZone = "Europe/Amsterdam";

/** Export each card completed in the local calendar month once, including archived cards.
 * Completion comes from board activity; labels, assignees and amounts are current metadata.
 * Fail rather than return an apparently complete CSV when upstream history or cards cannot be read.
 */
export async function exportFinishedTasks(api: Api, boardId: string, year: number, month: number) {
  const start = monthStart(year, month);
  const end = monthStart(month === 12 ? year + 1 : year, month === 12 ? 1 : month + 1);
  const board = await api(`/boards/${encodeURIComponent(boardId)}?fields=id`);
  const lists: { id: string; name: string }[] = await api(
    `/boards/${encodeURIComponent(board.id)}/lists?filter=all&fields=name`,
  );
  const done = lists.filter((list) => list.name === "✨Done");
  if (done.length !== 1) throw new Error("A single unambiguous ✨Done list is required for the export.");

  // Board actions retain Done moves for archived cards; never filter by current card/list status.
  const completed = new Map<string, string>();
  let before = end.toISOString();
  for (;;) {
    const query = new URLSearchParams({
      filter: "updateCard:idList,createCard,copyCard",
      since: new Date(start.getTime() - 1).toISOString(),
      before,
      limit: "1000",
    });
    const page: Completion[] = await api(`/boards/${encodeURIComponent(board.id)}/actions?${query}`);
    for (const action of page) {
      const destination = action.type === "updateCard"
        ? action.data.listAfter?.id
        : action.data.list?.id;
      const date = Date.parse(action.date);
      if (!action.data.card || destination !== done[0].id || date < start.getTime() || date >= end.getTime()) continue;
      // Keep the latest completion in this month, even if a card was reopened and completed again.
      const previous = completed.get(action.data.card.id);
      if (!previous || date > Date.parse(previous)) completed.set(action.data.card.id, action.date);
    }
    if (page.length < 1000) break;
    const next = page.at(-1)!.id;
    if (next === before) throw new Error("Unable to paginate Trello completion history.");
    before = next;
  }

  // Fetch cards individually: this endpoint includes archived cards and former board members.
  const rows: string[][] = [["title", "completed_at", "assignees", "feature", "client", "amount", "url", "archived"]];
  const warnings: string[] = [];
  const sorted = [...completed].sort(([a, dateA], [b, dateB]) => dateA.localeCompare(dateB) || a.localeCompare(b));
  for (const [id, date] of sorted) {
    const card = await api(`/cards/${encodeURIComponent(id)}?fields=name,idBoard,idMembers,labels,url,closed&members=true&member_fields=fullName,username`);
    if (card.idBoard !== board.id) throw new Error(`Completed card ${id} is no longer on the configured board; export refused.`);
    const amount = card.name.match(/\((\d+(?:[.,]\d+)?)\)\s*$/)?.[1]?.replace(",", ".") ?? "";
    if (!amount) warnings.push(`No numeric amount at the end of the title: ${card.url}`);
    const assignees = card.idMembers.map((memberId: string) => {
      const member = card.members.find((value: { id: string }) => value.id === memberId);
      return member ? `${member.fullName} (@${member.username})` : memberId;
    }).join("; ");
    const labelNames = (color: string) => card.labels
      .filter((label: { color: string }) => label.color === color)
      .map((label: { name: string }) => label.name).join("; ");
    rows.push([card.name, new Date(date).toISOString(), assignees, labelNames("blue_dark"), labelNames("green"), amount, card.url, String(card.closed)]);
  }
  const period = `${year}-${String(month).padStart(2, "0")}`;
  return {
    filename: `finished-tasks-${period}.csv`,
    mimeType: "text/csv;charset=utf-8",
    timeZone,
    start: start.toISOString(),
    endExclusive: end.toISOString(),
    count: completed.size,
    notes: "One row per card, using its latest Done entry in the month (including creation/copy into Done), even if later reopened. Current title, assignees, labels and unitless title amounts; completion timestamps are UTC. Spreadsheet formula-like text is prefixed with an apostrophe. Deleted or inaccessible cards cause an error, not a partial export.",
    warnings,
    csv: rows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n",
  };
}

/** Calculate Amsterdam midnight without depending on the server's timezone or a fixed DST offset. */
function monthStart(year: number, month: number) {
  const utc = Date.UTC(year, month - 1, 1);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone, year: "numeric", month: "numeric", day: "numeric",
    hour: "numeric", minute: "numeric", second: "numeric", hourCycle: "h23",
  }).formatToParts(utc);
  const value = (type: string) => Number(parts.find((part) => part.type === type)!.value);
  const localAsUtc = Date.UTC(value("year"), value("month") - 1, value("day"), value("hour"), value("minute"), value("second"));
  return new Date(utc - (localAsUtc - utc));
}

/** Quote every CSV field and neutralize spreadsheet formulas in untrusted Trello text. */
function csvCell(value: string) {
  const safe = /^[\s]*[=+@-]|^[\t\r\n]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}
