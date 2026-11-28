"use client";

/**
 * Statements tab — finalized month statements + month-end close.
 * Mobile-first: a month selector strip, a summary card, then member rows that
 * expand in place (no wide table on phones).
 */
import { useCallback, useMemo, useState } from "react";
import { LuFileText, LuLock, LuRefreshCw } from "react-icons/lu";
import Button from "@/components/shared/Button";
import Skeleton from "@/components/shared/Skeleton";
import { useToast } from "@/components/shared/ToastProvider";
import { useGroupStore } from "@/lib/store/groupStore";
import { statementsApi } from "@/lib/api/statements";
import { useT } from "@/lib/i18n/LangProvider";
import { SegmentedControl, SectionCard } from "../GroupUI";
import StatementList from "./StatementList";
import StatementDetail from "./StatementDetail";
import ClosePanel from "./ClosePanel";

const CLOSE_ROLES = ["owner", "manager", "treasurer"];

export default function StatementsClient({ groupId, initialGroup, initialData }) {
  const t = useT();
  const { showToast } = useToast();
  const role = useGroupStore((s) => s.myRole) || initialGroup?.myRole || "member";
  const canClose = CLOSE_ROLES.includes(role);

  const [statements, setStatements] = useState(initialData?.statements || []);
  const [versions, setVersions] = useState(initialData?.versions || []);
  const [period, setPeriod] = useState(initialData?.period || null);
  const [checklist, setChecklist] = useState(initialData?.checklist || null);
  const [activeMonth, setActiveMonth] = useState(initialData?.latestMonth || "");
  const [activeVersionId, setActiveVersionId] = useState(initialData?.versions?.[0]?._id || "");
  const [tab, setTab] = useState("statements");
  const [loading, setLoading] = useState(false);

  const activeStatement = useMemo(
    () => versions.find((v) => String(v._id) === String(activeVersionId)) || versions[0] || null,
    [versions, activeVersionId],
  );

  const loadVersions = useCallback(
    async (month, versionId) => {
      if (!month) return;
      setLoading(true);
      try {
        const data = await statementsApi.byMonth(groupId, month);
        const list = Array.isArray(data?.statements) ? data.statements : [];
        setVersions(list);
        setActiveMonth(month);
        setActiveVersionId(versionId || list[0]?._id || "");
      } catch (ex) {
        showToast({ status: "error", title: t("stmt.couldNotLoad"), description: ex?.message });
      } finally {
        setLoading(false);
      }
    },
    [groupId, showToast, t],
  );

  const reloadList = useCallback(async () => {
    setLoading(true);
    try {
      const data = await statementsApi.list(groupId);
      const list = data?.statements || data || [];
      setStatements(list);
      if (list.length) await loadVersions(activeMonth || list[0]?.month);
    } catch (ex) {
      showToast({ status: "error", title: t("stmt.couldNotRefresh"), description: ex?.message });
    } finally {
      setLoading(false);
    }
  }, [activeMonth, groupId, loadVersions, showToast, t]);

  return (
    <div className="min-w-0 space-y-3">
      <SegmentedControl
        ariaLabel={t("stmt.tabStatements")}
        value={tab}
        onChange={setTab}
        options={[
          { value: "statements", label: t("stmt.tabStatements"), icon: LuFileText },
          ...(canClose ? [{ value: "close", label: t("stmt.tabClose"), icon: LuLock }] : []),
        ]}
      />

      {tab === "statements" && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,290px)_minmax(0,1fr)] lg:items-start">
          <StatementList
            statements={statements}
            activeMonth={activeMonth}
            loading={loading}
            onSelect={(month) => loadVersions(month)}
            onRefresh={reloadList}
          />

          <div className="min-w-0">
            {loading && versions.length === 0 ? (
              <Skeleton variant="rect" height={240} className="rounded-2xl" />
            ) : (
              <StatementDetail
                groupId={groupId}
                statement={activeStatement}
                versions={versions}
                activeVersionId={activeVersionId}
                onSelectVersion={(version) => setActiveVersionId(version._id)}
              />
            )}
          </div>
        </div>
      )}

      {tab === "close" && canClose && (
        <ClosePanel
          groupId={groupId}
          initialPeriod={period}
          initialChecklist={checklist}
          initialMonth={activeMonth}
          onFinalized={(month) => {
            setPeriod(null);
            setChecklist(null);
            loadVersions(month);
            statementsApi
              .list(groupId)
              .then((data) => setStatements(data?.statements || data || []))
              .catch(() => { });
          }}
        />
      )}
    </div>
  );
}
