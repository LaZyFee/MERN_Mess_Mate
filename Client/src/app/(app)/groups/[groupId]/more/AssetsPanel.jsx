"use client";

/**
 * T14.6 — Refundable deposit assets (landlord deposit, kitchen equipment,
 * advances). Cursor list with load-more; treasurer+ can record a refund.
 */
import { useCallback, useEffect, useState } from "react";
import { LuBox, LuBanknote, LuRefreshCw } from "react-icons/lu";
import Button from "@/components/shared/Button";
import Card from "@/components/shared/Card";
import Input from "@/components/shared/Input";
import Modal from "@/components/modals/Modal";
import Select from "@/components/shared/Select";
import Skeleton from "@/components/shared/Skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useToast } from "@/components/shared/ToastProvider";
import { assetsApi } from "@/lib/api/expenses";
import { useT } from "@/lib/i18n/LangProvider";
import { useMoney } from "@/lib/hooks/useMoney";

export default function AssetsPanel({ groupId, canManage = false, memberships = [] }) {
  const t = useT();
  const { fmt, n, parse, errorText } = useMoney();
  const { showToast } = useToast();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [moreCursor, setMoreCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refunding, setRefunding] = useState(null);
  const [amount, setAmount] = useState("");
  const [shareId, setShareId] = useState("");
  const [saving, setSaving] = useState(false);

  const memberName = useCallback(
    (membershipId) => {
      const match = memberships.find((m) => String(m._id) === String(membershipId));
      return match?.displayName || match?.userId?.username || `#${String(membershipId).slice(-4)}`;
    },
    [memberships],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await assetsApi.list(groupId);
      setAssets(data?.assets || []);
      setMoreCursor(data?.nextCursor || null);
    } catch (ex) {
      showToast({ status: "error", title: t("more.couldNotLoadAssets"), description: ex?.data?.msg || ex?.message });
    } finally {
      setLoading(false);
    }
  }, [groupId, showToast, t]);

  useEffect(() => {
    load();
  }, [load]);

  const loadMore = async () => {
    if (!moreCursor) return;
    setLoadingMore(true);
    try {
      const data = await assetsApi.list(groupId, moreCursor);
      const next = data?.assets || [];
      setAssets((current) => {
        const seen = new Set(current.map((a) => a._id));
        return [...current, ...next.filter((a) => !seen.has(a._id))];
      });
      setMoreCursor(data?.nextCursor || null);
    } catch (ex) {
      showToast({ status: "error", title: t("more.couldNotLoadMoreAssets"), description: ex?.data?.msg || ex?.message });
    } finally {
      setLoadingMore(false);
    }
  };

  const submitRefund = async () => {
    const parsed = parse(amount);
    if (!refunding || !parsed.ok) {
      showToast({ status: "warning", title: parsed.ok ? t("more.refundPositive") : errorText(parsed.reason) });
      return;
    }
    if (!shareId) {
      showToast({ status: "warning", title: t("more.pickShare") });
      return;
    }
    setSaving(true);
    try {
      await assetsApi.refund(groupId, refunding._id, { membershipId: shareId, amount: parsed.poisha });
      showToast({ status: "success", title: t("more.refundRecorded") });
      setRefunding(null);
      setAmount("");
      setShareId("");
      load();
    } catch (ex) {
      showToast({ status: "error", title: t("more.couldNotRecordRefund"), description: ex?.data?.msg || ex?.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      padding="md"
      header={
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-sm font-bold text-(--tp)">
            <LuBox size={15} className="text-(--p)" /> {t("more.depositAssets")}
          </span>
          <Button size="sm" variant="ghost" isRound ariaLabel={t("shell.refresh")} isLoading={loading} onClick={load}>
            <LuRefreshCw size={14} />
          </Button>
        </div>
      }
    >
      {loading && assets.length === 0 ? (
        <Skeleton variant="rect" height={64} />
      ) : assets.length === 0 ? (
        <p className="py-4 text-center text-xs text-(--tm)">{t("more.noAssets")}</p>
      ) : (
        <div className="space-y-2">
          {assets.map((asset) => {
            const remaining = Math.max(0, (asset.currentValuation || asset.initialAmount || 0));
            return (
              <div key={asset._id} className="rounded-lg border border-(--bd) bg-(--bgs) p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge type="asset" status={asset.status} />
                  <span className="text-xs font-semibold text-(--ts)">{t(`more.assetKind.${asset.kind}`)}</span>
                </div>
                <p className="mt-1 text-sm font-bold text-(--tp)">{asset.name || t("more.assetFallback")}</p>
                <p className="text-xs text-(--tm)">
                  {t("more.held")}: {fmt(remaining)}
                  {" · "}
                  {t("more.refunds", { count: n(asset.refunds?.length || 0) })}
                </p>
                {canManage && asset.status !== "fully_refunded" && asset.status !== "written_off" && (
                  <Button size="sm" variant="outline" leftIcon={<LuBanknote size={13} />} className="mt-2" onClick={() => { setRefunding(asset); setAmount(""); setShareId(""); }}>
                    {t("more.recordRefund")}
                  </Button>
                )}
              </div>
            );
          })}
          {moreCursor && (
            <Button variant="outline" size="md" isFullWidth isLoading={loadingMore} isDisabled={loadingMore} onClick={loadMore}>
              {t("more.loadMoreAssets")}
            </Button>
          )}
        </div>
      )}

      <Modal
        isOpen={Boolean(refunding)}
        onClose={() => setRefunding(null)}
        header={t("more.recordRefund")}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRefunding(null)} isDisabled={saving}>{t("shell.cancel")}</Button>
            <Button onClick={submitRefund} isLoading={saving} isDisabled={saving}>{t("more.record")}</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-(--tm)">
            {t("more.refundAgainst", { name: refunding?.name || t("more.assetFallback") })}
          </p>
          <Select
            size="lg"
            label={t("more.fundingShare")}
            isRequired
            options={[
              { value: "", label: t("more.memberLabel") },
              ...(refunding?.fundingShares || [])
                .filter((share) => (share.amount - (share.refundedAmount || 0)) > 0)
                .map((share) => ({
                  value: String(share.membershipId),
                  label: `${memberName(share.membershipId)} · ${fmt(share.amount - (share.refundedAmount || 0))} ${t("more.left")}`,
                })),
            ]}
            value={shareId}
            onChange={(e) => setShareId(e.target.value)}
          />
          <Input size="lg" label={t("more.refundAmount")} isRequired inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
      </Modal>
    </Card>
  );
}
