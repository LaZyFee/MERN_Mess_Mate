"use client";

import { useCallback, useMemo, useState } from "react";
import Skeleton from "@/components/shared/Skeleton";
import Tabs, { TabList, Tab, TabPanels, TabPanel } from "@/components/shared/Tabs";
import { useToast } from "@/components/shared/ToastProvider";
import { useGroupStore } from "@/lib/store/groupStore";
import { statementsApi } from "@/lib/api/statements";
import StatementList from "./StatementList";
import StatementDetail from "./StatementDetail";
import ClosePanel from "./ClosePanel";

const CLOSE_ROLES = ["owner", "manager", "treasurer"];

export default function StatementsClient({ groupId, initialGroup, initialData }) {
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
        showToast({ status: "error", title: "Could not load statement", description: ex?.message });
      } finally {
        setLoading(false);
      }
    },
    [groupId, showToast],
  );

  const reloadList = useCallback(async () => {
    setLoading(true);
    try {
      const data = await statementsApi.list(groupId);
      const list = data?.statements || data || [];
      setStatements(list);
      if (list.length) await loadVersions(activeMonth || list[0]?.month);
    } catch (ex) {
      showToast({ status: "error", title: "Could not refresh", description: ex?.message });
    } finally {
      setLoading(false);
    }
  }, [activeMonth, groupId, loadVersions, showToast]);

  return (
    <div className="min-w-0 space-y-4">
      <Tabs value={tab} onChange={setTab} variant="solid-rounded" size="lg" isFitted>
        <TabList className="overflow-x-auto">
          <Tab value="statements">Statements</Tab>
          {canClose && <Tab value="close">Month-end close</Tab>}
        </TabList>

        <TabPanels className="mt-4">
          <TabPanel value="statements">
            {loading && versions.length === 0 ? (
              <Skeleton variant="rect" height={220} />
            ) : (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
                <StatementList
                  statements={statements}
                  activeMonth={activeMonth}
                  loading={loading}
                  onSelect={(month) => loadVersions(month)}
                  onRefresh={reloadList}
                />
                <div className="min-w-0">
                  <StatementDetail
                    groupId={groupId}
                    statement={activeStatement}
                    versions={versions}
                    activeVersionId={activeVersionId}
                    onSelectVersion={(version) => setActiveVersionId(version._id)}
                  />
                </div>
              </div>
            )}
          </TabPanel>

          {canClose && (
            <TabPanel value="close">
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
            </TabPanel>
          )}
        </TabPanels>
      </Tabs>
    </div>
  );
}
